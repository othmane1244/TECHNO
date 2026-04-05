function renderMD(text) {
  if (typeof marked !== 'undefined') {
    try {
      return marked.parse(text);
    } catch {
      /* fall through */
    }
  }

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'info') {
  const icons = { error: 'x', success: 'ok', info: 'i', warning: '!' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'i'}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, 4000);
}

async function copyToClipboard(value, successMessage, emptyMessage = 'Aucune information a copier.') {
  const text = String(value || '').trim();
  if (!text || text === 'Non renseigne') {
    showToast(emptyMessage, 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  } catch {
    showToast('Copie impossible depuis ce navigateur.', 'error');
  }
}

let authState = {
  enabled: false,
  authenticated: false,
  user: null,
  login_url: null,
  logout_url: null,
  allowed_email_domains: [],
  password_login_ready: false,
  message: null,
};

let conversations = [];
let currentConvId = null;
let currentMode = 'qa';
let isGenerating = false;
let abortController = null;
let statsChart = null;
let healthPollTimer = null;
let appBootstrapped = false;
let authIntent = 'user';

const modeConfig = {
  qa: { placeholder: 'Posez votre question a ELMA...' },
  summary: { placeholder: 'Collez ici le texte de votre cours...' },
  planning: { placeholder: 'Listez vos matieres (ex: Maths, Physique...)' },
  stress: { placeholder: 'Decrivez votre etat (ex: je suis stresse...)' },
};

function storageKey(base) {
  const scope = authState.user?.sub || 'guest';
  return `${base}_${scope}`;
}

function getStudentId() {
  return authState.user?.student_id || document.getElementById('student-id')?.value?.trim() || 'SESSION';
}

function setLoading(btnId, spinnerId, isLoading) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  if (!btn) return;
  btn.disabled = isLoading;
  spinner?.classList.toggle('hidden', !isLoading);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('elma_theme', theme);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const nextLabel = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
    themeToggle.textContent = nextLabel;
    themeToggle.setAttribute('aria-label', `Activer ${nextLabel.toLowerCase()}`);
  }
}

function initTheme() {
  applyTheme(localStorage.getItem('elma_theme') || 'light');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function updateViewMeta(tabId) {
  const panel = document.getElementById(`panel-${tabId}`) || document.getElementById('panel-chat');
  if (!panel) return;
  document.getElementById('main-view-kicker').textContent = panel.dataset.viewKicker || 'Assistant local';
  document.getElementById('main-view-title').textContent = panel.dataset.viewTitle || 'Conversation';
  document.getElementById('main-view-desc').textContent = panel.dataset.viewDesc || '';
}

function openSidebar() {
  document.body.classList.add('nav-open');
}

function closeSidebar() {
  document.body.classList.remove('nav-open');
}

function initShell() {
  document.getElementById('mobile-nav-toggle')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeSidebar();
  });
}

function formatAllowedDomains(domains) {
  if (!Array.isArray(domains) || !domains.length) return 'votre domaine institutionnel';
  return domains.map((domain) => `@${domain}`).join(', ');
}

function setAuthFormDisabled(disabled) {
  document.querySelectorAll('#auth-login-form input, #auth-login-form button, #auth-intent-switch button').forEach((element) => {
    element.disabled = disabled;
  });
}

function updateAuthFormCopy() {
  const domains = Array.isArray(authState.allowed_email_domains) ? authState.allowed_email_domains : [];
  const domainText = formatAllowedDomains(domains);
  const isAdminIntent = authIntent === 'admin';
  const shellCopy = document.getElementById('auth-shell-copy');
  const intentNote = document.getElementById('auth-intent-note');
  const domainHelp = document.getElementById('auth-domain-help');
  const submitLabel = document.getElementById('auth-submit-label');
  const emailInput = document.getElementById('auth-email');

  if (shellCopy) {
    shellCopy.textContent = isAdminIntent
      ? "Utilisez votre email institutionnel et votre mot de passe pour acceder a l'espace administrateur ELMA."
      : "Utilisez votre email institutionnel et votre mot de passe pour acceder a votre espace etudiant ELMA.";
  }

  if (intentNote) {
    intentNote.textContent = isAdminIntent
      ? "Connexion reservee aux comptes disposant des droits administrateur dans Keycloak."
      : "Connectez-vous a l'espace etudiant avec votre compte institutionnel.";
  }

  if (domainHelp) {
    domainHelp.textContent = authState.password_login_ready
      ? `Domaines autorises : ${domainText}.`
      : "Le domaine institutionnel doit etre configure par l'administrateur avant la connexion.";
  }

  if (submitLabel) submitLabel.textContent = isAdminIntent ? 'Connexion admin' : 'Connexion etudiant';
  if (emailInput && !emailInput.value) emailInput.placeholder = domains[0] ? `prenom.nom@${domains[0]}` : 'prenom.nom@etablissement.ma';
}

