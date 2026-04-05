import base64
import hashlib
import logging
import os
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import jwt
import requests
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from jwt import PyJWKClient

from database import delete_auth_session, get_auth_session, save_auth_session

logger = logging.getLogger("auth")

SESSION_KEY = "elma_session_id"
AUTH_CACHE_TTL = 300
AUTH_ALGORITHMS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"]

_cached_openid: dict[str, Any] | None = None
_cached_openid_at = 0.0
_cached_jwks: PyJWKClient | None = None
_cache_lock = threading.Lock()


@dataclass(frozen=True)
class AuthSettings:
    server_url: str = os.getenv("KEYCLOAK_SERVER_URL", "").rstrip("/")
    realm: str = os.getenv("KEYCLOAK_REALM", "").strip()
    client_id: str = os.getenv("KEYCLOAK_CLIENT_ID", "").strip()
    client_secret: str = os.getenv("KEYCLOAK_CLIENT_SECRET", "").strip()
    admin_role: str = os.getenv("KEYCLOAK_ADMIN_ROLE", "elma-admin").strip()
    dpo_role: str = os.getenv("KEYCLOAK_DPO_ROLE", "elma-dpo").strip()
    scopes: str = os.getenv("KEYCLOAK_SCOPES", "openid profile email roles").strip()
    post_logout_path: str = os.getenv("KEYCLOAK_POST_LOGOUT_PATH", "/").strip() or "/"
    allowed_email_domains_raw: str = os.getenv("AUTH_ALLOWED_EMAIL_DOMAINS", "").strip()
    require_verified_email_raw: str = os.getenv("AUTH_REQUIRE_VERIFIED_EMAIL", "true").strip().lower()

    @property
    def enabled(self) -> bool:
        return bool(self.server_url and self.realm and self.client_id)

    @property
    def issuer_base(self) -> str:
        return f"{self.server_url}/realms/{self.realm}"

    @property
    def openid_configuration_url(self) -> str:
        return f"{self.issuer_base}/.well-known/openid-configuration"

    @property
    def allowed_email_domains(self) -> list[str]:
        return [domain.strip().lower().lstrip("@") for domain in self.allowed_email_domains_raw.split(",") if domain.strip()]

    @property
    def require_verified_email(self) -> bool:
        return self.require_verified_email_raw not in {"0", "false", "no", "off"}

    @property
    def password_login_ready(self) -> bool:
        return self.enabled and bool(self.allowed_email_domains)


def get_auth_settings() -> AuthSettings:
    return AuthSettings()


def get_session_secret() -> str:
    secret = os.getenv("APP_SESSION_SECRET", "elma-dev-session-secret-change-me")
    if secret == "elma-dev-session-secret-change-me":
        logger.warning(
            "APP_SESSION_SECRET non défini — utilisez un secret fort en production. "
            "Exemple : export APP_SESSION_SECRET=$(python -c 'import secrets; print(secrets.token_hex(32))')"
        )
    return secret


def _format_allowed_domains(domains: list[str]) -> str:
    return ", ".join(f"@{domain}" for domain in domains)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_institutional_email(email: str, *, require_domain_ready: bool = True) -> str:
    settings = get_auth_settings()
    cleaned = _normalize_email(email)
    if not cleaned or "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
        raise HTTPException(status_code=400, detail="Saisissez un email institutionnel valide.")

    domains = settings.allowed_email_domains
    if require_domain_ready and not domains:
        raise HTTPException(
            status_code=503,
            detail="Configurez AUTH_ALLOWED_EMAIL_DOMAINS pour imposer les emails institutionnels.",
        )

    if domains:
        email_domain = cleaned.rsplit("@", 1)[1]
        if email_domain not in domains:
            raise HTTPException(
                status_code=400,
                detail=f"Utilisez votre email institutionnel ({_format_allowed_domains(domains)}).",
            )

    return cleaned


def get_openid_configuration(force: bool = False) -> dict[str, Any]:
    global _cached_openid, _cached_openid_at, _cached_jwks
    settings = get_auth_settings()
    if not settings.enabled:
        raise RuntimeError("Keycloak n'est pas configure.")

    now = time.time()
    if not force and _cached_openid and (now - _cached_openid_at) < AUTH_CACHE_TTL:
        return _cached_openid

    with _cache_lock:
        # Double-check après acquisition du lock (un autre thread a peut-être déjà rafraîchi)
        if not force and _cached_openid and (now - _cached_openid_at) < AUTH_CACHE_TTL:
            return _cached_openid
        response = requests.get(settings.openid_configuration_url, timeout=5)
        response.raise_for_status()
        _cached_openid = response.json()
        _cached_openid_at = now
        _cached_jwks = PyJWKClient(_cached_openid["jwks_uri"])
        logger.debug("Configuration OpenID rechargée depuis Keycloak")
    return _cached_openid


