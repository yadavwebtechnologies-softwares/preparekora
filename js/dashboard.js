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

  function clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) {}
  }

  function redirectToLogin() {
    clearTokens();
    window.location.replace("login.html");
  }

  function t(key) { return (window.PK && window.PK.t) ? window.PK.t(key) : key; }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function toast(msg, kind) {
    const c = $id("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
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

    const nameTagEl = $id("userDisplayName");
    const nameEl = $id("profileName");
    const emailEl = $id("profileEmail");
    const avatarEl = $id("dashAvatar");
    const metaEl = $id("profileMeta");

    if (nameTagEl) nameTagEl.textContent = profile.name || "User";
    if (nameEl) nameEl.textContent = profile.name || "User";
    if (emailEl) emailEl.textContent = profile.email || "";

    if (avatarEl) {
      avatarEl.innerHTML = "";
      if (profile.photoURL) {
        const img = document.createElement("img");
        img.src = profile.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        avatarEl.appendChild(img);
      } else {
        const initial = (profile.name || "U").trim().charAt(0).toUpperCase();
        avatarEl.innerHTML = '<span style="font-size: 20px; font-weight: 600; color: var(--accent);">' + esc(initial) + '</span>';
      }
    }

    if (metaEl) {
      metaEl.innerHTML =
        '<span>Email <strong style="color: var(--text); font-weight: 600;">' + esc(profile.email || "—") + '</strong></span>' +
        '<span>Joined <strong style="color: var(--text); font-weight: 600;">' + esc(formatDate(profile.createdAt)) + '</strong></span>' +
        '<span>Last login <strong style="color: var(--text); font-weight: 600;">' + esc(formatDate(profile.lastLoginAt)) + '</strong></span>';
    }

    const nameInput = $id("displayNameInput");
    if (nameInput) nameInput.value = profile.name || "";
  }

  /* ---------- TABS ---------- */

  function bindTabs() {
    const tabs = {
      quizzes: { tab: $id("tabQuizzes"), panel: $id("panelQuizzes") },
      settings: { tab: $id("tabSettings"), panel: $id("panelSettings") },
      help: { tab: $id("tabHelp"), panel: $id("panelHelp") },
      purchase: { tab: $id("tabPurchase"), panel: $id("panelPurchase") }
    };

    function activate(name) {
      Object.keys(tabs).forEach(function (k) {
        const tab = tabs[k];
        if (!tab.tab || !tab.panel) return;
        const isActive = (k === name);
        tab.tab.classList.toggle("is-active", isActive);
        tab.tab.setAttribute("aria-selected", String(isActive));
        tab.panel.hidden = !isActive;
      });
    }

    Object.keys(tabs).forEach(function (k) {
      const tab = tabs[k];
      if (!tab.tab) return;
      tab.tab.addEventListener("click", function () { activate(k); });
    });
  }

  /* ---------- SIGN OUT MODAL ---------- */

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

  /* ---------- SETTINGS FORM ---------- */

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
        toast("Name updated", "success");
      } catch (err) {
        if (err && err.code === "unauth") { redirectToLogin(); return; }
        errEl.textContent = (err && err.message) || "Could not save";
        errEl.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- MOBILE MENU ---------- */

  function bindMobileMenu() {
    const menuToggle = $id("menuToggle");
    const menuPanel = $id("menuPanel");
    const menuIcon = $id("menuIcon");
    if (!menuToggle || !menuPanel || !menuIcon) return;

    const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
    const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

    function closeMenu() {
      menuPanel.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuIcon.innerHTML = hamburgerSVG;
    }

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

    menuPanel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- INIT ---------- */

  async function init() {
    const yearEl = $id("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    bindMobileMenu();
    bindTabs();
    bindSettings();

    // Sign out
    const signOutBtn = $id("signOutBtn");
    if (signOutBtn) signOutBtn.addEventListener("click", openSignOutModal);

    const cancelBtn = $id("signOutCancelBtn");
    const confirmBtn = $id("signOutConfirmBtn");
    const overlay = $id("signOutOverlay");

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

    // Load profile
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
      const profile = await fetchProfile(token);
      renderProfile(profile);
      const loadingEl = $id("dashLoading");
      const screenEl = $id("dashboardScreen");
      if (loadingEl) loadingEl.hidden = true;
      if (screenEl) screenEl.hidden = false;
    } catch (err) {
      if (err && err.code === "unauth") { redirectToLogin(); return; }
      const loadingEl = $id("dashLoading");
      if (loadingEl) {
        loadingEl.innerHTML = '<div class="empty-state" style="max-width: 400px; margin: 40px auto;">Could not load profile. <a href="login.html" style="color: var(--accent); text-decoration: underline;">Sign in again</a></div>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