function setAuthIntent(intent = 'user') {
  authIntent = intent === 'admin' ? 'admin' : 'user';
  document.querySelectorAll('.auth-intent-btn').forEach((button) => {
    const active = button.dataset.intent === authIntent;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  updateAuthFormCopy();
}

function setAccountPanelOpen(isOpen) {
  const card = document.getElementById('account-card');
  const panel = document.getElementById('account-panel');
  const trigger = document.getElementById('account-card-trigger');
  if (!card || !panel || !trigger) return;

  card.classList.toggle('open', isOpen);
  panel.classList.toggle('hidden', !isOpen);
  panel.setAttribute('aria-hidden', String(!isOpen));
  trigger.setAttribute('aria-expanded', String(isOpen));
}

function initAccountPanel() {
  const card = document.getElementById('account-card');
  const trigger = document.getElementById('account-card-trigger');
  if (!card || !trigger || trigger.dataset.bound === 'true') return;

  trigger.dataset.bound = 'true';
  trigger.addEventListener('click', () => {
    const isOpen = card.classList.contains('open');
    setAccountPanelOpen(!isOpen);
  });

  document.addEventListener('click', (event) => {
    if (!card.contains(event.target)) setAccountPanelOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setAccountPanelOpen(false);
  });

  document.getElementById('btn-copy-student-id')?.addEventListener('click', (event) => {
    event.stopPropagation();
    copyToClipboard(document.getElementById('student-id-detail')?.textContent, "Identifiant copie.");
  });

  document.getElementById('btn-copy-email')?.addEventListener('click', (event) => {
    event.stopPropagation();
    copyToClipboard(document.getElementById('account-email')?.textContent, 'Email copie.', "Aucun email n'est disponible.");
  });

  document.getElementById('btn-open-stats')?.addEventListener('click', (event) => {
    event.stopPropagation();
    setAccountPanelOpen(false);
    activateTab('stats');
  });

  document.getElementById('btn-open-admin')?.addEventListener('click', (event) => {
    event.stopPropagation();
    setAccountPanelOpen(false);
    activateTab('admin');
  });
}

function applyAuthFeedback(title, text, mode = 'default') {
  const shell = document.getElementById('auth-shell');
  document.getElementById('auth-feedback-title').textContent = title;
  document.getElementById('auth-feedback-text').textContent = text;
  shell.dataset.mode = mode;
}

function setAuthView({ locked, loading = false }) {
  document.body.classList.toggle('auth-locked', locked);
  document.body.classList.toggle('auth-loading', loading);
  document.body.classList.remove('auth-pending');
}

function updateAuthQueryFeedback() {
  const url = new URL(window.location.href);
  const flag = url.searchParams.get('auth');
  const role = url.searchParams.get('role');
  if (!flag) return;

  if (flag === 'success') {
    showToast(role === 'admin' ? 'Connexion admin active.' : 'Connexion reussie.', 'success');
  } else if (flag === 'admin-denied') {
    showToast("Votre compte est connecte, mais il n'a pas le role admin requis.", 'warning');
  } else if (flag === 'error') {
    showToast("La connexion Keycloak a echoue.", 'error');
  } else if (flag === 'state-error') {
    showToast("La verification d'etat a echoue. Reessayez.", 'warning');
  }

  url.searchParams.delete('auth');
  url.searchParams.delete('role');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function bindAuthActions() {
  const form = document.getElementById('auth-login-form');
  if (form && form.dataset.bound !== 'true') {
    form.dataset.bound = 'true';

    document.querySelectorAll('.auth-intent-btn').forEach((button) => {
      button.addEventListener('click', () => setAuthIntent(button.dataset.intent));
    });

    document.getElementById('auth-password-toggle')?.addEventListener('click', () => {
      const passwordInput = document.getElementById('auth-password');
      if (!passwordInput) return;
      const reveal = passwordInput.type === 'password';
      passwordInput.type = reveal ? 'text' : 'password';
      document.getElementById('auth-password-toggle').textContent = reveal ? 'Masquer' : 'Afficher';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!authState.enabled) {
        showToast("L'authentification Keycloak n'est pas configuree.", 'warning');
        return;
      }

      if (!authState.password_login_ready) {
        showToast(authState.message || "Le domaine institutionnel n'est pas configure.", 'warning');
        return;
      }

      const email = document.getElementById('auth-email')?.value?.trim() || '';
      const password = document.getElementById('auth-password')?.value || '';
      if (!email || !password) {
        showToast('Saisissez votre email institutionnel et votre mot de passe.', 'warning');
        return;
      }

      setLoading('btn-auth-submit', 'spinner-auth', true);
      setAuthFormDisabled(true);
      applyAuthFeedback(
        authIntent === 'admin' ? 'Verification du compte admin...' : 'Connexion a votre session...',
        authIntent === 'admin'
          ? "ELMA verifie votre email institutionnel, votre mot de passe et vos droits administrateur."
          : "ELMA verifie votre email institutionnel et votre mot de passe.",
        'loading'
      );

      try {
        const data = await apiPasswordLogin({ email, password, intent: authIntent });
        document.getElementById('auth-password').value = '';
        applyAuthState(data);

        if (data.warning === 'admin-denied') {
          showToast("Connexion reussie, mais votre compte n'a pas le role admin.", 'warning');
        } else {
          showToast(authIntent === 'admin' ? 'Connexion admin active.' : 'Connexion reussie.', 'success');
        }
      } catch (err) {
        setAuthView({ locked: true, loading: false });
        applyAuthFeedback(
          authIntent === 'admin' ? 'Connexion admin refusee' : 'Connexion refusee',
          err.message.replace(/^Erreur \d+\s:\s/, ''),
          'guest'
        );
        showToast(err.message, 'error');
      } finally {
        setLoading('btn-auth-submit', 'spinner-auth', false);
        if (!authState.authenticated) setAuthFormDisabled(!authState.enabled || !authState.password_login_ready);
      }
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn && logoutBtn.dataset.bound !== 'true') {
    logoutBtn.dataset.bound = 'true';
    logoutBtn.addEventListener('click', () => {
      setAccountPanelOpen(false);
      redirectToLogout();
    });
  }

  setAuthIntent(authIntent);
}

function updateIdentityUI() {
  const displayName = authState.user?.name || authState.user?.username || 'Utilisateur';
  const roleText = authState.user?.is_admin ? 'Administrateur' : 'Utilisateur';
  const studentId = authState.user?.student_id || authState.user?.username || 'SESSION';
  const emailText = authState.user?.email || 'Non renseigne';
  const sessionText = authState.authenticated
    ? 'Session active'
    : authState.enabled
      ? authState.password_login_ready ? 'Connexion requise' : 'Domaine requis'
      : 'Configuration requise';

  const accountCard = document.getElementById('account-card');
  const input = document.getElementById('student-id');
  const avatar = document.getElementById('sidebar-avatar');
  const roleLabel = document.getElementById('student-role-label');
  const displayNameEl = document.getElementById('student-display-name');
  const idDisplay = document.getElementById('student-id-display');
  const idDetail = document.getElementById('student-id-detail');
  const emailEl = document.getElementById('account-email');
  const accountTitle = document.getElementById('account-panel-title');
  const accountRoleBadge = document.getElementById('account-role-badge');
  const accountSessionState = document.getElementById('account-session-state');
  const presenceDot = document.getElementById('profile-presence-dot');
  const roleChip = document.getElementById('auth-role-chip');
  const logoutBtn = document.getElementById('btn-logout');
  const welcomeName = document.getElementById('welcome-name');
  const openStatsBtn = document.getElementById('btn-open-stats');
  const openAdminBtn = document.getElementById('btn-open-admin');
  const copyEmailBtn = document.getElementById('btn-copy-email');

  if (accountCard) {
    accountCard.dataset.role = authState.authenticated
      ? authState.user?.is_admin ? 'admin' : 'user'
      : authState.enabled ? authState.password_login_ready ? 'guest' : 'setup' : 'setup';
  }
  if (input) input.value = studentId;
  if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
  if (roleLabel) roleLabel.textContent = authState.authenticated ? roleText : authState.enabled ? 'Connexion requise' : 'Configuration';
  if (displayNameEl) displayNameEl.textContent = authState.authenticated ? displayName : 'Acces securise';
  if (idDisplay) idDisplay.textContent = studentId;
  if (idDetail) idDetail.textContent = studentId;
  if (emailEl) emailEl.textContent = emailText;
  if (copyEmailBtn) copyEmailBtn.disabled = !authState.user?.email;
  if (accountTitle) accountTitle.textContent = authState.authenticated ? displayName : 'Session ELMA';
  if (accountRoleBadge) accountRoleBadge.textContent = authState.authenticated ? roleText : authState.enabled ? 'Invite' : 'Setup';
  if (accountSessionState) accountSessionState.textContent = sessionText;
  if (welcomeName) welcomeName.textContent = displayName;

  presenceDot?.classList.remove('offline', 'setup');
  if (authState.authenticated) {
    logoutBtn?.classList.remove('hidden');
    openStatsBtn?.classList.toggle('hidden', !authState.user?.is_admin);
    openAdminBtn?.classList.toggle('hidden', !authState.user?.is_admin);
    if (roleChip) roleChip.textContent = authState.user?.is_admin ? 'Role admin' : 'Role utilisateur';
    if (presenceDot) presenceDot.classList.remove('offline', 'setup');
  } else {
    logoutBtn?.classList.add('hidden');
    openStatsBtn?.classList.add('hidden');
    openAdminBtn?.classList.add('hidden');
    if (roleChip) roleChip.textContent = 'Session protegee';
    if (presenceDot) presenceDot.classList.add(authState.enabled ? 'offline' : 'setup');
    setAccountPanelOpen(false);
  }
}

function applyProtectedNavigation() {
  const adminOnly = Boolean(authState.user?.is_admin);
  document.getElementById('tab-btn-stats')?.classList.toggle('hidden', !adminOnly);
  document.getElementById('tab-btn-admin')?.classList.toggle('hidden', !adminOnly);

  const statsActive = document.getElementById('panel-stats')?.classList.contains('active');
  const adminActive = document.getElementById('panel-admin')?.classList.contains('active');
  if (!adminOnly && (statsActive || adminActive)) activateTab('chat');
}

function clearConversationState() {
  conversations = [];
  currentConvId = null;
  renderConvList();
  clearChatUI();
}

function loadConvHistory() {
  try {
    conversations = JSON.parse(localStorage.getItem(storageKey('elma_conversations')) || '[]');
  } catch {
    conversations = [];
  }
  currentConvId = localStorage.getItem(storageKey('elma_current_conv')) || null;
}

function saveConvHistory() {
  localStorage.setItem(storageKey('elma_conversations'), JSON.stringify(conversations));
  if (currentConvId) localStorage.setItem(storageKey('elma_current_conv'), currentConvId);
}

function renderConvList() {
  const list = document.getElementById('conv-list');
  if (!list) return;
  list.innerHTML = '';

  if (!conversations.length) {
    list.innerHTML = '<div style="padding:8px 6px;font-size:12px;color:var(--text-muted)">Aucune conversation</div>';
    return;
  }

  conversations.forEach((conv) => {
    const item = document.createElement('div');
    item.className = `conv-item${conv.id === currentConvId ? ' active' : ''}`;
    item.innerHTML = `<span class="conv-item-title">${escapeHtml(conv.title)}</span><button class="conv-item-del" data-id="${conv.id}" title="Supprimer" aria-label="Supprimer">x</button>`;
    item.addEventListener('click', (event) => {
      if (event.target.classList.contains('conv-item-del')) return;
      loadConversation(conv.id);
    });
    item.querySelector('.conv-item-del')?.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteConversation(conv.id);
    });
    list.appendChild(item);
  });
}

function createConversation() {
  const id = `conv_${Date.now()}`;
  const conv = { id, title: 'Nouvelle conversation', messages: [], mode: currentMode, timestamp: Date.now() };
  conversations.unshift(conv);
  currentConvId = id;
  saveConvHistory();
  return conv;
}

function getCurrentConv() {
  return conversations.find((conv) => conv.id === currentConvId) || null;
}

function saveMessageToConv(role, content, meta = '') {
  const conv = getCurrentConv();
  if (!conv) return;
  conv.messages.push({ role, content, meta, timestamp: Date.now() });
  if (role === 'user' && conv.title === 'Nouvelle conversation') {
    conv.title = content.slice(0, 48) + (content.length > 48 ? '...' : '');
  }
  saveConvHistory();
  renderConvList();
}

function loadConversation(id) {
  currentConvId = id;
  localStorage.setItem(storageKey('elma_current_conv'), id);
  renderConvList();

  const conv = getCurrentConv();
  if (!conv) return;

  activateTab('chat');
  clearChatUI();
  setMode(conv.mode || 'qa');
  conv.messages.forEach((message) => appendMessage(message.role, message.content, message.meta, false));
  document.getElementById('chat-conv-title').textContent = conv.title;
}

function deleteConversation(id) {
  conversations = conversations.filter((conv) => conv.id !== id);
  if (currentConvId === id) {
    currentConvId = null;
    clearChatUI();
    document.getElementById('chat-conv-title').textContent = 'ELMA - Assistant IA';
  }
  saveConvHistory();
  renderConvList();
}

function restoreConversationState() {
  loadConvHistory();
  renderConvList();
  if (currentConvId) {
    const conv = getCurrentConv();
    if (conv && conv.messages.length) {
      loadConversation(currentConvId);
      return;
    }
  }
  startNewChat();
}

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');

  function activateTabBtn(tabId) {
    buttons.forEach((button) => {
      const active = button.dataset.tab === tabId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    updateViewMeta(tabId);
    closeSidebar();

    if (tabId === 'stats' && authState.user?.is_admin) loadStats();
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const needsAdmin = button.dataset.tab === 'stats' || button.dataset.tab === 'admin';
      if (needsAdmin && !authState.user?.is_admin) {
        showToast('Cette section est reservee aux administrateurs.', 'warning');
        activateTabBtn('chat');
        return;
      }
      activateTabBtn(button.dataset.tab);
    });
  });

  activateTabBtn('chat');
}

