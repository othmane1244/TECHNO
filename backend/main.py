import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv

# Charge .env depuis la racine du projet (TECHNO/TECHNO/.env)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.sessions import SessionMiddleware

from auth import (
    authenticate_password_login,
    build_auth_status,
    build_login_redirect,
    build_logout_response,
    get_auth_settings,
    get_session_secret,
    handle_callback,
    require_admin_user,
    require_authenticated_user,
)
from database import get_stats, init_db, log_interaction
from model import check_model_available, query_edge, query_edge_stream
from security import anonymize, validate_input

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("main")

# ─── Chemins ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# ─── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ─── Application ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Campus AI Edge API",
    version="1.1",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    SessionMiddleware,
    secret_key=get_session_secret(),
    session_cookie="elma_session",
    same_site="lax",
    https_only=False,
    max_age=60 * 60 * 12,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Campus AI Edge démarré — docs disponibles sur /docs")


VALID_TASKS = {"qa", "summary", "planning", "stress"}


class QueryRequest(BaseModel):
    student_id: str = ""
    question: str = ""
    context: str = ""
    content: str = ""
    task: str = "qa"


class PasswordLoginRequest(BaseModel):
    email: str = ""
    password: str = ""
    intent: str = "user"


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/auth/me")
async def auth_me(request: Request):
    return build_auth_status(request)


@app.get("/auth/login")
async def auth_login(request: Request, intent: str = "user"):
    return build_login_redirect(request, intent=intent)


@app.post("/auth/login/password")
async def auth_login_password(request: Request, payload: PasswordLoginRequest):
    return authenticate_password_login(request, payload.email, payload.password, payload.intent)


@app.get("/auth/callback")
async def auth_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    return handle_callback(request, code=code, state=state, error=error)


@app.get("/auth/logout")
async def auth_logout(request: Request):
    return build_logout_response(request)


@app.get("/health")
async def health():
    ok = check_model_available()
    auth_settings = get_auth_settings()
    return {
        "status": "online" if ok else "degraded",
        "model": "gemma3:4b",
        "mode": "edge",
        "auth_enabled": auth_settings.enabled,
        "auth_provider": "keycloak" if auth_settings.enabled else "disabled",
    }


@app.post("/query")
@limiter.limit("30/minute")
async def query(request: Request, req: QueryRequest, auth_payload: dict = Depends(require_authenticated_user)):
    if req.task not in VALID_TASKS:
        raise HTTPException(status_code=400, detail="Tache inconnue")

    question = validate_input(req.question)
    context = validate_input(req.context)
    content = validate_input(req.content)
    effective_content = content or context or question

    result = query_edge(
        req.task,
        question=question,
        context=context,
        content=effective_content,
    )

    if not result.get("success"):
        logger.warning("Requête dégradée (task=%s) : %s", req.task, result.get("error"))

    user_ref = auth_payload.get("user", {}).get("sub") or req.student_id or "anonymous"
    log_interaction(
        student_hash=anonymize(user_ref),
        task=req.task,
        latency_ms=result["latency_ms"],
        mode=result["mode"],
    )

    return result


@app.post("/stream")
@limiter.limit("30/minute")
async def stream_query(request: Request, req: QueryRequest, auth_payload: dict = Depends(require_authenticated_user)):
    if req.task not in VALID_TASKS:
        raise HTTPException(status_code=400, detail="Tache inconnue")

    question = validate_input(req.question)
    context = validate_input(req.context)
    content = validate_input(req.content)
    effective_content = content or context or question
    user_ref = auth_payload.get("user", {}).get("sub") or req.student_id or "anonymous"

    def generate():
        start = time.time()
        for token in query_edge_stream(
            req.task,
            question=question,
            context=context,
            content=effective_content,
        ):
            yield f"data: {json.dumps({'token': token})}\n\n"

        latency = round((time.time() - start) * 1000, 1)
        log_interaction(
            student_hash=anonymize(user_ref),
            task=req.task,
            latency_ms=latency,
            mode="edge",
        )
        yield f"data: {json.dumps({'done': True, 'latency_ms': latency, 'mode': 'edge'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/stats")
async def stats(_: dict = Depends(require_admin_user)):
    return get_stats()