def get_jwks_client() -> PyJWKClient:
    global _cached_jwks
    if _cached_jwks is None:
        get_openid_configuration(force=True)
    return _cached_jwks


def build_absolute_url(request: Request, path: str) -> str:
    base = str(request.base_url).rstrip("/")
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def build_pkce_pair() -> tuple[str, str]:
    verifier = _b64url(secrets.token_bytes(64))
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    return verifier, challenge


def build_login_redirect(request: Request, intent: str = "user") -> RedirectResponse:
    settings = get_auth_settings()
    if not settings.enabled:
        raise HTTPException(status_code=503, detail="Keycloak n'est pas configure.")

    config = get_openid_configuration()
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)
    verifier, challenge = build_pkce_pair()

    request.session["oidc_state"] = state
    request.session["oidc_nonce"] = nonce
    request.session["oidc_verifier"] = verifier
    request.session["oidc_intent"] = intent

    params = {
        "client_id": settings.client_id,
        "response_type": "code",
        "redirect_uri": build_absolute_url(request, "/auth/callback"),
        "scope": settings.scopes,
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return RedirectResponse(url=f"{config['authorization_endpoint']}?{urlencode(params)}", status_code=302)


def _token_payload_from_response(
    token_data: dict[str, Any],
    nonce: str | None = None,
    login_email: str | None = None,
    session_kind: str = "browser",
) -> dict[str, Any]:
    settings = get_auth_settings()
    config = get_openid_configuration()
    jwks_client = get_jwks_client()

    id_token = token_data["id_token"]
    access_token = token_data["access_token"]

    id_key = jwks_client.get_signing_key_from_jwt(id_token).key
    access_key = jwks_client.get_signing_key_from_jwt(access_token).key

    id_claims = jwt.decode(
        id_token,
        id_key,
        algorithms=AUTH_ALGORITHMS,
        audience=settings.client_id,
        issuer=config["issuer"],
    )
    if nonce and id_claims.get("nonce") != nonce:
        raise HTTPException(status_code=401, detail="Nonce OIDC invalide.")

    access_claims = jwt.decode(
        access_token,
        access_key,
        algorithms=AUTH_ALGORITHMS,
        issuer=config["issuer"],
        options={"verify_aud": False},
    )

    roles = extract_roles(access_claims)
    preferred_username = id_claims.get("preferred_username") or id_claims.get("email") or id_claims.get("sub", "")
    display_name = id_claims.get("name") or preferred_username or "Utilisateur"
    resolved_email = _normalize_email(
        id_claims.get("email")
        or (preferred_username if "@" in preferred_username else "")
        or login_email
        or ""
    )
    if not resolved_email:
        raise HTTPException(status_code=403, detail="Aucun email institutionnel n'a ete retourne par Keycloak.")

    validate_institutional_email(resolved_email, require_domain_ready=False)
    if settings.allowed_email_domains:
        validate_institutional_email(resolved_email, require_domain_ready=True)
    if settings.require_verified_email and not id_claims.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Votre email institutionnel doit etre verifie dans Keycloak.")

    student_id = (
        id_claims.get("student_id")
        or access_claims.get("student_id")
        or preferred_username
        or id_claims.get("sub", "")[:12]
    )

    now = int(time.time())
    expires_at = now + int(token_data.get("expires_in", 0))
    refresh_expires_at = now + int(token_data.get("refresh_expires_in", token_data.get("expires_in", 0)))

    return {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token", ""),
        "id_token": id_token,
        "expires_at": expires_at,
        "refresh_expires_at": refresh_expires_at,
        "session_kind": session_kind,
        "user": {
            "sub": id_claims.get("sub", ""),
            "name": display_name,
            "email": resolved_email,
            "email_verified": bool(id_claims.get("email_verified", False)),
            "username": preferred_username,
            "student_id": student_id,
            "roles": roles,
            "is_admin": settings.admin_role in roles,
            "is_dpo": settings.dpo_role in roles,
        },
    }


def exchange_code_for_tokens(request: Request, code: str, nonce: str) -> dict[str, Any]:
    settings = get_auth_settings()
    config = get_openid_configuration()

    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.client_id,
        "code": code,
        "redirect_uri": build_absolute_url(request, "/auth/callback"),
        "code_verifier": request.session.get("oidc_verifier", ""),
    }
    if settings.client_secret:
        payload["client_secret"] = settings.client_secret

    response = requests.post(config["token_endpoint"], data=payload, timeout=8)
    if not response.ok:
        raise HTTPException(status_code=401, detail="Echec de l'echange Keycloak.")
    return _token_payload_from_response(response.json(), nonce=nonce, session_kind="browser")