function activateTab(tabId) {
  const button = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (button) {
    button.click();
    return;
  }

  document.querySelectorAll('.tab-btn').forEach((item) => {
    item.classList.remove('active');
    item.setAttribute('aria-selected', 'false');
  });

  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });

  updateViewMeta(tabId);
  closeSidebar();
}

function switchToTab(tabId) {
  activateTab(tabId);
}

async function handlePotentialAuthError(err) {
  if (!err || !isAuthErrorStatus(err.status)) return false;
  showToast(err.status === 403 ? 'Acces refuse pour ce role.' : 'Session expiree. Reconnectez-vous.', 'warning');
  await refreshAuthState();
  return true;
}

function updateStatus(health) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!health) {
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = 'Hors ligne';
    return;
  }

  const status = health.status;
  if (dot) dot.className = `status-dot ${status === 'online' ? 'online' : status === 'degraded' ? 'degraded' : 'offline'}`;
  if (text) text.textContent = status === 'online' ? 'Edge operationnel' : status === 'degraded' ? 'Mode degrade' : 'Hors ligne';
}

async function pollHealth() {
  const health = await apiHealth();
  updateStatus(health);
  const archOllama = document.getElementById('arch-ollama');
  if (!archOllama) return;

  if (health?.status === 'online') {
    archOllama.classList.add('arch-active');
    if (!archOllama.querySelector('.arch-dot')) {
      const dot = document.createElement('span');
      dot.className = 'arch-dot';
      archOllama.appendChild(dot);
    }
  } else {
    archOllama.classList.remove('arch-active');
    archOllama.querySelector('.arch-dot')?.remove();
  }
}

