import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

import ollama
from prompts import PROMPTS

# ─── Configuration du modèle ────────────────────────────────────────────────
# Priorité : variable d'environnement > valeur par défaut
# Si Ollama n'est pas encore installé ou le modèle pas encore téléchargé,
# l'application démarre quand même en mode dégradé.
MODEL_NAME = os.environ.get("CAMPUS_MODEL", "gemma3:4b")
MAX_TOKENS = 512

# Alias connus : si le modèle exact n'est pas trouvé, on essaie ces variantes
MODEL_ALIASES = [
    "gemma3:4b",
    "gemma4:4b",
    "gemma:4b",
    "gemma2:2b",   # fallback minimal si seule version disponible
]


def build_prompt(task: str, **kwargs) -> str:
    template = PROMPTS.get(task, PROMPTS["qa"])
    return template.format(**kwargs)


def get_active_model() -> str | None:
    """Renvoie le premier modèle disponible dans Ollama, ou None si Ollama est absent."""
    try:
        models = ollama.list()
        names = [m["name"] for m in models.get("models", [])]
        # 1. Chercher exactement MODEL_NAME
        for name in names:
            if MODEL_NAME in name:
                return name
        # 2. Chercher parmi les alias connus
        for alias in MODEL_ALIASES:
            for name in names:
                if alias in name:
                    return name
        return None
    except Exception:
        return None


def query_edge(task: str, **kwargs) -> dict:
    """Appelle le modèle en local via Ollama.
    Si Ollama n'est pas disponible ou le modèle absent → mode dégradé.
    """
    active_model = get_active_model()

    if not active_model:
        return {
            "answer": (
                "⚠️ Le modèle IA n'est pas encore disponible.\n\n"
                "**Ollama est peut-être encore en cours d'installation ou le modèle en téléchargement.**\n\n"
                "Commandes pour résoudre :\n"
                "```\n"
                "ollama pull gemma3:4b\n"
                "```\n"
                "Puis relancez le serveur FastAPI."
            ),
            "latency_ms": 0,
            "mode": "degraded",
            "success": False,
            "error": "Ollama non disponible ou modèle absent",
        }

    prompt = build_prompt(task, **kwargs)
    start = time.time()

    try:
        response = ollama.chat(
            model=active_model,
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
            "model": active_model,
            "success": True,
        }
    except Exception as e:
        return {
            "answer": "⚠️ Service temporairement indisponible. Veuillez réessayer.",
            "latency_ms": 0,
            "mode": "degraded",
            "success": False,
            "error": str(e),
        }


def check_model_available() -> bool:
    """Vérifie si au moins un modèle compatible est disponible dans Ollama."""
    return get_active_model() is not None
