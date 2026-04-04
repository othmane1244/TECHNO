# Architecture Campus AI — Edge Computing

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                      MACHINE LOCALE                      │
│                                                         │
│  ┌──────────────┐     HTTP      ┌───────────────────┐   │
│  │  Streamlit   │ ─────────────▶│   FastAPI         │   │
│  │  (port 8501) │               │   (port 8000)     │   │
│  │              │◀─────────────  │                   │   │
│  │  4 onglets : │    JSON        │  /health          │   │
│  │  • Résumé    │               │  /query           │   │
│  │  • Q&A       │               │  /stats           │   │
│  │  • Planning  │               └────────┬──────────┘   │
│  │  • Bien-être │                        │               │
│  └──────────────┘                        │ Python SDK    │
│                                          ▼               │
│                                 ┌────────────────┐       │
│                                 │   Ollama       │       │
│                                 │   (daemon)     │       │
│                                 │                │       │
│                                 │  Gemma 4 4B   │       │
│                                 │  (Q4_0, 5 Go) │       │
│                                 └────────────────┘       │
│                                          │               │
│                           ┌──────────────┴────────────┐  │
│                           │         SQLite            │  │
│                           │       campus.db           │  │
│                           │                           │  │
│                           │  • interactions           │  │
│                           │  • course_cache           │  │
│                           │  • model_versions         │  │
│                           └───────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
              ↕ (aucune donnée ne sort)
         Réseau campus / Internet
```

## Flux de traitement d'une requête

```
Étudiant
   │
   │ 1. Saisit sa question dans Streamlit
   ▼
frontend/app.py
   │
   │ 2. POST /query  { student_id, question, task }
   ▼
backend/main.py
   │
   ├── 3. validate_input()    → filtre injections de prompts
   ├── 4. anonymize()         → hash SHA-256 (16 chars)
   │
   │ 5. query_edge(task, ...)
   ▼
backend/model.py
   │
   │ 6. build_prompt()        → sélectionne le template
   │ 7. ollama.chat()         → appelle Gemma 4 en local
   ▼
Gemma 4 4B (Ollama)
   │
   │ 8. Génère la réponse (< 200 ms sur i7+RTX)
   ▼
backend/model.py  →  backend/main.py
   │
   ├── 9. log_interaction()   → stocke hash + latence dans SQLite
   │
   │ 10. Retourne { answer, latency_ms, mode }
   ▼
frontend/app.py   →  Étudiant
```

## Choix Edge vs Cloud

| Critère              | Edge (notre solution)  | Cloud                  |
|----------------------|------------------------|------------------------|
| Confidentialité      | ✓ Données sur le campus | ✗ Données externalisées |
| Latence              | ✓ ~80–180 ms           | ✗ 500–2000 ms (réseau) |
| Coût récurrent       | ✓ Nul (GPU local)      | ✗ Facturation à l'appel |
| Disponibilité offline| ✓ Fonctionne sans réseau| ✗ Dépend d'internet    |
| Mise à jour modèle   | Manuel (`ollama pull`) | ✓ Automatique           |
| Scalabilité          | Limitée (1 GPU)        | ✓ Élastique             |

## Sécurité & RGPD

- **Anonymisation** : aucun identifiant étudiant stocké en clair — SHA-256 tronqué à 16 caractères
- **Anti-injection** : liste de patterns bloqués (`ignore previous`, `jailbreak`, etc.)
- **Limite de taille** : entrées tronquées à 2 000 caractères
- **Isolation réseau** : aucune sortie réseau hors du campus
- **Pas de stockage de contenu** : seuls les métadonnées (tâche, latence, timestamp) sont loggées

## Stack technique

| Composant  | Technologie       | Version  |
|------------|-------------------|----------|
| Modèle IA  | Gemma 4 4B (Q4_0) | via Ollama 0.3 |
| API        | FastAPI + Uvicorn | 0.115 / 0.30 |
| Interface  | Streamlit         | 1.38     |
| Base de données | SQLite       | (stdlib) |
| Langage    | Python            | 3.11     |