function startHealthPolling() {
  pollHealth();
  if (healthPollTimer) clearInterval(healthPollTimer);
  healthPollTimer = setInterval(pollHealth, 30_000);
}

function setMode(mode) {
  if (!modeConfig[mode]) return;
  currentMode = mode;
  const input = document.getElementById('qa-input');
  if (input) input.placeholder = modeConfig[mode].placeholder;
  document.querySelectorAll('.mode-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
}

function clearChatUI() {
  document.getElementById('messages-list').innerHTML = '';
  document.getElementById('chat-welcome').style.display = '';
  document.getElementById('typing-row').classList.add('hidden');
}

function startNewChat() {
  createConversation();
  clearChatUI();
  setMode('qa');
  document.getElementById('chat-conv-title').textContent = 'Nouvelle conversation';
  activateTab('chat');
  renderConvList();
  document.getElementById('qa-input')?.focus();
}

function setSending(sending) {
  isGenerating = sending;
  document.getElementById('btn-send')?.classList.toggle('hidden', sending);
  document.getElementById('btn-stop')?.classList.toggle('hidden', !sending);
  const input = document.getElementById('qa-input');
  if (input) input.disabled = sending;
}

function showTyping(show) {
  document.getElementById('typing-row')?.classList.toggle('hidden', !show);
  if (show) scrollChatBottom();
}

function scrollChatBottom() {
  const body = document.getElementById('chat-body');
  if (body) body.scrollTop = body.scrollHeight;
}

function updateWelcomeName() {
  const displayName = authState.user?.name || getStudentId() || 'Etudiant';
  const avatar = document.getElementById('sidebar-avatar');
  const welcomeName = document.getElementById('welcome-name');
  if (welcomeName) welcomeName.textContent = displayName;
  if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
}

function appendMessage(role, content, meta = '', save = true) {
  document.getElementById('chat-welcome').style.display = 'none';

  const list = document.getElementById('messages-list');
  const div = document.createElement('div');
  div.className = `message message-${role}`;

  if (role === 'ai') {
    div.innerHTML = `
      <div class="ai-avatar-icon">
        <img src="/static/img/logo.png" alt="ELMA" class="logo-img-xs" />
      </div>
      <div class="msg-content-wrap">
        <div class="msg-text">${renderMD(content)}</div>
        <div class="msg-actions">
          <button class="msg-action-btn copy-btn" title="Copier">Copier</button>
          <button class="msg-action-btn regen-btn" title="Regenerer">Regenerer</button>
        </div>
        ${meta ? `<div class="msg-meta">${escapeHtml(meta)}</div>` : ''}
      </div>
    `;

    div.querySelector('.copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => showToast('Copie !', 'success'));
    });

    div.querySelector('.regen-btn')?.addEventListener('click', () => {
      const conv = getCurrentConv();
      if (!conv) return;
      const lastUser = [...conv.messages].reverse().find((message) => message.role === 'user');
      if (!lastUser) return;

      const lastAiIndex = [...conv.messages].map((message) => message.role).lastIndexOf('ai');
      if (lastAiIndex >= 0) conv.messages.splice(lastAiIndex, 1);
      div.remove();
      saveConvHistory();
      sendToBackend(lastUser.content, document.getElementById('qa-ctx')?.value?.trim() || '');
    });
  } else {
    div.innerHTML = `<div class="msg-content-wrap"><div class="msg-text">${escapeHtml(content)}</div></div>`;
  }

  list.appendChild(div);
  scrollChatBottom();
  if (save) saveMessageToConv(role, content, meta);
  return div;
}

