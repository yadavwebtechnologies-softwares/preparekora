"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_user_id_token";
  const $id = (id) => document.getElementById(id);

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function redirectToLogin() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    window.location.replace("login.html");
  }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function showScreen(name) {
    ["resultLoading", "resultError", "resultContent"].forEach(function (k) {
      const el = $id(k);
      if (el) el.hidden = (k !== name);
    });
  }

  function showError(msg) {
    const el = $id("resultErrorMessage");
    if (el) el.textContent = msg || "Please try again.";
    showScreen("resultError");
  }

  /* ---------- Result data ---------- */

  const params = new URLSearchParams(window.location.search);
  const date = params.get("date") || "";
  const subjectId = params.get("subject") || "";

  let resultData = null;

  function loadFromSession() {
    try {
      const raw = sessionStorage.getItem("pk_quiz_result_" + date + "_" + subjectId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  async function loadFromWorker() {
    const token = getToken();
    if (!token) { redirectToLogin(); return null; }

    try {
      // Fetch quiz + history to reconstruct result
      const [quizRes, historyRes] = await Promise.all([
        fetch(API_BASE + "/daily-quizzes/" + encodeURIComponent(date) + "/" + encodeURIComponent(subjectId), {
          headers: { "Authorization": "Bearer " + token }
        }),
        fetch(API_BASE + "/user/profile", {
          headers: { "Authorization": "Bearer " + token }
        })
      ]);

      // Note: quiz fetch returns 409 if already attempted — that's expected here
      // We just need history + questions with answers
      // Since we don't have a dedicated result endpoint, we rely on sessionStorage
      return null;
    } catch (e) { return null; }
  }

  async function loadResult() {
    if (!date || !subjectId) {
      showError("Missing date or subject.");
      return;
    }

    // Try sessionStorage first (from quiz submit)
    resultData = loadFromSession();

    if (!resultData) {
      showError("Result not found. Please re-take the quiz or check your dashboard.");
      return;
    }

    renderResult();
    showScreen("resultContent");
  }

  function renderResult() {
    const d = resultData;
    if (!d) return;

    const subjectEl = $id("resultSubject");
    const scoreEl = $id("resultScore");
    const totalEl = $id("resultTotal");
    const percentEl = $id("resultPercent");
    const correctEl = $id("resultCorrect");
    const wrongEl = $id("resultWrong");
    const unattemptedEl = $id("resultUnattempted");
    const timeEl = $id("resultTime");
    const streakEl = $id("resultStreak");

    if (subjectEl) subjectEl.textContent = d.subjectName || "Quiz";
    if (scoreEl) scoreEl.textContent = String(d.correct || 0);
    if (totalEl) totalEl.textContent = String(d.total || 0);
    if (percentEl) percentEl.textContent = (d.percent || 0) + "%";
    if (correctEl) correctEl.textContent = String(d.correct || 0);
    if (wrongEl) wrongEl.textContent = String(d.wrong || 0);
    if (unattemptedEl) unattemptedEl.textContent = String(d.unattempted || 0);
    if (timeEl) timeEl.textContent = formatTime(d.timeTaken);
    if (streakEl && d.streak && d.streak > 0) {
      streakEl.textContent = "🔥 " + d.streak + "-day streak";
      streakEl.hidden = false;
    }

    renderQuestions();
  }

  function formatTime(sec) {
    const s = Number(sec) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  function renderQuestions() {
    const wrap = $id("resultQuestions");
    if (!wrap) return;

    const questions = Array.isArray(resultData.questions) ? resultData.questions : [];
    wrap.innerHTML = "";

    questions.forEach(function (q, i) {
      const card = document.createElement("div");
      card.className = "q-review-card";

      const userAnswer = q.userAnswer;
      const correctAnswer = q.answer;
      let statusClass = "unattempted";
      let statusText = "Not attempted";
      if (userAnswer !== null && userAnswer !== undefined) {
        if (userAnswer === correctAnswer) {
          statusClass = "correct";
          statusText = "Correct";
        } else {
          statusClass = "wrong";
          statusText = "Wrong";
        }
      }

      let optionsHTML = "";
      (q.options || []).forEach(function (opt, oi) {
        let optClass = "";
        if (oi === correctAnswer) optClass = " correct";
        else if (oi === userAnswer) optClass = " wrong";
        optionsHTML +=
          '<div class="q-review-option' + optClass + '">' +
            '<span class="q-opt-key">' + "ABCD".charAt(oi) + '</span>' +
            '<span class="q-opt-text">' + esc(opt) + '</span>' +
          '</div>';
      });

      card.innerHTML =
        '<div class="q-review-header">' +
          '<span class="q-review-num">Q' + (i + 1) + '</span>' +
          '<span class="q-review-badge ' + statusClass + '">' + statusText + '</span>' +
        '</div>' +
        '<p class="q-review-text">' + esc(q.q) + '</p>' +
        '<div class="q-review-options">' + optionsHTML + '</div>';

      wrap.appendChild(card);
    });
  }

  function formatTime(sec) {
    const s = Number(sec) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  /* ---------- Init ---------- */

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  loadResult();

})();
