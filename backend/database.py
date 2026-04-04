import sqlite3
from pathlib import Path

# Chemin absolu vers campus.db — fonctionne peu importe le CWD de lancement
DB_PATH = str(Path(__file__).resolve().parent.parent / "data" / "campus.db")


def get_conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_conn()
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
    """)
    conn.commit()
    conn.close()


def log_interaction(student_hash: str, task: str, latency_ms: float, mode: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO interactions (student_hash, task, latency_ms, mode) VALUES (?,?,?,?)",
        (student_hash, task, latency_ms, mode),
    )
    conn.commit()
    conn.close()


def cache_summary(course_id: str, summary: str):
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO course_cache (course_id, summary) VALUES (?,?)",
        (course_id, summary),
    )
    conn.commit()
    conn.close()


def get_cached_summary(course_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT summary FROM course_cache WHERE course_id=?", (course_id,)
    ).fetchone()
    conn.close()
    return row[0] if row else None


def get_stats() -> dict:
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM interactions").fetchone()[0]
    avg_lat = conn.execute(
        "SELECT AVG(latency_ms) FROM interactions WHERE mode='edge'"
    ).fetchone()[0]
    by_task = conn.execute(
        "SELECT task, COUNT(*) FROM interactions GROUP BY task"
    ).fetchall()
    conn.close()
    return {
        "total_queries": total,
        "avg_latency_ms": round(avg_lat or 0, 1),
        "by_task": dict(by_task),
    }


# Initialisation automatique au premier import
init_db()
