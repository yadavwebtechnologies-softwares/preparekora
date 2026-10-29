"use strict";

/*
  PrepareKora — Review module (post-result).
  Read-only. Uses window.MockTestState and correctAnswers from the submit response.
*/

(function () {

  /* ---------- CSS ---------- */

  if (!document.getElementById("review-module-styles")) {
    const style = document.createElement("style");
    style.id = "review-module-styles";
    style.textContent =
      ".review-block{display:flex;flex-direction:column;gap:12px;}" +
      ".review-block-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px;}" +
      ".review-block-head h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:var(--text);}" +
      ".review-summary{display:flex;flex-wrap:wrap;gap:12px;color:var(--muted);font-size:12px;}" +
      ".review-summary strong{color:var(--text);font-weight:600;}" +
      ".review-card{padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:#ffffff;}" +
      ".review-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}" +
      ".review-card-num{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);}" +
      ".review-card-status{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border:1px solid var(--border);border-radius:999px;font-size:10px;color:var(--muted);white-space:nowrap;}" +
      ".review-card-status.is-answered{background:var(--accent);border-color:var(--accent);color:#ffffff;}" +
      ".review-card-status.is-marked{background:var(--surface);color:var(--text);}" +
      ".review-card-status svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}" +
      ".review-card-q{margin:0 0 10px;font-size:14px;font-weight:600;line-height:1.5;overflow-wrap:anywhere;color:var(--text);}" +
      ".review-opts{display:flex;flex-direction:column;gap:6px;}" +
      ".review-opt{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:#ffffff;font-size:13px;line-height:1.45;overflow-wrap:anywhere;}" +
      ".review-opt-key{display:grid;place-items:center;width:20px;height:20px;flex-shrink:0;border:1px solid var(--border);border-radius:50%;background:#ffffff;color:var(--muted);font-size:10px;font-weight:600;}" +
      ".review-opt-text{flex:1;}" +
      ".review-opt-mark{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;}" +
      ".review-opt-mark svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}" +
      ".review-opt.is-correct{border-color:var(--accent);background:var(--surface);}" +
      ".review-opt.is-correct .review-opt-key{background:var(--accent);border-color:var(--accent);color:#ffffff;}" +
      ".review-opt.is-correct .review-opt-mark{color:var(--accent);}" +
      ".review-opt.is-chosen-wrong{border-color:#b91c1c;background:#fef2f2;}" +
      ".review-opt.is-chosen-wrong .review-opt-key{background:#b91c1c;border-color:#b91c1c;color:#ffffff;}" +
      ".review-opt.is-chosen-wrong .review-opt-mark{color:#b91c1c;}" +
      ".review-opt.is-chosen-wrong .review-opt-text{color:#7f1d1d;}" +
      ".review-opt.is-chosen-only{border-color:var(--accent);background:var(--surface);}" +
      ".review-opt.is-chosen-only .review-opt-key{background:var(--accent);border-color:var(--accent);color:#ffffff;}" +
      ".review-overlay{position:fixed;inset:0;z-index:180;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity 0.25s ease;pointer-events:none;}" +
      ".review-overlay.is-visible{opacity:1;pointer-events:auto;}" +
      ".review-overlay-label{color:#ffffff;font-size:13px;font-weight:500;letter-spacing:0.02em;text-shadow:0 1px 2px rgba(0,0,0,0.4);}" +
      ".review-overlay .spinner{border-color:rgba(255,255,255,0.35);border-top-color:#ffffff;}" +
      "@media (max-width:560px){.review-card{padding:13px;}.review-card-q{font-size:13px;}.review-opt{font-size:12px;padding:7px 9px;}}";
    document.head.appendChild(style);
  }

  /* ---------- Helpers ---------- */

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function statusFor(index) {
    const state = window.MockTestState;
    if (!state || !state.publicTest) return "not-visited";
    const marked = state.marked.has(index);
    const answered = Object.prototype.hasOwnProperty.call(state.answers, index);
    const visited = state.visited.has(index);
    if (marked) return "marked";
    if (answered) return "answered";
    if (visited) return "not-answered";
    return "not-visited";
  }

  function answerFor(index) {
    const state = window.MockTestState;
    if (!state) return null;
    if (!Object.prototype.hasOwnProperty.call(state.answers, index)) return null;
    return state.answers[index];
  }

  function correctAnswerFor(index) {
    const state = window.MockTestState;
    if (!state || !state.result || !state.result.correctAnswers) return null;
    const ca = state.result.correctAnswers;
    if (typeof ca[String(index)] === "number") return ca[String(index)];
    if (typeof ca[index] === "number") return ca[index];
    return null;
  }

  /* ---------- Icons ---------- */

  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const ICON_CROSS =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
  const ICON_DOT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle></svg>';
  const ICON_EMPTY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle></svg>';

  function statusBadge(status) {
    if (status === "answered") return '<span class="review-card-status is-answered">' + ICON_CHECK + "Answered</span>";
    if (status === "marked") return '<span class="review-card-status is-marked">' + ICON_DOT + "Marked</span>";
    if (status === "not-answered") return '<span class="review-card-status">' + ICON_EMPTY + "Not answered</span>";
    return '<span class="review-card-status">' + ICON_EMPTY + "Not visited</span>";
  }

  /* ---------- Overlay ---------- */

  let overlayEl = null;

  function showOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.className = "review-overlay";
    overlayEl.setAttribute("role", "status");
    overlayEl.setAttribute("aria-live", "polite");
    overlayEl.innerHTML = '<div class="spinner" aria-hidden="true"></div><div class="review-overlay-label">Loading review…</div>';
    document.body.appendChild(overlayEl);
    void overlayEl.offsetWidth;
    overlayEl.classList.add("is-visible");
  }

  function hideOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove("is-visible");
    setTimeout(function () {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }, 260);
  }

  /* ---------- Build card ---------- */

  function buildCard(question, index) {
    const status = statusFor(index);
    const chosen = answerFor(index);
    const correct = correctAnswerFor(index);

    const card = document.createElement("div");
    card.className = "review-card";

    const head = document.createElement("div");
    head.className = "review-card-head";

    const num = document.createElement("span");
    num.className = "review-card-num";
    num.textContent = "Q" + (index + 1);

    head.appendChild(num);
    head.insertAdjacentHTML("beforeend", statusBadge(status));

    const qText = document.createElement("p");
    qText.className = "review-card-q";
    qText.textContent = question.q;

    const opts = document.createElement("div");
    opts.className = "review-opts";

    (question.options || []).forEach(function (optText, oi) {
      const isCorrect = correct !== null && oi === correct;
      const isChosen = chosen !== null && chosen === oi;

      let rowClass = "review-opt";

      if (isCorrect) {
        rowClass += " is-correct";
      } else if (isChosen && !isCorrect) {
        rowClass += " is-chosen-wrong";
      } else if (isChosen) {
        rowClass += " is-chosen-only";
      }

      const row = document.createElement("div");
      row.className = rowClass;

      const key = document.createElement("span");
      key.className = "review-opt-key";
      key.textContent = "ABCD".charAt(oi);

      const txt = document.createElement("span");
      txt.className = "review-opt-text";
      txt.textContent = optText;

      const mark = document.createElement("span");
      mark.className = "review-opt-mark";

      if (isCorrect) mark.innerHTML = ICON_CHECK;
      else if (isChosen && !isCorrect) mark.innerHTML = ICON_CROSS;

      row.appendChild(key);
      row.appendChild(txt);
      row.appendChild(mark);

      opts.appendChild(row);
    });

    card.appendChild(head);
    card.appendChild(qText);
    card.appendChild(opts);

    return card;
  }

  /* ---------- Build review block ---------- */

  function buildReviewBlock() {
    const state = window.MockTestState;
    if (!state || !state.publicTest) return null;

    const questions = state.publicTest.questions || [];
    const total = questions.length;
    if (!total) return null;

    let answered = 0, marked = 0;
    for (let i = 0; i < total; i++) {
      if (Object.prototype.hasOwnProperty.call(state.answers, i)) answered++;
      if (state.marked.has(i)) marked++;
    }
    const unattempted = total - answered;

    const block = document.createElement("div");
    block.className = "review-block";

    const head = document.createElement("div");
    head.className = "review-block-head";

    const title = document.createElement("h2");
    title.textContent = "Review";

    const summary = document.createElement("div");
    summary.className = "review-summary";
    summary.innerHTML =
      "Total <strong>" + total + "</strong>" +
      " · Answered <strong>" + answered + "</strong>" +
      " · Unattempted <strong>" + unattempted + "</strong>" +
      " · Marked <strong>" + marked + "</strong>";

    head.appendChild(title);
    head.appendChild(summary);
    block.appendChild(head);

    questions.forEach(function (q, i) {
      block.appendChild(buildCard(q, i));
    });

    return block;
  }

  /* ---------- Load ---------- */

  let mounted = false;

  function load() {
    if (mounted) return;

    const container = document.getElementById("resultReview");
    if (!container) return;

    const state = window.MockTestState;
    if (!state || !state.publicTest) return;

    mounted = true;
    showOverlay();
    const startedAt = Date.now();

    requestAnimationFrame(function () {
      const block = buildReviewBlock();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 400 - elapsed);

      setTimeout(function () {
        if (block) {
          container.innerHTML = "";
          container.appendChild(block);
        }
        hideOverlay();
      }, remaining);
    });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", function () {
    if (!mounted) return;
    const container = document.getElementById("resultReview");
    if (!container) return;
    const block = buildReviewBlock();
    if (block) {
      container.innerHTML = "";
      container.appendChild(block);
    }
  });

  /* ---------- Expose ---------- */

  window.ReviewModule = { load: load };

})();
