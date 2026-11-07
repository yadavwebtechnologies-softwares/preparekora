"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_user_id_token";
  const EXPIRES_KEY = "pk_user_expires_at";

  const $id = (id) => document.getElementById(id);

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) {}
  }

  function redirectToLogin() {
    clearToken();
    window.location.replace("login.html");
  }

  async function fetchProfile(token) {
    const res = await fetch(API_BASE + "/user/profile", {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });
    if (res.status === 401 || res.status === 403) {
      throw { code: "unauth" };
    }
    if (!res.ok) {
      throw { code: "http", status: res.status };
    }
    return await res.json();
  }

  function renderProfile(profile) {
    const nameEl = $id("dashName");
    const emailEl = $id("dashEmail");
    const avatarEl = $id("dashAvatar");

    if (nameEl) nameEl.textContent = "Welcome, " + (profile.name || "User");
    if (emailEl) emailEl.textContent = profile.email || "";

    if (avatarEl) {
      avatarEl.innerHTML = "";
      if (profile.photoURL) {
        const img = document.createElement("img");
        img.src = profile.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        avatarEl.appendChild(img);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "dash-avatar-fallback";
        const initial = (profile.name || "U").trim().charAt(0).toUpperCase();
        fallback.textContent = initial;
        avatarEl.appendChild(fallback);
      }
    }
  }

  async function init() {
    const yearEl = $id("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const signOutBtn = $id("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        redirectToLogin();
      });
    }

    const token = getToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    try {
      const profile = await fetchProfile(token);
      renderProfile(profile);
      const loadingEl = $id("dashLoading");
      const contentEl = $id("dashContent");
      if (loadingEl) loadingEl.hidden = true;
      if (contentEl) contentEl.hidden = false;
    } catch (err) {
      if (err && err.code === "unauth") {
        redirectToLogin();
        return;
      }
      const loadingEl = $id("dashLoading");
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="color:var(--muted);font-size:14px;">Could not load profile. Please refresh or sign in again.</p>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
