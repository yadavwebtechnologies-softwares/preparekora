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
    if (res.status === 401 || res.status === 403) throw { code: "unauth" };
    if (!res.ok) throw { code: "http", status: res.status };
    return await res.json();
  }

  async function updateProfileName(token, name) {
    const res = await fetch(API_BASE + "/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ name: name })
    });
    if (res.status === 401 || res.status === 403) throw { code: "unauth" };
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw { code: "http", message: (data && data.error) || "Save failed" };
    return data;
  }

  let currentProfile = null;

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function renderProfile(profile) {
    currentProfile = profile;

    const nameEl = $id("dashName");
    const emailEl = $id("dashEmail");
    const avatarEl = $id("dashAvatar");
    const metaEl = $id("profileMeta");

    if (nameEl) nameEl.textContent = profile.name || "User";
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
        fallback.className = "profile-avatar-fallback";
        const initial = (profile.name || "U").trim().charAt(0).toUpperCase();
        fallback.textContent = initial;
        avatarEl.appendChild(fallback);
      }
    }

    if (metaEl) {
      metaEl.innerHTML =
        '<span>Email <strong>' + (profile.email || "—") + '</strong></span>' +
        '<span>Joined <strong>' + formatDate(profile.createdAt) + '</strong></span>' +
        '<span>Last login <strong>' + formatDate(profile.lastLoginAt) + '</strong></span>';
    }

    const nameInput = $id("displayNameInput");
    if (nameInput) nameInput.value = profile.name || "";
  }

  /* ---------- Sign out modal ---------- */

  function openSignOutModal() {
    const overlay = $id("signOutOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add("open");
    setTimeout(function () {
      const b = $id("signOutCancelBtn");
      if (b) b.focus();
    }, 40);
  }

  function closeSignOutModal() {
    const overlay = $id("signOutOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove("open");
  }

  /* ---------- Settings form ---------- */

  function bindSettings() {
    const form = $id("settingsForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = $id("displayNameInput");
      const errEl = $id("displayNameError");
      const btn = $id("saveNameBtn");
      const value = input.value.trim();

      errEl.hidden = true;
      if (!value || value.length < 2) {
        errEl.textContent = "Name must be at least 2 characters";
        errEl.hidden = false;
        return;
      }
      if (value.length > 60) {
        errEl.textContent = "Name is too long (max 60 characters)";
        errEl.hidden = false;
        return;
      }
      if (currentProfile && value === currentProfile.name) {
        errEl.textContent = "This is already your display name";
        errEl.hidden = false;
        return;
      }

      btn.disabled = true;
      try {
        const token = getToken();
        if (!token) { redirectToLogin(); return; }
        const updated = await updateProfileName(token, value);
        renderProfile({
          uid: updated.uid,
          name: updated.name,
          email: updated.email,
          photoURL: updated.photoURL,
          createdAt: updated.createdAt,
          lastLoginAt: updated.lastLoginAt
        });
        btn.textContent = "Saved ✓";
        setTimeout(function () { btn.textContent = "Save"; }, 1500);
      } catch (err) {
        if (err && err.code === "unauth") { redirectToLogin(); return; }
        errEl.textContent = (err && err.message) || "Could not save";
        errEl.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Init ---------- */

  async function init() {
    const yearEl = $id("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Sign out triggers
    const topBtn = $id("signOutBtn");
    const bottomBtn = $id("signOutBottomBtn");
    if (topBtn) topBtn.addEventListener("click", openSignOutModal);
    if (bottomBtn) bottomBtn.addEventListener("click", openSignOutModal);

    // Sign out modal
    const overlay = $id("signOutOverlay");
    const cancelBtn = $id("signOutCancelBtn");
    const confirmBtn = $id("signOutConfirmBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeSignOutModal);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeSignOutModal();
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        closeSignOutModal();
        redirectToLogin();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSignOutModal();
    });

    bindSettings();

    // Load profile
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
      const profile = await fetchProfile(token);
      renderProfile(profile);
      const loadingEl = $id("dashLoading");
      const contentEl = $id("dashContent");
      if (loadingEl) loadingEl.hidden = true;
      if (contentEl) contentEl.hidden = false;
    } catch (err) {
      if (err && err.code === "unauth") { redirectToLogin(); return; }
      const loadingEl = $id("dashLoading");
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="color:var(--muted);font-size:14px;text-align:center;">Could not load profile.<br><a href="login.html" style="color:var(--accent);">Sign in again</a></p>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
