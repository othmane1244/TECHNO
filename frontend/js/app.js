/* ══════════════════════════════════════════════════════════
   app.js — Campus AI · ELMA Main Application Logic
   ══════════════════════════════════════════════════════════ */

/* ─── Markdown renderer ─────────────────────────────────── */
function renderMD(text) {
  if (typeof marked !== 'undefined') {
    try { return marked.parse(text); } catch { /* fall through */ }
  }
  // Fallback minimal si CDN offline
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

/* ─── Toast notifications ───────────────────────────────── */
function showToast(msg, type = 'info') {
  const icons = { error: '❌', success: '✅', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, 4000);
}

/* ─── Loading state on buttons ──────────────────────────── */
function setLoading(btnId, spinnerId, isLoading) {
  const btn = document.getElementById(btnId);
  const sp  = document.getElementById(spinnerId);
  if (!btn) return;
  btn.disabled = isLoading;
  if (sp) sp.classList.toggle('hidden', !isLoading);
}

/* ─── Latency badge text ─────────────────────────────────── */
function latencyBadgeText(ms, mode) {
  return `⚡ ${ms} ms · ${mode.toUpperCase()}`;
}

/* ─── Update sidebar status ──────────────────────────────── */
function updateStatus(health) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  if (!health) {
    if (dot)  dot.className   = 'status-dot offline';
    if (text) text.textContent = 'Hors ligne';
    return;
  }

  const st = health.status;
  if (dot)  dot.className   = `status-dot ${st === 'online' ? 'online' : st === 'degraded' ? 'degraded' : 'offline'}`;
  if (text) text.textContent = st === 'online' ? 'Edge opérationnel' : st === 'degraded' ? 'Mode dégradé' : 'Hors ligne';
}

/* Track last latency globally */
let lastLatency = null;

function updateLatencyInHeader(ms) {
  lastLatency = ms;
  /* status-latency element removed in new layout — no-op */
}

/* ─── Student ID ─────────────────────────────────────────── */
function getStudentId() {
  return document.getElementById('student-id')?.value?.trim() || 'ETU2024001';
}

/* ══════════════════════════════════════════════════════════
   TAB NAVIGATION
   ══════════════════════════════════════════════════════════ */
let statsChart = null;

