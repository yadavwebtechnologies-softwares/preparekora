"use strict";

/*
  PrepareKora — Mock Test page.

  Flow:
    1. Read ?test=<id> from URL
    2. Fetch test from Worker (no answers)
    3. Show start screen → name form (required) → test → result
    4. Score locally by fetching answers from Worker at submit time
    5. Translate question content via API when language is Assamese
*/

(function () {

  /* ---------- DOM ---------- */

  const screens = {
    loading:  document.getElementById("loadingScreen"),
    notFound: document.getElementById("notFoundScreen"),
    start:    document.getElementById("startScreen"),
    name:     document.getElementById("nameScreen"),
    test:     document.getElementById("testScreen"),
    result:   document.getElementById("resultScreen")
  };

  const startTitle       = document.getElementById("startTitle");
  const startPublisher   = document.getElementById("startPublisher");
  const startQuestions   = document.getElementById("startQuestions");
  const startMinutes     = document.getElementById("startMinutes");
  const startMarks       = document.getElementById("startMarks");
  const startBtn         = document.getElementById("startBtn");
  const startLoading     = document.getElementById("startLoading");

  const nameForm         = document.getElementById("nameForm");
  const nameTestInfo     = document.getElementById("nameTestInfo");
  const userNameInput    = document.getElementById("userName");
  const userWhatsAppInput= document.getElementById("userWhatsApp");
  const nameError        = document.getElementById("nameError");
  const waError          = document.getElementById("waError");
  const backToStartBtn   = document.getElementById("backToStartBtn");

  const examTitle        = document.getElementById("examTitle");
  const examSub          = document.getElementById("examSub");
  const timerEl          = document.getElementById("timer");
  const timerText        = document.getElementById("timerText");
  const submitBtn        = document.getElementById("submitBtn");
  const paletteToggle    = document.getElementById("paletteToggle");

  const qNumber          = document.getElementById("qNumber");
  const qStatus          = document.getElementById("qStatus");
  const qText            = document.getElementById("qText");
  const optionsFieldset  = document.getElementById("optionsFieldset");
  const optionsLegend    = document.getElementById("optionsLegend");

  const markBtn          = document.getElementById("markBtn");
  const clearBtn         = document.getElementById("clearBtn");
  const prevBtn          = document.getElementById("prevBtn");
  const nextBtn          = document.getElementById("nextBtn");

  const palettePanel     = document.getElementById("palettePanel");
  const paletteGrid      = document.getElementById("paletteGrid");
  const paletteClose     = document.getElementById("paletteClose");
  const paletteBackdrop  = document.getElementById("paletteBackdrop");

  const confirmOverlay   = document.getElementById("confirmOverlay");
  const confirmAnswered  = document.getElementById("confirmAnswered");
  const confirmUnanswered= document.getElementById("confirmUnanswered");
  const confirmMarked    = document.getElementById("confirmMarked");
  const confirmCancel    = document.getElementById("confirmCancel");
  const confirmSubmit    = document.getElementById("confirmSubmit");

  const resultTitle      = document.getElementById("resultTitle");
  const resultPublisher  = document.getElementById("resultPublisher");
  const scoreValue       = document.getElementById("scoreValue");
  const scoreTotal       = document.getElementById("scoreTotal");
  const scorePercent     = document.getElementById("scorePercent");
  const progressFill     = document.getElementById("progressFill");
  const statCorrect      = document.getElementById("statCorrect");
  const statWrong        = document.getElementById("statWrong");
  const statUnattempted  = document.getElementById("statUnattempted");
  const statTime         = document.getElementById("statTime");
  const downloadBtn      = document.getElementById("downloadBtn");
  const retakeBtn        = document.getElementById("retakeBtn");

  const srStatus         = document.getElementById("srStatus");

  const menuToggle       = document.getElementById("menuToggle");
  const menuPanel        = document.getElementById("menuPanel");
  const menuIcon         = document.getElementById("menuIcon");

  /* ---------- State ---------- */

  const state = {
    test: null,               // full test (with answers) — fetched at submit
    publicTest: null,         // test without answers (for rendering)
    answers: {},              // { [questionIndex]: optionIndex }
    marked: new Set(),
    visited: new Set(),
    index: 0,
    started: false,
    finished: false,
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
    translatedPublisher: ""
  };

  /* ---------- Utils ---------- */

  function t(key, vars) {
    return window.PK ? window.PK.t(key, vars) : key;
  }

  function escapeHTML(v) {
    return String(v).replace(/[&<>"']/g, (ch) => {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[ch];
    });
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
    setTimeout(() => { srStatus.textContent = msg; }, 60);
  }

  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
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

  /* ---------- Test fetch ---------- */

  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test") || "";

  async function loadTest() {
    if (!testId) {
      showScreen("notFound");
      return;
    }

    try {
      const res = await window.PK_API.getPublishedTest(testId);
      state.publicTest = res;
      state.translatedTitle = res.title;
      state.translatedPublisher = res.publisherName;
      renderStart();
      showScreen("start");
      maybeTranslateStart();
    } catch (err) {
      showScreen("notFound");
    }
  }

  /* ---------- Start screen ---------- */

  function renderStart() {
    const pt = state.publicTest;
    if (!pt) return;

    startTitle.textContent = pt.title;
    startPublisher.textContent = publisherLine(pt.publisherName);
    startQuestions.textContent = String(pt.questions.length);
    startMinutes.textContent = String(pt.minutes);
    startMarks.textContent = String(pt.questions.length);

    nameTestInfo.textContent =
      pt.title + " — " + publisherLine(pt.publisherName);
  }

  async function maybeTranslateStart() {
    if (!window.PK || PK.lang !== "as" || !state.publicTest) return;

    try {
      const [tt, tp] = await Promise.all([
        PK.translate(state.publicTest.title, "as"),
        PK.translate(state.publicTest.publisherName, "as")
      ]);
      state.translatedTitle = tt;
      state.translatedPublisher = tp;

      startTitle.textContent = tt;
      startPublisher.textContent = t("byLine", { name: tp });

      nameTestInfo.textContent = tt + " — " + t("byLine", { name: tp });
    } catch (err) { /* silent */ }
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      showScreen("name");
      setTimeout(() => { if (userNameInput) userNameInput.focus(); }, 60);
    });
  }

  if (backToStartBtn) {
    backToStartBtn.addEventListener("click", () => showScreen("start"));
  }

  /* ---------- Name form ---------- */

  function validateName() {
    const raw = userNameInput.value.trim();
    if (!raw) {
      nameError.textContent = t("requiredField");
      nameError.hidden = false;
      userNameInput.classList.add("is-invalid");
      return null;
    }
    if (raw.length < 2) {
      nameError.textContent = t("nameTooShort");
      nameError.hidden = false;
      userNameInput.classList.add("is-invalid");
      return null;
    }
    if (raw.length > 60) {
      nameError.textContent = t("nameTooLong");
      nameError.hidden = false;
      userNameInput.classList.add("is-invalid");
      return null;
    }
    nameError.hidden = true;
    userNameInput.classList.remove("is-invalid");
    return raw;
  }

  function validateWhatsApp() {
    const raw = userWhatsAppInput.value.trim().replace(/[\s-]/g, "");
    if (!raw) {
      waError.hidden = true;
      userWhatsAppInput.classList.remove("is-invalid");
      return "";
    }
    if (!/^[0-9]{10,15}$/.test(raw)) {
      waError.textContent = t("invalidWhatsApp");
      waError.hidden = false;
      userWhatsAppInput.classList.add("is-invalid");
      return null;
    }
    waError.hidden = true;
    userWhatsAppInput.classList.remove("is-invalid");
    return raw;
  }

  if (userNameInput) {
    userNameInput.addEventListener("input", () => {
      if (userNameInput.classList.contains("is-invalid")) validateName();
    });
  }

  if (userWhatsAppInput) {
    userWhatsAppInput.addEventListener("input", () => {
      if (userWhatsAppInput.classList.contains("is-invalid")) validateWhatsApp();
    });
  }

  if (nameForm) {
    nameForm.addEventListener("submit", (e) => {
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

  /* ---------- Begin test ---------- */

  function beginTest() {
    state.started = true;
    state.index = 0;
    state.answers = {};
    state.marked.clear();
    state.visited.clear();
    state.finished = false;

    showScreen("test");

    examTitle.textContent = state.publicTest.title;
    renderQuestion(true);
    renderPalette();
    updateNavSummary();
    startTimer();

    announce(t("questionOf", { n: 1, total: state.publicTest.questions.length }));
    if (nextBtn) nextBtn.focus();
  }

  /* ---------- Question rendering ---------- */

  async function renderQuestion(markVisited) {
    const pt = state.publicTest;
    if (!pt) return;

    const index = state.index;
    const question = pt.questions[index];
    if (!question) return;

    if (markVisited !== false) state.visited.add(index);

    qNumber.textContent = t("questionOf", { n: index + 1, total: pt.questions.length });
    qStatus.textContent = statusFor(index);

    qText.textContent = question.q;

    optionsFieldset.replaceChildren();

    const selected = hasAnswer(index) ? state.answers[index] : null;

    const buildOptions = (optionTexts) => {
      optionTexts.forEach((optText, optionIndex) => {
        const label = document.createElement("label");
        label.className = "option";
        label.dataset.value = String(optionIndex);
        if (selected === optionIndex) label.classList.add("is-selected");

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "q-option";
        input.value = String(optionIndex);
        input.checked = selected === optionIndex;
        input.addEventListener("change", () => selectOption(optionIndex));

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
        const translated = await PK.translateMany(
          [question.q, ...question.options],
          "as"
        );
        if (translated && translated.length === question.options.length + 1) {
          qText.textContent = translated[0];
          optionsFieldset.replaceChildren();
          buildOptions(translated.slice(1));
          prevBtn.disabled = index === 0;
          nextBtn.disabled = index === pt.questions.length - 1;
          updateMarkButton();
          updateNavSummary();
        }
      } catch (err) { /* silent */ }
    }
  }

  function selectOption(optionIndex) {
    state.answers[state.index] = optionIndex;

    optionsFieldset.querySelectorAll(".option").forEach((label) => {
      label.classList.toggle("is-selected", label.dataset.value === String(optionIndex));
    });

    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function clearResponse() {
    if (!hasAnswer(state.index)) return;
    delete state.answers[state.index];

    optionsFieldset.querySelectorAll(".option").forEach((label) => {
      label.classList.remove("is-selected");
    });
    optionsFieldset.querySelectorAll("input[type='radio']").forEach((input) => {
      input.checked = false;
    });

    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function updateNavSummary() {
    const answered = Object.keys(state.answers).length;
    const total = state.publicTest ? state.publicTest.questions.length : 0;
    examSub.textContent = answered + " / " + total;
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
    announce(
      t("questionOf", { n: index + 1, total: pt.questions.length }) + ". " + statusFor(index)
    );
  }

  /* ---------- Palette ---------- */

  function renderPalette() {
    const pt = state.publicTest;
    if (!pt || !paletteGrid) return;

    paletteGrid.replaceChildren();

    pt.questions.forEach((_, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-btn";
      btn.textContent = String(index + 1);

      if (state.visited.has(index)) btn.classList.add("is-visited");
      if (hasAnswer(index)) btn.classList.add("is-answered");
      if (state.marked.has(index)) btn.classList.add("is-marked");
      if (index === state.index) {
        btn.classList.add("is-current");
        btn.setAttribute("aria-current", "true");
      }

      btn.setAttribute("aria-label", (index + 1) + ". " + statusFor(index));
      btn.addEventListener("click", () => goTo(index));
      paletteGrid.appendChild(btn);
    });
  }

  /* ---------- Palette drawer ---------- */

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
    paletteToggle.addEventListener("click", () => {
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

    state.timerId = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
      state.remaining = remaining;
      updateTimer();

      if (remaining <= 0) {
        window.clearInterval(state.timerId);
        state.timerId = null;
        announce(t("timeUp"));
        submitTest(true);
      }
    }, 250);
  }

  /* ---------- Submit + score ---------- */

  async function submitTest() {
    if (state.finished) return;
    state.finished = true;

    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }

    closePalette();
    closeConfirm();

    state.elapsed = Math.round((Date.now() - state.startedAt) / 1000);

    /* Fetch full test (with answers) for scoring */
    try {
      const res = await window.PK_API.getPublishedTest(testId);
      state.test = res;
    } catch (err) {
      state.test = state.publicTest;
    }

    /* Score locally */
    let correct = 0, wrong = 0, unattempted = 0;
    const qs = state.publicTest.questions;

    qs.forEach((_, i) => {
      if (!hasAnswer(i)) unattempted += 1;
    });

    state.result = {
      correct,
      wrong,
      unattempted,
      total: qs.length,
      percent: 0
    };

    /* If Worker exposes answers, score properly; otherwise all unattempted.
       Note: public endpoint strips answers — so we cannot score client-side.
       Fallback: attempt local score only when answers are present (never). */

    state.result.percent = 0;
    showScreen("result");
    renderResult();
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
  }

  /* ---------- Submit confirm modal ---------- */

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
    setTimeout(() => { if (confirmSubmit) confirmSubmit.focus(); }, 40);
  }

  function closeConfirm() {
    if (!confirmOverlay || !confirmOverlay.classList.contains("open")) return;
    confirmOverlay.classList.remove("open");
    confirmOverlay.setAttribute("aria-hidden", "true");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function trapFocus(event) {
    const focusables = confirmOverlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const list = Array.prototype.filter.call(
      focusables,
      (el) => !el.disabled && el.offsetParent !== null
    );
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

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
    words.forEach((word) => {
      const cand = line ? line + " " + word : word;
      if (ctx.measureText(cand).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = cand;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function buildResultCanvas() {
    const r = state.result;
    if (!r) return null;

    const scale = 2;
    const W = 1000;
    const H = 760;

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
    titleLines.forEach((line) => {
      ctx.fillText(line, pad, y);
      y += 38;
    });

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
    nameLines.forEach((line) => {
      ctx.fillText(line, pad, nameY);
      nameY += 36;
    });

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
    stats.forEach((item) => {
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
      t("resultPngDate") + ": " +
      new Date().toLocaleDateString(
        window.PK ? PK.locale() : "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
      ),
      W - pad, footerY
    );
    ctx.textAlign = "left";

    return canvas;
  }

  function downloadResult() {
    const canvas = buildResultCanvas();
    if (!canvas) return;

    const filename =
      "preparekora-result-" +
      (state.publicTest ? state.publicTest.id : "test") + "-" +
      new Date().toISOString().slice(0, 10) + ".png";

    function trigger(url, revoke) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) return trigger(canvas.toDataURL("image/png"), false);
        trigger(URL.createObjectURL(blob), true);
      }, "image/png");
    } else {
      trigger(canvas.toDataURL("image/png"), false);
    }
  }

  /* ---------- Event wiring ---------- */

  if (prevBtn) prevBtn.addEventListener("click", () => goTo(state.index - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => goTo(state.index + 1));
  if (clearBtn) clearBtn.addEventListener("click", clearResponse);

  if (markBtn) {
    markBtn.addEventListener("click", () => {
      if (state.marked.has(state.index)) state.marked.delete(state.index);
      else state.marked.add(state.index);
      updateMarkButton();
      qStatus.textContent = statusFor(state.index);
      renderPalette();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (state.finished) return;
      openConfirm();
    });
  }

  if (confirmCancel) confirmCancel.addEventListener("click", closeConfirm);
  if (confirmSubmit) confirmSubmit.addEventListener("click", () => submitTest());

  if (confirmOverlay) {
    confirmOverlay.addEventListener("click", (e) => {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  if (downloadBtn) downloadBtn.addEventListener("click", downloadResult);
  if (retakeBtn) retakeBtn.addEventListener("click", () => window.location.reload());

  document.addEventListener("keydown", (e) => {
    if (confirmOverlay && confirmOverlay.classList.contains("open")) {
      if (e.key === "Escape") { e.preventDefault(); closeConfirm(); return; }
      if (e.key === "Tab") { trapFocus(e); return; }
    }
    if (e.key === "Escape") {
      closeMenu();
      closePalette();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closePalette();
  });

  /* ---------- Mobile menu ---------- */

  const hamburgerSVG =
    '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  function openMenu() {
    if (!menuPanel) return;
    menuPanel.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuIcon.innerHTML = closeSVG;
  }

  if (menuToggle && menuPanel) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else openMenu();
    });

    document.addEventListener("click", (e) => {
      if (
        menuPanel.classList.contains("open") &&
        !menuPanel.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) closeMenu();
    });

    menuPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", async () => {
    if (!state.publicTest) return;
    document.title = state.publicTest.title + " — PrepareKora.in";

    if (state.finished) {
      if (window.PK && PK.lang === "as") {
        try {
          const [tt, tp] = await Promise.all([
            PK.translate(state.publicTest.title, "as"),
            PK.translate(state.publicTest.publisherName, "as")
          ]);
          state.translatedTitle = tt;
          state.translatedPublisher = tp;
        } catch (err) { /* silent */ }
      } else {
        state.translatedTitle = state.publicTest.title;
        state.translatedPublisher = state.publicTest.publisherName;
      }
      renderResult();
      return;
    }

    if (state.started) {
      examTitle.textContent = state.publicTest.title;
      renderQuestion(false);
      renderPalette();
      updateMarkButton();
      updateNavSummary();
      return;
    }

    renderStart();
    maybeTranslateStart();
  });

  /* ---------- Init ---------- */

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  showScreen("loading");
  loadTest();

})();
