# Guide de configuration — Campus AI Edge (ENSA)

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | Python 3.11+ / FastAPI |
| Auth locale | Starlette SessionMiddleware + PyJWT |
| Auth SSO | Keycloak (OpenID Connect, PKCE) |
| BDD sessions | SQLite — `data/campus.db` |
| Rate limiting | slowapi |

---

## 1. Structure du projet

```
TECHNO/TECHNO/
├── backend/
│   ├── main.py          # Entrée FastAPI + routes API
│   ├── auth.py          # OIDC Keycloak, sessions, rôles
│   ├── database.py      # Schéma SQLite + helpers
│   ├── model.py         # Ollama / inférence locale
│   ├── security.py      # Filtrage prompt injection
│   └── prompts.py       # Templates de prompts
├── frontend/
│   ├── index.html
│   ├── js/app.js
│   ├── js/api.js
│   └── css/style.css
├── data/
│   └── campus.db        # Créé automatiquement au démarrage
├── docs/
├── scripts/
│   └── import_ensa_data.py
├── .env.example         # Template des variables d'environnement
└── requirements.txt
```

---

## 2. Variables d'environnement

Copier `.env.example` en `.env` et remplir :

```env
# Sécurité session (OBLIGATOIRE en production)
APP_SESSION_SECRET=change_this_to_a_random_secret_key_64_chars

# Modèle Ollama
CAMPUS_MODEL=gemma3:4b

# Keycloak SSO (laisser vide pour désactiver)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=ensa
KEYCLOAK_CLIENT_ID=elma-web
KEYCLOAK_CLIENT_SECRET=

# Rôles (noms des rôles realm Keycloak)
KEYCLOAK_ADMIN_ROLE=elma-admin
KEYCLOAK_DPO_ROLE=elma-dpo

# Contraintes email institutionnel
AUTH_ALLOWED_EMAIL_DOMAINS=usms.ac.ma,ensa.ac.ma
AUTH_REQUIRE_VERIFIED_EMAIL=true
```

> **Important :** `APP_SESSION_SECRET` doit être un token aléatoire fort.
> Générer avec :
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

> **Note :** Si `KEYCLOAK_SERVER_URL` est vide, l'application démarre en mode
> dégradé sans authentification SSO — utile pour tester en local sans Keycloak.

---

## 3. Installation et démarrage

```bash
# 1. Cloner / accéder au projet
cd TECHNO/TECHNO

# 2. Créer l'environnement virtuel
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / Mac

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Configurer l'environnement
cp .env.example .env
# → Modifier les valeurs dans .env

# 5. (Optionnel) Importer les données ENSA
python scripts/import_ensa_data.py

# 6. Lancer le serveur FastAPI
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# → Application disponible sur http://localhost:8000
# → Documentation API sur http://localhost:8000/docs
```

---

## 4. Configuration du client Keycloak

Dans la console d'administration Keycloak (`http://localhost:8080/admin`) :

### 4.1 Créer le realm

- Nom : `ensa`
- Activé : oui

### 4.2 Créer le client OpenID Connect

| Paramètre | Valeur |
|---|---|
| Type | OpenID Connect |
| Client ID | `elma-web` |
| Standard Flow | ✅ activé |
| Direct Access Grants | ✅ activé (pour connexion email/mot de passe) |
| PKCE Method | `S256` (recommandé) |
| Client Authentication | selon besoin (secret optionnel) |

**Valid Redirect URIs :**
```
http://localhost:8000/auth/callback
http://127.0.0.1:8000/auth/callback
```

**Valid Post Logout Redirect URIs :**
```
http://localhost:8000/
http://127.0.0.1:8000/
```

**Web Origins :**
```
http://localhost:8000
http://127.0.0.1:8000
```

### 4.3 Créer les rôles realm

| Rôle | Variable | Accès |
|---|---|---|
| `elma-admin` | `KEYCLOAK_ADMIN_ROLE` | Dashboard complet, stats, gestion users |
| `elma-dpo` | `KEYCLOAK_DPO_ROLE` | Logs d'audit, demandes RGPD |
| *(aucun rôle)* | — | Chatbot IA, ses propres données |

> **Pour créer un rôle :** Realm → Realm roles → Create role

### 4.4 Configurer le mapper de rôles

Pour que les rôles apparaissent dans le JWT :

1. Client `elma-web` → Client scopes → `roles` → Add mapper
2. Mapper type : **User Realm Role**
3. Token Claim Name : `realm_access.roles`
4. Inclure dans access token : ✅

### 4.5 Configurer l'email comme identifiant

- Realm settings → Login → **Email as username** : activé
- Realm settings → Login → **Verify email** : activé (si `AUTH_REQUIRE_VERIFIED_EMAIL=true`)

---

## 5. Comptes Keycloak à créer

