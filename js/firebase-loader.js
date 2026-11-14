"use strict";

/*
  PrepareKora — Firebase SDK loader.
  Fetches Firebase web config from the Cloudflare worker at runtime,
  then initializes the Firebase SDK.

  Exposes:
    window.PK_FIREBASE.ready   → Promise<firebase.app.App>
    window.PK_FIREBASE.auth    → firebase.auth.Auth (after ready resolves)
    window.PK_FIREBASE.config  → { apiKey, authDomain, projectId, ... }
*/

(function () {

  const CONFIG_CACHE_KEY = "pk_fb_config_v1";
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

  const SDK_VERSION = "10.12.2";

  const PK_FIREBASE = {
    ready: null,
    auth: null,
    config: null,
    error: null
  };

  window.PK_FIREBASE = PK_FIREBASE;

  function readCachedConfig() {
    try {
      const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) return parsed;
    } catch (e) {}
    return null;
  }

  function writeCachedConfig(cfg) {
    try { sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  async function fetchConfig() {
    const cached = readCachedConfig();
    if (cached) return cached;

    let res;
    try {
      res = await fetch(API_BASE + "/firebase-config", {
        method: "GET",
        headers: { Accept: "application/json" }
      });
    } catch (e) {
      throw new Error("Network error reaching config endpoint");
    }

    if (!res.ok) throw new Error("Failed to load Firebase config (HTTP " + res.status + ")");

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    if (!data || !data.apiKey || !data.projectId) {
      throw new Error("Invalid Firebase config from server");
    }

    writeCachedConfig(data);
    return data;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load script: " + src)); };
      document.head.appendChild(s);
    });
  }

  async function loadSdk() {
    if (window.firebase && typeof window.firebase.initializeApp === "function") return;

    await loadScript("https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/firebase-auth-compat.js");
  }

  async function init() {
    try {
      await loadSdk();
      const config = await fetchConfig();
      PK_FIREBASE.config = config;

      let app;
      try {
        app = window.firebase.app();
      } catch (e) {
        app = window.firebase.initializeApp(config);
      }
      PK_FIREBASE.auth = window.firebase.auth(app);

      try {
        await PK_FIREBASE.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {}

      return app;
    } catch (err) {
      PK_FIREBASE.error = err;
      throw err;
    }
  }

  PK_FIREBASE.ready = init();

})();
