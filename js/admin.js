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
      if (expiresIn) {
        localStorage.setItem(EXPIRES_KEY, String(Date.now() + Number(expiresIn) * 1000));
      }
    } catch (e) { /* ignore */ }
  }

  function getIdToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function getRefreshToken() { try { return localStorage.getItem(REFRESH_KEY) || ""; } catch (e) { return ""; } }
  function getExpiresAt() { try { return parseInt(localStorage.getItem(EXPIRES_KEY) || "0", 10) || 0; } catch (e) { return 0; } }

  function clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) { /* ignore */ }
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
    try { data = await res.json(); } catch (e) { /* ignore */ }

    if (!res.ok) {
      const e = new Error((data && data.error) || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }

    return data;
  }

  const api = {
    login: function (email, password) {
      return request("/login", {
        method: "POST", noAuth: true,
        body: JSON.stringify({ email: email, password: password })
      });
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

  const state = { admin: null, tests: [], editing: null, currentTab: "tests" };
  const screens = {
    loading: $id("adminLoading"),
    login: $id("loginScreen"),
    dashboard: $id("dashboardScreen"),
    editor: $id("editorScreen")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showLogin() {
    state.admin = null; state.tests = []; state.editing = null;
    const u = $id("loginUser"), p = $id("loginPass"), e = $id("loginError");
    if (u) u.value = ""; if (p) p.value = ""; if (e) e.hidden = true;
    showScreen("login");
  }

  /* Login */
  const loginForm = $id("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = $id("loginUser").value.trim();
      const password = $id("loginPass").value;
      const errEl = $id("loginError");
      const btn = $id("loginSubmit");
      errEl.hidden = true;
      if (!email || !password) {
        errEl.textContent = t("fillAllFields"); errEl.hidden = false; return;
      }
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
  if (signOutBtn) signOutBtn.addEventListener("click", function () { clearTokens(); showLogin(); });

  /* Tabs */
  const tabTests = $id("tabTests"), tabSettings = $id("tabSettings");
  const panelTests = $id("panelTests"), panelSettings = $id("panelSettings");

  function setTab(tab) {
    state.currentTab = tab;
    if (tabTests) {
      const a = tab === "tests"; tabTests.classList.toggle("is-active", a); tabTests.setAttribute("aria-selected", String(a));
    }
    if (tabSettings) {
      const a = tab === "settings"; tabSettings.classList.toggle("is-active", a); tabSettings.setAttribute("aria-selected", String(a));
    }
    if (panelTests) panelTests.hidden = tab !== "tests";
    if (panelSettings) panelSettings.hidden = tab !== "settings";
    if (tab === "settings") loadSettings();
  }

  if (tabTests) tabTests.addEventListener("click", function () { setTab("tests"); });
  if (tabSettings) tabSettings.addEventListener("click", function () { setTab("settings"); });

  /* Dashboard */
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
        console.error("Publish/unpublish error:", err);
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

  /* Settings */
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

  /* Editor */
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

  function blankQuestion() {
    return { q: "", options: ["", "", "", ""], answer: 0 };
  }

  function renderEditor() {
    if (!state.editing) return;

    const isPublished = state.editing.status === "published";

    $id("editorHeading").textContent =
      state.editing.id ? (isPublished ? "Edit test" : "Edit draft") : "New test";
    $id("editorTitle").value = state.editing.title || "";
    $id("editorMinutes").value = state.editing.minutes || 10;
    $id("editorError").hidden = true;

    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");
    if (saveDraftBtn) {
      saveDraftBtn.removeAttribute("data-i18n");
      saveDraftBtn.textContent = isPublished ? "Save changes" : t("saveDraft");
    }
    if (publishBtn) {
      publishBtn.removeAttribute("data-i18n");
      publishBtn.textContent = isPublished ? t("unpublish") : t("publishNow");
      publishBtn.className = isPublished ? "btn btn-sm" : "btn btn-primary btn-sm";
    }

    renderQuestionsList();
  }

  function renderQuestionsList() {
    const container = $id("questionsContainer");
    if (!container || !state.editing) return;
    container.innerHTML = "";

    state.editing.questions.forEach(function (question, qi) {
      const block = document.createElement("div");
      block.className = "editor-question";

      // Header
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

      // Question text
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

      // Options label
      const optLabel = document.createElement("div");
      optLabel.className = "form-label";
      optLabel.style.marginTop = "14px";
      optLabel.textContent = "Options — click the circle to mark the correct answer";
      block.appendChild(optLabel);

      // Options with radio
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

  /* Validation */
  function collectEditor() {
    const title = $id("editorTitle").value.trim();
    const minutes = Number($id("editorMinutes").value);

    if (!title) return { error: "Test title is required" };
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      return { error: "Duration must be between 1 and 180 minutes" };
    }

    const questions = [];

    for (let i = 0; i < state.editing.questions.length; i++) {
      const raw = state.editing.questions[i];
      const cleaned = {
        q: raw.q.trim(),
        options: raw.options.map(function (o) { return o.trim(); }),
        answer: raw.answer
      };

      if (!cleaned.q) return { error: "Question " + (i + 1) + ": text is required" };
      if (cleaned.options.some(function (o) { return !o; })) {
        return { error: "Question " + (i + 1) + ": all 4 options are required" };
      }
      if (typeof cleaned.answer !== "number" || cleaned.answer < 0 || cleaned.answer > 3) {
        return { error: "Question " + (i + 1) + ": select the correct answer" };
      }

      questions.push(cleaned);
    }

    if (questions.length === 0) return { error: "Add at least one question" };

    return { payload: { title: title, minutes: minutes, questions: questions } };
  }

  async function saveEditor(action) {
    // action: "save" | "publish" | "unpublish"
    const errEl = $id("editorError");
    errEl.hidden = true;

    const collected = collectEditor();
    if (collected.error) {
      errEl.textContent = collected.error;
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const payload = collected.payload;
    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");

    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;

    console.log("Saving test", { action: action, id: state.editing.id });

    try {
      if (state.editing.id) {
        await api.updateTest(state.editing.id, payload);
      } else {
        const created = await api.createTest(payload);
        state.editing.id = created.test.id;
      }

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
    } finally {
      saveDraftBtn.disabled = false;
      publishBtn.disabled = false;
    }
  }

  const saveDraftBtn = $id("saveDraftBtn");
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", function () { saveEditor("save"); });

  const publishBtn = $id("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", function () {
      const isPublished = state.editing && state.editing.status === "published";
      if (isPublished) {
        if (!window.confirm("Unpublish this test? It will be hidden from the homepage.")) return;
        saveEditor("unpublish");
      } else {
        if (!window.confirm(t("confirmPublish"))) return;
        saveEditor("publish");
      }
    });
  }

  /* Mobile menu */
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
      else {
        menuPanel.classList.add("open");
        menuToggle.setAttribute("aria-expanded", "true");
        menuIcon.innerHTML = closeSVG;
      }
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
        return;
      } catch (err) { clearTokens(); }
    }
    showLogin();
  })();

})();