> **Note :** Les comptes ci-dessous doivent être créés dans Keycloak
> (Users → Create user) avec les rôles assignés dans l'onglet **Role mapping**.

| Username | Email | Rôle | Accès |
|---|---|---|---|
| `admin` | `admin@ensa.ac.ma` | `elma-admin` | Tout |
| `dpo` | `dpo@ensa.ac.ma` | `elma-dpo` | RGPD, logs |
| `etudiant1` | `etudiant1@usms.ac.ma` | *(aucun)* | Chatbot uniquement |

Pour chaque compte :
1. Users → Create user → remplir email + username
2. Credentials → Set password (décocher "Temporary")
3. Role mapping → Assign role

---

## 6. Rôles et accès

| Rôle | `/query` `/stream` | `/stats` | `is_admin` | `is_dpo` |
|---|---|---|---|---|
| Authentifié (user) | ✅ | ❌ | `false` | `false` |
| `elma-dpo` | ✅ | ❌ | `false` | `true` |
| `elma-admin` | ✅ | ✅ | `true` | `false` |

> Le champ `is_dpo` est disponible dans le payload renvoyé par `/auth/me`
> pour que le frontend puisse afficher les onglets RGPD / audit.

---

## 7. Flux d'authentification

L'application utilise **Direct Access Grants** (email + mot de passe) :

```
Frontend          FastAPI          Keycloak
   │                  │                 │
   │ POST /auth/login/password          │
   │─────────────────►│                 │
   │                  │ POST /token     │
   │                  │ (grant_type=    │
   │                  │  password)      │
   │                  │────────────────►│
   │                  │◄────────────────│
   │                  │  access_token   │
   │                  │  + id_token     │
   │                  │  + refresh_token│
   │                  │                 │
   │                  │ Vérifie JWT     │
   │                  │ (PyJWT + JWKS)  │
   │                  │ Stocke session  │
   │                  │ SQLite          │
   │◄─────────────────│                 │
   │  { authenticated: true, user: {…} }│
```

Endpoints auth disponibles :

| Endpoint | Méthode | Description |
|---|---|---|
| `/auth/me` | GET | Statut de la session courante |
| `/auth/login/password` | POST | Connexion email + mot de passe |
| `/auth/login` | GET | Redirection OIDC (flow navigateur) |
| `/auth/callback` | GET | Callback OIDC après Keycloak |
| `/auth/logout` | GET | Déconnexion + invalidation session |

---

## 8. Contraintes email institutionnel

- `AUTH_ALLOWED_EMAIL_DOMAINS=usms.ac.ma,ensa.ac.ma` → seuls ces domaines sont acceptés
- Le domaine est vérifié côté backend dans `validate_institutional_email()`
- Si la liste est vide, tout email est accepté (déconseillé en production)
- `AUTH_REQUIRE_VERIFIED_EMAIL=true` → Keycloak doit marquer l'email comme vérifié

---

## 9. Session et sécurité

- Sessions stockées dans `data/campus.db` (table `auth_sessions`)
- Durée max : 12 heures (`max_age` dans SessionMiddleware)
- Refresh automatique 30 secondes avant expiration du token
- Purge des sessions expirées à chaque lecture/écriture de session
- Cookie : `elma_session`, `SameSite=lax`
- Rate limiting : 30 requêtes/minute par IP sur `/query` et `/stream`

---

## 10. Points d'attention

| Point | Détail |
|---|---|
| `data/campus.db` | Créé automatiquement au démarrage — ne pas supprimer en prod |
| Tables ENSA | Créées par `init_db()` — pas besoin de migrations Alembic |
| Keycloak optionnel | App fonctionne sans SSO si `KEYCLOAK_SERVER_URL` est vide |
| `is_deleted=True` | Soft delete RGPD — email anonymisé, enregistrement conservé |
| Direct Access Grants | Doit être activé sur le client Keycloak pour login email/mdp |
| PKCE S256 | Recommandé — activé par défaut dans le client Keycloak |
| `APP_SESSION_SECRET` | Un warning est loggé au démarrage si la valeur par défaut est utilisée |

---

## 11. Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| `503 Keycloak n'est pas configure` | Variable `KEYCLOAK_SERVER_URL` absente | Vérifier le `.env` |
| `401 Echec de l'echange Keycloak` | `KEYCLOAK_CLIENT_SECRET` incorrect | Vérifier dans Keycloak → Credentials |
| `503 Activez Direct Access Grants` | Option désactivée sur le client | Keycloak → Client → Settings → activer |
| `403 email institutionnel requis` | Domaine non autorisé | Ajouter le domaine dans `AUTH_ALLOWED_EMAIL_DOMAINS` |
| `401 Nonce OIDC invalide` | Session corrompue | Vider les cookies et réessayer |
| `degraded` dans `/health` | Ollama non démarré | `ollama serve` puis `ollama pull gemma3:4b` |
