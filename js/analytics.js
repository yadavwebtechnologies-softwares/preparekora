"use strict";

/*
  PrepareKora — anonymous analytics beacon.
  Fire-and-forget. Silent on all failures. No DOM, no cookies, no PII.
  Skips admin.html entirely.
*/

(function () {

  /* Skip admin panel — don't track admin's own traffic */
  try {
    if (document.getElementById("adminLoading") || document.getElementById("loginScreen")) return;
    if (/\/admin(\.html)?(\?|$)/.test(window.location.pathname)) return;
  } catch (e) { return; }

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

  const SESSION_KEY = "pk_an_session";
  const ENABLED_KEY = "pk_an_enabled";
  const PING_MS = 30000;

  /* ---------- session id (per tab, dies on close) ---------- */

  let sessionId = null;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId || sessionId.length < 8) {
      sessionId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ("an-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch (e) {
    sessionId = "an-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- device + lang + page ---------- */

  function getDevice() {
    try {
      if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return "mobile";
      const ua = (navigator.userAgent || "").toLowerCase();
      if (/mobile|android|iphone|ipad|ipod/.test(ua)) return "mobile";
    } catch (e) {}
    return "desktop";
  }

  function getLang() {
    try {
      if (window.PK && window.PK.lang === "as") return "as";
    } catch (e) {}
    return "en";
  }

  function getPage() {
    try {
      const p = window.location.pathname || "/";
      const clean = p.replace(/^\/preparekora/, "") || "/";
      return clean.length > 200 ? clean.slice(0, 200) : clean;
    } catch (e) { return "/"; }
  }

  /* ---------- enabled check (cached per session) ---------- */

  function isEnabledFromCache() {
    try {
      const v = sessionStorage.getItem(ENABLED_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (e) {}
    return null;
  }

  async function checkEnabled() {
    const cached = isEnabledFromCache();
    if (cached !== null) return cached;
    try {
      const res = await fetch(API_BASE + "/settings", { headers: { Accept: "application/json" } });
      if (!res.ok) return true;
      const data = await res.json();
      const enabled = data && data.analyticsEnabled !== false;
      try { sessionStorage.setItem(ENABLED_KEY, enabled ? "1" : "0"); } catch (e) {}
      return enabled;
    } catch (e) {
      return true;
    }
  }

  /* ---------- beacon ---------- */

  let lastPageSent = "";
  let timerId = null;

  function fireBeacon() {
    if (document.visibilityState === "hidden") return;

    const page = getPage();
    const lang = getLang();
    const device = getDevice();
    const referrer = (document.referrer || "").slice(0, 300);

    lastPageSent = page;

    try {
      fetch(API_BASE + "/analytics/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          page: page,
          lang: lang,
          device: device,
          referrer: referrer
        }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function startPing() {
    if (timerId) return;
    timerId = setInterval(function () {
      if (document.visibilityState === "hidden") return;
      fireBeacon();
    }, PING_MS);
  }

  function stopPing() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      fireBeacon();
      startPing();
    } else {
      stopPing();
    }
  });

  window.addEventListener("beforeunload", function () {
    if (document.visibilityState === "hidden") return;
    try {
      fetch(API_BASE + "/analytics/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          page: getPage(),
          lang: getLang(),
          device: getDevice(),
          referrer: (document.referrer || "").slice(0, 300)
        }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  });

  document.addEventListener("pk:langchange", function () {
    fireBeacon();
  });

  /* ---------- init ---------- */

  (async function init() {
    const enabled = await checkEnabled();
    if (!enabled) return;
    fireBeacon();
    startPing();
  })();

})();