async function sendMessage() {
  if (isGenerating) return;
  const input = document.getElementById('qa-input');
  const question = input.value.trim();
  if (!question) return;

  const context = document.getElementById('qa-ctx')?.value?.trim() || '';
  if (!currentConvId) createConversation();

  input.value = '';
  input.style.height = 'auto';
  appendMessage('user', question);
  await sendToBackend(question, context);
}

async function sendToBackend(question, context) {
  setSending(true);
  showTyping(true);
  abortController = new AbortController();

  const payload = {
    student_id: getStudentId(),
    question,
    context,
    content: question,
    task: currentMode,
  };

  showTyping(false);
  document.getElementById('chat-welcome').style.display = 'none';

  const list = document.getElementById('messages-list');
  const aiDiv = document.createElement('div');
  aiDiv.className = 'message message-ai';
  aiDiv.innerHTML = `
    <div class="ai-avatar-icon">
      <img src="/static/img/logo.png" alt="ELMA" class="logo-img-xs" />
    </div>
    <div class="msg-content-wrap">
      <div class="msg-text streaming-text"></div>
    </div>
  `;
  list.appendChild(aiDiv);

  const aiTextEl = aiDiv.querySelector('.streaming-text');
  const typingDots = document.createElement('span');
  typingDots.className = 'typing-dots-inline';
  typingDots.innerHTML = '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--text-muted);margin:0 1px"></span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--text-muted);margin:0 1px"></span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--text-muted);margin:0 1px"></span>';
  aiTextEl.appendChild(typingDots);
  scrollChatBottom();

  let fullText = '';

  try {
    let firstToken = true;

    await apiStream(
      payload,
      (token) => {
        if (firstToken) {
          typingDots.remove();
          firstToken = false;
        }
        fullText += token;
        aiTextEl.textContent = fullText;
        scrollChatBottom();
      },
      (latency, mode) => {
        aiTextEl.innerHTML = renderMD(fullText);
        const wrap = aiDiv.querySelector('.msg-content-wrap');
        const meta = `Latency ${latency} ms · ${(mode || 'edge').toUpperCase()}`;
        wrap.insertAdjacentHTML(
          'beforeend',
          `<div class="msg-actions"><button class="msg-action-btn copy-btn" title="Copier">Copier</button></div><div class="msg-meta">${escapeHtml(meta)}</div>`
        );
        wrap.querySelector('.copy-btn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(fullText).then(() => showToast('Copie !', 'success'));
        });
        saveMessageToConv('ai', fullText, meta);
      },
      abortController
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      if (fullText) {
        typingDots.remove();
        aiTextEl.innerHTML = `${renderMD(fullText)}<em style="color:var(--text-muted);font-size:12px"> [arrete]</em>`;
        saveMessageToConv('ai', fullText, '[arrete]');
      } else {
        aiDiv.remove();
      }
    } else {
      typingDots.remove();
      aiDiv.remove();
      try {
        const data = await apiQuery(payload);
        appendMessage('ai', data.answer, `Latency ${data.latency_ms} ms · ${data.mode.toUpperCase()}`);
        if (!data.success) showToast('Mode degrade - Ollama est peut-etre en cours de demarrage.', 'warning');
      } catch (fallbackErr) {
        if (await handlePotentialAuthError(fallbackErr)) return;
        appendMessage('ai', `Erreur: ${fallbackErr.message}`, '');
        showToast(fallbackErr.message, 'error');
      }
    }
  } finally {
    setSending(false);
    showTyping(false);
    document.getElementById('qa-input')?.focus();
  }
}

