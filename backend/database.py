import json
import sqlite3
import time
from pathlib import Path

# Chemin absolu vers campus.db — fonctionne peu importe le CWD de lancement
DB_PATH = str(Path(__file__).resolve().parent.parent / "data" / "campus.db")

# Créer le dossier data/ s'il n'existe pas
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS interactions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            student_hash TEXT NOT NULL,
            task         TEXT NOT NULL,
            latency_ms   REAL,
            mode         TEXT,
            timestamp    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS course_cache (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id    TEXT UNIQUE NOT NULL,
            summary      TEXT,
            updated_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS model_versions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            version      TEXT,
            installed_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS auth_sessions (
            session_id   TEXT PRIMARY KEY,
            user_sub     TEXT,
            payload      TEXT NOT NULL,
            expires_at   INTEGER NOT NULL,
            created_at   TEXT DEFAULT (datetime('now')),
            updated_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_interactions_task    ON interactions(task);
        CREATE INDEX IF NOT EXISTS idx_interactions_mode    ON interactions(mode);
        CREATE INDEX IF NOT EXISTS idx_interactions_student ON interactions(student_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_user        ON auth_sessions(user_sub);

        -- ══════════════════════════════════════════════════════
        --  Module IA Responsable ENSA — Système éthique & RGPD
        -- ══════════════════════════════════════════════════════

        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            keycloak_id   TEXT UNIQUE,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role          TEXT DEFAULT 'user',
            created_at    TEXT NOT NULL,
            last_login    TEXT,
            ia_disabled   INTEGER DEFAULT 0,
            is_deleted    INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS ensa_queries (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            question   TEXT NOT NULL,
            response   TEXT NOT NULL,
            timestamp  TEXT NOT NULL,
            is_flagged INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id         TEXT PRIMARY KEY,
            user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
            action     TEXT NOT NULL,
            details    TEXT DEFAULT '',
            ip_address TEXT DEFAULT '',
            timestamp  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS consent_records (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            consent_type TEXT NOT NULL,
            given_at     TEXT NOT NULL,
            withdrawn_at TEXT
        );

        CREATE TABLE IF NOT EXISTS rgpd_requests (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            request_type TEXT NOT NULL,
            status       TEXT DEFAULT 'pending',
            created_at   TEXT NOT NULL,
            processed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
        CREATE INDEX IF NOT EXISTS idx_ensa_queries_user  ON ensa_queries(user_id);
        CREATE INDEX IF NOT EXISTS idx_ensa_queries_flag  ON ensa_queries(is_flagged);
        CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_action       ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_consent_user       ON consent_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_rgpd_user          ON rgpd_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_rgpd_status        ON rgpd_requests(status);
        """)


def log_interaction(student_hash: str, task: str, latency_ms: float, mode: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO interactions (student_hash, task, latency_ms, mode) VALUES (?,?,?,?)",
            (student_hash, task, latency_ms, mode),
        )


def cache_summary(course_id: str, summary: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO course_cache (course_id, summary) VALUES (?,?)",
            (course_id, summary),
        )


def get_cached_summary(course_id: str):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT summary FROM course_cache WHERE course_id=?", (course_id,)
        ).fetchone()
    return row[0] if row else None


def get_stats() -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        # Une seule requête pour total + latence moyenne
        agg = conn.execute(
            "SELECT COUNT(*) as total, AVG(CASE WHEN mode='edge' THEN latency_ms END) as avg_lat "
            "FROM interactions"
        ).fetchone()
        by_task = conn.execute(
            "SELECT task, COUNT(*) FROM interactions GROUP BY task"
        ).fetchall()
    return {
        "total_queries": agg[0] or 0,
        "avg_latency_ms": round(agg[1] or 0, 1),
        "by_task": dict(by_task),
    }


def purge_expired_auth_sessions(now_ts: int | None = None):
    now_ts = now_ts or int(time.time())
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now_ts,))


def save_auth_session(session_id: str, payload: dict):
    purge_expired_auth_sessions()
    expires_at = int(payload.get("refresh_expires_at") or payload.get("expires_at") or (time.time() + 3600))
    user_sub = payload.get("user", {}).get("sub", "")
    serialized = json.dumps(payload)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO auth_sessions (session_id, user_sub, payload, expires_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(session_id) DO UPDATE SET
                user_sub = excluded.user_sub,
                payload = excluded.payload,
                expires_at = excluded.expires_at,
                updated_at = datetime('now')
            """,
            (session_id, user_sub, serialized, expires_at),
        )


def get_auth_session(session_id: str) -> dict | None:
    purge_expired_auth_sessions()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT payload FROM auth_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if not row:
        return None
    try:
        return json.loads(row[0])
    except json.JSONDecodeError:
        return None


def delete_auth_session(session_id: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM auth_sessions WHERE session_id = ?", (session_id,))
