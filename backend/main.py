import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import query_edge, check_model_available
from database import log_interaction, get_stats
from security import anonymize, validate_input

app = FastAPI(title="Campus AI Edge API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TASKS = {"qa", "summary", "planning", "stress"}


class QueryRequest(BaseModel):
    student_id: str
    question: str = ""
    context: str = ""
    content: str = ""   # utilisé par les tabs Planning et Résumé
    task: str = "qa"


@app.get("/health")
async def health():
    ok = check_model_available()
    return {
        "status": "online" if ok else "degraded",
        "model": "gemma4:4b",
        "mode": "edge",
    }


@app.post("/query")
async def query(req: QueryRequest):
    # 1. Valider la tâche
    if req.task not in VALID_TASKS:
        raise HTTPException(status_code=400, detail="Tâche inconnue")

    # 2. Valider et nettoyer les entrées
    question = validate_input(req.question)
    context = validate_input(req.context)
    content = validate_input(req.content)

    # 3. Construire kwargs selon la tâche
    # Le champ "content" est la source principale pour summary/planning/stress
    # Pour qa, on utilise question + context
    effective_content = content or context or question
    kwargs = {
        "question": question,
        "context": context,
        "content": effective_content,
    }

    # 4. Appeler le modèle Edge
    result = query_edge(req.task, **kwargs)

    # 5. Logger de façon anonyme
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


# Lancer avec : uvicorn main:app --host 0.0.0.0 --port 8000