function initChat() {
  const input = document.getElementById('qa-input');
  const clearBtn = document.getElementById('btn-clear-chat');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  });

  document.querySelectorAll('.mode-btn').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  document.getElementById('ctx-toggle-btn')?.addEventListener('click', () => {
    const bar = document.getElementById('context-bar');
    const hidden = bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !hidden);
    document.getElementById('ctx-toggle-btn')?.classList.toggle('ctx-active', hidden);
  });

  document.getElementById('ctx-close')?.addEventListener('click', () => {
    document.getElementById('context-bar')?.classList.add('hidden');
    document.getElementById('ctx-toggle-btn')?.classList.remove('ctx-active');
  });

  document.getElementById('btn-send')?.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('btn-stop')?.addEventListener('click', () => {
    abortController?.abort();
    setSending(false);
    showToast('Generation arretee.', 'info');
  });

  document.getElementById('btn-new-chat')?.addEventListener('click', () => startNewChat());

  clearBtn?.addEventListener('click', () => {
    if (!currentConvId) return;
    const conv = getCurrentConv();
    if (conv) {
      conv.messages = [];
      conv.title = 'Nouvelle conversation';
      saveConvHistory();
      renderConvList();
    }
    clearChatUI();
    document.getElementById('chat-conv-title').textContent = 'Nouvelle conversation';
  });

  document.querySelectorAll('.suggestion-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      input.value = pill.dataset.prompt;
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
      sendMessage();
    });
  });

  updateWelcomeName();
}

