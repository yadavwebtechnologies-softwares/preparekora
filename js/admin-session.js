"use strict";

(function () {

  const TIMEOUT_KEY = "pk_admin_session_timeout_min";
  const ACTIVITY_KEY = "pk_admin_last_activity_at";
  const DEFAULT_TIMEOUT_MIN = 3;
  const MIN_TIMEOUT = 1;
  const MAX_TIMEOUT = 60;
  const TICK_MS = 1000;
  const ACTIVITY_THROTTLE_MS = 1000;

  let lastActivityAt = Date.now();
  let lastRecordedAt = 0;
  let wasLoggedIn = false;
  let expiryTriggered = false;
  let tickId = null;

  function getTimeoutMin() {
    try {
      const v = parseInt(localStorage.getItem(TIMEOUT_KEY) || "0", 10);
      if (Number.isInteger(v) && v >= MIN_TIMEOUT && v <= MAX_TIMEOUT) return v;
    } catch (e) {}
    return DEFAULT_TIMEOUT_MIN;
  }

  function setTimeoutMin(v) {
    try { localStorage.setItem(TIMEOUT_KEY, String(v)); } catch (e) {}
  }

  function hasToken() {
    try {
      return !!(localStorage.getItem("pk_admin_id_token") || localStorage.getItem("pk_admin_refresh_token"));
    } catch (e) { return false; }
  }

  function isLoginVisible() {
    const el = document.getElementById("loginScreen");
    if (!el) return true;
    return !el.hidden;
  }

  function isLoadingVisible() {
    const el = document.getElementById("adminLoading");
    if (!el) return false;
    return !el.hidden;
  }

  function isLoggedInView() {
    if (!hasToken()) return false;
    if (isLoginVisible()) return false;
    if (isLoadingVisible()) return false;
    return true;
  }

  function writeActivity() {
    try { localStorage.setItem(ACTIVITY_KEY, String(lastActivityAt)); } catch (e) {}
  }

  function recordActivity() {
    const now = Date.now();
    if (now - lastRecordedAt < ACTIVITY_THROTTLE_MS) return;
    lastRecordedAt = now;
    lastActivityAt = now;
    if (isLoggedInView()) writeActivity();
  }

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach(function (ev) {
    document.addEventListener(ev, recordActivity, { passive: true, capture: true });
  });

  /* --- Session expired modal --- */

  function ensureExpiryModal() {
    if (document.getElementById("sessionExpiredOverlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "sessionExpiredOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "sessionExpiredTitle");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2 id="sessionExpiredTitle">Session expired</h2>' +
        '<p class="muted-text" id="sessionExpiredMessage"></p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-primary" id="sessionExpiredOk" type="button">Sign in again</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById("sessionExpiredOk").addEventListener("click", function () {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      setTimeout(function () {
        const u = document.getElementById("loginUser");
        if (u) u.focus();
      }, 60);
    });
  }

  function showExpiryModal(minutes) {
    ensureExpiryModal();
    const overlay = document.getElementById("sessionExpiredOverlay");
    const msg = document.getElementById("sessionExpiredMessage");
    if (msg) msg.textContent = "You were signed out due to " + minutes + " minute" + (minutes === 1 ? "" : "s") + " of inactivity.";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      const ok = document.getElementById("sessionExpiredOk");
      if (ok) ok.focus();
    }, 40);
  }

  /* --- Force logout --- */

  function forceLoginScreen() {
    try {
      localStorage.removeItem("pk_admin_id_token");
      localStorage.removeItem("pk_admin_refresh_token");
      localStorage.removeItem("pk_admin_expires_at");
    } catch (e) {}
    ["adminLoading", "dashboardScreen", "editorScreen", "submissionsScreen", "analysisScreen"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    const login = document.getElementById("loginScreen");
    if (login) login.hidden = false;
  }

  function triggerExpiry() {
    if (expiryTriggered) return;
    expiryTriggered = true;
    const minutes = getTimeoutMin();
    forceLoginScreen();
    showExpiryModal(minutes);
  }

  /* --- Timer tick --- */

  function tick() {
    const loggedIn = isLoggedInView();
    if (loggedIn && !wasLoggedIn) {
      lastActivityAt = Date.now();
      lastRecordedAt = Date.now();
      writeActivity();
      expiryTriggered = false;
    }
    wasLoggedIn = loggedIn;
    if (!loggedIn) return;
    const timeoutMs = getTimeoutMin() * 60 * 1000;
    if (Date.now() - lastActivityAt >= timeoutMs) {
      triggerExpiry();
    }
  }

  function start() {
    if (tickId) return;
    tickId = setInterval(tick, TICK_MS);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick();
  });

  /* --- Settings UI (injected, no HTML edit needed) --- */

  function ensureSettingsUI() {
    const panel = document.getElementById("panelSettings");
    if (!panel) return;
    if (document.getElementById("sessionTimeoutForm")) return;

    const card = document.createElement("div");
    card.className = "card";
    card.style.maxWidth = "480px";
    card.style.marginTop = "16px";
    card.innerHTML =
      '<h2 style="margin: 0 0 16px; font-size: 15px; font-weight: 600;">Session</h2>' +
      '<form id="sessionTimeoutForm" novalidate>' +
        '<div class="form-field">' +
          '<label for="sessionTimeoutInput" class="form-label">Session timeout (minutes)</label>' +
          '<input id="sessionTimeoutInput" type="number" class="form-input" min="1" max="60" step="1">' +
          '<p class="form-hint">Auto sign-out after this many minutes of inactivity.</p>' +
          '<p class="form-error" id="sessionTimeoutError" hidden></p>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button class="btn btn-primary" id="saveSessionBtn" type="submit">Save</button>' +
        '</div>' +
      '</form>';
    panel.appendChild(card);

    const input = document.getElementById("sessionTimeoutInput");
    if (input) input.value = String(getTimeoutMin());

    const form = document.getElementById("sessionTimeoutForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const errEl = document.getElementById("sessionTimeoutError");
      const val = parseInt(input.value, 10);
      if (errEl) errEl.hidden = true;
      if (!Number.isInteger(val) || val < MIN_TIMEOUT || val > MAX_TIMEOUT) {
        if (errEl) {
          errEl.textContent = "Enter a whole number between " + MIN_TIMEOUT + " and " + MAX_TIMEOUT + ".";
          errEl.hidden = false;
        }
        return;
      }
      setTimeoutMin(val);
      lastActivityAt = Date.now();
      lastRecordedAt = Date.now();
      writeActivity();
      expiryTriggered = false;
      const container = document.getElementById("toastContainer");
      if (container) {
        const el = document.createElement("div");
        el.className = "toast success";
        el.textContent = "Session timeout updated to " + val + " minute" + (val === 1 ? "" : "s") + ".";
        container.appendChild(el);
        setTimeout(function () { el.remove(); }, 3200);
      }
    });
  }

  /* --- Init --- */

  // Sync pre-check: must run BEFORE admin.js's init so we can clear tokens cleanly.
  function initSyncCheck() {
    const lastSaved = parseInt(localStorage.getItem(ACTIVITY_KEY) || "0", 10) || 0;
    const hasTok = hasToken();
    if (hasTok && lastSaved > 0) {
      const elapsed = Date.now() - lastSaved;
      const timeoutMs = getTimeoutMin() * 60 * 1000;
      if (elapsed >= timeoutMs) {
        try {
          localStorage.removeItem("pk_admin_id_token");
          localStorage.removeItem("pk_admin_refresh_token");
          localStorage.removeItem("pk_admin_expires_at");
        } catch (e) {}
        setTimeout(function () { showExpiryModal(getTimeoutMin()); }, 500);
      }
    }
    lastActivityAt = Date.now();
    writeActivity();
  }

  function initAsync() {
    ensureSettingsUI();
    ensureExpiryModal();
    start();
  }

  // Re-inject settings card if settings panel is ever re-rendered
  document.addEventListener("click", function (e) {
    if (e.target.closest("#tabSettings")) setTimeout(ensureSettingsUI, 50);
  });

  initSyncCheck();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAsync);
  } else {
    initAsync();
  }

})();
