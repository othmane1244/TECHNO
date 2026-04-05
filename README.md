# Campus AI Edge — ELMA

Assistant pédagogique IA local pour campus universitaire.  
Toutes les données restent sur la machine — aucune donnée ne sort du campus.

---

## Aperçu

**ELMA** (Edge Learning & Mentoring Assistant) est un assistant IA edge-first conçu pour les étudiants de l'ENSA. Il tourne entièrement en local via [Ollama](https://ollama.ai) + Gemma 3 4B, avec une authentification institutionnelle Keycloak et une interface web moderne.

```
┌──────────────────────────────────────────────────────────┐
│                     MACHINE LOCALE                       │
│                                                          │
│   Navigateur          FastAPI          Ollama            │
│   (port 8000)  ──►  (port 8000)  ──►  Gemma 3 4B        │
│                          │                               │
│                       SQLite                             │
│                      campus.db                           │
└──────────────────────────────────────────────────────────┘
          ↕ aucune donnée ne sort du campus
```

---

## Fonctionnalités

| Mode | Description |
|---|---|
| **Q&A** | Répond aux questions pédagogiques de l'étudiant |
| **Résumé** | Génère un résumé structuré en 5 points clés d'un cours |
| **Planning** | Crée un planning de révision sur 7 jours |
| **Bien-être** | Détecte le niveau de stress et propose un conseil bienveillant |

- Streaming temps réel des réponses (SSE)
- Authentification Keycloak (OIDC + PKCE) avec email institutionnel
- Interface light / dark mode
- Rate limiting 30 req/min par IP
- Anonymisation SHA-256 des identifiants étudiants
- Filtrage prompt injection (unicode-aware)
- Module RGPD : consentements, demandes d'accès / suppression / rectification

---

## Stack technique

| Composant | Technologie |
|---|---|
| Modèle IA | Gemma 3 4B (Q4) via Ollama |
| API backend | FastAPI 0.115 + Uvicorn |
| Authentification | Keycloak OIDC + PyJWT |
| Base de données | SQLite (`data/campus.db`) |
| Rate limiting | slowapi |
| Interface web | HTML / CSS / JS vanilla |
| Interface admin | Streamlit |
| Langage | Python 3.11+ |

---

## Lancer le frontend

ELMA propose deux interfaces selon l'usage :

### Interface web principale (recommandée)

Servie automatiquement par FastAPI — **aucune commande supplémentaire**.  
Il suffit de lancer le backend :

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Puis ouvrir **http://localhost:8000** dans le navigateur.

> Le frontend HTML/CSS/JS est monté comme fichier statique via FastAPI.
> Authentification Keycloak, streaming SSE, thème light/dark — tout est inclus.

### Interface Streamlit (démo / développement)

Interface alternative en Python pur, sans authentification, pour tester rapidement le modèle :

```bash
# Dans un terminal séparé (le backend FastAPI doit déjà tourner sur :8000)
cd frontend
streamlit run app.py
```

Puis ouvrir **http://localhost:8501** dans le navigateur.

| | Interface web (`/`) | Interface Streamlit (`:8501`) |
|---|---|---|
| Auth Keycloak | ✅ | ❌ |
| Streaming SSE | ✅ | ❌ (requête bloquante) |
| Light / Dark mode | ✅ | ❌ |
| Stats admin | ✅ | ✅ (sidebar) |
| Usage recommandé | Production / démo | Développement rapide |

---

## Prérequis

