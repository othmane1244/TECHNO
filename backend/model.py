import logging
import os
import time

import ollama
from prompts import PROMPTS

logger = logging.getLogger("model")

# ─── Configuration du modèle ────────────────────────────────────────────────
MODEL_NAME = os.environ.get("CAMPUS_MODEL", "gemma3:4b")
MAX_TOKENS = 512

# Alias connus : si le modèle exact n'est pas trouvé, on essaie ces variantes
MODEL_ALIASES = [
    "gemma3:4b",
    "gemma4:4b",
    "gemma:4b",
    "gemma2:2b",
]

# Cache du modèle actif — évite d'interroger Ollama à chaque requête
_model_cache: str | None = None
_model_cache_at: float = 0.0
_MODEL_CACHE_TTL = 300  # secondes


def build_prompt(task: str, **kwargs) -> str:
    template = PROMPTS.get(task, PROMPTS["qa"])
    return template.format(**kwargs)


def get_active_model() -> str | None:
    """Renvoie le premier modèle disponible dans Ollama, ou None si Ollama est absent.

    Le résultat est mis en cache pendant MODEL_CACHE_TTL secondes.
    Si Ollama n'était pas disponible (cache None), on re-teste immédiatement.
    """
    global _model_cache, _model_cache_at
    now = time.monotonic()

    # Utiliser le cache uniquement si on avait trouvé un modèle (pas None)
    if _model_cache is not None and (now - _model_cache_at) < _MODEL_CACHE_TTL:
        return _model_cache

    try:
        models = ollama.list()
        names = [m["name"] for m in models.get("models", [])]
        # 1. Chercher exactement MODEL_NAME
        for name in names:
            if MODEL_NAME in name:
                _model_cache = name
                _model_cache_at = now
                return name
        # 2. Chercher parmi les alias connus
        for alias in MODEL_ALIASES:
            for name in names:
                if alias in name:
                    _model_cache = name
                    _model_cache_at = now
                    return name
        _model_cache = None
        return None
    except Exception as exc:
        logger.warning("Ollama inaccessible : %s", exc)
        _model_cache = None
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
        logger.error("Erreur génération Ollama (task=%s) : %s", task, e)
        return {
            "answer": "⚠️ Service temporairement indisponible. Veuillez réessayer.",
            "latency_ms": 0,
            "mode": "degraded",
            "success": False,
            "error": str(e),
        }


def query_edge_stream(task: str, **kwargs):
    """Générateur qui stream les tokens Ollama un par un."""
    active_model = get_active_model()

    if not active_model:
        yield "⚠️ Le modèle IA n'est pas disponible. Vérifiez qu'Ollama est lancé et que le modèle est téléchargé."
        return

    prompt = build_prompt(task, **kwargs)
    try:
        for chunk in ollama.chat(
            model=active_model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            options={
                "temperature": 0.3,
                "num_predict": MAX_TOKENS,
                "num_ctx": 4096,
            },
        ):
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content
    except Exception as e:
        logger.error("Erreur stream Ollama (task=%s) : %s", task, e)
        yield f"\n\n⚠️ Erreur de génération : {str(e)}"


def check_model_available() -> bool:
    """Vérifie si au moins un modèle compatible est disponible dans Ollama."""
    return get_active_model() is not None
