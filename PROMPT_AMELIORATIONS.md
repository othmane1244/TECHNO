# Prompt d'amélioration — Campus AI Edge

## Contexte
FastAPI + Ollama (gemma3:4b) + Keycloak OIDC + SQLite + Frontend HTML/JS vanilla.
Edge computing mono-machine. 6 fichiers backend, 2 fichiers JS frontend.

## Améliorations à appliquer (dans l'ordre)

### 1. security.py
- Étendre `banned` : ajouter `"act as"`, `"you are now"`, `"pretend"`, `"roleplay"`, `"bypass"`, `"disregard"`, `"new instructions"`, `"[system]"`, `"###"` (séparateur de prompt injection), `"--"` (commentaire SQL-style)
- Normaliser unicode avant filtrage : `unicodedata.normalize("NFKC", text)` pour éviter contournements homoglyphes
- Retourner `""` si injection détectée (comportement actuel OK)

### 2. model.py
- Supprimer `sys.path.insert(0, os.path.dirname(__file__))` (inutile, même répertoire)
- Cacher `get_active_model()` : ajouter `_model_cache: str | None = None` et `_model_cache_at: float = 0.0`, TTL = 300s. Invalider le cache si le résultat était `None` (Ollama pas encore prêt)

### 3. database.py
- Ajouter dans `init_db()` après les CREATE TABLE :
  ```sql
  CREATE INDEX IF NOT EXISTS idx_interactions_task ON interactions(task);
  CREATE INDEX IF NOT EXISTS idx_interactions_mode ON interactions(mode);
  CREATE INDEX IF NOT EXISTS idx_interactions_student ON interactions(student_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_sub);
  ```
- Fusionner les 3 requêtes de `get_stats()` en une seule :
  ```sql
  SELECT COUNT(*) as total,
         AVG(CASE WHEN mode='edge' THEN latency_ms END) as avg_lat
  FROM interactions
  ```
  puis une seule requête GROUP BY pour `by_task`
- Supprimer l'appel `init_db()` en bas du fichier (appelé au startup de main.py)

### 4. auth.py
- Ajouter `import logging`, `import threading` en tête
- Ajouter `_cache_lock = threading.Lock()` après les globales
- Dans `get_openid_configuration()`, entourer la section de mise à jour du cache avec `with _cache_lock:`
- Dans `get_session_secret()`, si la valeur retournée est `"elma-dev-session-secret-change-me"`, logger un warning : `logging.getLogger("auth").warning("APP_SESSION_SECRET non défini — utilisez un secret fort en production")`

### 5. main.py
- Supprimer `sys.path.insert(0, os.path.dirname(__file__))` et `import sys`
- Ajouter après les imports : configuration du logger racine
  ```python
  import logging
  logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
  logger = logging.getLogger("main")
  ```
- Dans `FastAPI(...)`, ajouter `docs_url="/docs", redoc_url="/redoc"`
- Ajouter rate limiting avec `slowapi` :
  ```python
  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.util import get_remote_address
  from slowapi.errors import RateLimitExceeded
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  ```
  Décorer `/query` et `/stream` avec `@limiter.limit("30/minute")`
- Dans le `startup_event`, logger : `logger.info("Campus AI Edge démarré")`
- Logger les erreurs dans `/query` si `result["success"] == False`

### 6. requirements.txt
- Remplacer `>=` par `~=` (compatible release) sur toutes les lignes
- Ajouter `slowapi~=0.1.9`

### 7. frontend/js/api.js
- Dans `apiQuery` et `apiStream`, après le check `!res.ok`, gérer spécifiquement :
  - status 401 → throw avec `.isAuthError = true` pour que app.js redirige vers login
  - status 403 → throw avec `.isForbidden = true`
  - status 429 → throw avec message "Trop de requêtes — attendez 1 minute."
- Dans `apiStats`, même traitement 401/403

## Ordre d'application recommandé
security → model → database → auth → main → requirements → api.js
