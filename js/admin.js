"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" ||
      host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_admin_id_token";
  const REFRESH_KEY = "pk_admin_refresh_token";
  const EXPIRES_KEY = "pk_admin_expires_at";

  const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

  function storeTokens(idToken, refreshToken, expiresIn) {
    try {
      if (idToken) localStorage.setItem(TOKEN_KEY, idToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      if (expiresIn) localStorage.setItem(EXPIRES_KEY, String(Date.now() + Number(expiresIn) * 1000));
    } catch (e) {}
  }

  function getIdToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function getRefreshToken() { try { return localStorage.getItem(REFRESH_KEY) || ""; } catch (e) { return ""; } }
  function getExpiresAt() { try { return parseInt(localStorage.getItem(EXPIRES_KEY) || "0", 10) || 0; } catch (e) { return 0; } }

  function clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) {}
  }

  let refreshingPromise = null;

  async function refreshTokens() {
    if (refreshingPromise) return refreshingPromise;
    refreshingPromise = (async function () {
      const rt = getRefreshToken();
      if (!rt) throw new Error("No refresh token");
      const res = await fetch(API_BASE + "/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) { clearTokens(); throw new Error("Session expired"); }
      const data = await res.json();
      storeTokens(data.idToken, data.refreshToken, data.expiresIn);
      return data.idToken;
    })();
    try { return await refreshingPromise; } finally { refreshingPromise = null; }
  }

  async function ensureFreshToken() {
    const token = getIdToken();
    const expiresAt = getExpiresAt();
    if (token && expiresAt && expiresAt - Date.now() < 60000) {
      try { return await refreshTokens(); } catch (e) { return token; }
    }
    return token;
  }

  async function request(path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    if (!opts.noAuth) {
      const token = await ensureFreshToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body
      });
    } catch (err) {
      const e = new Error("Network error. Check your connection.");
      e.status = 0;
      throw e;
    }

    if (res.status === 401 && !opts.noAuth) {
      try { await refreshTokens(); } catch (e) { clearTokens(); showLogin(); throw new Error("Session expired"); }
      headers["Authorization"] = "Bearer " + getIdToken();
      res = await fetch(API_BASE + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body
      });
    }

    let data = null;
    try { data = await res.json(); } catch (e) {}

    if (!res.ok) {
      const e = new Error((data && data.error) || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }

    return data;
  }

  const api = {
    login: function (email, password) {
      return request("/login", { method: "POST", noAuth: true, body: JSON.stringify({ email: email, password: password }) });
    },
    me: function () { return request("/me"); },
    updateMe: function (name) {
      return request("/me", { method: "PUT", body: JSON.stringify({ displayName: name }) });
    },
    listOwn: function () { return request("/admin/tests"); },
    getOwn: function (id) { return request("/admin/tests/" + encodeURIComponent(id)); },
    createTest: function (payload) {
      return request("/admin/tests", { method: "POST", body: JSON.stringify(payload) });
    },
    updateTest: function (id, payload) {
      return request("/admin/tests/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(payload) });
    },
    deleteTest: function (id) { return request("/admin/tests/" + encodeURIComponent(id), { method: "DELETE" }); },
    publish: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/publish", { method: "POST" }); },
    unpublish: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/unpublish", { method: "POST" }); },
    getSubmissions: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/submissions"); },
    getSettings: function () { return request("/settings", { noAuth: true }); },
    updateSettings: function (payload) {
      return request("/settings", { method: "PUT", body: JSON.stringify(payload) });
    }
  };

  function t(key, vars) { return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key; }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }; return m[c]; }); }
  function $id(id) { return document.getElementById(id); }

  function toast(message, kind) {
    const container = $id("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); resolve(); } catch (e) { reject(e); } finally { document.body.removeChild(ta); }
    });
  }

  function publicTestUrl(id) {
    const base = window.location.origin + window.location.pathname.replace(/admin\.html$/, "");
    return base + "mock-test.html?test=" + encodeURIComponent(id);
  }

  function formatDuration(seconds) {
    const s = Number(seconds) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  }

  const state = { admin: null, tests: [], editing: null, currentTab: "tests", submissionsTestId: null, submissionsCache: [] };
  const screens = {
    loading: $id("adminLoading"),
    login: $id("loginScreen"),
    dashboard: $id("dashboardScreen"),
    editor: $id("editorScreen"),
    submissions: $id("submissionsScreen")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showLogin() {
    stopInactivityTimer();
    state.admin = null; state.tests = []; state.editing = null;
    const u = $id("loginUser"), p = $id("loginPass"), e = $id("loginError");
    if (u) u.value = ""; if (p) p.value = ""; if (e) e.hidden = true;
    showScreen("login");
  }

  /* ---------- INACTIVITY TIMER ---------- */

  let inactivityTimerId = null;

  function resetInactivityTimer() {
    if (inactivityTimerId) {
      clearTimeout(inactivityTimerId);
    }
    if (!getIdToken() && !getRefreshToken()) return;
    inactivityTimerId = setTimeout(handleInactivityTimeout, INACTIVITY_MS);
  }

  function startInactivityTimer() {
    resetInactivityTimer();
  }

  function stopInactivityTimer() {
    if (inactivityTimerId) {
      clearTimeout(inactivityTimerId);
      inactivityTimerId = null;
    }
  }

  const activityEvents = ["click", "keydown", "scroll", "touchstart"];

  function onUserActivity() {
    resetInactivityTimer();
  }

  activityEvents.forEach(function (ev) {
    document.addEventListener(ev, onUserActivity, { passive: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      resetInactivityTimer();
    }
  });

  function handleInactivityTimeout() {
    stopInactivityTimer();
    clearTokens();
    state.admin = null;
    state.tests = [];
    state.editing = null;
    openSessionTimeoutModal();
  }

  /* ---------- SESSION TIMEOUT MODAL ---------- */

  let sessionTimeoutModalEl = null;

  function ensureSessionTimeoutModal() {
    if (sessionTimeoutModalEl) return sessionTimeoutModalEl;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "sessionTimeoutOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sessionTimeoutTitle");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2 id="sessionTimeoutTitle">Session timed out</h2>' +
        '<p class="muted-text" style="margin-bottom: 20px;">' +
          'Your session has expired due to inactivity. Please log in again to continue.' +
        '</p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-primary" id="sessionTimeoutLoginBtn">Go to login</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    const loginBtn = overlay.querySelector("#sessionTimeoutLoginBtn");
    loginBtn.addEventListener("click", function () {
      overlay.hidden = true;
      overlay.classList.remove("open");
      showLogin();
    });

    sessionTimeoutModalEl = overlay;
    return overlay;
  }

  function openSessionTimeoutModal() {
    const overlay = ensureSessionTimeoutModal();
    overlay.hidden = false;
    overlay.classList.add("open");
    setTimeout(function () {
      const btn = overlay.querySelector("#sessionTimeoutLoginBtn");
      if (btn) btn.focus();
    }, 40);
  }

  /* ---------- LOGOUT CONFIRM MODAL ---------- */

  let logoutModalEl = null;

  function ensureLogoutModal() {
    if (logoutModalEl) return logoutModalEl;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "logoutOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "logoutTitle");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2 id="logoutTitle">Sign out?</h2>' +
        '<p class="muted-text" style="margin-bottom: 20px;">' +
          'You will need to sign in again to manage your tests.' +
        '</p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn" id="logoutCancelBtn">Stay signed in</button>' +
          '<button type="button" class="btn btn-primary" id="logoutConfirmBtn">Sign out</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector("#logoutCancelBtn");
    const confirmBtn = overlay.querySelector("#logoutConfirmBtn");

    function close() {
      overlay.hidden = true;
      overlay.classList.remove("open");
    }

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) close();
    });

    confirmBtn.addEventListener("click", function () {
      close();
      clearTokens();
      stopInactivityTimer();
      showLogin();
    });

    logoutModalEl = overlay;
    return overlay;
  }

  function openLogoutModal() {
    const overlay = ensureLogoutModal();
    overlay.hidden = false;
    overlay.classList.add("open");
    setTimeout(function () {
      const btn = overlay.querySelector("#logoutCancelBtn");
      if (btn) btn.focus();
    }, 40);
  }

  /* ---------- LOGIN ---------- */

  const loginForm = $id("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = $id("loginUser").value.trim();
      const password = $id("loginPass").value;
      const errEl = $id("loginError");
      const btn = $id("loginSubmit");
      errEl.hidden = true;
      if (!email || !password) { errEl.textContent = t("fillAllFields"); errEl.hidden = false; return; }
      btn.disabled = true;
      try {
        const res = await api.login(email, password);
        storeTokens(res.idToken, res.refreshToken, res.expiresIn);
        state.admin = res.admin;
        await enterDashboard();
        startInactivityTimer();
      } catch (err) {
        errEl.textContent =
          err.status === 401 ? t("invalidLogin") :
          err.status === 403 ? (err.message || "Not authorized") :
          (err.message || "Error");
        errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  const signOutBtn = $id("signOutBtn");
  if (signOutBtn) signOutBtn.addEventListener("click", function () { openLogoutModal(); });

  /* ---------- TABS ---------- */

  const tabTests = $id("tabTests"), tabSettings = $id("tabSettings");
  const panelTests = $id("panelTests"), panelSettings = $id("panelSettings");

  function setTab(tab) {
    state.currentTab = tab;
    if (tabTests) { const a = tab === "tests"; tabTests.classList.toggle("is-active", a); tabTests.setAttribute("aria-selected", String(a)); }
    if (tabSettings) { const a = tab === "settings"; tabSettings.classList.toggle("is-active", a); tabSettings.setAttribute("aria-selected", String(a)); }
    if (panelTests) panelTests.hidden = tab !== "tests";
    if (panelSettings) panelSettings.hidden = tab !== "settings";
    if (tab === "settings") { loadSettings(); loadInterruptionSettings(); }
  }

  if (tabTests) tabTests.addEventListener("click", function () { setTab("tests"); });
  if (tabSettings) tabSettings.addEventListener("click", function () { setTab("settings"); });

  /* ---------- DASHBOARD ---------- */

  async function enterDashboard() {
    if (!state.admin) return;
    const nameEl = $id("adminDisplayName");
    if (nameEl) nameEl.textContent = state.admin.displayName || "";
    showScreen("dashboard");
    setTab("tests");
    await loadTests();
  }

  async function loadTests() {
    const loading = $id("testsLoading"), empty = $id("testsEmpty"), list = $id("testsList");
    if (!list) return;
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = true; list.innerHTML = "";

    try {
      const res = await api.listOwn();
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      if (loading) loading.hidden = true;
      if (state.tests.length === 0) { if (empty) empty.hidden = false; return; }
      list.hidden = false;
      state.tests.forEach(function (test) { list.appendChild(renderTestCard(test)); });
    } catch (err) {
      if (loading) loading.hidden = true;
      if (err.status === 401) { showLogin(); return; }
      if (empty) { empty.hidden = false; empty.textContent = err.message || t("loadFailed"); }
    }
  }

  function renderTestCard(test) {
    const card = document.createElement("div");
    card.className = "admin-test-card";
    const isPublished = test.status === "published";

    card.innerHTML =
      '<div class="admin-test-info">' +
        '<p class="admin-test-title">' + esc(test.title) + '</p>' +
        '<div class="admin-test-meta">' +
          '<span class="status-badge ' + (isPublished ? "published" : "draft") + '">' +
            esc(isPublished ? t("published") : t("draft")) +
          '</span>' +
          '<span>' + Number(test.questionCount || 0) + " " + esc(t("questionsUnit")) + '</span>' +
          '<span>' + Number(test.minutes || 0) + " " + esc(t("minutesUnit")) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="admin-test-actions"></div>';

    const actions = card.querySelector(".admin-test-actions");

    const subsBtn = document.createElement("button");
    subsBtn.type = "button"; subsBtn.className = "btn btn-sm"; subsBtn.textContent = "Submissions";
    subsBtn.addEventListener("click", function () { openSubmissions(test.id); });
    actions.appendChild(subsBtn);

    if (isPublished) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button"; copyBtn.className = "btn btn-sm"; copyBtn.textContent = t("copyUrl");
      copyBtn.addEventListener("click", function () {
        copyText(publicTestUrl(test.id)).then(function () { toast(t("urlCopied"), "success"); })
          .catch(function () { toast("Copy failed", "error"); });
      });
      actions.appendChild(copyBtn);
    }

    const editBtn = document.createElement("button");
    editBtn.type = "button"; editBtn.className = "btn btn-sm"; editBtn.textContent = t("edit");
    editBtn.addEventListener("click", function () { openEditor(test.id); });
    actions.appendChild(editBtn);

    const pubBtn = document.createElement("button");
    pubBtn.type = "button";
    pubBtn.className = "btn btn-sm" + (isPublished ? "" : " btn-primary");
    pubBtn.textContent = isPublished ? t("unpublish") : t("publish");
    pubBtn.addEventListener("click", async function () {
      pubBtn.disabled = true;
      try {
        if (isPublished) await api.unpublish(test.id);
        else await api.publish(test.id);
        toast(isPublished ? t("testUnpublished") : t("testPublished"), "success");
        await loadTests();
      } catch (err) {
        if (err.status === 401) return showLogin();
        toast(err.message || "Error", "error");
      } finally { pubBtn.disabled = false; }
    });
    actions.appendChild(pubBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "btn btn-sm"; delBtn.textContent = t("delete");
    delBtn.addEventListener("click", async function () {
      if (!window.confirm(t("confirmDelete"))) return;
      delBtn.disabled = true;
      try {
        await api.deleteTest(test.id);
        toast(t("testDeleted"));
        await loadTests();
      } catch (err) {
        if (err.status === 401) return showLogin();
        toast(err.message || "Error", "error");
      } finally { delBtn.disabled = false; }
    });
    actions.appendChild(delBtn);

    return card;
  }

  /* ---------- SUBMISSIONS VIEWER ---------- */

  async function openSubmissions(testId) {
    state.submissionsTestId = testId;
    showScreen("submissions");

    const titleEl = $id("submissionsTitle");
    const loadingEl = $id("submissionsLoading");
    const emptyEl = $id("submissionsEmpty");
    const bodyEl = $id("submissionsBody");
    const listEl = $id("submissionsList");

    if (titleEl) titleEl.textContent = "Loading…";
    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (bodyEl) bodyEl.hidden = true;
    if (listEl) listEl.innerHTML = "";

    try {
      const res = await api.getSubmissions(testId);
      if (titleEl) titleEl.textContent = res.testTitle || "Submissions";
      if (loadingEl) loadingEl.hidden = true;

      const list = Array.isArray(res.submissions) ? res.submissions : [];
      state.submissionsCache = list;

      if (list.length === 0) { if (emptyEl) emptyEl.hidden = false; return; }

      let totalPercent = 0, topPercent = 0;
      list.forEach(function (s) {
        totalPercent += Number(s.percent) || 0;
        if (Number(s.percent) > topPercent) topPercent = Number(s.percent);
      });
      const avgPercent = Math.round(totalPercent / list.length);

      const totalEl = $id("submissionsTotal");
      const avgEl = $id("submissionsAvg");
      const topEl = $id("submissionsTop");
      if (totalEl) totalEl.textContent = String(list.length);
      if (avgEl) avgEl.textContent = avgPercent + "%";
      if (topEl) topEl.textContent = topPercent + "%";

      if (listEl) {
        list.forEach(function (s, idx) { listEl.appendChild(renderSubmissionRow(s, idx)); });
      }
      if (bodyEl) bodyEl.hidden = false;
    } catch (err) {
      if (err.status === 401) return showLogin();
      if (loadingEl) loadingEl.hidden = true;
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = err.message || "Could not load submissions"; }
    }
  }

  function renderSubmissionRow(s, idx) {
    const row = document.createElement("div");
    row.className = "submission-row";

    const name = esc(s.userName || "—");
    const correct = Number(s.correct) || 0;
    const total = Number(s.total) || 0;
    const percent = Number(s.percent) || 0;

    let timeText = "—";
    if (s.submittedAt) {
      const diff = Date.now() - Number(s.submittedAt);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) timeText = "just now";
      else if (mins < 60) timeText = mins + "m ago";
      else if (mins < 1440) timeText = Math.floor(mins / 60) + "h ago";
      else timeText = Math.floor(mins / 1440) + "d ago";
    }

    row.innerHTML =
      '<div class="submission-name">' + name + '</div>' +
      '<div class="submission-score"><strong>' + correct + '</strong><span>/ ' + total + '</span></div>' +
      '<div class="submission-percent">' + percent + '%</div>' +
      '<div class="submission-time">' + esc(timeText) + '</div>';

    row.addEventListener("click", function () { openSubmissionDetail(idx); });
    return row;
  }

  /* ---------- SUBMISSION DETAIL MODAL ---------- */

  function ensureSubmissionModal() {
    let overlay = $id("submissionDetailOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "submissionDetailOverlay";
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="submission-detail-modal">' +
        '<div class="submission-detail-head">' +
          '<div>' +
            '<h2 id="submissionDetailName">—</h2>' +
            '<p id="submissionDetailTest">—</p>' +
          '</div>' +
          '<button type="button" class="submission-detail-close" id="submissionDetailClose" aria-label="Close">' +
            '<svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div class="submission-detail-body" id="submissionDetailBody"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    function close() {
      overlay.hidden = true;
      overlay.classList.remove("open");
    }

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    const closeBtn = overlay.querySelector("#submissionDetailClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) close();
    });

    return overlay;
  }

  function openSubmissionDetail(idx) {
    const s = state.submissionsCache[idx];
    if (!s) return;

    const overlay = ensureSubmissionModal();
    const nameEl = overlay.querySelector("#submissionDetailName");
    const testEl = overlay.querySelector("#submissionDetailTest");
    const bodyEl = overlay.querySelector("#submissionDetailBody");

    const correct = Number(s.correct) || 0;
    const wrong = Number(s.wrong) || 0;
    const unattempted = Number(s.unattempted) || 0;
    const total = Number(s.total) || 0;
    const percent = Number(s.percent) || 0;
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    nameEl.textContent = s.userName || "—";
    const currentTest = state.tests.find(function (x) { return x.id === state.submissionsTestId; });
    testEl.textContent = currentTest ? currentTest.title : "Test";

    const timeTakenText = s.timeTaken > 0 ? formatDuration(s.timeTaken) : "Not recorded";
    const waText = s.userWhatsApp && s.userWhatsApp.trim() ? esc(s.userWhatsApp) : "Not provided";

    bodyEl.innerHTML =
      '<div class="submission-metrics">' +
        '<div class="submission-metric"><strong>' + correct + " / " + total + '</strong><span>Score</span></div>' +
        '<div class="submission-metric"><strong>' + percent + '%</strong><span>Percent</span></div>' +
        '<div class="submission-metric"><strong>' + accuracy + '%</strong><span>Accuracy</span></div>' +
      '</div>' +
      '<div class="submission-breakdown">' +
        '<div class="submission-breakdown-item correct"><strong>' + correct + '</strong><span>Correct</span></div>' +
        '<div class="submission-breakdown-item wrong"><strong>' + wrong + '</strong><span>Wrong</span></div>' +
        '<div class="submission-breakdown-item"><strong>' + unattempted + '</strong><span>Unattempted</span></div>' +
        '<div class="submission-breakdown-item"><strong>' + attempted + '</strong><span>Attempted</span></div>' +
      '</div>' +
      '<div class="submission-meta-list">' +
        '<div class="submission-meta-row"><span class="label">Time taken</span><span class="value' + (s.timeTaken > 0 ? "" : " muted") + '">' + esc(timeTakenText) + '</span></div>' +
        '<div class="submission-meta-row"><span class="label">Submitted</span><span class="value">' + esc(formatDateTime(s.submittedAt)) + '</span></div>' +
        '<div class="submission-meta-row"><span class="label">WhatsApp</span><span class="value' + (s.userWhatsApp && s.userWhatsApp.trim() ? "" : " muted") + '">' + waText + '</span></div>' +
      '</div>';

    overlay.hidden = false;
    overlay.classList.add("open");
    const closeBtn = overlay.querySelector("#submissionDetailClose");
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 40);
  }

  const submissionsBackBtn = $id("submissionsBackBtn");
  if (submissionsBackBtn) {
    submissionsBackBtn.addEventListener("click", function () {
      state.submissionsTestId = null;
      state.submissionsCache = [];
      showScreen("dashboard");
      loadTests();
    });
  }

  /* ---------- SETTINGS ---------- */

  async function loadSettings() {
    const input = $id("displayNameInput");
    if (!input) return;
    try {
      const me = await api.me();
      state.admin = me;
      const nameEl = $id("adminDisplayName");
      if (nameEl) nameEl.textContent = me.displayName || "";
      input.value = me.displayName || "";
      const errEl = $id("displayNameError"); if (errEl) errEl.hidden = true;
    } catch (err) { if (err.status === 401) showLogin(); }
  }

  const settingsForm = $id("settingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = $id("displayNameInput");
      const errEl = $id("displayNameError");
      const btn = $id("saveNameBtn");
      const value = input.value.trim();
      errEl.hidden = true;
      if (!value || value.length < 2) { errEl.textContent = t("nameTooShort"); errEl.hidden = false; return; }
      if (value.length > 60) { errEl.textContent = t("nameTooLong"); errEl.hidden = false; return; }
      btn.disabled = true;
      try {
        const res = await api.updateMe(value);
        state.admin = res;
        const nameEl = $id("adminDisplayName");
        if (nameEl) nameEl.textContent = res.displayName;
        toast(t("nameUpdated"), "success");
      } catch (err) {
        if (err.status === 401) return showLogin();
        errEl.textContent = err.message || "Error"; errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  async function loadInterruptionSettings() {
    try {
      const res = await api.getSettings();
      const cb = $id("interruptionEnabled");
      const dur = $id("interruptionDuration");
      if (cb) cb.checked = res.interruptionEnabled !== false;
      if (dur) dur.value = res.interruptionDuration || 5;
      const errEl = $id("interruptionError");
      if (errEl) errEl.hidden = true;
    } catch (err) {}
  }

  const interruptionForm = $id("interruptionForm");
  if (interruptionForm) {
    interruptionForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const errEl = $id("interruptionError");
      const btn = $id("saveInterruptionBtn");
      errEl.hidden = true;
      const enabled = $id("interruptionEnabled").checked;
      const duration = Number($id("interruptionDuration").value);
      if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
        errEl.textContent = "Duration must be between 1 and 120 minutes";
        errEl.hidden = false; return;
      }
      btn.disabled = true;
      try {
        await api.updateSettings({ interruptionEnabled: enabled, interruptionDuration: duration });
        toast("Settings saved", "success");
      } catch (err) {
        if (err.status === 401) return showLogin();
        errEl.textContent = err.message || "Save failed";
        errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- EDITOR ---------- */

  const newTestBtn = $id("newTestBtn");
  if (newTestBtn) {
    newTestBtn.addEventListener("click", function () {
      state.editing = { id: null, status: "draft", title: "", minutes: 10, questions: [blankQuestion()] };
      renderEditor();
      showScreen("editor");
    });
  }

  const editorBackBtn = $id("editorBackBtn");
  if (editorBackBtn) {
    editorBackBtn.addEventListener("click", function () {
      state.editing = null;
      showScreen("dashboard");
      loadTests();
    });
  }

  async function openEditor(id) {
    try {
      const res = await api.getOwn(id);
      if (!res || !res.test) throw new Error("Test not found");
      state.editing = {
        id: res.test.id,
        status: res.test.status,
        title: res.test.title,
        minutes: res.test.minutes,
        questions: (res.test.questions || []).map(function (q) {
          return { q: q.q, options: q.options.slice(), answer: q.answer };
        })
      };
      renderEditor();
      showScreen("editor");
    } catch (err) {
      if (err.status === 401) return showLogin();
      toast(err.message || "Error", "error");
    }
  }

  function blankQuestion() { return { q: "", options: ["", "", "", ""], answer: 0 }; }

  function renderEditor() {
    if (!state.editing) return;
    const isPublished = state.editing.status === "published";
    $id("editorHeading").textContent = state.editing.id ? (isPublished ? "Edit test" : "Edit draft") : "New test";
    $id("editorTitle").value = state.editing.title || "";
    $id("editorMinutes").value = state.editing.minutes || 10;
    $id("editorError").hidden = true;
    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");
    if (saveDraftBtn) { saveDraftBtn.removeAttribute("data-i18n"); saveDraftBtn.textContent = isPublished ? "Save changes" : t("saveDraft"); }
    if (publishBtn) { publishBtn.removeAttribute("data-i18n"); publishBtn.textContent = isPublished ? t("unpublish") : t("publishNow"); publishBtn.className = isPublished ? "btn btn-sm" : "btn btn-primary btn-sm"; }
    renderQuestionsList();
  }

  function renderQuestionsList() {
    const container = $id("questionsContainer");
    if (!container || !state.editing) return;
    container.innerHTML = "";

    state.editing.questions.forEach(function (question, qi) {
      const block = document.createElement("div");
      block.className = "editor-question";

      const head = document.createElement("div");
      head.className = "editor-question-head";

      const numWrap = document.createElement("div");
      numWrap.className = "editor-question-num-wrap";

      const num = document.createElement("span");
      num.className = "editor-question-number";
      num.textContent = String(qi + 1);

      const label = document.createElement("span");
      label.className = "editor-question-label";
      label.textContent = "Question " + (qi + 1);

      numWrap.appendChild(num);
      numWrap.appendChild(label);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "editor-remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", function () {
        if (state.editing.questions.length <= 1) { toast(t("atLeastOneQuestion"), "error"); return; }
        state.editing.questions.splice(qi, 1);
        renderQuestionsList();
      });

      head.appendChild(numWrap);
      head.appendChild(removeBtn);
      block.appendChild(head);

      const qField = document.createElement("div");
      qField.className = "form-field";
      const qLabel = document.createElement("label");
      qLabel.className = "form-label";
      qLabel.textContent = "Question";
      const qInput = document.createElement("textarea");
      qInput.className = "form-textarea";
      qInput.rows = 2;
      qInput.value = question.q;
      qInput.placeholder = "Type the question";
      qInput.addEventListener("input", function () { question.q = qInput.value; });
      qField.appendChild(qLabel);
      qField.appendChild(qInput);
      block.appendChild(qField);

      const optLabel = document.createElement("div");
      optLabel.className = "form-label";
      optLabel.style.marginTop = "14px";
      optLabel.textContent = "Options — click the circle to mark the correct answer";
      block.appendChild(optLabel);

      const optWrap = document.createElement("div");
      optWrap.className = "editor-options";

      question.options.forEach(function (_, oi) {
        const row = document.createElement("div");
        row.className = "editor-option" + (question.answer === oi ? " is-answer" : "");

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer-q" + qi;
        radio.checked = question.answer === oi;
        radio.className = "editor-option-radio";
        radio.setAttribute("aria-label", "Mark option " + "ABCD".charAt(oi) + " as correct");
        radio.addEventListener("change", function () {
          question.answer = oi;
          block.querySelectorAll(".editor-option").forEach(function (r, idx) { r.classList.toggle("is-answer", idx === oi); });
        });

        const key = document.createElement("span");
        key.className = "editor-option-key";
        key.textContent = "ABCD".charAt(oi);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "editor-option-input";
        input.placeholder = "Option " + "ABCD".charAt(oi);
        input.value = question.options[oi];
        input.addEventListener("input", function () { question.options[oi] = input.value; });

        row.appendChild(radio);
        row.appendChild(key);
        row.appendChild(input);
        optWrap.appendChild(row);
      });

      block.appendChild(optWrap);
      container.appendChild(block);
    });
  }

  const addQuestionBtn = $id("addQuestionBtn");
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", function () {
      if (!state.editing) return;
      state.editing.questions.push(blankQuestion());
      renderQuestionsList();
      const container = $id("questionsContainer");
      if (container && container.lastElementChild) container.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    if (!$id("importJsonBtn")) {
      const importBtn = document.createElement("button");
      importBtn.id = "importJsonBtn";
      importBtn.type = "button";
      importBtn.className = "btn btn-sm";
      importBtn.textContent = "Import JSON";
      importBtn.addEventListener("click", openImportModal);
      addQuestionBtn.parentNode.insertBefore(importBtn, addQuestionBtn);
    }
  }

  function ensureImportModal() {
    let overlay = $id("importModalOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "importModalOverlay";
    overlay.className = "import-modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="import-modal" role="dialog" aria-modal="true" aria-labelledby="importTitle">' +
        '<h2 id="importTitle">Import questions from JSON</h2>' +
        '<p class="import-hint">Paste a JSON <strong>array of questions</strong>, or an <strong>object</strong> with <code>title</code>, <code>minutes</code>, and <code>questions</code>.</p>' +
        '<details class="import-example"><summary>Show example</summary>' +
          '<pre>{\n  "title": "Assam GK Mock Test",\n  "minutes": 20,\n  "questions": [\n    {\n      "q": "What is the capital of Assam?",\n      "options": ["Guwahati", "Dispur", "Jorhat", "Tezpur"],\n      "answer": 1\n    }\n  ]\n}</pre>' +
        '</details>' +
        '<textarea id="importTextarea" class="import-textarea" placeholder="Paste JSON here..."></textarea>' +
        '<p class="form-error" id="importError" hidden></p>' +
        '<div class="import-modal-actions">' +
          '<button type="button" class="btn" id="importCancelBtn">Cancel</button>' +
          '<button type="button" class="btn btn-primary" id="importConfirmBtn">Import</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    const cancel = overlay.querySelector("#importCancelBtn");
    const confirm = overlay.querySelector("#importConfirmBtn");
    const ta = overlay.querySelector("#importTextarea");
    const errEl = overlay.querySelector("#importError");

    function close() { overlay.hidden = true; }
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });

    confirm.addEventListener("click", function () {
      errEl.hidden = true;
      const raw = ta.value.trim();
      if (!raw) { errEl.textContent = "Paste JSON first"; errEl.hidden = false; return; }

      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { errEl.textContent = "Invalid JSON: " + e.message; errEl.hidden = false; return; }

      let rawQuestions = null, title = null, minutes = null;
      if (Array.isArray(parsed)) rawQuestions = parsed;
      else if (parsed && typeof parsed === "object") {
        rawQuestions = parsed.questions;
        if (typeof parsed.title === "string") title = parsed.title;
        if (typeof parsed.minutes === "number") minutes = parsed.minutes;
      }

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) { errEl.textContent = "JSON must contain a non-empty questions array"; errEl.hidden = false; return; }

      const cleaned = [];
      for (let i = 0; i < rawQuestions.length; i++) {
        const rawQ = rawQuestions[i];
        const n = i + 1;
        if (!rawQ || typeof rawQ !== "object") { errEl.textContent = "Question " + n + ": invalid entry"; errEl.hidden = false; return; }
        if (typeof rawQ.q !== "string" || !rawQ.q.trim()) { errEl.textContent = "Question " + n + ": missing q"; errEl.hidden = false; return; }
        if (!Array.isArray(rawQ.options) || rawQ.options.length !== 4) { errEl.textContent = "Question " + n + ": exactly 4 options required"; errEl.hidden = false; return; }
        for (let j = 0; j < 4; j++) { if (typeof rawQ.options[j] !== "string" || !rawQ.options[j].trim()) { errEl.textContent = "Question " + n + ": option " + (j + 1) + " is empty"; errEl.hidden = false; return; } }
        if (typeof rawQ.answer !== "number" || !Number.isInteger(rawQ.answer) || rawQ.answer < 0 || rawQ.answer > 3) { errEl.textContent = "Question " + n + ": answer must be 0, 1, 2, or 3"; errEl.hidden = false; return; }
        cleaned.push({ q: rawQ.q.trim(), options: rawQ.options.map(function (o) { return o.trim(); }), answer: rawQ.answer });
      }

      if (!state.editing) { close(); return; }

      const hasExisting = state.editing.questions.length > 0 && !(state.editing.questions.length === 1 && !state.editing.questions[0].q.trim());
      if (hasExisting) {
        const ok = window.confirm("Import " + cleaned.length + " question(s)?\n\nOK = Append\nCancel = Replace");
        if (ok) state.editing.questions = state.editing.questions.concat(cleaned);
        else state.editing.questions = cleaned.slice();
      } else state.editing.questions = cleaned.slice();

      if (title && !$id("editorTitle").value.trim()) $id("editorTitle").value = title.trim().slice(0, 200);
      if (minutes && Number.isInteger(minutes) && minutes >= 1 && minutes <= 180) $id("editorMinutes").value = minutes;

      state.editing.title = $id("editorTitle").value;
      state.editing.minutes = Number($id("editorMinutes").value) || state.editing.minutes;

      renderQuestionsList();
      close();
      ta.value = "";
      toast("Imported " + cleaned.length + " question(s)", "success");
    });

    return overlay;
  }

  function openImportModal() {
    if (!state.editing) return;
    const overlay = ensureImportModal();
    overlay.hidden = false;
    const ta = overlay.querySelector("#importTextarea");
    setTimeout(function () { if (ta) ta.focus(); }, 50);
  }

  function collectEditor() {
    const title = $id("editorTitle").value.trim();
    const minutes = Number($id("editorMinutes").value);
    if (!title) return { error: "Test title is required" };
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return { error: "Duration must be between 1 and 180 minutes" };

    const questions = [];
    for (let i = 0; i < state.editing.questions.length; i++) {
      const raw = state.editing.questions[i];
      const cleaned = { q: raw.q.trim(), options: raw.options.map(function (o) { return o.trim(); }), answer: raw.answer };
      if (!cleaned.q) return { error: "Question " + (i + 1) + ": text is required" };
      if (cleaned.options.some(function (o) { return !o; })) return { error: "Question " + (i + 1) + ": all 4 options are required" };
      if (typeof cleaned.answer !== "number" || cleaned.answer < 0 || cleaned.answer > 3) return { error: "Question " + (i + 1) + ": select the correct answer" };
      questions.push(cleaned);
    }
    if (questions.length === 0) return { error: "Add at least one question" };
    return { payload: { title: title, minutes: minutes, questions: questions } };
  }

  async function saveEditor(action) {
    const errEl = $id("editorError");
    errEl.hidden = true;
    const collected = collectEditor();
    if (collected.error) { errEl.textContent = collected.error; errEl.hidden = false; errEl.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const payload = collected.payload;
    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;

    try {
      if (state.editing.id) await api.updateTest(state.editing.id, payload);
      else { const created = await api.createTest(payload); state.editing.id = created.test.id; }

      if (action === "publish") {
        await new Promise(function (r) { setTimeout(r, 250); });
        await api.publish(state.editing.id);
        toast(t("testPublished"), "success");
      } else if (action === "unpublish") {
        await api.unpublish(state.editing.id);
        toast(t("testUnpublished"));
      } else {
        toast(t("testUpdated"));
      }

      state.editing = null;
      showScreen("dashboard");
      await loadTests();
    } catch (err) {
      console.error("Save error:", err);
      if (err.status === 401) return showLogin();
      errEl.textContent = err.message || "Save failed";
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally { saveDraftBtn.disabled = false; publishBtn.disabled = false; }
  }

  const saveDraftBtn = $id("saveDraftBtn");
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", function () { saveEditor("save"); });

  const publishBtn = $id("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", function () {
      const isPublished = state.editing && state.editing.status === "published";
      if (isPublished) { if (!window.confirm("Unpublish this test?")) return; saveEditor("unpublish"); }
      else { if (!window.confirm(t("confirmPublish"))) return; saveEditor("publish"); }
    });
  }

  /* ---------- MOBILE MENU ---------- */

  const menuToggle = $id("menuToggle"), menuPanel = $id("menuPanel"), menuIcon = $id("menuIcon");
  const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else { menuPanel.classList.add("open"); menuToggle.setAttribute("aria-expanded", "true"); menuIcon.innerHTML = closeSVG; }
    });
    document.addEventListener("click", function (e) {
      if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    menuPanel.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeMenu); });
  }

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  document.addEventListener("pk:langchange", function () {
    if (screens.dashboard && !screens.dashboard.hidden && state.tests.length) {
      const list = $id("testsList");
      if (list) { list.innerHTML = ""; state.tests.forEach(function (test) { list.appendChild(renderTestCard(test)); }); }
    }
    if (state.editing && screens.editor && !screens.editor.hidden) renderEditor();
    if (state.submissionsTestId && screens.submissions && !screens.submissions.hidden) openSubmissions(state.submissionsTestId);
  });

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  (async function init() {
    showScreen("loading");
    if (getIdToken() || getRefreshToken()) {
      try {
        const me = await api.me();
        state.admin = me;
        await enterDashboard();
        startInactivityTimer();
        return;
      } catch (err) { clearTokens(); }
    }
    showLogin();
  })();

})();
