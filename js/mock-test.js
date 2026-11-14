"use strict";

/*
  PrepareKora — Mock Test page.
*/

(function () {

  /* ---------- API ---------- */

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" ||
      host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  async function apiGet(path) {
    if (window.PK_API && window.PK_API.getPublishedTest) {
      return window.PK_API.getPublishedTest(decodeURIComponent(path.replace("/tests/", "")));
    }
    const headers = { Accept: "application/json" };
    try {
      const token = (window.PK_STUDENT && window.PK_STUDENT.getToken) ? await window.PK_STUDENT.getToken() : null;
      if (token) headers["Authorization"] = "Bearer " + token;
    } catch (e) {}
    const res = await fetch(API_BASE + path, { headers: headers });
    if (!res.ok) { const e = new Error("HTTP " + res.status); e.status = res.status; throw e; }
    return res.json();
  }

  async function apiSubmit(id, payload) {
    const url = API_BASE + "/tests/" + encodeURIComponent(id) + "/submit";
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    try {
      const token = (window.PK_STUDENT && window.PK_STUDENT.getToken) ? await window.PK_STUDENT.getToken() : null;
      if (token) headers["Authorization"] = "Bearer " + token;
    } catch (e) {}
    const res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(function () { return null; });
      const e = new Error((data && data.error) || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  async function apiGetSettings() {
    try {
      const res = await fetch(API_BASE + "/settings", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function apiTranslate(text, target) {
    if (window.PK && window.PK.translate) return window.PK.translate(text, target);
    return text;
  }

  async function apiTranslateMany(items, target) {
    if (window.PK && window.PK.translateMany) return window.PK.translateMany(items, target);
    return items;
  }

  /* ---------- DOM ---------- */

  const screens = {
    loading:  document.getElementById("loadingScreen"),
    notFound: document.getElementById("notFoundScreen"),
    start:    document.getElementById("startScreen"),
    name:     document.getElementById("nameScreen"),
    test:     document.getElementById("testScreen"),
    result:   document.getElementById("resultScreen")
  };

  const startTitle      = document.getElementById("startTitle");
  const startPublisher  = document.getElementById("startPublisher");
  const startQuestions  = document.getElementById("startQuestions");
  const startMinutes    = document.getElementById("startMinutes");
  const startMarks      = document.getElementById("startMarks");
  const startBtn        = document.getElementById("startBtn");

  const nameForm        = document.getElementById("nameForm");
  const nameTestInfo    = document.getElementById("nameTestInfo");
  const userNameInput   = document.getElementById("userName");
  const userWhatsAppInput = document.getElementById("userWhatsApp");
  const nameError       = document.getElementById("nameError");
  const waError         = document.getElementById("waError");
  const backToStartBtn  = document.getElementById("backToStartBtn");

  const examTitle       = document.getElementById("examTitle");
  const examSub         = document.getElementById("examSub");
  const timerEl         = document.getElementById("timer");
  const timerText       = document.getElementById("timerText");
  const submitBtn       = document.getElementById("submitBtn");
  const paletteToggle   = document.getElementById("paletteToggle");

  const qNumber         = document.getElementById("qNumber");
  const qStatus         = document.getElementById("qStatus");
  const qText           = document.getElementById("qText");
  const optionsFieldset = document.getElementById("optionsFieldset");
  const optionsLegend   = document.getElementById("optionsLegend");

  const markBtn         = document.getElementById("markBtn");
  const clearBtn        = document.getElementById("clearBtn");
  const prevBtn         = document.getElementById("prevBtn");
  const nextBtn         = document.getElementById("nextBtn");

  const palettePanel    = document.getElementById("palettePanel");
  const paletteGrid     = document.getElementById("paletteGrid");
  const paletteClose    = document.getElementById("paletteClose");
  const paletteBackdrop = document.getElementById("paletteBackdrop");

  const confirmOverlay  = document.getElementById("confirmOverlay");
  const confirmAnswered = document.getElementById("confirmAnswered");
  const confirmUnanswered = document.getElementById("confirmUnanswered");
  const confirmMarked   = document.getElementById("confirmMarked");
  const confirmCancel   = document.getElementById("confirmCancel");
  const confirmSubmit   = document.getElementById("confirmSubmit");

  const interruptOverlay  = document.getElementById("interruptOverlay");
  const interruptWarnCount= document.getElementById("interruptWarnCount");
  const resumeBtn         = document.getElementById("resumeBtn");
  const terminateOverlay  = document.getElementById("terminateOverlay");
  const terminateRemaining= document.getElementById("terminateRemaining");

  const resultTitle     = document.getElementById("resultTitle");
  const resultPublisher = document.getElementById("resultPublisher");
  const scoreValue      = document.getElementById("scoreValue");
  const scoreTotal      = document.getElementById("scoreTotal");
  const scorePercent    = document.getElementById("scorePercent");
  const progressFill    = document.getElementById("progressFill");
  const statCorrect     = document.getElementById("statCorrect");
  const statWrong       = document.getElementById("statWrong");
  const statUnattempted = document.getElementById("statUnattempted");
  const statTime        = document.getElementById("statTime");
  const downloadBtn     = document.getElementById("downloadBtn");
  const retakeBtn       = document.getElementById("retakeBtn");

  const srStatus        = document.getElementById("srStatus");

  const menuToggle      = document.getElementById("menuToggle");
  const menuPanel       = document.getElementById("menuPanel");
  const menuIcon        = document.getElementById("menuIcon");

  const hintBlock       = document.getElementById("hintBlock");
  const hintBtn         = document.getElementById("hintBtn");
  const hintContent     = document.getElementById("hintContent");
  const hintEn          = document.getElementById("hintEn");
  const hintAs          = document.getElementById("hintAs");
  const hintDivider     = document.getElementById("hintDivider");

  /* ---------- State ---------- */

  const state = {
    publicTest: null,
    answers: {},
    marked: new Set(),
    visited: new Set(),
    index: 0,
    started: false,
    finished: false,
    submitting: false,
    remaining: 0,
    endAt: 0,
    startedAt: 0,
    elapsed: 0,
    timerId: null,
    warnedOneMinute: false,
    result: null,
    userName: "",
    userWhatsApp: "",
    translatedTitle: "",
    translatedPublisher: "",
    settings: { enabled: true, duration: 5 },
    sessionId: null,
    sessionPingId: null,
    reviewVisible: false,
    hintTimerId: null,
    hintQIndex: -1
  };

  /* ---------- Interruption ---------- */

  const MAX_INTERRUPTIONS = 5;
  let awayActive = false;
  let terminateCountdownId = null;

  function interruptKey() {
    return "pk_interrupt_" + (state.publicTest ? state.publicTest.id : "unknown");
  }

  function terminateKey() {
    return "pk_terminated_" + (state.publicTest ? state.publicTest.id : "unknown");
  }

  function getInterruptCount() {
    try {
      const n = parseInt(localStorage.getItem(interruptKey()) || "0", 10);
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  }

  function setInterruptCount(n) {
    try { localStorage.setItem(interruptKey(), String(n)); } catch (e) {}
  }

  function clearInterruptState() {
    try {
      localStorage.removeItem(interruptKey());
      localStorage.removeItem(terminateKey());
    } catch (e) {}
  }

  function getRemainingCooldown() {
    try {
      const raw = localStorage.getItem(terminateKey());
      if (!raw) return 0;
      const at = parseInt(raw, 10);
      if (isNaN(at)) return 0;
      const durationMs = state.settings.duration * 60 * 1000;
      const elapsed = Date.now() - at;
      if (elapsed >= durationMs) {
        clearInterruptState();
        return 0;
      }
      return Math.ceil((durationMs - elapsed) / 1000);
    } catch (e) { return 0; }
  }

  function isSessionTerminated() {
    return getRemainingCooldown() > 0;
  }

  function markTerminated() {
    try { localStorage.setItem(terminateKey(), String(Date.now())); } catch (e) {}
  }

  /* ---------- Utils ---------- */

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function locale() {
    return (window.PK && window.PK.locale) ? window.PK.locale() : "en-IN";
  }

  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function announce(msg) {
    if (!srStatus) return;
    srStatus.textContent = "";
    setTimeout(function () { srStatus.textContent = msg; }, 60);
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].hidden = (k !== name);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function hasAnswer(i) {
    return Object.prototype.hasOwnProperty.call(state.answers, i);
  }

  function statusFor(i) {
    if (state.marked.has(i)) return t("statusMarked");
    if (hasAnswer(i)) return t("statusAnswered");
    if (state.visited.has(i)) return t("statusNotAnswered");
    return t("statusNotVisited");
  }

  function publisherLine(name) {
    return t("byLine", { name: name || "—" });
  }

  function escapeHTMLLocal(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  /* ---------- Load test ---------- */

  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test") || "";

  async function loadTest() {
    if (!testId) { showScreen("notFound"); return; }

    // Fire both fetches in parallel — settings never blocks test
    let testRes = null;
    let testErr = null;
    const settingsPromise = apiGetSettings().catch(function () { return null; });
    const testPromise = apiGet("/tests/" + encodeURIComponent(testId)).then(
      function (r) { return r; },
      function (e) { testErr = e; return null; }
    );

    const results = await Promise.all([settingsPromise, testPromise]);
    const settingsRes = results[0];
    testRes = results[1];

    // 401 → maybe token was stale (Firebase not ready yet). Retry after Firebase auth resolves.
    if (testErr && testErr.status === 401) {
      try {
        if (window.PK_STUDENT && window.PK_STUDENT.ready) {
          await window.PK_STUDENT.ready;
        }
        if (window.PK_STUDENT && window.PK_STUDENT.isLoggedIn()) {
          testRes = await apiGet("/tests/" + encodeURIComponent(testId));
          testErr = null;
        }
      } catch (e) {}
    }

    if (settingsRes) {
      state.settings = {
        enabled: settingsRes.interruptionEnabled !== false,
        duration: Number(settingsRes.interruptionDuration) || 5
      };
    }

    if (testErr || !testRes) {
      if (testErr && testErr.status === 401) {
        handleAuthRequired();
        return;
      }
      showScreen("notFound");
      return;
    }

    state.publicTest = testRes;
    state.translatedTitle = testRes.title;
    state.translatedPublisher = testRes.publisherName;

    if (isSessionTerminated()) {
      renderStart();
      showScreen("test");
      showTerminateModal();
      return;
    }

    clearInterruptState();
    renderStart();
    showScreen("start");
    translateStartIfNeeded();
  }

  function handleAuthRequired() {
    const authScreen = document.getElementById("signInRequiredScreen");
    if (authScreen) authScreen.hidden = true;

    const loggedIn = (window.PK_STUDENT && window.PK_STUDENT.isLoggedIn());

    if (loggedIn) {
      if (authScreen) authScreen.hidden = false;
      showScreen("loading");
      return;
    }

    try {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    } catch (e) {}

    let handled = false;
    const onAuthChange = function () {
      if (handled) return;
      if (window.PK_STUDENT && window.PK_STUDENT.isLoggedIn()) {
        handled = true;
        document.removeEventListener("pk:student-auth-changed", onAuthChange);
        window.location.reload();
      }
    };
    document.addEventListener("pk:student-auth-changed", onAuthChange);

    setTimeout(function () {
      if (handled) return;
      const stillNotLoggedIn = !(window.PK_STUDENT && window.PK_STUDENT.isLoggedIn());
      if (stillNotLoggedIn && authScreen) {
        document.removeEventListener("pk:student-auth-changed", onAuthChange);
        authScreen.hidden = false;
        showScreen("loading");
      }
    }, 30000);
  }

  /* ---------- Start screen ---------- */

  function renderStart() {
    const pt = state.publicTest;
    if (!pt) return;

    startTitle.textContent = state.translatedTitle || pt.title;
    startPublisher.textContent = publisherLine(state.translatedPublisher || pt.publisherName);
    startQuestions.textContent = String(pt.questions.length);
    startMinutes.textContent = String(pt.minutes);
    startMarks.textContent = String(pt.questions.length);

    nameTestInfo.textContent =
      (state.translatedTitle || pt.title) + " — " +
      publisherLine(state.translatedPublisher || pt.publisherName);
  }

  async function translateStartIfNeeded() {
    if (!window.PK || PK.lang !== "as" || !state.publicTest) return;
    try {
      const results = await Promise.all([
        apiTranslate(state.publicTest.title, "as"),
        apiTranslate(state.publicTest.publisherName, "as")
      ]);
      state.translatedTitle = results[0] || state.publicTest.title;
      state.translatedPublisher = results[1] || state.publicTest.publisherName;
      renderStart();
    } catch (err) {}
  }

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      // If logged in with a profile name, skip the name form entirely
      try {
        const logged = window.PK_STUDENT && window.PK_STUDENT.isLoggedIn();
        if (logged) {
          const profile = window.PK_STUDENT.getProfile() || {};
          const user = window.PK_STUDENT.getUser() || {};
          const accountName = String(profile.name || user.displayName || "").trim();
          const accountWa = String(profile.whatsapp || "").trim();
          if (accountName.length >= 2) {
            state.userName = accountName;
            state.userWhatsApp = accountWa;
            beginTest();
            return;
          }
        }
      } catch (e) {}

      // Fall back to name form for anonymous users or missing profile
      showScreen("name");
      setTimeout(function () { if (userNameInput) userNameInput.focus(); }, 60);
    });
  }

  if (backToStartBtn) {
    backToStartBtn.addEventListener("click", function () { showScreen("start"); });
  }

  /* ---------- Name form ---------- */

  function validateName() {
    const raw = userNameInput.value.trim();
    if (!raw) { nameError.textContent = t("requiredField"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    if (raw.length < 2) { nameError.textContent = t("nameTooShort"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    if (raw.length > 60) { nameError.textContent = t("nameTooLong"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    nameError.hidden = true; userNameInput.classList.remove("is-invalid"); return raw;
  }

  function validateWhatsApp() {
    const raw = userWhatsAppInput.value.trim().replace(/[\s-]/g, "");
    if (!raw) { waError.hidden = true; userWhatsAppInput.classList.remove("is-invalid"); return ""; }
    if (!/^[0-9]{10,15}$/.test(raw)) { waError.textContent = t("invalidWhatsApp"); waError.hidden = false; userWhatsAppInput.classList.add("is-invalid"); return null; }
    waError.hidden = true; userWhatsAppInput.classList.remove("is-invalid"); return raw;
  }

  if (userNameInput) {
    userNameInput.addEventListener("input", function () {
      if (userNameInput.classList.contains("is-invalid")) validateName();
    });
  }

  if (userWhatsAppInput) {
    userWhatsAppInput.addEventListener("input", function () {
      if (userWhatsAppInput.classList.contains("is-invalid")) validateWhatsApp();
    });
  }

  if (nameForm) {
    nameForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = validateName();
      const wa = validateWhatsApp();
      if (name === null) { userNameInput.focus(); return; }
      if (wa === null) { userWhatsAppInput.focus(); return; }
      state.userName = name;
      state.userWhatsApp = wa;
      beginTest();
    });
  }

  /* ---------- Session heartbeat ---------- */

  async function startSession() {
    if (!state.publicTest || state.sessionId) return;
    try {
      const res = await fetch(API_BASE + "/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: testId,
          testTitle: state.publicTest.title,
          userName: state.userName
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.sessionId) {
        state.sessionId = data.sessionId;
        startSessionPing();
      }
    } catch (e) {}
  }

  function startSessionPing() {
    if (state.sessionPingId) clearInterval(state.sessionPingId);
    state.sessionPingId = setInterval(function () {
      if (!state.sessionId || !state.started || state.finished) return;
      fetch(API_BASE + "/sessions/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.sessionId, testId: testId })
      }).catch(function () {});
    }, 20000);
  }

  function endSession(keepalive) {
    if (!state.sessionId) return;
    if (state.sessionPingId) { clearInterval(state.sessionPingId); state.sessionPingId = null; }
    const body = JSON.stringify({ sessionId: state.sessionId, testId: testId });
    state.sessionId = null;
    try {
      if (keepalive && navigator.sendBeacon) {
        navigator.sendBeacon(API_BASE + "/sessions/end",
          new Blob([body], { type: "application/json" }));
      } else {
        fetch(API_BASE + "/sessions/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* ---------- Hint ---------- */

  const HINT_DELAY_MS = 20000;
  const HINT_CACHE_PREFIX = "pkh_v1_";

  function hintCacheKey(qIndex) {
    const tid = state.publicTest ? state.publicTest.id : "unknown";
    return HINT_CACHE_PREFIX + tid + "_" + qIndex;
  }

  function clearHintTimer() {
    if (state.hintTimerId) {
      window.clearTimeout(state.hintTimerId);
      state.hintTimerId = null;
    }
  }

  function resetHintForQuestion() {
    clearHintTimer();
    state.hintQIndex = state.index;
    if (hintBlock) hintBlock.hidden = true;
    if (hintContent) hintContent.hidden = true;
    if (hintEn) hintEn.textContent = "";
    if (hintAs) hintAs.textContent = "";
    if (hintBtn) { hintBtn.disabled = false; hintBtn.textContent = t("showHint"); }
  }

  function startHintTimer() {
    clearHintTimer();
    state.hintTimerId = window.setTimeout(function () {
      state.hintTimerId = null;
      if (!state.started || state.finished) return;
      if (state.hintQIndex !== state.index) return;
      if (hintBlock) hintBlock.hidden = false;
    }, HINT_DELAY_MS);
  }

  async function loadHint() {
    if (!state.publicTest) return;
    const qIndex = state.index;
    const cacheKey = hintCacheKey(qIndex);

    let cached = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}

    if (cached && cached.hintEn) {
      renderHintContent(cached.hintEn, cached.hintAs || "");
      return;
    }

    if (hintBtn) { hintBtn.disabled = true; hintBtn.textContent = t("hintLoading"); }
    if (hintContent) hintContent.hidden = false;
    if (hintEn) hintEn.innerHTML = '<span class="hint-loading-text">' + escapeHTMLLocal(t("hintLoading")) + '</span>';
    if (hintAs) hintAs.textContent = "";
    if (hintDivider) hintDivider.style.display = "none";

    try {
      const res = await fetch(API_BASE + "/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: state.publicTest.id, questionIndex: qIndex })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const en = (data && data.hintEn) || "";
      const as = (data && data.hintAs) || "";
      if (!en) throw new Error("Empty hint");
      try { localStorage.setItem(cacheKey, JSON.stringify({ hintEn: en, hintAs: as })); } catch (e) {}
      renderHintContent(en, as);
    } catch (err) {
      if (hintBtn) { hintBtn.disabled = false; hintBtn.textContent = t("showHint"); }
      if (hintEn) hintEn.textContent = "Hint unavailable. Try eliminating wrong options.";
      if (hintAs) hintAs.textContent = "";
      if (hintDivider) hintDivider.style.display = "none";
    }
  }

  function renderHintContent(en, as) {
    if (hintContent) hintContent.hidden = false;
    if (hintEn) hintEn.textContent = en;
    if (as && String(as).trim()) {
      if (hintAs) hintAs.textContent = as;
      if (hintDivider) hintDivider.style.display = "";
    } else {
      if (hintAs) hintAs.textContent = "";
      if (hintDivider) hintDivider.style.display = "none";
    }
    if (hintBtn) { hintBtn.disabled = true; hintBtn.textContent = t("showHint"); }
  }

  if (hintBtn) {
    hintBtn.addEventListener("click", function () {
      if (hintBtn.disabled) return;
      loadHint();
    });
  }

  /* ---------- Begin test ---------- */

  function beginTest() {
    if (isSessionTerminated()) {
      showScreen("test");
      showTerminateModal();
      return;
    }

    state.started = true;
    state.index = 0;
    state.answers = {};
    state.marked.clear();
    state.visited.clear();
    state.finished = false;
    state.submitting = false;

    clearInterruptState();

    showScreen("test");
    examTitle.textContent = state.translatedTitle || state.publicTest.title;
    renderQuestion(true);
    renderPalette();
    updateNavSummary();
    startTimer();

    announce(t("questionOf", { n: 1, total: state.publicTest.questions.length }));
    if (nextBtn) nextBtn.focus();
    startSession();
  }

  /* ---------- Question rendering ---------- */

  async function renderQuestion(markVisited) {
    const pt = state.publicTest;
    if (!pt) return;
    const index = state.index;
    const question = pt.questions[index];
    if (!question) return;

    if (markVisited !== false) state.visited.add(index);

    if (state.hintQIndex !== index) {
      resetHintForQuestion();
      startHintTimer();
    }

    qNumber.textContent = t("questionOf", { n: index + 1, total: pt.questions.length });
    qStatus.textContent = statusFor(index);
    qText.textContent = question.q;
    optionsFieldset.replaceChildren();

    const selected = hasAnswer(index) ? state.answers[index] : null;

    const buildOptions = function (optionTexts) {
      optionTexts.forEach(function (optText, optionIndex) {
        const label = document.createElement("label");
        label.className = "option";
        label.dataset.value = String(optionIndex);
        if (selected === optionIndex) label.classList.add("is-selected");

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "q-option";
        input.value = String(optionIndex);
        input.checked = selected === optionIndex;
        input.addEventListener("change", function () { selectOption(optionIndex); });

        const key = document.createElement("span");
        key.className = "option-key";
        key.setAttribute("aria-hidden", "true");
        key.textContent = "ABCD".charAt(optionIndex);

        const text = document.createElement("span");
        text.className = "option-text";
        text.textContent = optText;

        label.appendChild(input);
        label.appendChild(key);
        label.appendChild(text);
        optionsFieldset.appendChild(label);
      });
    };

    buildOptions(question.options);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pt.questions.length - 1;
    updateMarkButton();
    updateNavSummary();

    if (window.PK && PK.lang === "as") {
      try {
        const translated = await apiTranslateMany([question.q].concat(question.options), "as");
        if (translated && translated.length === question.options.length + 1) {
          qText.textContent = translated[0];
          optionsFieldset.replaceChildren();
          buildOptions(translated.slice(1));
          prevBtn.disabled = index === 0;
          nextBtn.disabled = index === pt.questions.length - 1;
          updateMarkButton();
          updateNavSummary();
        }
      } catch (err) {}
    }
  }

  function selectOption(optionIndex) {
    state.answers[state.index] = Number(optionIndex);
    optionsFieldset.querySelectorAll(".option").forEach(function (label) {
      label.classList.toggle("is-selected", label.dataset.value === String(optionIndex));
    });
    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function clearResponse() {
    if (!hasAnswer(state.index)) return;
    delete state.answers[state.index];
    optionsFieldset.querySelectorAll(".option").forEach(function (label) { label.classList.remove("is-selected"); });
    optionsFieldset.querySelectorAll("input[type='radio']").forEach(function (input) { input.checked = false; });
    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function updateNavSummary() {
    const answered = Object.keys(state.answers).length;
    const total = state.publicTest ? state.publicTest.questions.length : 0;
    if (examSub) examSub.textContent = answered + " / " + total;
  }

  function updateMarkButton() {
    const marked = state.marked.has(state.index);
    markBtn.classList.toggle("is-active", marked);
    markBtn.textContent = marked ? t("unmarkReview") : t("markForReview");
    markBtn.setAttribute("aria-pressed", String(marked));
  }

  function goTo(index) {
    const pt = state.publicTest;
    if (!pt) return;
    if (index < 0 || index >= pt.questions.length) return;
    if (index === state.index) { closePalette(); return; }
    state.index = index;
    renderQuestion(true);
    renderPalette();
    closePalette();
    announce(t("questionOf", { n: index + 1, total: pt.questions.length }) + ". " + statusFor(index));
  }

  function renderPalette() {
    const pt = state.publicTest;
    if (!pt || !paletteGrid) return;
    paletteGrid.replaceChildren();
    pt.questions.forEach(function (_, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-btn";
      btn.textContent = String(index + 1);
      if (state.visited.has(index)) btn.classList.add("is-visited");
      if (hasAnswer(index)) btn.classList.add("is-answered");
      if (state.marked.has(index)) btn.classList.add("is-marked");
      if (index === state.index) { btn.classList.add("is-current"); btn.setAttribute("aria-current", "true"); }
      btn.setAttribute("aria-label", (index + 1) + ". " + statusFor(index));
      btn.addEventListener("click", function () { goTo(index); });
      paletteGrid.appendChild(btn);
    });
  }

  function openPalette() {
    if (!palettePanel) return;
    palettePanel.classList.add("open");
    paletteBackdrop.hidden = false;
    if (paletteClose) paletteClose.focus();
  }

  function closePalette() {
    if (!palettePanel) return;
    palettePanel.classList.remove("open");
    paletteBackdrop.hidden = true;
  }

  if (paletteToggle) {
    paletteToggle.addEventListener("click", function () {
      if (palettePanel.classList.contains("open")) closePalette();
      else openPalette();
    });
  }
  if (paletteClose) paletteClose.addEventListener("click", closePalette);
  if (paletteBackdrop) paletteBackdrop.addEventListener("click", closePalette);

  /* ---------- Timer ---------- */

  function updateTimer() {
    timerText.textContent = formatClock(state.remaining);
    timerEl.classList.toggle("is-warning", state.remaining <= 60);
    if (!state.warnedOneMinute && state.remaining <= 60 && state.remaining > 0) {
      state.warnedOneMinute = true;
      announce(t("oneMinuteLeft"));
    }
  }

  function startTimer() {
    const minutes = state.publicTest ? state.publicTest.minutes : 0;
    state.startedAt = Date.now();
    state.endAt = state.startedAt + minutes * 60 * 1000;
    state.remaining = minutes * 60;
    state.warnedOneMinute = false;
    updateTimer();
    if (state.timerId) window.clearInterval(state.timerId);
    state.timerId = window.setInterval(function () {
      const remaining = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
      state.remaining = remaining;
      updateTimer();
      if (remaining <= 0) {
        window.clearInterval(state.timerId);
        state.timerId = null;
        announce(t("timeUp"));
        submitTest();
      }
    }, 250);
  }

  /* ---------- Submit ---------- */

  async function submitTest() {
    if (state.finished || state.submitting) return;
    endSession(false);
    clearHintTimer();
    state.submitting = true;
    state.finished = true;

    if (state.timerId) { window.clearInterval(state.timerId); state.timerId = null; }
    closePalette();
    closeConfirm();

    state.elapsed = Math.round((Date.now() - state.startedAt) / 1000);

    const payloadAnswers = {};
    Object.keys(state.answers).forEach(function (i) {
      const v = state.answers[i];
      if (typeof v === "number" && v >= 0 && v <= 3) payloadAnswers[String(i)] = v;
    });

    let scored = null;
    try {
      scored = await apiSubmit(testId, {
        answers: payloadAnswers,
        userName: state.userName,
        userWhatsApp: state.userWhatsApp || "",
        timeTaken: state.elapsed || 0
      });
    } catch (err) {
      scored = { correct: 0, wrong: 0, unattempted: state.publicTest.questions.length, total: state.publicTest.questions.length, percent: 0 };
    }

    state.result = {
      correct: Number(scored.correct) || 0,
      wrong: Number(scored.wrong) || 0,
      unattempted: Number(scored.unattempted) || 0,
      total: Number(scored.total) || state.publicTest.questions.length,
      percent: Number(scored.percent) || 0,
      correctAnswers: (scored && scored.correctAnswers) ? scored.correctAnswers : null
    };

    showScreen("result");
    renderResult();
    announce(t("resultEyebrow") + ". " + t("scoreOf", { a: state.result.correct, b: state.result.total }));
  }

  function renderResult() {
    const r = state.result;
    if (!r) return;

    const title = state.translatedTitle || (state.publicTest ? state.publicTest.title : "");
    const pub = state.translatedPublisher || (state.publicTest ? state.publicTest.publisherName : "");

    resultTitle.textContent = title;
    resultPublisher.textContent = publisherLine(pub);

    scoreValue.textContent = String(r.correct);
    scoreTotal.textContent = "/ " + r.total;
    scorePercent.textContent = r.percent + "%";
    progressFill.style.width = r.percent + "%";

    statCorrect.textContent = String(r.correct);
    statWrong.textContent = String(r.wrong);
    statUnattempted.textContent = String(r.unattempted);
    statTime.textContent = formatClock(state.elapsed);

    const reviewBtnEl = document.getElementById("reviewBtn");
    const reviewContainerEl = document.getElementById("reviewContainer");
    if (reviewBtnEl) reviewBtnEl.hidden = !(r && r.correctAnswers);
    if (reviewContainerEl) { reviewContainerEl.hidden = true; reviewContainerEl.innerHTML = ""; }
    state.reviewVisible = false;
    if (reviewBtnEl) reviewBtnEl.textContent = t("reviewAnswers");
  }

  /* ---------- Confirm modal ---------- */

  let lastFocused = null;

  function openConfirm() {
    const total = state.publicTest ? state.publicTest.questions.length : 0;
    const answered = Object.keys(state.answers).length;
    confirmAnswered.textContent = String(answered);
    confirmUnanswered.textContent = String(total - answered);
    confirmMarked.textContent = String(state.marked.size);
    lastFocused = document.activeElement;
    confirmOverlay.classList.add("open");
    confirmOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (confirmSubmit) confirmSubmit.focus(); }, 40);
  }

  function closeConfirm() {
    if (!confirmOverlay || !confirmOverlay.classList.contains("open")) return;
    confirmOverlay.classList.remove("open");
    confirmOverlay.setAttribute("aria-hidden", "true");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function trapFocus(event) {
    const focusables = confirmOverlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.prototype.filter.call(focusables, function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* ---------- Interruption logic ---------- */

  function showInterruptModal(count) {
    if (!interruptOverlay) return;
    if (interruptWarnCount) {
      interruptWarnCount.textContent = t("interruptWarn", { n: count, total: MAX_INTERRUPTIONS });
    }
    interruptOverlay.classList.add("open");
    interruptOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (resumeBtn) resumeBtn.focus(); }, 40);
  }

  function hideInterruptModal() {
    if (!interruptOverlay) return;
    interruptOverlay.classList.remove("open");
    interruptOverlay.setAttribute("aria-hidden", "true");
  }

  function formatRemaining(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return s + "s";
    return m + "m " + String(s).padStart(2, "0") + "s";
  }

  function startTerminateCountdown() {
    if (terminateCountdownId) {
      window.clearInterval(terminateCountdownId);
      terminateCountdownId = null;
    }

    function tick() {
      const remaining = getRemainingCooldown();
      if (!terminateRemaining) return;

      if (remaining > 0) {
        terminateRemaining.textContent = "Please wait " + formatRemaining(remaining);
      } else {
        terminateRemaining.textContent = "You can retake this test now.";
        if (terminateCountdownId) {
          window.clearInterval(terminateCountdownId);
          terminateCountdownId = null;
        }
        setTimeout(function () { window.location.reload(); }, 1500);
      }
    }

    tick();
    terminateCountdownId = window.setInterval(tick, 1000);
  }

  function showTerminateModal() {
    if (!terminateOverlay) return;
    terminateOverlay.classList.add("open");
    terminateOverlay.setAttribute("aria-hidden", "false");
    startTerminateCountdown();
  }

  function terminateTest() {
    if (state.finished) return;
    state.finished = true;
    state.submitting = true;
    endSession(false);
    clearHintTimer();
    if (state.timerId) { window.clearInterval(state.timerId); state.timerId = null; }
    hideInterruptModal();
    closePalette();
    closeConfirm();
    markTerminated();
    showTerminateModal();
  }

  function registerInterruption() {
    if (!state.started || state.finished) return;
    if (!state.settings.enabled) return;

    const newCount = getInterruptCount() + 1;
    setInterruptCount(newCount);

    if (newCount >= MAX_INTERRUPTIONS) {
      terminateTest();
    } else {
      showInterruptModal(newCount);
    }
  }

  function handleStartAway() {
    if (!state.started || state.finished) return;
    if (awayActive) return;
    awayActive = true;
  }

  function handleEndAway() {
    if (!awayActive) return;
    awayActive = false;
    if (!state.started || state.finished) return;
    registerInterruption();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") handleStartAway();
    else handleEndAway();
  });

  window.addEventListener("blur", function () {
    if (document.visibilityState === "hidden") return;
    handleStartAway();
  });

  window.addEventListener("focus", function () { handleEndAway(); });

  if (resumeBtn) resumeBtn.addEventListener("click", hideInterruptModal);

  if (interruptOverlay) {
    interruptOverlay.addEventListener("click", function (event) {
      if (event.target === interruptOverlay) hideInterruptModal();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && interruptOverlay && interruptOverlay.classList.contains("open")) {
      hideInterruptModal();
    }
  });

  /* ---------- Result PNG ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(function (word) {
      const cand = line ? line + " " + word : word;
      if (ctx.measureText(cand).width > maxWidth && line) { lines.push(line); line = word; }
      else line = cand;
    });
    if (line) lines.push(line);
    return lines;
  }

  function buildResultCanvas() {
    const r = state.result;
    if (!r) return null;
    const scale = 2, W = 1000, H = 760;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.stroke();
    const pad = 56;
    let y = 86;
    ctx.font = "600 26px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    ctx.fillText("preparekora", pad, y);
    const brandW = ctx.measureText("preparekora").width;
    ctx.font = "400 26px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#858585";
    ctx.fillText(".in", pad + brandW, y);
    y += 46;
    ctx.font = "600 12px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(t("resultPngTitle"), pad, y);
    y += 48;
    ctx.font = "700 30px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    const title = state.translatedTitle || (state.publicTest ? state.publicTest.title : "—");
    const titleLines = wrapText(ctx, title, W - pad * 2).slice(0, 2);
    titleLines.forEach(function (line) { ctx.fillText(line, pad, y); y += 38; });
    y += 6;
    ctx.font = "400 15px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    const pub = state.translatedPublisher || (state.publicTest ? state.publicTest.publisherName : "");
    ctx.fillText(publisherLine(pub), pad, y);
    y += 18;
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    y += 60;
    ctx.font = "400 14px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(t("resultPngName"), pad, y - 12);
    ctx.font = "600 30px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    const safeName = state.userName || "—";
    const nameLines = wrapText(ctx, safeName, W - pad * 2 - 320).slice(0, 2);
    let nameY = y + 22;
    nameLines.forEach(function (line) { ctx.fillText(line, pad, nameY); nameY += 36; });
    ctx.textAlign = "right";
    ctx.font = "700 56px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    ctx.fillText(String(r.correct), W - pad, y + 30);
    const scoreRightW = ctx.measureText(String(r.correct)).width;
    ctx.font = "400 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText("/ " + r.total, W - pad - scoreRightW - 12, y + 30);
    ctx.font = "600 16px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(r.percent + "%", W - pad, y + 52);
    ctx.textAlign = "left";
    y = Math.max(nameY, y + 70) + 30;
    const gap = 16;
    const boxW = (W - pad * 2 - gap * 3) / 4;
    const boxH = 96;
    const stats = [
      { label: t("correct"), value: r.correct },
      { label: t("wrong"), value: r.wrong },
      { label: t("unattempted"), value: r.unattempted },
      { label: t("timeTaken"), value: formatClock(state.elapsed) }
    ];
    let boxX = pad;
    stats.forEach(function (item) {
      roundRect(ctx, boxX, y, boxW, boxH, 12);
      ctx.strokeStyle = "#e7e7e7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#737373";
      ctx.font = "400 13px Arial, Helvetica, sans-serif";
      ctx.fillText(item.label, boxX + 18, y + 36);
      ctx.fillStyle = "#111111";
      ctx.font = "700 24px Arial, Helvetica, sans-serif";
      ctx.fillText(String(item.value), boxX + 18, y + 70);
      boxX += boxW + gap;
    });
    const footerY = H - 44;
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, footerY - 26);
    ctx.lineTo(W - pad, footerY - 26);
    ctx.stroke();
    ctx.font = "400 13px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText("preparekora.in", pad, footerY);
    ctx.textAlign = "right";
    ctx.fillText(
      t("resultPngDate") + ": " + new Date().toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }),
      W - pad, footerY
    );
    ctx.textAlign = "left";
    return canvas;
  }

  function downloadResult() {
    const canvas = buildResultCanvas();
    if (!canvas) return;
    const filename = "preparekora-result-" + (state.publicTest ? state.publicTest.id : "test") + "-" + new Date().toISOString().slice(0, 10) + ".png";
    function trigger(url, revoke) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) return trigger(canvas.toDataURL("image/png"), false);
        trigger(URL.createObjectURL(blob), true);
      }, "image/png");
    } else {
      trigger(canvas.toDataURL("image/png"), false);
    }
  }

  /* ---------- Review module ---------- */

  const reviewBtn = document.getElementById("reviewBtn");
  const reviewContainer = document.getElementById("reviewContainer");
  const EXPLAIN_CACHE_PREFIX = "pke_v1_";
  const EXPLAIN_BATCH = 3;

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  function explainCacheKey(index, question, correctIndex) {
    const tid = state.publicTest ? state.publicTest.id : "unknown";
    return EXPLAIN_CACHE_PREFIX + tid + "_" + index + "_" + hashString(question + "|" + correctIndex);
  }

  function buildReview() {
    if (!reviewContainer) return;
    reviewContainer.innerHTML = "";

    if (!state.publicTest || !state.result || !state.result.correctAnswers) {
      reviewContainer.hidden = false;
      const err = document.createElement("div");
      err.className = "empty-state";
      err.textContent = "Review unavailable.";
      reviewContainer.appendChild(err);
      return;
    }

    const questions = state.publicTest.questions;
    const correctAnswers = state.result.correctAnswers;
    const letters = ["A", "B", "C", "D"];
    const tasks = [];

    questions.forEach(function (q, i) {
      const correctIdx = Number(correctAnswers[String(i)]);
      const userIdx = Object.prototype.hasOwnProperty.call(state.answers, i) ? Number(state.answers[i]) : null;

      const item = document.createElement("div");
      item.className = "review-item";

      const head = document.createElement("div");
      head.className = "review-head";

      const num = document.createElement("span");
      num.className = "review-num";
      num.textContent = "Q" + (i + 1);

      let badgeClass, badgeText;
      if (userIdx === null) { badgeClass = "skipped"; badgeText = t("statusNotAnswered"); }
      else if (userIdx === correctIdx) { badgeClass = "correct"; badgeText = t("correct"); }
      else { badgeClass = "wrong"; badgeText = t("wrong"); }

      const badge = document.createElement("span");
      badge.className = "review-badge " + badgeClass;
      badge.textContent = badgeText;

      head.appendChild(num);
      head.appendChild(badge);
      item.appendChild(head);

      const qText = document.createElement("div");
      qText.className = "review-q";
      qText.textContent = q.q;
      item.appendChild(qText);

      const optsWrap = document.createElement("div");
      optsWrap.className = "review-options";

      q.options.forEach(function (optText, oi) {
        const opt = document.createElement("div");
        opt.className = "review-option";
        if (oi === correctIdx) opt.classList.add("is-correct");
        if (oi === userIdx && userIdx !== correctIdx) opt.classList.add("is-wrong");

        const key = document.createElement("span");
        key.className = "review-option-key";
        key.textContent = letters[oi];

        const txt = document.createElement("span");
        txt.className = "review-option-text";
        txt.textContent = optText;

        opt.appendChild(key);
        opt.appendChild(txt);

        if (oi === correctIdx) {
          const tag = document.createElement("span");
          tag.className = "review-tag correct-tag";
          tag.textContent = t("reviewCorrectAnswer");
          opt.appendChild(tag);
        } else if (oi === userIdx) {
          const tag = document.createElement("span");
          tag.className = "review-tag wrong-tag";
          tag.textContent = t("reviewYourAnswer");
          opt.appendChild(tag);
        }

        optsWrap.appendChild(opt);
      });

      item.appendChild(optsWrap);

      const expl = document.createElement("div");
      expl.className = "review-explanation";

      const explLabel = document.createElement("div");
      explLabel.className = "review-explanation-label";
      explLabel.textContent = t("reviewExplanation");

      const explText = document.createElement("div");
      explText.className = "review-explanation-text";
      explText.textContent = t("reviewExplanationLoading");

      expl.appendChild(explLabel);
      expl.appendChild(explText);
      item.appendChild(expl);

      reviewContainer.appendChild(item);

      tasks.push({
        index: i,
        question: q.q,
        options: q.options,
        correctIdx: correctIdx,
        userIdx: userIdx,
        el: explText
      });
    });

    reviewContainer.hidden = false;
    runExplanationBatches(tasks);
  }

  async function runExplanationBatches(tasks) {
    for (let i = 0; i < tasks.length; i += EXPLAIN_BATCH) {
      await Promise.all(tasks.slice(i, i + EXPLAIN_BATCH).map(fetchExplanation));
    }
  }

  async function fetchExplanation(task) {
    const cacheKey = explainCacheKey(task.index, task.question, task.correctIdx);

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { task.el.textContent = cached; return; }
    } catch (e) {}

    try {
      const res = await fetch(API_BASE + "/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: task.question,
          options: task.options,
          correctIndex: task.correctIdx,
          userAnswer: task.userIdx
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const text = (data && data.explanation) || "";
      if (text) {
        task.el.textContent = text;
        try { localStorage.setItem(cacheKey, text); } catch (e) {}
      } else {
        task.el.textContent = t("reviewExplanationFailed");
      }
    } catch (err) {
      task.el.textContent = t("reviewExplanationFailed");
    }
  }

  function showReview() {
    state.reviewVisible = true;
    if (reviewBtn) reviewBtn.textContent = t("reviewHide");
    buildReview();
  }

  function hideReview() {
    state.reviewVisible = false;
    if (reviewBtn) reviewBtn.textContent = t("reviewAnswers");
    if (reviewContainer) { reviewContainer.hidden = true; reviewContainer.innerHTML = ""; }
  }

  if (reviewBtn) {
    reviewBtn.addEventListener("click", function () {
      if (state.reviewVisible) hideReview();
      else showReview();
    });
  }

  /* ---------- Event wiring ---------- */

  if (prevBtn) prevBtn.addEventListener("click", function () { goTo(state.index - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { goTo(state.index + 1); });
  if (clearBtn) clearBtn.addEventListener("click", clearResponse);

  if (markBtn) {
    markBtn.addEventListener("click", function () {
      if (state.marked.has(state.index)) state.marked.delete(state.index);
      else state.marked.add(state.index);
      updateMarkButton();
      qStatus.textContent = statusFor(state.index);
      renderPalette();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () { if (state.finished) return; openConfirm(); });
  }

  if (confirmCancel) confirmCancel.addEventListener("click", closeConfirm);
  if (confirmSubmit) confirmSubmit.addEventListener("click", function () { submitTest(); });

  if (confirmOverlay) {
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  if (downloadBtn) downloadBtn.addEventListener("click", downloadResult);
  if (retakeBtn) retakeBtn.addEventListener("click", function () { window.location.reload(); });

  document.addEventListener("keydown", function (e) {
    if (confirmOverlay && confirmOverlay.classList.contains("open")) {
      if (e.key === "Escape") { e.preventDefault(); closeConfirm(); return; }
      if (e.key === "Tab") { trapFocus(e); return; }
    }
    if (e.key === "Escape") { closeMenu(); closePalette(); }
  });

  window.addEventListener("resize", function () { if (window.innerWidth > 860) closePalette(); });

  window.addEventListener("beforeunload", function () {
    if (state.started && !state.finished) endSession(true);
  });

  /* ---------- Mobile menu ---------- */

  const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  function openMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuIcon.innerHTML = closeSVG;
  }

  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else openMenu();
    });
    document.addEventListener("click", function (e) {
      if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    menuPanel.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", async function () {
    if (!state.publicTest) return;
    if (state.finished) {
      if (state.reviewVisible) hideReview();
      await translateStartIfNeeded();
      renderResult();
      return;
    }
    if (state.started) {
      examTitle.textContent = state.translatedTitle || state.publicTest.title;
      renderQuestion(false);
      renderPalette();
      updateMarkButton();
      updateNavSummary();
      return;
    }
    await translateStartIfNeeded();
    renderStart();
  });

  /* ---------- Init ---------- */

  const _retrySignInBtn = document.getElementById("retrySignInBtn");
  if (_retrySignInBtn) {
    _retrySignInBtn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    });
  }

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  (async function init() {
    showScreen("loading");
    loadTest();
  })();

})();