def _raise_direct_grant_error(response: requests.Response) -> None:
    try:
        data = response.json()
    except ValueError:
        data = {}

    error_code = str(data.get("error", "")).strip().lower()
    error_description = str(data.get("error_description", "")).strip().lower()

    if error_code in {"invalid_grant", "access_denied"}:
        raise HTTPException(status_code=401, detail="Email institutionnel ou mot de passe invalide.")

    if error_code in {"unauthorized_client", "unsupported_grant_type"} or "direct access grants" in error_description:
        raise HTTPException(
            status_code=503,
            detail="Activez Direct Access Grants sur le client Keycloak pour la connexion email/mot de passe.",
        )

    raise HTTPException(status_code=401, detail="Echec de l'authentification Keycloak.")


def _persist_auth_session(request: Request, payload: dict[str, Any]) -> None:
    previous_session_id = request.session.get(SESSION_KEY)
    if previous_session_id:
        delete_auth_session(previous_session_id)

    session_id = secrets.token_urlsafe(32)
    save_auth_session(session_id, payload)
    request.session[SESSION_KEY] = session_id


def authenticate_password_login(request: Request, email: str, password: str, intent: str = "user") -> dict[str, Any]:
    settings = get_auth_settings()
    if not settings.enabled:
        raise HTTPException(status_code=503, detail="Keycloak n'est pas configure.")
    if not settings.password_login_ready:
        raise HTTPException(
            status_code=503,
            detail="Configurez AUTH_ALLOWED_EMAIL_DOMAINS pour limiter la connexion aux emails institutionnels.",
        )

    login_email = validate_institutional_email(email)
    if not password:
        raise HTTPException(status_code=400, detail="Saisissez votre mot de passe.")

    config = get_openid_configuration()
    form = {
        "grant_type": "password",
        "client_id": settings.client_id,
        "username": login_email,
        "password": password,
        "scope": settings.scopes,
    }
    if settings.client_secret:
        form["client_secret"] = settings.client_secret

    response = requests.post(config["token_endpoint"], data=form, timeout=8)
    if not response.ok:
        _raise_direct_grant_error(response)

    payload = _token_payload_from_response(response.json(), login_email=login_email, session_kind="password")
    _persist_auth_session(request, payload)

    status = build_auth_status(request)
    status["warning"] = "admin-denied" if intent == "admin" and not payload["user"]["is_admin"] else None
    return status