function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const indicator = document.getElementById('tab-indicator');

  function activateTab(tabId) {
    // Update buttons
    btns.forEach(b => {
      const active = b.dataset.tab === tabId;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${tabId}`);
    });

    // Slide indicator
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn && indicator) {
      const nav    = document.querySelector('.tab-nav-inner');
      const navRect= nav.getBoundingClientRect();
      const btnRect= activeBtn.getBoundingClientRect();
      indicator.style.left  = `${btnRect.left - navRect.left}px`;
      indicator.style.width = `${btnRect.width}px`;
    }

    // Load stats when tab opened
    if (tabId === 'stats') loadStats();
  }

  btns.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Init position — démarre sur l'accueil
  activateTab('home');
}

/* ══════════════════════════════════════════════════════════
   HEALTH POLLING
   ══════════════════════════════════════════════════════════ */
async function pollHealth() {
  const health = await apiHealth();
  updateStatus(health);

  // Update arch node
  const archOllama = document.getElementById('arch-ollama');
  if (archOllama) {
    if (health?.status === 'online') {
      archOllama.classList.add('arch-active');
      let dot = archOllama.querySelector('.arch-dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'arch-dot';
        archOllama.appendChild(dot);
      }
    } else {
      archOllama.classList.remove('arch-active');
      archOllama.querySelector('.arch-dot')?.remove();
    }
  }
}

/* ══════════════════════════════════════════════════════════
   TAB : RÉSUMÉ
   ══════════════════════════════════════════════════════════ */
function initSummaryTab() {
  const input  = document.getElementById('summary-input');
  const counter= document.getElementById('summary-char');
  const btn    = document.getElementById('btn-summary');

  // Character counter
  input.addEventListener('input', () => {
    const len = input.value.length;
    counter.textContent = `${len} / 2000`;
    counter.style.color = len > 1800 ? 'var(--orange)' : '';
  });

  btn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) { showToast('Veuillez coller un cours avant de générer.', 'warning'); return; }

    setLoading('btn-summary', 'spinner-summary', true);
    const result = document.getElementById('summary-result');
    result.classList.add('hidden');

    try {
      const data = await apiQuery({ student_id: getStudentId(), content, task: 'summary' });

      document.getElementById('summary-content').innerHTML  = renderMD(data.answer);
      document.getElementById('summary-latency-badge').textContent = `⚡ ${data.latency_ms} ms`;
      document.getElementById('summary-mode-badge').textContent    = data.mode.toUpperCase();
      document.getElementById('summary-mode-badge').className =
        `badge ${data.mode === 'edge' ? 'badge-purple' : 'badge-orange'}`;

      result.classList.remove('hidden');
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateLatencyInHeader(data.latency_ms);
      if (!data.success) showToast('Mode dégradé — Ollama peut-être en cours de démarrage.', 'warning');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading('btn-summary', 'spinner-summary', false);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   TAB : Q&A  (Chat)
   ══════════════════════════════════════════════════════════ */
function initQATab() {
  const input   = document.getElementById('qa-input');
  const btn     = document.getElementById('btn-qa');
  const ctxToggle = document.getElementById('ctx-toggle');
  const ctxBody   = document.getElementById('ctx-body');
  const ctxChevron= document.getElementById('ctx-chevron');
  const msgs    = document.getElementById('chat-messages');
  const empty   = document.getElementById('chat-empty');
  const typing  = document.getElementById('typing-indicator');
  const chatWin = document.getElementById('chat-window');

  // Context collapsible
  ctxToggle.addEventListener('click', () => {
    const open = ctxBody.style.display !== 'none';
    ctxBody.style.display = open ? 'none' : 'block';
    ctxChevron.classList.toggle('open', !open);
    ctxToggle.setAttribute('aria-expanded', String(!open));
  });

  function addMessage(role, content, meta = '') {
    if (empty.style.display !== 'none') empty.style.display = 'none';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    const avatar = role === 'ai'
      ? `<div class="bubble-avatar ai-avatar">🤖</div>`
      : `<div class="bubble-avatar user-avatar">👤</div>`;

    const htmlContent = role === 'ai' ? renderMD(content) : escapeHtml(content);

    bubble.innerHTML = `
      ${avatar}
      <div>
        <div class="bubble-content">${htmlContent}</div>
        ${meta ? `<div class="bubble-meta">${meta}</div>` : ''}
      </div>`;

    msgs.appendChild(bubble);
    chatWin.scrollTop = chatWin.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function sendQuestion() {
    const question = input.value.trim();
    const ctx = document.getElementById('qa-ctx')?.value?.trim() || '';
    if (!question) return;

    input.value = '';
    btn.disabled = true;

    addMessage('user', question);

    // Show typing
    typing.classList.remove('hidden');
    chatWin.scrollTop = chatWin.scrollHeight;

    try {
      const data = await apiQuery({
        student_id: getStudentId(),
        question,
        context: ctx,
        task: 'qa',
      });

      typing.classList.add('hidden');
      addMessage('ai', data.answer, `⚡ ${data.latency_ms} ms · ${data.mode.toUpperCase()}`);
      updateLatencyInHeader(data.latency_ms);
    } catch (e) {
      typing.classList.add('hidden');
      addMessage('ai', `⚠️ ${e.message}`, '');
      showToast(e.message, 'error');
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', sendQuestion);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); } });
}

/* ══════════════════════════════════════════════════════════
   TAB : PLANNING  (Chips)
   ══════════════════════════════════════════════════════════ */
function initPlanningTab() {
  const chipsList  = document.getElementById('chips-list');
  const chipInput  = document.getElementById('chip-input');
  const btn        = document.getElementById('btn-planning');
  const btnPrint   = document.getElementById('btn-print');
  const container  = document.getElementById('chips-container');

  // Click on container focuses input
  container.addEventListener('click', () => chipInput.focus());

  function addChip(value) {
    if (!value.trim()) return;
    const exists = [...chipsList.querySelectorAll('.chip')].some(c => c.dataset.value === value.trim());
    if (exists) return;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.value = value.trim();
    chip.innerHTML = `${value.trim()}<button class="chip-del" aria-label="Supprimer">×</button>`;
    chip.querySelector('.chip-del').addEventListener('click', (e) => {
      e.stopPropagation();
      chip.remove();
    });
    chipsList.appendChild(chip);
    chipInput.value = '';
  }

  // Initial chips already have del buttons — re-bind
  chipsList.querySelectorAll('.chip-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.closest('.chip').remove();
    });
  });

  chipInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addChip(chipInput.value); }
    if (e.key === 'Backspace' && !chipInput.value) {
      chipsList.lastElementChild?.remove();
    }
  });

  btn.addEventListener('click', async () => {
    const chips = [...chipsList.querySelectorAll('.chip')].map(c => c.dataset.value);
    if (!chips.length) { showToast('Ajoutez au moins une matière.', 'warning'); return; }

    setLoading('btn-planning', 'spinner-planning', true);
    const result = document.getElementById('planning-result');
    result.classList.add('hidden');
    btnPrint.style.display = 'none';

    try {
      const data = await apiQuery({
        student_id: getStudentId(),
        content: chips.join('\n'),
        task: 'planning',
      });

      document.getElementById('planning-content').innerHTML = renderMD(data.answer);
      document.getElementById('planning-latency-badge').textContent = `⚡ ${data.latency_ms} ms`;
      result.classList.remove('hidden');
      btnPrint.style.display = '';
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateLatencyInHeader(data.latency_ms);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading('btn-planning', 'spinner-planning', false);
    }
  });

  btnPrint.addEventListener('click', () => window.print());
}

/* ══════════════════════════════════════════════════════════
   TAB : BIEN-ÊTRE  (Gauge)
   ══════════════════════════════════════════════════════════ */
function initWellbeingTab() {
  const btn = document.getElementById('btn-wellbeing');

  btn.addEventListener('click', async () => {
    const msg = document.getElementById('wellbeing-input').value.trim();
    if (!msg) { showToast('Décrivez votre état avant d\'analyser.', 'warning'); return; }

    setLoading('btn-wellbeing', 'spinner-wellbeing', true);
    const result = document.getElementById('wellbeing-result');
    result.classList.add('hidden');

    try {
      const data = await apiQuery({
        student_id: getStudentId(),
        content: msg,
        task: 'stress',
      });

      let parsed = null;
      try { parsed = JSON.parse(data.answer); } catch { /* not JSON */ }

      if (parsed) {
        renderGauge(parsed.niveau || 'faible');
        renderEmotions(parsed.emotions || [], parsed.niveau || 'faible');
        document.getElementById('conseil-text').textContent = parsed.conseil || '–';
      } else {
        // Model didn't return clean JSON
        renderGauge('moyen');
        document.getElementById('emotions-list').innerHTML = '';
        document.getElementById('conseil-text').textContent = data.answer;
      }

      document.getElementById('wellbeing-latency-badge').textContent = `⚡ ${data.latency_ms} ms`;
      result.classList.remove('hidden');
      updateLatencyInHeader(data.latency_ms);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading('btn-wellbeing', 'spinner-wellbeing', false);
    }
  });
}

function renderGauge(niveau) {
  const fill   = document.getElementById('gauge-fill');
  const emoji  = document.getElementById('gauge-emoji');
  const label  = document.getElementById('gauge-label');

  // Arc circumference ≈ 267 (semi-circle r=85)
  const total = 267;
  const map = {
    faible:  { offset: total * 0.72, emoji: '😊', color: 'var(--teal)',   label: 'FAIBLE' },
    moyen:   { offset: total * 0.40, emoji: '😐', color: 'var(--orange)', label: 'MOYEN'  },
    eleve:   { offset: total * 0.07, emoji: '😟', color: 'var(--red)',    label: 'ÉLEVÉ'  },
  };

  const cfg = map[niveau] || map.faible;
  fill.style.strokeDashoffset = cfg.offset;
  fill.style.stroke           = cfg.color;
  emoji.textContent           = cfg.emoji;
  label.textContent           = cfg.label;
  label.style.color           = cfg.color;
}

function renderEmotions(emotions, niveau) {
  const list = document.getElementById('emotions-list');
  list.innerHTML = '';
  const cls = { faible: 'low', moyen: 'medium', eleve: 'high' };
  emotions.forEach((em, i) => {
    const tag = document.createElement('span');
    tag.className = `emotion-tag ${cls[niveau] || 'medium'}`;
    tag.style.animationDelay = `${i * 0.06}s`;
    tag.textContent = em;
    list.appendChild(tag);
  });
}

/* ══════════════════════════════════════════════════════════
   TAB : STATS
   ══════════════════════════════════════════════════════════ */
async function loadStats() {
  const data = await apiStats();
  if (!data) { showToast('Impossible de charger les statistiques.', 'warning'); return; }

  document.getElementById('kpi-total').textContent   = data.total_queries;
  document.getElementById('kpi-latency').textContent = `${data.avg_latency_ms} ms`;

  drawChart(data.by_task || {});
}

function drawChart(byTask) {
  if (typeof Chart === 'undefined') return;

  const labels = Object.keys(byTask);
  const values = Object.values(byTask);

  const ctx = document.getElementById('stats-chart').getContext('2d');

  if (statsChart) { statsChart.destroy(); }

  statsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Requêtes',
        data: values,
        backgroundColor: [
          'rgba(108,99,255,0.7)',
          'rgba(0,212,170,0.7)',
          'rgba(245,158,11,0.7)',
          'rgba(255,107,107,0.7)',
        ],
        borderColor: [
          'rgba(108,99,255,1)',
          'rgba(0,212,170,1)',
          'rgba(245,158,11,1)',
          'rgba(255,107,107,1)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,19,37,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#e8edf5',
          bodyColor: '#8b9db8',
        },
      },
      scales: {
        x: {
          ticks: { color: '#8b9db8', font: { family: 'Inter', size: 12 } },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          ticks: { color: '#8b9db8', font: { family: 'Inter', size: 12 } },
          grid:  { color: 'rgba(255,255,255,0.05)' },
          beginAtZero: true,
        },
      },
    },
  });
}

document.getElementById('btn-refresh-stats')?.addEventListener('click', loadStats);

/* ══════════════════════════════════════════════════════════
   GLOBAL: switchToTab helper (used by onclick in HTML)
   ══════════════════════════════════════════════════════════ */
function switchToTab(tabId) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

/* ══════════════════════════════════════════════════════════
   TAB : HOME
   ══════════════════════════════════════════════════════════ */
function initHomeTab() {
  // Update greeting name + sidebar avatar from student ID field
  function updateGreeting() {
    const raw    = getStudentId();
    const name   = raw.replace(/^ETU\d*/i, '').trim() || raw;
    const nameEl = document.getElementById('home-student-name');
    const avEl   = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = name || 'Irvin';
    if (avEl)   avEl.textContent   = (name || 'U')[0].toUpperCase();
  }
  updateGreeting();
  document.getElementById('student-id')?.addEventListener('input', updateGreeting);

  // Home search bar → forward to Q&A tab
  const searchInput = document.getElementById('home-search-input');
  const searchSend  = document.getElementById('home-search-send');

  function submitHomeSearch() {
    const q = searchInput?.value?.trim();
    if (!q) return;
    // Copy question into Q&A input then switch tabs
    const qaInput = document.getElementById('qa-input');
    if (qaInput) qaInput.value = q;
    searchInput.value = '';
    switchToTab('qa');
    // Auto-fire the question
    setTimeout(() => document.getElementById('btn-qa')?.click(), 100);
  }

  searchSend?.addEventListener('click', submitHomeSearch);
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitHomeSearch(); }
  });
}

/* ══════════════════════════════════════════════════════════
   TAB : ADMIN (password-protected)
   ══════════════════════════════════════════════════════════ */
const ADMIN_PASSWORD = 'admin@elma';
let adminAuthenticated = false;
let pendingAdminTab    = false;

function initAdminTab() {
  const modal      = document.getElementById('admin-modal');
  const pwdInput   = document.getElementById('admin-password-input');
  const confirmBtn = document.getElementById('admin-modal-confirm');
  const cancelBtn  = document.getElementById('admin-modal-cancel');
  const errorMsg   = document.getElementById('admin-modal-error');

  function openModal() {
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    pwdInput.value = '';
    pwdInput.classList.remove('error');
    errorMsg.classList.add('hidden');
    setTimeout(() => pwdInput.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    if (pendingAdminTab && !adminAuthenticated) {
      // Return to previous tab (summary)
      switchToTab('summary');
    }
    pendingAdminTab = false;
  }

  function tryLogin() {
    if (pwdInput.value === ADMIN_PASSWORD) {
      adminAuthenticated = true;
      closeModal();
      // Actually show the admin panel now
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.getElementById('panel-admin')?.classList.add('active');
      document.getElementById('tab-btn-admin')?.classList.add('active');
      document.getElementById('tab-btn-admin')?.setAttribute('aria-selected', 'true');
      initAdminSearch();
    } else {
      pwdInput.classList.add('error');
      errorMsg.classList.remove('hidden');
      pwdInput.value = '';
      pwdInput.focus();
    }
  }

  confirmBtn?.addEventListener('click', tryLogin);
  cancelBtn?.addEventListener('click', closeModal);
  pwdInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
    if (e.key === 'Escape') closeModal();
    pwdInput.classList.remove('error');
    errorMsg.classList.add('hidden');
  });
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Intercept the admin tab button click
  const adminBtn = document.getElementById('tab-btn-admin');
  adminBtn?.addEventListener('click', e => {
    if (!adminAuthenticated) {
      e.stopImmediatePropagation();
      pendingAdminTab = true;
      openModal();
    }
  }, true); // capture phase so it fires before initTabs handler
}

/* Admin table search filter */
function initAdminSearch() {
  const searchInput = document.getElementById('admin-search');
  const tbody       = document.getElementById('admin-table-body');
  if (!searchInput || !tbody) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    tbody.querySelectorAll('tr').forEach(row => {
      const docName = row.querySelector('.admin-doc-name')?.textContent?.toLowerCase() || '';
      row.style.display = (!q || docName.includes(q)) ? '' : 'none';
    });
  });
}

/* ══════════════════════════════════════════════════════════
   BOOTSTRAP
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSummaryTab();
  initQATab();
  initPlanningTab();
  initWellbeingTab();
  initHomeTab();
  initAdminTab();

  // Initial health check + polling
  pollHealth();
  setInterval(pollHealth, 30_000);
});
