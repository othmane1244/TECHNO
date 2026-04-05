const API_BASE = window.location.origin;
const QUERY_TIMEOUT = 120_000;

function isAuthErrorStatus(status) {
  return status === 401 || status === 403;
}

async function parseApiError(res) {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
  } catch {
    /* ignore */
  }
  const errText = await res.text().catch(() => res.statusText);
  return errText.slice(0, 160) || res.statusText;
}

function _makeApiError(status, message) {
  const err = new Error(`Erreur ${status} : ${message}`);
  err.status = status;
  err.isAuthError = status === 401;
  err.isForbidden = status === 403;
  err.isRateLimited = status === 429;
  return err;
}

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
      const message = await parseApiError(res);
      const errMessage = res.status === 429
        ? 'Trop de requêtes — attendez 1 minute avant de réessayer.'
        : message;
      throw _makeApiError(res.status, errMessage);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(tid);
    if (err.name === 'AbortError') {
      throw new Error('Timeout - le modele est trop lent. Relancez ou verifiez Ollama.');
    }
    throw err;
  }
}

async function apiStream(payload, onToken, onDone, controller) {
  const res = await fetch(`${API_BASE}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  if (!res.ok) {
    const message = await parseApiError(res);
    const errMessage = res.status === 429
      ? 'Trop de requêtes — attendez 1 minute avant de réessayer.'
      : message;
    throw _makeApiError(res.status, errMessage);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token !== undefined) onToken(data.token);
        if (data.done) onDone(data.latency_ms, data.mode || 'edge');
      } catch {
        /* ignore malformed */
      }
    }
  }
}

async function apiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function apiStats() {
  const res = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    const message = await parseApiError(res);
    throw _makeApiError(res.status, message);
  }
  return await res.json();
}

async function apiAuthMe() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const message = await parseApiError(res);
      return {
        _request_failed: true,
        status: res.status,
        message,
      };
    }
    return await res.json();
  } catch {
    return {
      _request_failed: true,
      status: 0,
      message: "Le serveur d'application est indisponible.",
    };
  }
}

async function apiPasswordLogin(payload) {
  const res = await fetch(`${API_BASE}/auth/login/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const message = await parseApiError(res);
    throw _makeApiError(res.status, message);
  }

  return await res.json();
}

function redirectToLogin(intent = 'user') {
  window.location.href = `${API_BASE}/auth/login?intent=${encodeURIComponent(intent)}`;
}

function redirectToLogout() {
  window.location.href = `${API_BASE}/auth/logout`;
}