def refresh_session_payload(session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    refresh_token = payload.get("refresh_token")
    refresh_expires_at = int(payload.get("refresh_expires_at", 0))
    now = int(time.time())

    if not refresh_token or refresh_expires_at <= now:
        delete_auth_session(session_id)
        raise HTTPException(status_code=401, detail="Session expiree.")

    settings = get_auth_settings()
    config = get_openid_configuration()
    form = {
        "grant_type": "refresh_token",
        "client_id": settings.client_id,
        "refresh_token": refresh_token,
    }
    if settings.client_secret:
        form["client_secret"] = settings.client_secret

    response = requests.post(config["token_endpoint"], data=form, timeout=8)
    if not response.ok:
        delete_auth_session(session_id)
        raise HTTPException(status_code=401, detail="Impossible de rafraichir la session.")

    refreshed = _token_payload_from_response(
        response.json(),
        session_kind=str(payload.get("session_kind", "password") or "password"),
    )
    save_auth_session(session_id, refreshed)
    return refreshed


def extract_roles(access_claims: dict[str, Any]) -> list[str]:
    roles: set[str] = set(access_claims.get("realm_access", {}).get("roles", []))
    for _, resource_data in access_claims.get("resource_access", {}).items():
        roles.update(resource_data.get("roles", []))
    return sorted(roles)


def get_current_payload(request: Request, allow_missing: bool = False) -> dict[str, Any] | None:
    settings = get_auth_settings()
    if not settings.enabled:
        if allow_missing:
            return None
        raise HTTPException(status_code=503, detail="Keycloak n'est pas configure.")

    session_id = request.session.get(SESSION_KEY)
    if not session_id:
        if allow_missing:
            return None
        raise HTTPException(status_code=401, detail="Authentification requise.")

    payload = get_auth_session(session_id)
    if not payload:
        request.session.pop(SESSION_KEY, None)
        if allow_missing:
            return None
        raise HTTPException(status_code=401, detail="Session introuvable.")

    expires_at = int(payload.get("expires_at", 0))
    now = int(time.time())
    if expires_at <= now + 30:
        payload = refresh_session_payload(session_id, payload)

    return payload


def require_authenticated_user(request: Request) -> dict[str, Any]:
    payload = get_current_payload(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentification requise.")
    return payload


def require_admin_user(request: Request) -> dict[str, Any]:
    payload = require_authenticated_user(request)
    if not payload.get("user", {}).get("is_admin"):
        raise HTTPException(status_code=403, detail="Role admin requis.")
    return payload


def build_auth_status(request: Request) -> dict[str, Any]:
    settings = get_auth_settings()
    if not settings.enabled:
        return {
            "enabled": False,
            "authenticated": False,
            "user": None,
            "login_url": "/auth/login/password",
            "logout_url": None,
            "admin_role": settings.admin_role,
            "login_method": "password",
            "allowed_email_domains": settings.allowed_email_domains,
            "password_login_ready": False,
            "message": "Keycloak n'est pas configure.",
        }

    payload = get_current_payload(request, allow_missing=True)
    if not payload:
        return {
            "enabled": True,
            "authenticated": False,
            "user": None,
            "login_url": "/auth/login/password",
            "logout_url": "/auth/logout",
            "admin_role": settings.admin_role,
            "login_method": "password",
            "allowed_email_domains": settings.allowed_email_domains,
            "password_login_ready": settings.password_login_ready,
            "message": None if settings.password_login_ready else "AUTH_ALLOWED_EMAIL_DOMAINS est requis pour imposer l'email institutionnel.",
        }

    return {
        "enabled": True,
        "authenticated": True,
        "user": payload["user"],
        "login_url": "/auth/login/password",
        "logout_url": "/auth/logout",
        "admin_role": settings.admin_role,
        "login_method": "password",
        "allowed_email_domains": settings.allowed_email_domains,
        "password_login_ready": settings.password_login_ready,
        "message": None,
    }


def handle_callback(request: Request, code: str = "", state: str = "", error: str = "") -> RedirectResponse:
    if error:
        return RedirectResponse(url="/?auth=error", status_code=302)

    expected_state = request.session.get("oidc_state", "")
    nonce = request.session.get("oidc_nonce", "")
    if not code or not state or state != expected_state:
        return RedirectResponse(url="/?auth=state-error", status_code=302)

    payload = exchange_code_for_tokens(request, code=code, nonce=nonce)
    intent = request.session.get("oidc_intent", "user")
    _persist_auth_session(request, payload)

    request.session.pop("oidc_state", None)
    request.session.pop("oidc_nonce", None)
    request.session.pop("oidc_verifier", None)
    request.session.pop("oidc_intent", None)

    if intent == "admin" and not payload["user"]["is_admin"]:
        return RedirectResponse(url="/?auth=admin-denied&role=user", status_code=302)
    if payload["user"]["is_admin"]:
        return RedirectResponse(url="/?auth=success&role=admin", status_code=302)
    return RedirectResponse(url="/?auth=success&role=user", status_code=302)


def build_logout_response(request: Request) -> RedirectResponse:
    settings = get_auth_settings()
    payload = get_current_payload(request, allow_missing=True)
    session_id = request.session.get(SESSION_KEY)
    post_logout_redirect_uri = build_absolute_url(request, settings.post_logout_path if settings.enabled else "/")

    if session_id:
        delete_auth_session(session_id)
    request.session.clear()

    if not settings.enabled:
        return RedirectResponse(url=post_logout_redirect_uri, status_code=302)

    if payload and payload.get("session_kind") == "password":
        return RedirectResponse(url=post_logout_redirect_uri, status_code=302)

    config = get_openid_configuration()
    params = {"post_logout_redirect_uri": post_logout_redirect_uri, "client_id": settings.client_id}
    if payload and payload.get("id_token"):
        params["id_token_hint"] = payload["id_token"]

    end_session_endpoint = config.get("end_session_endpoint")
    if not end_session_endpoint:
        return RedirectResponse(url=post_logout_redirect_uri, status_code=302)

    return RedirectResponse(url=f"{end_session_endpoint}?{urlencode(params)}", status_code=302)