function initSummaryTab() {
  const input = document.getElementById('summary-input');
  const counter = document.getElementById('summary-char');
  const btn = document.getElementById('btn-summary');
  if (!input || !counter || !btn) return;

  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 2000`;
    counter.style.color = input.value.length > 1800 ? 'var(--orange)' : '';
  });

  btn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) {
      showToast('Veuillez coller un cours avant de generer.', 'warning');
      return;
    }

    setLoading('btn-summary', 'spinner-summary', true);
    const result = document.getElementById('summary-result');
    result.classList.add('hidden');

    try {
      const data = await apiQuery({ student_id: getStudentId(), content, task: 'summary' });
      document.getElementById('summary-content').innerHTML = renderMD(data.answer);
      document.getElementById('summary-latency-badge').textContent = `Latency ${data.latency_ms} ms`;
      document.getElementById('summary-mode-badge').textContent = data.mode.toUpperCase();
      document.getElementById('summary-mode-badge').className = `badge ${data.mode === 'edge' ? 'badge-blue' : 'badge-orange'}`;
      result.classList.remove('hidden');
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!data.success) showToast('Mode degrade - Ollama est peut-etre en cours de demarrage.', 'warning');
    } catch (err) {
      if (await handlePotentialAuthError(err)) return;
      showToast(err.message, 'error');
    } finally {
      setLoading('btn-summary', 'spinner-summary', false);
    }
  });
}

function initPlanningTab() {
  const chipsList = document.getElementById('chips-list');
  const chipInput = document.getElementById('chip-input');
  const btn = document.getElementById('btn-planning');
  const btnPrint = document.getElementById('btn-print');
  const container = document.getElementById('chips-container');
  if (!chipsList || !chipInput || !btn) return;

  const addChip = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const exists = [...chipsList.querySelectorAll('.chip')].some((chip) => chip.dataset.value === trimmed);
    if (exists) return;
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.value = trimmed;
    chip.innerHTML = `${escapeHtml(trimmed)}<button class="chip-del" aria-label="Supprimer">x</button>`;
    chip.querySelector('.chip-del')?.addEventListener('click', (event) => {
      event.stopPropagation();
      chip.remove();
    });
    chipsList.appendChild(chip);
    chipInput.value = '';
  };

  container.addEventListener('click', () => chipInput.focus());
  chipsList.querySelectorAll('.chip-del').forEach((btnDel) => {
    btnDel.addEventListener('click', (event) => {
      event.stopPropagation();
      btnDel.closest('.chip')?.remove();
    });
  });

  chipInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addChip(chipInput.value);
    }
    if (event.key === 'Backspace' && !chipInput.value) chipsList.lastElementChild?.remove();
  });

  btn.addEventListener('click', async () => {
    const chips = [...chipsList.querySelectorAll('.chip')].map((chip) => chip.dataset.value);
    if (!chips.length) {
      showToast('Ajoutez au moins une matiere.', 'warning');
      return;
    }

    setLoading('btn-planning', 'spinner-planning', true);
    const result = document.getElementById('planning-result');
    result.classList.add('hidden');
    btnPrint.style.display = 'none';

    try {
      const data = await apiQuery({ student_id: getStudentId(), content: chips.join('\n'), task: 'planning' });
      document.getElementById('planning-content').innerHTML = renderMD(data.answer);
      document.getElementById('planning-latency-badge').textContent = `Latency ${data.latency_ms} ms`;
      result.classList.remove('hidden');
      btnPrint.style.display = '';
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (await handlePotentialAuthError(err)) return;
      showToast(err.message, 'error');
    } finally {
      setLoading('btn-planning', 'spinner-planning', false);
    }
  });

  btnPrint?.addEventListener('click', () => window.print());
}

function renderGauge(level) {
  const fill = document.getElementById('gauge-fill');
  const emoji = document.getElementById('gauge-emoji');
  const label = document.getElementById('gauge-label');
  const total = 267;
  const levels = {
    faible: { offset: total * 0.72, emoji: ':)', color: 'var(--teal)', label: 'FAIBLE' },
    moyen: { offset: total * 0.4, emoji: ':|', color: 'var(--orange)', label: 'MOYEN' },
    eleve: { offset: total * 0.07, emoji: ':(', color: 'var(--red)', label: 'ELEVE' },
  };
  const cfg = levels[level] || levels.faible;
  fill.style.strokeDashoffset = cfg.offset;
  fill.style.stroke = cfg.color;
  emoji.textContent = cfg.emoji;
  label.textContent = cfg.label;
  label.style.color = cfg.color;
}

function renderEmotions(emotions, level) {
  const list = document.getElementById('emotions-list');
  list.innerHTML = '';
  const classes = { faible: 'low', moyen: 'medium', eleve: 'high' };
  emotions.forEach((emotion, index) => {
    const tag = document.createElement('span');
    tag.className = `emotion-tag ${classes[level] || 'medium'}`;
    tag.style.animationDelay = `${index * 0.06}s`;
    tag.textContent = emotion;
    list.appendChild(tag);
  });
}

function initWellbeingTab() {
  const btn = document.getElementById('btn-wellbeing');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const message = document.getElementById('wellbeing-input').value.trim();
    if (!message) {
      showToast("Decrivez votre etat avant d'analyser.", 'warning');
      return;
    }

    setLoading('btn-wellbeing', 'spinner-wellbeing', true);
    const result = document.getElementById('wellbeing-result');
    result.classList.add('hidden');

    try {
      const data = await apiQuery({ student_id: getStudentId(), content: message, task: 'stress' });
      let parsed = null;
      try {
        parsed = JSON.parse(data.answer);
      } catch {
        parsed = null;
      }

      if (parsed) {
        renderGauge(parsed.niveau || 'faible');
        renderEmotions(parsed.emotions || [], parsed.niveau || 'faible');
        document.getElementById('conseil-text').textContent = parsed.conseil || '-';
      } else {
        renderGauge('moyen');
        document.getElementById('emotions-list').innerHTML = '';
        document.getElementById('conseil-text').textContent = data.answer;
      }

      document.getElementById('wellbeing-latency-badge').textContent = `Latency ${data.latency_ms} ms`;
      result.classList.remove('hidden');
    } catch (err) {
      if (await handlePotentialAuthError(err)) return;
      showToast(err.message, 'error');
    } finally {
      setLoading('btn-wellbeing', 'spinner-wellbeing', false);
    }
  });
}

async function loadStats() {
  if (!authState.user?.is_admin) {
    showToast('Les statistiques sont reservees aux administrateurs.', 'warning');
    return;
  }

  try {
    const data = await apiStats();
    document.getElementById('kpi-total').textContent = data.total_queries;
    document.getElementById('kpi-latency').textContent = `${data.avg_latency_ms} ms`;
    drawChart(data.by_task || {});
  } catch (err) {
    if (await handlePotentialAuthError(err)) return;
    showToast(err.message || 'Impossible de charger les statistiques.', 'warning');
  }
}

function drawChart(byTask) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('stats-chart')?.getContext('2d');
  if (!ctx) return;

  if (statsChart) statsChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#8b8b8b' : '#6b7280';

  statsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(byTask),
      datasets: [{
        label: 'Requetes',
        data: Object.values(byTask),
        backgroundColor: ['rgba(11,102,255,0.72)', 'rgba(16,185,129,0.72)', 'rgba(255,122,89,0.72)', 'rgba(19,34,56,0.72)'],
        borderColor: ['rgba(11,102,255,1)', 'rgba(16,185,129,1)', 'rgba(255,122,89,1)', 'rgba(19,34,56,1)'],
        borderWidth: 1,
        borderRadius: 12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30,30,30,0.97)' : 'rgba(13,19,37,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: isDark ? '#ececec' : '#e8edf5',
          bodyColor: isDark ? '#a0a0a0' : '#8b9db8',
        },
      },
      scales: {
        x: { ticks: { color: tickColor, font: { family: 'Manrope', size: 12 } }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: { family: 'Manrope', size: 12 } }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });
}

function initAdminSearch() {
  const searchInput = document.getElementById('admin-search');
  const tbody = document.getElementById('admin-table-body');
  if (!searchInput || !tbody) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    tbody.querySelectorAll('tr').forEach((row) => {
      const docName = row.querySelector('.admin-doc-name')?.textContent?.toLowerCase() || '';
      row.style.display = (!query || docName.includes(query)) ? '' : 'none';
    });
  });
}

function bootstrapAuthenticatedApp() {
  if (!appBootstrapped) {
    restoreConversationState();
    initAdminSearch();
    startHealthPolling();
    appBootstrapped = true;
    return;
  }

  updateIdentityUI();
  applyProtectedNavigation();
  startHealthPolling();
}

function applyAuthState(nextState) {
  authState = nextState || { enabled: false, authenticated: false, user: null, allowed_email_domains: [], password_login_ready: false };
  updateIdentityUI();
  applyProtectedNavigation();
  updateAuthFormCopy();

  if (!authState.enabled) {
    clearConversationState();
    setAuthView({ locked: true, loading: false });
    setAuthFormDisabled(true);
    applyAuthFeedback(
      'Configuration Keycloak requise',
      "Renseignez KEYCLOAK_SERVER_URL, KEYCLOAK_REALM et KEYCLOAK_CLIENT_ID pour activer l'authentification centralisee.",
      'setup'
    );
    return;
  }

  if (!authState.password_login_ready && !authState.authenticated) {
    clearConversationState();
    setAuthView({ locked: true, loading: false });
    setAuthFormDisabled(true);
    applyAuthFeedback(
      'Domaine institutionnel requis',
      authState.message || "Configurez AUTH_ALLOWED_EMAIL_DOMAINS pour limiter l'acces aux emails institutionnels.",
      'setup'
    );
    return;
  }

  if (!authState.authenticated) {
    clearConversationState();
    setAuthView({ locked: true, loading: false });
    setAuthFormDisabled(false);
    applyAuthFeedback(
      'Connectez-vous avec votre email institutionnel',
      authIntent === 'admin'
        ? "Saisissez votre email institutionnel et votre mot de passe pour acceder a l'espace administrateur."
        : "Saisissez votre email institutionnel et votre mot de passe pour acceder a l'espace etudiant.",
      'guest'
    );
    return;
  }

  setAuthView({ locked: false, loading: false });
  setAuthFormDisabled(false);
  updateWelcomeName();
  bootstrapAuthenticatedApp();
}

async function refreshAuthState() {
  setAuthView({ locked: true, loading: true });
  setAuthFormDisabled(true);
  applyAuthFeedback('Verification de la session...', 'ELMA prepare votre espace securise.', 'loading');

  const data = await apiAuthMe();
  if (!data || data._request_failed) {
    clearConversationState();
    setAuthView({ locked: true, loading: false });
    setAuthFormDisabled(true);

    const explicit404 = data?.status === 404;
    applyAuthFeedback(
      explicit404 ? "Serveur FastAPI incorrect" : "Service d'authentification indisponible",
      explicit404
        ? "La page n'est pas servie par backend/main.py. Lancez uvicorn depuis TECHNO/TECHNO/backend sur le port 8000."
        : "Le serveur n'a pas pu verifier votre session. Verifiez l'application et Keycloak.",
      'error'
    );
    if (explicit404) {
      showToast("Route /auth/me introuvable. Lancez uvicorn main:app depuis TECHNO/TECHNO/backend.", 'error');
    }
    return;
  }

  applyAuthState(data);
}

async function initAuth() {
  bindAuthActions();
  updateAuthQueryFeedback();
  await refreshAuthState();
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initShell();
  initAccountPanel();
  initTabs();
  initChat();
  initSummaryTab();
  initPlanningTab();
  initWellbeingTab();
  document.getElementById('btn-refresh-stats')?.addEventListener('click', loadStats);
  await initAuth();
});
