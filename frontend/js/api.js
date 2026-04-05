/* ══════════════════════════════════════════════
   api.js — Campus AI API Client
   Calls FastAPI backend on same origin (port 8000)
   ══════════════════════════════════════════════ */

const API_BASE = window.location.origin;   // http://localhost:8000
const QUERY_TIMEOUT = 120_000;             // 2 min — tolérant pour modèle local

/**
 * POST /query — Appelle le modèle IA local
 * @param {Object} payload - { student_id, task, question?, context?, content? }
 * @returns {Promise<Object>} - { answer, latency_ms, mode, success }
 */
async function apiQuery(payload) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Erreur ${res.status} : ${errText.slice(0, 120)}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(tid);
    if (err.name === 'AbortError') {
      throw new Error('⏱️ Timeout — le modèle est trop lent. Relancez ou vérifiez Ollama.');
    }
    throw err;
  }
}

/**
 * GET /health — Vérifie l'état du serveur et du modèle
 * @returns {Promise<Object|null>} - { status, model, mode } ou null si hors ligne
 */
async function apiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * GET /stats — Récupère les métriques SQLite
 * @returns {Promise<Object|null>} - { total_queries, avg_latency_ms, by_task }
 */
async function apiStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
