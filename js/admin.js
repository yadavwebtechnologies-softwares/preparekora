"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "" ||
      host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_admin_id_token";
  const REFRESH_KEY = "pk_admin_refresh_token";
  const EXPIRES_KEY = "pk_admin_expires_at";

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
    unpublish: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/unpublish", { method: "POST" }); }
  };

  function t(key, vars) { return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key; }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }; return m[c]; }); }
  function $id(id) { return document.getElementById(id); }

  function showOverlay(el) {
    if (!el) return;
    el.classList.remove("is-hidden");
    el.setAttribute("aria-hidden", "false");
  }

  function hideOverlay(el) {
    if (!el) return;
    el.classList.add("is-hidden");
    el.setAttribute("aria-hidden", "true");
  }

  function toast(message, kind) {
    const container = $id("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }
  let confirmCallback = null;

  function openConfirmModal(opts) {
    const overlay = $id("confirmOverlay");
    if (!overlay) {
      if (window.confirm(opts.message || "Are you sure?")) {
        if (typeof opts.onConfirm === "function") opts.onConfirm();
      }
      return;
    }
    if (overlay.classList.contains("open")) return;
    const title = $id("confirmTitle");
    const msg = $id("confirmMessage");
    const okBtn = $id("confirmOk");
    if (title) title.textContent = opts.title || "Are you sure?";
    if (msg) msg.textContent = opts.message || "";
    if (okBtn) okBtn.textContent = opts.confirmLabel || "Confirm";
    confirmCallback = typeof opts.onConfirm === "function" ? opts.onConfirm : null;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { const c = $id("confirmCancel"); if (c) c.focus(); }, 40);
  }

  function closeConfirmModal() {
    const overlay = $id("confirmOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    confirmCallback = null;
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

  function formatDuration(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-IN", { month: "short" });
    const yr = d.getFullYear();
    const hr = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return day + " " + mon + " " + yr + " " + hr + ":" + mn;
  }

  function csvEsc(v) {
    const s = String(v == null ? "" : v);
    if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const state = { admin: null, tests: [], editing: null, currentTab: "tests" };
  const screens = {
    loading: $id("adminLoading"),
    login: $id("loginScreen"),
    dashboard: $id("dashboardScreen"),
    editor: $id("editorScreen"),
    submissions: $id("submissionsScreen"),
    analysis: $id("analysisScreen")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
    window.scrollTo({ top: 0, behavior: "auto" });
    if (name === "editor" || name === "submissions" || name === "analysis") stopLivePolling();
    else if (name === "dashboard" && state.admin) startLivePolling();
  }

  function showLogin() {
    stopLivePolling();
    state.admin = null; state.tests = []; state.editing = null;
    const u = $id("loginUser"), p = $id("loginPass"), e = $id("loginError");
    if (u) u.value = ""; if (p) p.value = ""; if (e) e.hidden = true;
    showScreen("login");
  }

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
  const logoutOverlay = $id("logoutOverlay");
  const logoutCancel = $id("logoutCancel");
  const logoutConfirm = $id("logoutConfirm");

  function openLogoutModal() {
    if (!logoutOverlay) { clearTokens(); showLogin(); return; }
    logoutOverlay.classList.add("open");
    logoutOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (logoutCancel) logoutCancel.focus(); }, 40);
  }

  function closeLogoutModal() {
    if (!logoutOverlay) return;
    logoutOverlay.classList.remove("open");
    logoutOverlay.setAttribute("aria-hidden", "true");
  }

  if (signOutBtn) signOutBtn.addEventListener("click", openLogoutModal);
  if (logoutCancel) logoutCancel.addEventListener("click", closeLogoutModal);
  if (logoutConfirm) logoutConfirm.addEventListener("click", function () {
    closeLogoutModal();
    clearTokens();
    showLogin();
  });
  if (logoutOverlay) {
    logoutOverlay.addEventListener("click", function (e) {
      if (e.target === logoutOverlay) closeLogoutModal();
    });
  }

  const confirmOverlay = $id("confirmOverlay");
  const confirmCancel = $id("confirmCancel");
  const confirmOk = $id("confirmOk");

  if (confirmCancel) confirmCancel.addEventListener("click", closeConfirmModal);
  if (confirmOk) {
    confirmOk.addEventListener("click", function () {
      const cb = confirmCallback;
      closeConfirmModal();
      if (cb) cb();
    });
  }
  if (confirmOverlay) {
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirmModal();
    });
  }

  const tabTests = $id("tabTests"), tabSettings = $id("tabSettings");
  const tabUsersEl = $id("tabUsers");
  const panelTests = $id("panelTests"), panelSettings = $id("panelSettings");
  const panelUsers = $id("panelUsers");

  function setTab(tab) {
    state.currentTab = tab;
    if (tabTests) { const a = tab === "tests"; tabTests.classList.toggle("is-active", a); tabTests.setAttribute("aria-selected", String(a)); }
    if (tabUsersEl) { const a = tab === "users"; tabUsersEl.classList.toggle("is-active", a); tabUsersEl.setAttribute("aria-selected", String(a)); }
    if (tabSettings) { const a = tab === "settings"; tabSettings.classList.toggle("is-active", a); tabSettings.setAttribute("aria-selected", String(a)); }
    if (panelTests) panelTests.hidden = tab !== "tests";
    if (panelUsers) panelUsers.hidden = tab !== "users";
    if (panelSettings) panelSettings.hidden = tab !== "settings";
    if (tab === "settings") loadSettings();
    if (tab === "users") loadUsers();
    if (tab === "tests") startLivePolling();
    if (tab !== "tests") stopLivePolling();
  }

  if (tabTests) tabTests.addEventListener("click", function () { setTab("tests"); });
  if (tabSettings) tabSettings.addEventListener("click", function () { setTab("settings"); });
  if (tabUsersEl) tabUsersEl.addEventListener("click", function () { setTab("users"); });

  const TESTS_PAGE_SIZE = 5;
  let testsCurrentPage = 1;
  let testsSearchQuery = "";
  let testsFilteredList = [];

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
    showOverlay(loading);
    if (empty) empty.hidden = true;
    list.hidden = true; list.innerHTML = "";
    const pagination = $id("testsPagination");
    if (pagination) pagination.hidden = true;

    try {
      const res = await api.listOwn();
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      hideOverlay(loading);
      if (state.tests.length === 0) { if (empty) empty.hidden = false; return; }
      renderTestsPage();
    } catch (err) {
      hideOverlay(loading);
      if (err.status === 401) { showLogin(); return; }
      if (empty) { empty.hidden = false; empty.textContent = err.message || t("loadFailed"); }
    }
  }

  function renderTestsPage() {
    const list = $id("testsList");
    const empty = $id("testsEmpty");
    const pagination = $id("testsPagination");
    if (!list) return;

    const q = testsSearchQuery.trim().toLowerCase();
    testsFilteredList = q
      ? state.tests.filter(function (test) {
          const hay = [
            test.title || "",
            test.status || "",
            String(test.questionCount || ""),
            String(test.minutes || "")
          ].join(" ").toLowerCase();
          return hay.indexOf(q) !== -1;
        })
      : state.tests.slice();

    list.innerHTML = "";
    list.hidden = false;

    if (testsFilteredList.length === 0) {
      list.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = q ? t("noMatches") : t("noTests");
      }
      if (pagination) pagination.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;

    const totalPages = Math.max(1, Math.ceil(testsFilteredList.length / TESTS_PAGE_SIZE));
    if (testsCurrentPage > totalPages) testsCurrentPage = totalPages;
    if (testsCurrentPage < 1) testsCurrentPage = 1;

    const start = (testsCurrentPage - 1) * TESTS_PAGE_SIZE;
    const pageItems = testsFilteredList.slice(start, start + TESTS_PAGE_SIZE);

    pageItems.forEach(function (test) { list.appendChild(renderTestCard(test)); });
    if (liveLastData) updateTestCardBadges();

    if (pagination) {
      if (totalPages <= 1) {
        pagination.hidden = true;
      } else {
        pagination.hidden = false;
        const info = $id("testsPageInfo");
        if (info) info.textContent = t("pageOf", { a: testsCurrentPage, b: totalPages });
        const prev = $id("testsPrev");
        const next = $id("testsNext");
        if (prev) prev.disabled = testsCurrentPage <= 1;
        if (next) next.disabled = testsCurrentPage >= totalPages;
      }
    }
  }

  function renderTestCard(test) {
    const card = document.createElement("div");
    card.className = "admin-test-card";
    card.setAttribute("data-test-id", test.id);
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

    const subsBtn = document.createElement("button");
    subsBtn.type = "button"; subsBtn.className = "btn btn-sm"; subsBtn.textContent = "Submissions";
    subsBtn.addEventListener("click", function () { openSubmissions(test.id); });
    actions.appendChild(subsBtn);

    const analysisBtn = document.createElement("button");
    analysisBtn.type = "button"; analysisBtn.className = "btn btn-sm"; analysisBtn.textContent = "Analysis";
    analysisBtn.addEventListener("click", function () { openAnalysis(test.id); });
    actions.appendChild(analysisBtn);

    const pubBtn = document.createElement("button");
    pubBtn.type = "button";
    pubBtn.className = "btn btn-sm" + (isPublished ? "" : " btn-primary");
    pubBtn.textContent = isPublished ? t("unpublish") : t("publish");
    pubBtn.addEventListener("click", function () {
      const doAction = async function () {
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
      };
      if (isPublished) {
        openConfirmModal({
          title: "Unpublish test?",
          message: t("confirmUnpublish"),
          confirmLabel: t("unpublish"),
          onConfirm: doAction
        });
      } else {
        doAction();
      }
    });
    actions.appendChild(pubBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "btn btn-sm"; delBtn.textContent = t("delete");
    delBtn.addEventListener("click", function () {
      openConfirmModal({
        title: "Delete test?",
        message: t("confirmDelete"),
        confirmLabel: t("delete"),
        onConfirm: async function () {
          delBtn.disabled = true;
          try {
            await api.deleteTest(test.id);
            toast(t("testDeleted"));
            await loadTests();
          } catch (err) {
            if (err.status === 401) return showLogin();
            toast(err.message || "Error", "error");
          } finally { delBtn.disabled = false; }
        }
      });
    });
    actions.appendChild(delBtn);

    return card;
  }

  const testsSearchInput = $id("testsSearchInput");
  if (testsSearchInput) {
    testsSearchInput.addEventListener("input", function () {
      testsSearchQuery = testsSearchInput.value;
      testsCurrentPage = 1;
      renderTestsPage();
    });
  }

  const testsPrev = $id("testsPrev");
  if (testsPrev) {
    testsPrev.addEventListener("click", function () {
      if (testsCurrentPage > 1) { testsCurrentPage--; renderTestsPage(); }
    });
  }
  const testsNext = $id("testsNext");
  if (testsNext) {
    testsNext.addEventListener("click", function () {
      const totalPages = Math.max(1, Math.ceil(testsFilteredList.length / TESTS_PAGE_SIZE));
      if (testsCurrentPage < totalPages) { testsCurrentPage++; renderTestsPage(); }
    });
  }

  async function loadSettings() {
    const input = $id("displayNameInput");
    if (!input) return;
    const loading = $id("settingsLoading");
    showOverlay(loading);
    try {
      const me = await api.me();
      state.admin = me;
      const nameEl = $id("adminDisplayName");
      if (nameEl) nameEl.textContent = me.displayName || "";
      input.value = me.displayName || "";
      const errEl = $id("displayNameError"); if (errEl) errEl.hidden = true;
      await loadFreeTestsSettings();
    } catch (err) {
      if (err.status === 401) showLogin();
    } finally {
      hideOverlay(loading);
    }
  }

  async function loadFreeTestsSettings() {
    const panel = $id("panelSettings");
    if (!panel) return;

    let published = [];
    try {
      const listRes = await api.listOwn();
      published = (Array.isArray(listRes.tests) ? listRes.tests : [])
        .filter(function (x) { return x.status === "published"; });
    } catch (e) { published = []; }

    let freeTestIds = [];
    let gatingEnabled = false;
    try {
      const res = await fetch(API_BASE + "/settings", { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.freeTestIds)) freeTestIds = data.freeTestIds;
        if (data.gatingEnabled === true) gatingEnabled = true;
      }
    } catch (e) {}

    let card = $id("freeTestsCard");
    if (!card) {
      card = document.createElement("div");
      card.className = "card";
      card.id = "freeTestsCard";
      card.style.maxWidth = "480px";
      card.style.marginTop = "16px";
      panel.appendChild(card);
    }

    let html = '<h2 style="margin: 0 0 16px; font-size: 15px; font-weight: 600;">Free tests</h2>';
    html += '<p class="form-hint" style="margin: 0 0 14px;">Select which published tests can be taken without login.</p>';

    if (published.length === 0) {
      html += '<div class="empty-state" style="padding: 16px; font-size: 12px;">No published tests yet. Publish a test first.</div>';
    } else {
      html += '<div id="freeTestsList" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">';
      published.forEach(function (test) {
        const checked = freeTestIds.indexOf(test.id) !== -1 ? " checked" : "";
        html += '<label class="editor-option" style="cursor: pointer;">' +
          '<input type="checkbox" class="freeTestCheckbox" value="' + esc(test.id) + '"' + checked + ' style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">' +
          '<span class="editor-option-text" style="font-size: 13px;">' + esc(test.title) + '</span>' +
        '</label>';
      });
      html += '</div>';
    }

    html += '<label style="display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid var(--border); cursor: pointer;">' +
      '<input type="checkbox" id="gatingEnabledCheckbox"' + (gatingEnabled ? " checked" : "") + ' style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">' +
      '<span style="font-size: 13px; font-weight: 500;">Require login for non-free tests</span>' +
    '</label>';

    html += '<p class="form-hint" style="margin: 0 0 12px;">When OFF, all tests are free (default). When ON, only checked tests are free — others require sign-in.</p>';
    html += '<div class="form-error" id="freeTestsError" hidden></div>';
    html += '<div class="form-actions" style="margin-top: 12px;">' +
      '<button class="btn btn-primary" id="saveFreeTestsBtn" type="button">Save</button>' +
    '</div>';

    card.innerHTML = html;

    const saveBtn = $id("saveFreeTestsBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveFreeTestsSettings);
  }

  async function saveFreeTestsSettings() {
    const errEl = $id("freeTestsError");
    if (errEl) errEl.hidden = true;

    const checkboxes = document.querySelectorAll(".freeTestCheckbox");
    const freeTestIds = [];
    checkboxes.forEach(function (cb) { if (cb.checked) freeTestIds.push(cb.value); });

    const gatingEl = $id("gatingEnabledCheckbox");
    const gatingEnabled = !!(gatingEl && gatingEl.checked);

    const saveBtn = $id("saveFreeTestsBtn");
    if (saveBtn) saveBtn.disabled = true;

    try {
      const token = getIdToken();
      const res = await fetch(API_BASE + "/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ freeTestIds: freeTestIds, gatingEnabled: gatingEnabled })
      });
      const data = await res.json().catch(function () { return null; });
      if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));
      toast("Free test settings saved", "success");
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || "Save failed"; errEl.hidden = false; }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
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

  const newTestBtn = $id("newTestBtn");
  if (newTestBtn) {
    newTestBtn.addEventListener("click", function () {
      state.editing = { id: null, status: "draft", title: "", minutes: 10, exam: "", questions: [blankQuestion()] };
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
        exam: typeof res.test.exam === "string" ? res.test.exam : "",
        questions: (res.test.questions || []).map(function (q) {
          const out = { q: q.q, options: q.options.slice(), answer: q.answer, hint: "" };
          if (typeof q.hint === "string" && q.hint.trim()) out.hint = q.hint;
          if (q.type === "math" || q.type === "reasoning") out.type = q.type;
          if (typeof q.latex === "string" && q.latex.length) out.latex = q.latex;
          if (typeof q.imageBase64 === "string" && q.imageBase64.indexOf("data:image/") === 0) {
            out.imageBase64 = q.imageBase64;
          }
          return out;
        })
      };
      renderEditor();
      showScreen("editor");
    } catch (err) {
      if (err.status === 401) return showLogin();
      toast(err.message || "Error", "error");
    }
  }

  function blankQuestion() {
    return { q: "", options: ["", "", "", ""], answer: 0, hint: "" };
  }

  function renderEditor() {
    if (!state.editing) return;
    const isPublished = state.editing.status === "published";
    $id("editorHeading").textContent = state.editing.id ? (isPublished ? "Edit test" : "Edit draft") : "New test";
    $id("editorTitle").value = state.editing.title || "";
    $id("editorMinutes").value = state.editing.minutes || 10;
    const examEl = $id("editorExam");
    if (examEl) examEl.value = state.editing.exam || "";
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
        if (state.editing.questions.length <= 1) {
          toast(t("atLeastOneQuestion"), "error"); return;
        }
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
          block.querySelectorAll(".editor-option").forEach(function (r, idx) {
            r.classList.toggle("is-answer", idx === oi);
          });
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

      const hintField = document.createElement("div");
      hintField.className = "form-field";
      hintField.style.marginTop = "14px";

      const hintLabel = document.createElement("label");
      hintLabel.className = "form-label";
      hintLabel.textContent = "Hint (optional — English, auto-translated to Assamese)";

      const hintInput = document.createElement("textarea");
      hintInput.className = "form-textarea";
      hintInput.rows = 2;
      hintInput.maxLength = 500;
      hintInput.placeholder = "One-line conceptual hint. Do not reveal the answer.";
      hintInput.value = question.hint || "";
      hintInput.addEventListener("input", function () { question.hint = hintInput.value; });

      hintField.appendChild(hintLabel);
      hintField.appendChild(hintInput);
      block.appendChild(hintField);

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
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

    function collectEditor() {
    const title = $id("editorTitle").value.trim();
    const minutes = Number($id("editorMinutes").value);
    const examEl = $id("editorExam");
    const exam = examEl ? examEl.value.trim() : "";
    if (!title) return { error: "Test title is required" };
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return { error: "Duration must be between 1 and 180 minutes" };
    if (exam.length > 30) return { error: "Exam name too long (max 30 chars)" };

    const questions = [];
    for (let i = 0; i < state.editing.questions.length; i++) {
      const raw = state.editing.questions[i];
      const cleaned = { q: raw.q.trim(), options: raw.options.map(function (o) { return o.trim(); }), answer: raw.answer };
      if (!cleaned.q) return { error: "Question " + (i + 1) + ": text is required" };
      if (cleaned.options.some(function (o) { return !o; })) return { error: "Question " + (i + 1) + ": all 4 options are required" };
      if (typeof cleaned.answer !== "number" || cleaned.answer < 0 || cleaned.answer > 3) return { error: "Question " + (i + 1) + ": select the correct answer" };
      if (raw.type === "math" || raw.type === "reasoning") cleaned.type = raw.type;
      if (typeof raw.latex === "string" && raw.latex.length) cleaned.latex = raw.latex;
      if (typeof raw.imageBase64 === "string" && raw.imageBase64.indexOf("data:image/") === 0) {
        cleaned.imageBase64 = raw.imageBase64;
      }
      if (typeof raw.hint === "string" && raw.hint.trim()) {
        if (raw.hint.trim().length > 500) return { error: "Question " + (i + 1) + ": hint too long (max 500 chars)" };
        cleaned.hint = raw.hint.trim();
      }
      questions.push(cleaned);
    }
    if (questions.length === 0) return { error: "Add at least one question" };
    return { payload: { title: title, minutes: minutes, exam: exam, questions: questions } };
  }

  async function saveEditor(action) {
    const errEl = $id("editorError");
    errEl.hidden = true;
    const collected = collectEditor();
    if (collected.error) { errEl.textContent = collected.error; errEl.hidden = false; errEl.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const payload = collected.payload;
    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");
    saveDraftBtn.disabled = true; publishBtn.disabled = true;

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
      if (isPublished) {
        openConfirmModal({
          title: "Unpublish test?",
          message: t("confirmUnpublish"),
          confirmLabel: t("unpublish"),
          onConfirm: function () { saveEditor("unpublish"); }
        });
      } else {
        if (!window.confirm(t("confirmPublish"))) return;
        saveEditor("publish");
      }
    });
  }

  const LIVE_POLL_MS = 30000;
  let livePollId = null;
  let liveTickerId = null;
  let liveLastUpdated = 0;
  let liveLastData = null;

  async function fetchLiveSessions() {
    try {
      const res = await request("/admin/sessions/active");
      liveLastData = (res && typeof res === "object") ? res : { total: 0, sessions: [] };
      liveLastUpdated = Date.now();
      renderLivePill(false);
      updateTestCardBadges();
      return true;
    } catch (err) {
      if (err.status === 401) { stopLivePolling(); showLogin(); return false; }
      renderLivePill(true);
      return false;
    }
  }

  function startLivePolling() {
    if (livePollId) return;
    if (!state.admin) return;
    fetchLiveSessions();
    livePollId = setInterval(function () {
      if (document.hidden) return;
      if (screens.editor && !screens.editor.hidden) return;
      if (screens.submissions && !screens.submissions.hidden) return;
      if (screens.analysis && !screens.analysis.hidden) return;
      fetchLiveSessions();
    }, LIVE_POLL_MS);
    if (!liveTickerId) {
      liveTickerId = setInterval(function () {
        if (!liveLastUpdated) return;
        const pill = $id("livePill");
        if (!pill) return;
        const el = pill.querySelector(".live-updated");
        if (!el) return;
        const secs = Math.max(0, Math.round((Date.now() - liveLastUpdated) / 1000));
        el.textContent = "Updated " + secs + "s ago";
      }, 1000);
    }
  }

  function stopLivePolling() {
    if (livePollId) { clearInterval(livePollId); livePollId = null; }
    if (liveTickerId) { clearInterval(liveTickerId); liveTickerId = null; }
  }

  function renderLivePill(failed) {
    const pill = $id("livePill");
    if (!pill) return;
    const dot = pill.querySelector(".live-dot");
    const countEl = pill.querySelector(".live-count");
    const updatedEl = pill.querySelector(".live-updated");

    if (failed) {
      pill.classList.add("is-failed");
      if (dot) dot.classList.add("is-idle");
      if (countEl) countEl.textContent = "Live count unavailable";
      if (updatedEl) updatedEl.textContent = "";
      return;
    }

    pill.classList.remove("is-failed");
    const total = liveLastData ? (Number(liveLastData.total) || 0) : 0;
    if (dot) dot.classList.toggle("is-idle", total === 0);
    if (countEl) countEl.textContent = total === 1 ? "1 live now" : total + " live now";
    if (updatedEl && liveLastUpdated) {
      const secs = Math.max(0, Math.round((Date.now() - liveLastUpdated) / 1000));
      updatedEl.textContent = "Updated " + secs + "s ago";
    }
  }

  function updateTestCardBadges() {
    if (!liveLastData || !Array.isArray(liveLastData.sessions)) return;
    const map = {};
    liveLastData.sessions.forEach(function (s) {
      if (s && s.testId) map[s.testId] = Number(s.activeCount) || 0;
    });

    const list = $id("testsList");
    if (!list) return;

    list.querySelectorAll(".admin-test-card").forEach(function (card) {
      const testId = card.getAttribute("data-test-id");
      if (!testId) return;
      const count = map[testId] || 0;

      let badge = card.querySelector(".live-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "live-badge";
        badge.innerHTML = '<span class="live-dot"></span><span class="live-badge-text"></span>';
        const info = card.querySelector(".admin-test-info");
        if (info) info.appendChild(badge);
      }
      const dot = badge.querySelector(".live-dot");
      const text = badge.querySelector(".live-badge-text");
      if (dot) dot.classList.toggle("is-idle", count === 0);
      if (text) text.textContent = count + " live";
    });
  }

  const liveRefreshBtn = $id("liveRefreshBtn");
  if (liveRefreshBtn) {
    liveRefreshBtn.addEventListener("click", function () {
      liveRefreshBtn.disabled = true;
      fetchLiveSessions().finally(function () { liveRefreshBtn.disabled = false; });
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && state.admin && screens.dashboard && !screens.dashboard.hidden) {
      fetchLiveSessions();
    }
  });

  let currentSubmissionsTestId = null;
  const SUBMISSIONS_PAGE_SIZE = 10;
  let submittedAllRows = [];
  let submittedPage = 1;
  let pendingAllRows = [];
  let pendingPage = 1;

  function setSubmissionsTab(tab) {
    const tabSubmitted = $id("tabSubmitted");
    const tabPending = $id("tabPending");
    const panelSubmitted = $id("panelSubmitted");
    const panelPending = $id("panelPending");
    if (tabSubmitted) { const a = tab === "submitted"; tabSubmitted.classList.toggle("is-active", a); tabSubmitted.setAttribute("aria-selected", String(a)); }
    if (tabPending) { const a = tab === "pending"; tabPending.classList.toggle("is-active", a); tabPending.setAttribute("aria-selected", String(a)); }
    if (panelSubmitted) panelSubmitted.hidden = tab !== "submitted";
    if (panelPending) panelPending.hidden = tab !== "pending";
  }

  async function openSubmissions(id) {
    currentSubmissionsTestId = id;
    const heading = $id("submissionsHeading");
    const test = state.tests.find(function (x) { return x.id === id; });
    if (heading) heading.textContent = test ? ("Submissions — " + test.title) : "Submissions";
    showScreen("submissions");
    setSubmissionsTab("submitted");
    await Promise.all([loadSubmitted(), loadPending()]);
  }

  async function loadSubmitted() {
    const loading = $id("submittedLoading");
    const empty = $id("submittedEmpty");
    const wrap = $id("submittedTableWrap");
    const body = $id("submittedTableBody");
    const pagination = $id("submittedPagination");
    if (!body) return;
    showOverlay(loading);
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = true;
    if (pagination) pagination.hidden = true;
    body.innerHTML = "";
    submittedAllRows = [];
    submittedPage = 1;

    try {
      const res = await request("/admin/tests/" + encodeURIComponent(currentSubmissionsTestId) + "/submissions");
      const list = (res && Array.isArray(res.submissions)) ? res.submissions : [];
      hideOverlay(loading);
      submittedAllRows = list;
      if (list.length === 0) { if (empty) empty.hidden = false; return; }
      renderSubmittedPage();
    } catch (err) {
      hideOverlay(loading);
      if (err.status === 401) return showLogin();
      if (empty) { empty.hidden = false; empty.textContent = err.message || "Failed to load"; }
    }
  }

  function renderSubmittedPage() {
    const wrap = $id("submittedTableWrap");
    const body = $id("submittedTableBody");
    const pagination = $id("submittedPagination");
    if (!body) return;

    const totalPages = Math.max(1, Math.ceil(submittedAllRows.length / SUBMISSIONS_PAGE_SIZE));
    if (submittedPage > totalPages) submittedPage = totalPages;
    if (submittedPage < 1) submittedPage = 1;

    const start = (submittedPage - 1) * SUBMISSIONS_PAGE_SIZE;
    const pageRows = submittedAllRows.slice(start, start + SUBMISSIONS_PAGE_SIZE);

    body.innerHTML = "";
    pageRows.forEach(function (sub) { body.appendChild(renderSubmissionRow(sub)); });
    if (wrap) wrap.hidden = false;

    if (pagination) {
      if (totalPages <= 1) {
        pagination.hidden = true;
      } else {
        pagination.hidden = false;
        const info = $id("submittedPageInfo");
        if (info) info.textContent = t("pageOf", { a: submittedPage, b: totalPages });
        const prev = $id("submittedPrev");
        const next = $id("submittedNext");
        if (prev) prev.disabled = submittedPage <= 1;
        if (next) next.disabled = submittedPage >= totalPages;
      }
    }
  }

  function renderSubmissionRow(sub) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + esc(sub.userName || "—") + '</td>' +
      '<td>' + (Number(sub.correct) || 0) + ' / ' + (Number(sub.total) || 0) + '</td>' +
      '<td>' + (Number(sub.percent) || 0) + '%</td>' +
      '<td>' + esc(formatDuration(sub.timeTaken)) + '</td>' +
      '<td>' + esc(formatDate(sub.submittedAt)) + '</td>';
    return tr;
  }

  async function loadPending() {
    const loading = $id("pendingLoading");
    const empty = $id("pendingEmpty");
    const wrap = $id("pendingTableWrap");
    const body = $id("pendingTableBody");
    const pagination = $id("pendingPagination");
    if (!body) return;
    showOverlay(loading);
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = true;
    if (pagination) pagination.hidden = true;
    body.innerHTML = "";
    pendingAllRows = [];
    pendingPage = 1;

    try {
      const res = await request("/admin/tests/" + encodeURIComponent(currentSubmissionsTestId) + "/pending");
      const list = (res && Array.isArray(res.pending)) ? res.pending : [];
      hideOverlay(loading);
      pendingAllRows = list;
      if (list.length === 0) { if (empty) empty.hidden = false; return; }
      renderPendingPage();
    } catch (err) {
      hideOverlay(loading);
      if (err.status === 401) return showLogin();
      if (empty) { empty.hidden = false; empty.textContent = err.message || "Failed to load"; }
    }
  }

  function renderPendingPage() {
    const wrap = $id("pendingTableWrap");
    const body = $id("pendingTableBody");
    const pagination = $id("pendingPagination");
    if (!body) return;

    const totalPages = Math.max(1, Math.ceil(pendingAllRows.length / SUBMISSIONS_PAGE_SIZE));
    if (pendingPage > totalPages) pendingPage = totalPages;
    if (pendingPage < 1) pendingPage = 1;

    const start = (pendingPage - 1) * SUBMISSIONS_PAGE_SIZE;
    const pageRows = pendingAllRows.slice(start, start + SUBMISSIONS_PAGE_SIZE);

    body.innerHTML = "";
    pageRows.forEach(function (p) { body.appendChild(renderPendingRow(p)); });
    if (wrap) wrap.hidden = false;

    if (pagination) {
      if (totalPages <= 1) {
        pagination.hidden = true;
      } else {
        pagination.hidden = false;
        const info = $id("pendingPageInfo");
        if (info) info.textContent = t("pageOf", { a: pendingPage, b: totalPages });
        const prev = $id("pendingPrev");
        const next = $id("pendingNext");
        if (prev) prev.disabled = pendingPage <= 1;
        if (next) next.disabled = pendingPage >= totalPages;
      }
    }
  }

  function renderPendingRow(p) {
    const tr = document.createElement("tr");
    const isLive = p.status === "live";
    const statusHtml = '<span class="sub-status-badge ' + (isLive ? "live" : "left") + '">' +
      (isLive ? "In test" : "Left") + '</span>';
    tr.innerHTML =
      '<td>' + esc(p.userName || "—") + '</td>' +
      '<td>' + statusHtml + '</td>' +
      '<td>' + esc(formatDate(p.startedAt)) + '</td>' +
      '<td>' + esc(formatDuration(p.elapsedSeconds)) + '</td>';
    return tr;
  }

  const submissionsBackBtn = $id("submissionsBackBtn");
  if (submissionsBackBtn) {
    submissionsBackBtn.addEventListener("click", function () {
      currentSubmissionsTestId = null;
      showScreen("dashboard");
      loadTests();
    });
  }

  const tabSubmittedEl = $id("tabSubmitted");
  const tabPendingEl = $id("tabPending");
  if (tabSubmittedEl) tabSubmittedEl.addEventListener("click", function () { setSubmissionsTab("submitted"); });
  if (tabPendingEl) tabPendingEl.addEventListener("click", function () { setSubmissionsTab("pending"); });

  const submittedPrev = $id("submittedPrev");
  if (submittedPrev) {
    submittedPrev.addEventListener("click", function () {
      if (submittedPage > 1) { submittedPage--; renderSubmittedPage(); }
    });
  }
  const submittedNext = $id("submittedNext");
  if (submittedNext) {
    submittedNext.addEventListener("click", function () {
      const totalPages = Math.max(1, Math.ceil(submittedAllRows.length / SUBMISSIONS_PAGE_SIZE));
      if (submittedPage < totalPages) { submittedPage++; renderSubmittedPage(); }
    });
  }

  const pendingPrev = $id("pendingPrev");
  if (pendingPrev) {
    pendingPrev.addEventListener("click", function () {
      if (pendingPage > 1) { pendingPage--; renderPendingPage(); }
    });
  }
  const pendingNext = $id("pendingNext");
  if (pendingNext) {
    pendingNext.addEventListener("click", function () {
      const totalPages = Math.max(1, Math.ceil(pendingAllRows.length / SUBMISSIONS_PAGE_SIZE));
      if (pendingPage < totalPages) { pendingPage++; renderPendingPage(); }
    });
  }

  const ANALYSIS_PAGE_SIZE = 10;
  let analysisTestId = null;
  let analysisData = null;
  let analysisQuestionsPage = 1;

  function formatClock(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function difficultyLabel(d) {
    if (d === "easy") return "Easy";
    if (d === "medium") return "Medium";
    return "Hard";
  }

  async function openAnalysis(id) {
    analysisTestId = id;
    analysisData = null;
    analysisQuestionsPage = 1;
    const heading = $id("analysisHeading");
    const test = state.tests.find(function (x) { return x.id === id; });
    if (heading) heading.textContent = test ? ("Analysis — " + test.title) : "Analysis";
    showScreen("analysis");
    showOverlay($id("analysisLoading"));
    try {
      const res = await request("/admin/tests/" + encodeURIComponent(id) + "/analysis");
      analysisData = res || null;
      renderAnalysis();
    } catch (err) {
      if (err.status === 401) return showLogin();
      toast(err.message || "Failed to load analysis", "error");
    } finally {
      hideOverlay($id("analysisLoading"));
    }
  }

  function renderAnalysis() {
    if (!analysisData) return;
    renderAnalysisOverview();
    renderAnalysisBuckets();
    renderAnalysisTopPerformers();
    renderAnalysisToughest();
    renderAnalysisQuestions();
  }

  function renderAnalysisOverview() {
    const d = analysisData;
    const s1 = $id("anStatSubs"); if (s1) s1.textContent = String(d.totalSubmissions || 0);
    const s2 = $id("anStatAvg"); if (s2) s2.textContent = (d.avgPercent || 0) + "%";
    const s3 = $id("anStatPass"); if (s3) s3.textContent = (d.passRate || 0) + "%";
    const s4 = $id("anStatTime"); if (s4) s4.textContent = formatClock(d.avgTime || 0);
  }

  function renderAnalysisBuckets() {
    const wrap = $id("analysisBuckets");
    if (!wrap) return;
    wrap.innerHTML = "";
    const labels = ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"];
    const buckets = Array.isArray(analysisData.scoreBuckets) ? analysisData.scoreBuckets : [0,0,0,0,0];
    const maxCount = Math.max.apply(null, buckets.concat([1]));

    buckets.forEach(function (count, i) {
      const row = document.createElement("div");
      row.className = "analysis-bucket";
      row.innerHTML =
        '<span class="analysis-bucket-label">' + labels[i] + '</span>' +
        '<div class="analysis-bucket-bar"><span style="width:' + Math.round((count / maxCount) * 100) + '%"></span></div>' +
        '<span class="analysis-bucket-count">' + count + ' student' + (count === 1 ? "" : "s") + '</span>';
      wrap.appendChild(row);
    });
  }

  function renderAnalysisTopPerformers() {
    const wrap = $id("analysisTopPerformers");
    if (!wrap) return;
    wrap.innerHTML = "";
    const list = Array.isArray(analysisData.topPerformers) ? analysisData.topPerformers : [];
    if (list.length === 0) { wrap.innerHTML = '<div class="empty-state">No submissions yet.</div>'; return; }

    list.forEach(function (p, i) {
      const row = document.createElement("div");
      row.className = "analysis-performer";
      row.innerHTML =
        '<span class="analysis-performer-rank">#' + (i + 1) + '</span>' +
        '<span class="analysis-performer-name">' + esc(p.name) + '</span>' +
        '<span class="analysis-performer-score">' + p.percent + '%</span>' +
        '<span class="analysis-performer-time">' + esc(formatClock(p.time)) + '</span>';
      wrap.appendChild(row);
    });
  }

  function renderAnalysisToughest() {
    const wrap = $id("analysisToughest");
    if (!wrap) return;
    wrap.innerHTML = "";
    const list = Array.isArray(analysisData.toughest) ? analysisData.toughest : [];
    if (list.length === 0) { wrap.innerHTML = '<div class="empty-state">No data yet.</div>'; return; }

    list.forEach(function (tv, i) {
      const row = document.createElement("div");
      row.className = "analysis-tough";
      row.innerHTML =
        '<div class="analysis-tough-head">' +
          '<span class="analysis-tough-rank">#' + (i + 1) + ' · Q' + (tv.index + 1) + '</span>' +
          '<span class="analysis-badge ' + tv.difficulty + '">' + difficultyLabel(tv.difficulty) + '</span>' +
          '<span class="analysis-tough-pct">' + tv.wrongPercent + '% wrong</span>' +
        '</div>' +
        '<div class="analysis-tough-q">' + esc(tv.q) + '</div>' +
        '<div class="analysis-tough-bar"><span style="width:' + tv.wrongPercent + '%"></span></div>';
      row.addEventListener("click", function () {
        analysisQuestionsPage = Math.floor(tv.index / ANALYSIS_PAGE_SIZE) + 1;
        renderAnalysisQuestions();
        const target = document.querySelector('[data-an-qindex="' + tv.index + '"]');
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      wrap.appendChild(row);
    });
  }

  function renderAnalysisQuestions() {
    const wrap = $id("analysisQuestions");
    const pagination = $id("analysisPagination");
    if (!wrap) return;
    wrap.innerHTML = "";
    const all = Array.isArray(analysisData.questions) ? analysisData.questions : [];
    if (all.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No questions.</div>';
      if (pagination) pagination.hidden = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(all.length / ANALYSIS_PAGE_SIZE));
    if (analysisQuestionsPage > totalPages) analysisQuestionsPage = totalPages;
    if (analysisQuestionsPage < 1) analysisQuestionsPage = 1;
    const start = (analysisQuestionsPage - 1) * ANALYSIS_PAGE_SIZE;
    const pageItems = all.slice(start, start + ANALYSIS_PAGE_SIZE);

    pageItems.forEach(function (q) { wrap.appendChild(renderAnalysisQuestionCard(q)); });

    if (pagination) {
      if (totalPages <= 1) { pagination.hidden = true; }
      else {
        pagination.hidden = false;
        const info = $id("analysisPageInfo");
        if (info) info.textContent = "Page " + analysisQuestionsPage + " of " + totalPages;
        const prev = $id("analysisPrev");
        const next = $id("analysisNext");
        if (prev) prev.disabled = analysisQuestionsPage <= 1;
        if (next) next.disabled = analysisQuestionsPage >= totalPages;
      }
    }
  }

  function renderAnalysisQuestionCard(q) {
    const card = document.createElement("div");
    card.className = "analysis-q-card";
    card.setAttribute("data-an-qindex", q.index);

    const letters = ["A", "B", "C", "D"];
    const statsLine = q.correctPercent + "% correct · " + q.wrongPercent + "% wrong · " + q.skippedPercent + "% skipped";

    const head = document.createElement("div");
    head.className = "analysis-q-head";
    head.innerHTML =
      '<span class="analysis-q-num">Q' + (q.index + 1) + '</span>' +
      '<span class="analysis-badge ' + q.difficulty + '">' + difficultyLabel(q.difficulty) + '</span>' +
      '<span class="analysis-q-stats">' + statsLine + '</span>';
    card.appendChild(head);

    const qText = document.createElement("div");
    qText.className = "analysis-q-text";
    qText.textContent = q.q;
    card.appendChild(qText);

    const opts = document.createElement("div");
    opts.className = "analysis-options";
    const totalAns = (q.correct + q.wrong + q.skipped) || 1;

    q.options.forEach(function (optText, oi) {
      const count = q.counts[oi] || 0;
      const pct = Math.round((count / totalAns) * 100);
      const row = document.createElement("div");
      row.className = "analysis-option";
      if (oi === q.correctIndex) row.classList.add("is-correct");
      if (oi === q.trapIndex && q.trapIndex !== q.correctIndex) row.classList.add("is-trap");

      let tag = "";
      if (oi === q.correctIndex) tag = '<span class="analysis-opt-tag correct">CORRECT</span>';
      else if (oi === q.trapIndex) tag = '<span class="analysis-opt-tag trap">TRAP</span>';

      row.innerHTML =
        '<span class="analysis-opt-key">' + letters[oi] + '</span>' +
        '<span class="analysis-opt-text">' + esc(optText) + '</span>' +
        tag +
        '<span class="analysis-opt-count">' + count + ' (' + pct + '%)</span>' +
        '<div class="analysis-opt-bar"><span style="width:' + pct + '%"></span></div>';
      opts.appendChild(row);
    });

    if (q.skipped > 0) {
      const skippedRow = document.createElement("div");
      skippedRow.className = "analysis-option is-skipped";
      const pct = Math.round((q.skipped / totalAns) * 100);
      skippedRow.innerHTML =
        '<span class="analysis-opt-key">—</span>' +
        '<span class="analysis-opt-text">Not answered</span>' +
        '<span class="analysis-opt-count">' + q.skipped + ' (' + pct + '%)</span>' +
        '<div class="analysis-opt-bar"><span style="width:' + pct + '%"></span></div>';
      opts.appendChild(skippedRow);
    }

    card.appendChild(opts);

    const actions = document.createElement("div");
    actions.className = "analysis-q-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Who chose what";
    btn.addEventListener("click", function () { openAnalysisUsers(q.index); });
    actions.appendChild(btn);
    card.appendChild(actions);

    return card;
  }

  const analysisUsersOverlay = $id("analysisUsersOverlay");
  const analysisUsersBody = $id("analysisUsersBody");
  const analysisUsersSearch = $id("analysisUsersSearch");
  const analysisUsersClose = $id("analysisUsersClose");
  const analysisUsersSub = $id("analysisUsersSub");
  let analysisUsersCache = null;

  async function openAnalysisUsers(qIndex) {
    if (!analysisUsersOverlay) return;
    if (analysisUsersSub) analysisUsersSub.textContent = "Loading…";
    if (analysisUsersBody) analysisUsersBody.innerHTML = "";
    if (analysisUsersSearch) analysisUsersSearch.value = "";
    analysisUsersOverlay.classList.add("open");
    analysisUsersOverlay.setAttribute("aria-hidden", "false");
    try {
      const res = await request("/admin/tests/" + encodeURIComponent(analysisTestId) + "/analysis/question/" + qIndex);
      analysisUsersCache = res || null;
      if (analysisUsersSub) analysisUsersSub.textContent = res ? ("Q" + (qIndex + 1) + " — " + res.question) : "";
      renderAnalysisUsers("");
    } catch (err) {
      if (err.status === 401) { closeAnalysisUsers(); return showLogin(); }
      if (analysisUsersSub) analysisUsersSub.textContent = err.message || "Failed to load";
    }
  }

  function closeAnalysisUsers() {
    if (!analysisUsersOverlay) return;
    analysisUsersOverlay.classList.remove("open");
    analysisUsersOverlay.setAttribute("aria-hidden", "true");
    analysisUsersCache = null;
  }

  function renderAnalysisUsers(query) {
    if (!analysisUsersBody || !analysisUsersCache) return;
    const q = (query || "").trim().toLowerCase();
    analysisUsersBody.innerHTML = "";
    const letters = ["A", "B", "C", "D"];
    const correct = analysisUsersCache.correctIndex;

    function renderGroup(label, users, isCorrect) {
      const filtered = q ? users.filter(function (u) { return u.toLowerCase().indexOf(q) !== -1; }) : users;
      if (q && filtered.length === 0) return;
      const group = document.createElement("div");
      group.className = "analysis-users-group";
      if (isCorrect) group.classList.add("is-correct");
      const head = document.createElement("div");
      head.className = "analysis-users-group-head";
      head.innerHTML = '<strong>' + esc(label) + '</strong> · ' + filtered.length + ' user' + (filtered.length === 1 ? "" : "s");
      group.appendChild(head);
      if (filtered.length > 0) {
        const list = document.createElement("div");
        list.className = "analysis-users-list";
        filtered.forEach(function (u) {
          const chip = document.createElement("span");
          chip.className = "analysis-user-chip";
          chip.textContent = u;
          list.appendChild(chip);
        });
        group.appendChild(list);
      }
      analysisUsersBody.appendChild(group);
    }

    analysisUsersCache.grouped.forEach(function (g) {
      renderGroup(letters[g.index] + ". " + analysisUsersCache.options[g.index], g.users, g.index === correct);
    });
    renderGroup("Not answered", analysisUsersCache.notAnswered, false);
  }

  if (analysisUsersSearch) {
    analysisUsersSearch.addEventListener("input", function () {
      renderAnalysisUsers(analysisUsersSearch.value);
    });
  }
  if (analysisUsersClose) analysisUsersClose.addEventListener("click", closeAnalysisUsers);
  if (analysisUsersOverlay) {
    analysisUsersOverlay.addEventListener("click", function (e) {
      if (e.target === analysisUsersOverlay) closeAnalysisUsers();
    });
  }

  const analysisPrev = $id("analysisPrev");
  if (analysisPrev) analysisPrev.addEventListener("click", function () {
    if (analysisQuestionsPage > 1) { analysisQuestionsPage--; renderAnalysisQuestions(); }
  });
  const analysisNext = $id("analysisNext");
  if (analysisNext) analysisNext.addEventListener("click", function () {
    const all = analysisData && Array.isArray(analysisData.questions) ? analysisData.questions : [];
    const totalPages = Math.max(1, Math.ceil(all.length / ANALYSIS_PAGE_SIZE));
    if (analysisQuestionsPage < totalPages) { analysisQuestionsPage++; renderAnalysisQuestions(); }
  });

  const analysisBackBtn = $id("analysisBackBtn");
  if (analysisBackBtn) analysisBackBtn.addEventListener("click", function () {
    analysisTestId = null;
    analysisData = null;
    showScreen("dashboard");
    loadTests();
  });

  const analysisExportBtn = $id("analysisExportBtn");
  if (analysisExportBtn) analysisExportBtn.addEventListener("click", function () {
    if (!analysisData || !Array.isArray(analysisData.questions)) { toast("Nothing to export", "error"); return; }
    const rows = ["Q#,Question,A,B,C,D,Correct,Correct %,Wrong,Skipped,Difficulty"];
    analysisData.questions.forEach(function (q) {
      const o = q.options || ["", "", "", ""];
      const row = [
        "Q" + (q.index + 1),
        csvEsc(q.q),
        csvEsc(o[0]), csvEsc(o[1]), csvEsc(o[2]), csvEsc(o[3]),
        csvEsc(o[q.correctIndex]),
        q.correctPercent + "%",
        q.wrongPercent + "%",
        q.skippedPercent + "%",
        q.difficulty
      ].join(",");
      rows.push(row);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis-" + (analysisTestId || "test") + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("CSV downloaded");
  });

  const importOverlay = $id("importOverlay");
  const importInput = $id("importInput");
  const importError = $id("importError");
  const importConfirm = $id("importConfirm");
  const importCancel = $id("importCancel");
  const importJsonBtn = $id("importJsonBtn");

  const BANNED_KEYS = [
    "numericAnswer", "tolerance",
    "explanation", "explanationLatex", "explanationImageBase64",
    "qAs", "optionsAs"
  ];

  function setImportError(msg) {
    if (!importError) return;
    if (!msg) { importError.hidden = true; importError.textContent = ""; return; }
    importError.textContent = msg;
    importError.hidden = false;
  }

  function openImportModal() {
    if (!importOverlay) return;
    if (!state.editing) { toast("Open a test first", "error"); return; }
    if (importInput) importInput.value = "";
    setImportError(null);
    importOverlay.classList.add("open");
    importOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (importInput) importInput.focus(); }, 40);
  }

  function closeImportModal() {
    if (!importOverlay) return;
    importOverlay.classList.remove("open");
    importOverlay.setAttribute("aria-hidden", "true");
  }

  function validateImportQuestion(raw, index) {
    const where = "Question " + (index + 1) + ": ";
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: where + "must be an object" };
    }
    BANNED_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) delete raw[k];
    });
    const q = typeof raw.q === "string" ? raw.q.trim() : "";
    if (!q) return { error: where + "text is required" };
    if (!Array.isArray(raw.options) || raw.options.length !== 4) {
      return { error: where + "exactly 4 options required" };
    }
    const options = raw.options.map(function (o) {
      return (typeof o === "string") ? o.trim() : String(o == null ? "" : o).trim();
    });
    if (options.some(function (o) { return !o; })) {
      return { error: where + "all 4 options must be non-empty" };
    }
    const answer = raw.answer;
    if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer > 3) {
      return { error: where + "answer must be 0, 1, 2, or 3" };
    }
    const cleaned = { q: q, options: options, answer: answer };
    if (raw.type === "math" || raw.type === "reasoning") cleaned.type = raw.type;
    if (typeof raw.latex === "string" && raw.latex.length) cleaned.latex = raw.latex;
    if (typeof raw.imageBase64 === "string" && raw.imageBase64.indexOf("data:image/") === 0) {
      cleaned.imageBase64 = raw.imageBase64;
    }
    if (raw.hint != null) {
      if (typeof raw.hint !== "string") return { error: where + "hint must be a string" };
      if (raw.hint.trim().length > 500) return { error: where + "hint too long (max 500 chars)" };
      if (raw.hint.trim()) cleaned.hint = raw.hint.trim();
    }
    return { question: cleaned };
  }

  function handleImport() {
    if (!state.editing) return;
    setImportError(null);
    const rawText = importInput ? importInput.value.trim() : "";
    if (!rawText) return setImportError("Paste JSON first.");

    let parsed;
    try { parsed = JSON.parse(rawText); }
    catch (e) { return setImportError("Invalid JSON — check the syntax and try again."); }

    let questions = null, title = null, minutes = null, exam = null;

    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
      if (typeof parsed.title === "string") title = parsed.title.trim();
      if (parsed.exam != null) {
        if (typeof parsed.exam !== "string") return setImportError("exam must be a string");
        const ex = parsed.exam.trim();
        if (ex.length > 30) return setImportError("Exam name too long (max 30 chars)");
        if (ex.length > 0) exam = ex;
      }
      if (parsed.minutes != null) {
        const m = Number(parsed.minutes);
        if (Number.isInteger(m) && m >= 1 && m <= 180) minutes = m;
      }
    } else {
      return setImportError("Provide a question array or a test object with a questions array.");
    }

    if (!questions.length) return setImportError("No questions found in the JSON.");

    const cleaned = [];
    for (let i = 0; i < questions.length; i++) {
      const res = validateImportQuestion(questions[i], i);
      if (res.error) return setImportError(res.error);
      cleaned.push(res.question);
    }

    const isFullTest = (title !== null) || (minutes !== null) || (exam !== null);

    if (isFullTest) {
      if (title !== null) $id("editorTitle").value = title;
      if (minutes !== null) $id("editorMinutes").value = minutes;
      if (exam !== null) {
        const examEl = $id("editorExam");
        if (examEl) examEl.value = exam;
      }
      state.editing.questions = cleaned;
    } else {
      const onlyOne = state.editing.questions.length === 1;
      const blank = onlyOne && state.editing.questions[0];
      const isBlank = blank && !blank.q && blank.options.every(function (o) { return !o; });
      state.editing.questions = isBlank ? cleaned : state.editing.questions.concat(cleaned);
    }

    renderQuestionsList();
    closeImportModal();
    toast("Imported " + cleaned.length + " question(s).", "success");
  }

  if (importJsonBtn) importJsonBtn.addEventListener("click", openImportModal);
  if (importCancel)  importCancel.addEventListener("click", closeImportModal);
  if (importConfirm) importConfirm.addEventListener("click", handleImport);

  if (importOverlay) {
    importOverlay.addEventListener("click", function (e) {
      if (e.target === importOverlay) closeImportModal();
    });
  }

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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMenu();
      if (importOverlay && importOverlay.classList.contains("open")) closeImportModal();
      if (logoutOverlay && logoutOverlay.classList.contains("open")) closeLogoutModal();
      if (analysisUsersOverlay && analysisUsersOverlay.classList.contains("open")) closeAnalysisUsers();
      if (confirmOverlay && confirmOverlay.classList.contains("open")) closeConfirmModal();
    }
  });

  document.addEventListener("pk:langchange", function () {
    if (screens.dashboard && !screens.dashboard.hidden && state.tests.length) {
      renderTestsPage();
    }
    if (state.editing && screens.editor && !screens.editor.hidden) renderEditor();
  });

  const USERS_PAGE_SIZE = 20;
  let allUsersCache = [];
  let usersFiltered = [];
  let usersCurrentPage = 1;
  let usersSearchQuery = "";
  let usersStatusFilter = "";

  function formatShortDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-IN", { month: "short" });
    return day + " " + mon + " " + d.getFullYear();
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-IN", { month: "short" });
    const hr = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return day + " " + mon + " " + d.getFullYear() + " · " + hr + ":" + mn;
  }

  async function loadUsers() {
    const loading = $id("usersLoading");
    const empty = $id("usersEmpty");
    const wrap = $id("usersTableWrap");
    const tbody = $id("usersTableBody");
    if (!tbody) return;

    showOverlay(loading);
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = true;
    tbody.innerHTML = "";

    try {
      const res = await request("/admin/users");
      allUsersCache = Array.isArray(res.users) ? res.users : [];
      hideOverlay(loading);
      renderUsers();
    } catch (err) {
      hideOverlay(loading);
      if (err.status === 401) return showLogin();
      if (empty) { empty.hidden = false; empty.textContent = err.message || "Failed to load users"; }
    }
  }

  function renderUsers() {
    const empty = $id("usersEmpty");
    const wrap = $id("usersTableWrap");
    const tbody = $id("usersTableBody");
    const pagination = $id("usersPagination");
    if (!tbody) return;

    const q = usersSearchQuery.trim().toLowerCase();
    const now = Date.now();
    const NEW_MS = 24 * 60 * 60 * 1000;

    usersFiltered = allUsersCache.filter(function (u) {
      if (usersStatusFilter === "active" && u.disabled) return false;
      if (usersStatusFilter === "disabled" && !u.disabled) return false;
      if (usersStatusFilter === "new" && (now - u.createdAt) >= NEW_MS) return false;
      if (q) {
        const hay = [u.name, u.email, u.whatsapp].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (usersFiltered.length === 0) {
      if (empty) { empty.hidden = false; empty.textContent = allUsersCache.length === 0 ? "No users yet." : "No matching users."; }
      if (wrap) wrap.hidden = true;
      if (pagination) pagination.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;

    const totalPages = Math.max(1, Math.ceil(usersFiltered.length / USERS_PAGE_SIZE));
    if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;
    if (usersCurrentPage < 1) usersCurrentPage = 1;
    const start = (usersCurrentPage - 1) * USERS_PAGE_SIZE;
    const pageItems = usersFiltered.slice(start, start + USERS_PAGE_SIZE);

    tbody.innerHTML = "";
    pageItems.forEach(function (u) {
      const tr = document.createElement("tr");
      const isNew = (now - u.createdAt) < NEW_MS;
      const statusBadge = u.disabled
        ? '<span class="user-status disabled">Disabled</span>'
        : '<span class="user-status active">Active</span>';
      const newBadge = isNew ? ' <span class="user-new-badge">NEW</span>' : "";
      tr.innerHTML =
        '<td>' + esc(u.name || "—") + newBadge + '</td>' +
        '<td>' + esc(u.email || "—") + '</td>' +
        '<td>' + esc(u.whatsapp || "—") + '</td>' +
        '<td>' + esc(formatShortDate(u.createdAt)) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="user-action-row"></div></td>';
      const actions = tr.querySelector(".user-action-row");

      const viewBtn = document.createElement("button");
      viewBtn.type = "button"; viewBtn.className = "btn btn-sm"; viewBtn.textContent = "View";
      viewBtn.addEventListener("click", function () { openUserDetails(u.uid); });
      actions.appendChild(viewBtn);

      if (u.canResetPassword) {
        const resetBtn = document.createElement("button");
        resetBtn.type = "button"; resetBtn.className = "btn btn-sm"; resetBtn.textContent = "Reset";
        resetBtn.addEventListener("click", function () { resetUserPassword(u); });
        actions.appendChild(resetBtn);
      }

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button"; toggleBtn.className = "btn btn-sm";
      toggleBtn.textContent = u.disabled ? "Enable" : "Disable";
      toggleBtn.addEventListener("click", function () { toggleUserStatus(u); });
      actions.appendChild(toggleBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.className = "btn btn-sm"; delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function () { deleteUserConfirm(u); });
      actions.appendChild(delBtn);

      tbody.appendChild(tr);
    });

    if (pagination) {
      if (totalPages <= 1) pagination.hidden = true;
      else {
        pagination.hidden = false;
        const info = $id("usersPageInfo");
        if (info) info.textContent = "Page " + usersCurrentPage + " of " + totalPages;
        const prev = $id("usersPrev");
        const next = $id("usersNext");
        if (prev) prev.disabled = usersCurrentPage <= 1;
        if (next) next.disabled = usersCurrentPage >= totalPages;
      }
    }
  }

  async function resetUserPassword(u) {
    openConfirmModal({
      title: "Send password reset?",
      message: "A reset link will be emailed to " + (u.email || "this user") + ".",
      confirmLabel: "Send",
      onConfirm: async function () {
        try {
          await request("/admin/users/" + encodeURIComponent(u.uid) + "/reset-password", { method: "POST" });
          toast("Reset email sent to " + u.email, "success");
        } catch (err) {
          if (err.status === 401) return showLogin();
          toast(err.message || "Failed to send reset email", "error");
        }
      }
    });
  }

  async function toggleUserStatus(u) {
    const willDisable = !u.disabled;
    openConfirmModal({
      title: willDisable ? "Disable this user?" : "Re-enable this user?",
      message: willDisable
        ? "They will not be able to sign in until re-enabled."
        : "They will be able to sign in again.",
      confirmLabel: willDisable ? "Disable" : "Enable",
      onConfirm: async function () {
        try {
          await request("/admin/users/" + encodeURIComponent(u.uid) + "/status", {
            method: "PUT",
            body: JSON.stringify({ disabled: willDisable })
          });
          toast(willDisable ? "User disabled" : "User re-enabled", "success");
          await loadUsers();
        } catch (err) {
          if (err.status === 401) return showLogin();
          toast(err.message || "Failed to update user", "error");
        }
      }
    });
  }

  function deleteUserConfirm(u) {
    openConfirmModal({
      title: "Delete this user permanently?",
      message: "This removes their Firebase account, profile, and login history. Cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async function () {
        try {
          await request("/admin/users/" + encodeURIComponent(u.uid), { method: "DELETE" });
          toast("User deleted", "success");
          await loadUsers();
        } catch (err) {
          if (err.status === 401) return showLogin();
          toast(err.message || "Failed to delete user", "error");
        }
      }
    });
  }

  function ensureUserDetailsModal() {
    if ($id("userDetailsOverlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "userDetailsOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "userDetailsTitle");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="modal user-details-modal">' +
        '<h2 id="userDetailsTitle">User details</h2>' +
        '<div id="userDetailsBody"></div>' +
        '<div class="modal-actions" style="margin-top: 16px;">' +
          '<button class="btn" id="userDetailsClose" type="button">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    $id("userDetailsClose").addEventListener("click", function () {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
    });
  }

  async function openUserDetails(uid) {
    ensureUserDetailsModal();
    const overlay = $id("userDetailsOverlay");
    const body = $id("userDetailsBody");
    body.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    try {
      const u = await request("/admin/users/" + encodeURIComponent(uid));
      const providerLabel = u.provider === "google.com" ? "Google" : (u.provider === "password" ? "Email / Password" : (u.provider || "—"));
      let html = '<div class="user-details-grid">';
      html += '<div><span class="user-details-label">Name</span><span class="user-details-value">' + esc(u.name || "—") + '</span></div>';
      html += '<div><span class="user-details-label">Email</span><span class="user-details-value">' + esc(u.email || "—") + '</span></div>';
      html += '<div><span class="user-details-label">WhatsApp</span><span class="user-details-value">' + esc(u.whatsapp || "—") + '</span></div>';
      html += '<div><span class="user-details-label">DOB</span><span class="user-details-value">' + esc(u.dob || "—") + '</span></div>';
      html += '<div><span class="user-details-label">PIN Code</span><span class="user-details-value">' + esc(u.pincode || "—") + '</span></div>';
      html += '<div><span class="user-details-label">Provider</span><span class="user-details-value">' + esc(providerLabel) + '</span></div>';
      html += '<div><span class="user-details-label">Account Status</span><span class="user-details-value">' + (u.disabled ? '<span class="user-status disabled">Disabled</span>' : '<span class="user-status active">Active</span>') + '</span></div>';
      html += '<div><span class="user-details-label">Email Verified</span><span class="user-details-value">' + (u.emailVerified ? "Yes" : "No") + '</span></div>';
      html += '<div><span class="user-details-label">Registered</span><span class="user-details-value">' + esc(formatDateTime(u.createdAt)) + '</span></div>';
      html += '<div><span class="user-details-label">Last Login</span><span class="user-details-value">' + esc(formatDateTime(u.lastLoginAt)) + '</span></div>';
      html += '</div>';

      html += '<h3 class="user-details-section-title">Login History</h3>';
      if (!u.loginHistory || u.loginHistory.length === 0) {
        html += '<p class="muted-text" style="font-size: 12px;">No login events recorded yet. Activity will appear here for future logins.</p>';
      } else {
        html += '<div class="user-login-history">';
        u.loginHistory.forEach(function (ev) {
          const prov = ev.provider === "google.com" ? "Google" : (ev.provider === "password" ? "Email" : (ev.provider || "—"));
          html += '<div class="user-login-event">' +
            '<span class="user-login-date">' + esc(formatDateTime(ev.at)) + '</span>' +
            '<span class="user-login-provider">' + esc(prov) + '</span>' +
          '</div>';
        });
        html += '</div>';
      }

      body.innerHTML = html;
    } catch (err) {
      if (err.status === 401) { overlay.classList.remove("open"); return showLogin(); }
      body.innerHTML = '<p class="form-error">' + esc(err.message || "Failed to load user") + '</p>';
    }
  }

  const usersSearchInput = $id("usersSearchInput");
  if (usersSearchInput) {
    usersSearchInput.addEventListener("input", function () {
      usersSearchQuery = usersSearchInput.value;
      usersCurrentPage = 1;
      renderUsers();
    });
  }

  const usersStatusFilterEl = $id("usersStatusFilter");
  if (usersStatusFilterEl) {
    usersStatusFilterEl.addEventListener("change", function () {
      usersStatusFilter = usersStatusFilterEl.value;
      usersCurrentPage = 1;
      renderUsers();
    });
  }

  const usersPrevEl = $id("usersPrev");
  if (usersPrevEl) {
    usersPrevEl.addEventListener("click", function () {
      if (usersCurrentPage > 1) { usersCurrentPage--; renderUsers(); }
    });
  }

  const usersNextEl = $id("usersNext");
  if (usersNextEl) {
    usersNextEl.addEventListener("click", function () {
      const totalPages = Math.max(1, Math.ceil(usersFiltered.length / USERS_PAGE_SIZE));
      if (usersCurrentPage < totalPages) { usersCurrentPage++; renderUsers(); }
    });
  }

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  (async function init() {
    showScreen("loading");
    if (getIdToken() || getRefreshToken()) {
      try {
        const me = await api.me();
        state.admin = me;
        await enterDashboard();
        return;
      } catch (err) { clearTokens(); }
    }
    showLogin();
  })();

})();
