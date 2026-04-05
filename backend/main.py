import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from model import query_edge, check_model_available
from database import log_interaction, get_stats, init_db
from security import anonymize, validate_input

# ── Chemins ────────────────────────────────────────────────
BASE_DIR     = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Campus AI Edge API", version="1.0")

# ── CORS (dev) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000",
                   "http://localhost:8501", "http://127.0.0.1:8501"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── Fichiers statiques → frontend/ ────────────────────────
app.mount(
    "/static",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="static",
)

# ── Startup ────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    init_db()


# ── Routes ────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    """Sert l'interface web principale."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


VALID_TASKS = {"qa", "summary", "planning", "stress"}


class QueryRequest(BaseModel):
    student_id: str
    question:   str = ""
    context:    str = ""
    content:    str = ""
    task:       str = "qa"


@app.get("/health")
async def health():
    ok = check_model_available()
    return {
        "status": "online" if ok else "degraded",
        "model":  "gemma3:4b",
        "mode":   "edge",
    }


@app.post("/query")
async def query(req: QueryRequest):
    if req.task not in VALID_TASKS:
        raise HTTPException(status_code=400, detail="Tâche inconnue")

    question         = validate_input(req.question)
    context          = validate_input(req.context)
    content          = validate_input(req.content)
    effective_content = content or context or question

    result = query_edge(
        req.task,
        question=question,
        context=context,
        content=effective_content,
    )

    log_interaction(
        student_hash=anonymize(req.student_id),
        task=req.task,
        latency_ms=result["latency_ms"],
        mode=result["mode"],
    )

    return result


@app.get("/stats")
async def stats():
    return get_stats()


# Lancer avec :
#   cd campus_ai/backend
#   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
