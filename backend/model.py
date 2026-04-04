import sys
import os
import time

# Garantit que le dossier backend est dans le path, peu importe le CWD de lancement
sys.path.insert(0, os.path.dirname(__file__))

import ollama
from prompts import PROMPTS

MODEL_NAME = "gemma4:4b"
MAX_TOKENS = 512


def build_prompt(task: str, **kwargs) -> str:
    template = PROMPTS.get(task, PROMPTS["qa"])
    return template.format(**kwargs)


def query_edge(task: str, **kwargs) -> dict:
    """Appelle Gemma 4 en local via Ollama."""
    prompt = build_prompt(task, **kwargs)
    start = time.time()

    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            options={
                "temperature": 0.3,
                "num_predict": MAX_TOKENS,
                "num_ctx": 4096,
            },
        )
        answer = response["message"]["content"]
        latency = (time.time() - start) * 1000
        return {
            "answer": answer,
            "latency_ms": round(latency, 1),
            "mode": "edge",
            "success": True,
        }
    except Exception as e:
        return {
            "answer": "Service temporairement indisponible.",
            "latency_ms": 0,
            "mode": "degraded",
            "success": False,
            "error": str(e),
        }


def check_model_available() -> bool:
    try:
        models = ollama.list()
        names = [m["name"] for m in models.get("models", [])]
        return any(MODEL_NAME in n for n in names)
    except Exception:
        return False