- Python 3.11+
- [Ollama](https://ollama.ai) installé et démarré
- Keycloak (optionnel — l'app fonctionne sans SSO)

---

## Installation

```bash
# 1. Accéder au projet
cd TECHNO/TECHNO

# 2. Créer l'environnement virtuel
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Configurer l'environnement
cp .env.example .env
# → Modifier les valeurs dans .env (voir section Configuration)

# 5. Télécharger le modèle IA
ollama pull gemma3:4b

# 6. (Optionnel) Importer les données ENSA
python scripts/import_ensa_data.py

# 7. Lancer le serveur
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Ou via le script PowerShell :

```powershell
.\run_elma.ps1
```

Application disponible sur **http://localhost:8000**  
Documentation API sur **http://localhost:8000/docs**

---

## Configuration

Copier `.env.example` en `.env` et remplir :

```env
# Sécurité (générer avec : python -c "import secrets; print(secrets.token_hex(32))")
APP_SESSION_SECRET=votre-secret-fort-ici

# Modèle Ollama
CAMPUS_MODEL=gemma3:4b

# Keycloak SSO (laisser vide pour désactiver)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=EnsaAI
KEYCLOAK_CLIENT_ID=ensa-ia-app
KEYCLOAK_CLIENT_SECRET=votre-secret-client

# Rôles
KEYCLOAK_ADMIN_ROLE=elma-admin
KEYCLOAK_DPO_ROLE=elma-dpo

# Emails institutionnels autorisés
AUTH_ALLOWED_EMAIL_DOMAINS=usms.ac.ma,ensa.ac.ma
AUTH_REQUIRE_VERIFIED_EMAIL=true
```

> Pour la configuration Keycloak complète, voir [`docs/keycloak_setup.md`](docs/keycloak_setup.md).

---

## Rôles et accès

| Rôle Keycloak | Chatbot | Stats admin | RGPD / Logs |
|---|---|---|---|
| Étudiant authentifié | ✅ | ❌ | ses données uniquement |
| `elma-dpo` | ✅ | ❌ | ✅ complet |
| `elma-admin` | ✅ | ✅ | ✅ complet |

---

## Endpoints API

| Endpoint | Méthode | Auth | Description |
|---|---|---|---|
| `GET /` | GET | — | Interface web principale |
| `GET /health` | GET | — | Statut Ollama + auth |
| `POST /query` | POST | ✅ user | Requête IA (réponse complète) |
| `POST /stream` | POST | ✅ user | Requête IA (streaming SSE) |
| `GET /stats` | GET | ✅ admin | Statistiques d'usage |
| `GET /auth/me` | GET | — | Statut de session courante |
| `POST /auth/login/password` | POST | — | Connexion email + mot de passe |
| `GET /auth/login` | GET | — | Redirection OIDC Keycloak |
| `GET /auth/callback` | GET | — | Callback OIDC |
| `GET /auth/logout` | GET | — | Déconnexion |
| `GET /docs` | GET | — | Documentation Swagger |

---

## Structure du projet

```
TECHNO/TECHNO/
├── backend/
│   ├── main.py          # Entrée FastAPI, routes, rate limiting
│   ├── auth.py          # OIDC Keycloak, sessions SQLite, rôles
│   ├── database.py      # Schéma SQLite, helpers, tables ENSA
│   ├── model.py         # Ollama, cache modèle, fallback dégradé
│   ├── security.py      # Filtrage prompt injection, anonymisation
│   └── prompts.py       # Templates Q&A / résumé / planning / stress
├── frontend/
│   ├── index.html       # Shell HTML principal
│   ├── js/app.js        # Logique UI, état, navigation
│   ├── js/api.js        # Client API fetch avec gestion d'erreurs
│   └── css/style.css    # Design system light/dark
├── data/
│   ├── campus.db        # Base SQLite (créée automatiquement)
│   └── seed_ensa.sql    # Données ENSA (33 users, queries, RGPD)
├── docs/
│   ├── architecture.md  # Diagrammes et choix techniques
│   ├── keycloak_setup.md # Guide configuration SSO complet
│   ├── design_prompt.md # Brief UX/UI
│   └── risques.md       # Analyse des risques
├── scripts/
│   └── import_ensa_data.py # Import des données ENSA dans campus.db
├── tests/
│   └── test_api.py      # Benchmarks de latence
├── .env                 # Variables d'environnement (ne pas commiter)
├── .env.example         # Template .env
├── requirements.txt
└── run_elma.ps1         # Script de démarrage Windows
```

---

## Sécurité & RGPD

- **Anonymisation** : identifiants étudiants jamais stockés en clair (SHA-256 tronqué)
- **Prompt injection** : filtrage unicode-aware sur 16 patterns (homoglyphes inclus)
- **Rate limiting** : 30 req/min par IP sur `/query` et `/stream`
- **Thread safety** : cache OIDC protégé par `threading.Lock`
- **Sessions** : stockées en SQLite, TTL 12h, refresh automatique
- **Soft delete RGPD** : `is_deleted=True` anonymise l'email sans supprimer l'audit trail
- **Edge-only** : aucune donnée ne quitte la machine du campus

---

## Performances

| Métrique | Valeur typique |
|---|---|
| Latence Q&A (i7 + GPU) | 80 – 180 ms |
| Latence Q&A (CPU seul) | 2 000 – 8 000 ms |
| Taille modèle (Q4) | ~2,5 Go RAM |
| Tokens max par réponse | 512 |
| Taille max input | 2 000 caractères |

---

## Documentation

| Fichier | Contenu |
|---|---|
| [`docs/keycloak_setup.md`](docs/keycloak_setup.md) | Guide complet Keycloak OIDC |
| [`docs/architecture.md`](docs/architecture.md) | Architecture edge, flux de données |
| [`docs/risques.md`](docs/risques.md) | Analyse des risques |
| [`http://localhost:8000/docs`](http://localhost:8000/docs) | Documentation Swagger interactive |

---

## Dépannage

| Symptôme | Solution |
|---|---|
| `degraded` dans `/health` | Lancer Ollama : `ollama serve` puis `ollama pull gemma3:4b` |
| `503 Keycloak non configuré` | Vérifier `KEYCLOAK_SERVER_URL` dans `.env` |
| `503 Activez Direct Access Grants` | Keycloak → Client `ensa-ia-app` → Settings → activer |
| `403 email institutionnel requis` | Ajouter le domaine dans `AUTH_ALLOWED_EMAIL_DOMAINS` |
| Warning `APP_SESSION_SECRET` au démarrage | Changer la valeur par défaut dans `.env` |
| `429 Too Many Requests` | Attendre 1 minute (limite 30 req/min) |
