"use strict";

(function () {

  if (document.getElementById("loginScreen")) return;

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

  const TOKEN_KEY = "pk_student_id_token";
  const USER_KEY = "pk_student_user";
  const PROFILE_KEY = "pk_student_profile";

  const PK_STUDENT = {
    ready: null,
    user: null,
    profile: null,
    error: null
  };

  window.PK_STUDENT = PK_STUDENT;

  /* ---------- storage ---------- */

  function storeUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify({ uid: user.uid, email: user.email || "" }));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  function storeToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function storeProfile(profile) {
    try {
      if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(PROFILE_KEY);
    } catch (e) {}
  }

  function readProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ---------- API ---------- */

  async function fetchProfile() {
    const token = await PK_STUDENT.getToken();
    if (!token) return null;
    try {
      const res = await fetch(API_BASE + "/students/me", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function saveProfileToServer(data) {
    const token = await PK_STUDENT.getToken();
    if (!token) throw new Error("Not signed in");
    const res = await fetch(API_BASE + "/students/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(function () { return null; });
    if (!res.ok) throw new Error((json && json.error) || ("HTTP " + res.status));
    return json;
  }

  /* ---------- public API ---------- */

  PK_STUDENT.getToken = async function () {
    try {
      const fb = window.PK_FIREBASE && window.PK_FIREBASE.auth;
      if (fb && fb.currentUser) return await fb.currentUser.getIdToken();
    } catch (e) {}
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
  };

  PK_STUDENT.getUser = function () {
    if (PK_STUDENT.user) return PK_STUDENT.user;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  PK_STUDENT.getProfile = function () {
    return PK_STUDENT.profile || readProfile();
  };

  PK_STUDENT.isLoggedIn = function () { return !!(PK_STUDENT.user || localStorage.getItem(USER_KEY)); };

  PK_STUDENT.login = async function (email, password) {
    await PK_STUDENT.ready;
    return window.PK_FIREBASE.auth.signInWithEmailAndPassword(email, password);
  };

  PK_STUDENT.signup = async function (email, password, name, whatsapp) {
    await PK_STUDENT.ready;
    const cred = await window.PK_FIREBASE.auth.createUserWithEmailAndPassword(email, password);
    try { await cred.user.updateProfile({ displayName: name }); } catch (e) {}
    if (name && whatsapp) {
      try { await saveProfileToServer({ name: name, whatsapp: whatsapp }); } catch (e) {}
    }
    return cred;
  };

  PK_STUDENT.loginWithGoogle = async function () {
    await PK_STUDENT.ready;
    const provider = new window.firebase.auth.GoogleAuthProvider();
    return window.PK_FIREBASE.auth.signInWithPopup(provider);
  };

  PK_STUDENT.logout = async function () {
    await PK_STUDENT.ready;
    try { await window.PK_FIREBASE.auth.signOut(); } catch (e) {}
    storeUser(null); storeToken(null); storeProfile(null);
    PK_STUDENT.user = null;
    PK_STUDENT.profile = null;
  };

  PK_STUDENT.saveProfile = async function (data) {
    const saved = await saveProfileToServer(data);
    PK_STUDENT.profile = saved;
    storeProfile(saved);
    return saved;
  };

  /* ---------- custom event ---------- */

  function fireAuthChanged() {
    try {
      document.dispatchEvent(new CustomEvent("pk:student-auth-changed", {
        detail: {
          user: PK_STUDENT.user,
          profile: PK_STUDENT.profile,
          loggedIn: !!PK_STUDENT.user
        }
      }));
    } catch (e) {}
  }

  /* ---------- header: desktop nav ---------- */

  function clearInjected(container) {
    if (!container) return;
    container.querySelectorAll('[data-pk-injected="true"]').forEach(function (el) { el.remove(); });
  }

  function renderDesktopNav(loggedIn) {
    const nav = document.querySelector(".desktop-nav");
    if (!nav) return;
    clearInjected(nav);

    const adminLink = nav.querySelector('a[href="admin.html"]');
    if (adminLink) adminLink.style.display = loggedIn ? "none" : "";

    if (loggedIn) {
      const dash = document.createElement("a");
      dash.href = "dashboard.html";
      dash.textContent = "Dashboard";
      dash.setAttribute("data-pk-injected", "true");

      const prem = document.createElement("a");
      prem.href = "premium.html";
      prem.textContent = "Premium";
      prem.setAttribute("data-pk-injected", "true");

      nav.appendChild(dash);
      nav.appendChild(prem);
    }
  }

  /* ---------- header: nav-actions ---------- */

  function ensureSigninBtn() {
    const actions = document.querySelector(".nav-actions");
    if (!actions) return;

    clearInjected(actions);

    const toggle = actions.querySelector("#menuToggle");

    const signinBtn = document.createElement("button");
    signinBtn.type = "button";
    signinBtn.className = "nav-signin-btn";
    signinBtn.setAttribute("data-pk-injected", "true");
    signinBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>' +
      'Sign in';
    signinBtn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    });
    if (toggle) actions.insertBefore(signinBtn, toggle);
    else actions.appendChild(signinBtn);
  }

  function ensureProfileBtn(user, profile) {
    const actions = document.querySelector(".nav-actions");
    if (!actions) return;

    clearInjected(actions);

    const toggle = actions.querySelector("#menuToggle");
    const displayName = (profile && profile.name) || (user && user.email ? user.email.split("@")[0] : "Account");
    const email = (user && user.email) || "";
    const initial = (displayName || "U").trim().charAt(0).toUpperCase();

    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.setAttribute("data-pk-injected", "true");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "profile-btn";
    btn.id = "pkProfileToggle";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "pkProfileDropdown");
    btn.innerHTML =
      '<span class="profile-avatar">' + escapeHTML(initial) + '</span>' +
      '<span class="profile-name">' + escapeHTML(displayName) + '</span>' +
      '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

    const dd = document.createElement("div");
    dd.className = "profile-dropdown";
    dd.id = "pkProfileDropdown";
    dd.setAttribute("aria-hidden", "true");
    dd.innerHTML =
      '<div class="profile-dropdown-head">' +
        '<div class="profile-dropdown-name">' + escapeHTML(displayName) + '</div>' +
        '<div class="profile-dropdown-email">' + escapeHTML(email) + '</div>' +
      '</div>' +
      '<a href="dashboard.html"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Dashboard</a>' +
      '<a href="dashboard.html#settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Settings</a>' +
      '<button type="button" class="dropdown-danger" id="pkSignOutBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>Log out</button>';

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const willOpen = !dd.classList.contains("open");
      closeProfileDropdown();
      if (willOpen) {
        dd.classList.add("open");
        dd.setAttribute("aria-hidden", "false");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(dd);

    if (toggle) actions.insertBefore(wrap, toggle);
    else actions.appendChild(wrap);

    const signOutBtn = dd.querySelector("#pkSignOutBtn");
    if (signOutBtn) signOutBtn.addEventListener("click", function () {
      closeProfileDropdown();
      openSignOutModal();
    });
  }

  function closeProfileDropdown() {
    const dd = document.getElementById("pkProfileDropdown");
    const btn = document.getElementById("pkProfileToggle");
    if (dd) { dd.classList.remove("open"); dd.setAttribute("aria-hidden", "true"); }
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", function (e) {
    const dd = document.getElementById("pkProfileDropdown");
    const btn = document.getElementById("pkProfileToggle");
    if (!dd || !btn) return;
    if (!dd.contains(e.target) && !btn.contains(e.target)) closeProfileDropdown();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeProfileDropdown();
  });

  /* ---------- header: mobile menu panel ---------- */

  function renderMobilePanel(loggedIn) {
    const panel = document.getElementById("menuPanel");
    if (!panel) return;
    clearInjected(panel);

    const adminLink = panel.querySelector('a[href="admin.html"]');
    if (adminLink) adminLink.style.display = loggedIn ? "none" : "";

    const langSwitch = panel.querySelector(".lang-switch");
    const insertBefore = langSwitch || null;

    if (loggedIn) {
      const items = [
        { href: "dashboard.html", label: "Dashboard", icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
        { href: "premium.html", label: "Premium", icon: '<path d="M12 2 15.09 8.26 22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>' },
        { href: "dashboard.html#settings", label: "Settings", icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' }
      ];

      items.forEach(function (it) {
        const a = document.createElement("a");
        a.href = it.href;
        a.setAttribute("data-pk-injected", "true");
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.icon + '</svg>' + it.label;
        if (insertBefore) panel.insertBefore(a, insertBefore);
        else panel.appendChild(a);
      });

      const logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.setAttribute("data-pk-injected", "true");
      logoutBtn.style.color = "#b91c1c";
      logoutBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:#b91c1c;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>Log out';
      logoutBtn.addEventListener("click", function () {
        const m = document.getElementById("menuPanel");
        if (m) m.classList.remove("open");
        const mb = document.getElementById("menuToggle");
        if (mb) mb.setAttribute("aria-expanded", "false");
        openSignOutModal();
      });
      if (insertBefore) panel.insertBefore(logoutBtn, insertBefore);
      else panel.appendChild(logoutBtn);
    } else {
      const signinBtn = document.createElement("button");
      signinBtn.type = "button";
      signinBtn.className = "nav-signin-btn";
      signinBtn.setAttribute("data-pk-injected", "true");
      signinBtn.style.width = "100%";
      signinBtn.style.justifyContent = "center";
      signinBtn.style.margin = "4px 0";
      signinBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>' +
        'Sign in';
      signinBtn.addEventListener("click", function () {
        const m = document.getElementById("menuPanel");
        if (m) m.classList.remove("open");
        const mb = document.getElementById("menuToggle");
        if (mb) mb.setAttribute("aria-expanded", "false");
        document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
      });
      if (insertBefore) panel.insertBefore(signinBtn, insertBefore);
      else panel.appendChild(signinBtn);
    }
  }

  /* ---------- sign-out modal ---------- */

  function ensureSignOutModal() {
    if (document.getElementById("studentSignOutOverlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "studentSignOutOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "studentSignOutTitle");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2 id="studentSignOutTitle">Sign out?</h2>' +
        '<p class="muted-text">Are you sure you want to sign out?</p>' +
        '<div class="modal-actions">' +
          '<button class="btn" id="studentSignOutCancel" type="button">Cancel</button>' +
          '<button class="btn btn-primary" id="studentSignOutOk" type="button">Sign out</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById("studentSignOutCancel").addEventListener("click", closeSignOutModal);
    document.getElementById("studentSignOutOk").addEventListener("click", async function () {
      closeSignOutModal();
      try { await PK_STUDENT.logout(); } catch (e) {}
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSignOutModal();
    });
  }

  function openSignOutModal() {
    ensureSignOutModal();
    const overlay = document.getElementById("studentSignOutOverlay");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      const c = document.getElementById("studentSignOutCancel");
      if (c) c.focus();
    }, 40);
  }

  function closeSignOutModal() {
    const overlay = document.getElementById("studentSignOutOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  /* ---------- complete-profile modal (Google users without WhatsApp) ---------- */

  let completeProfileShownThisSession = false;

  function ensureCompleteProfileModal() {
    if (document.getElementById("studentCompleteProfileOverlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "studentCompleteProfileOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "studentCompleteProfileTitle");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="modal complete-profile-modal">' +
        '<h2 id="studentCompleteProfileTitle">Complete your profile</h2>' +
        '<p class="complete-profile-sub">Just WhatsApp is required to continue.</p>' +
        '<form class="complete-profile-form" id="studentCompleteProfileForm" novalidate>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentCPName">Full name</label>' +
            '<input class="form-input" id="studentCPName" type="text" maxlength="60" autocomplete="name">' +
          '</div>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentCPWhatsApp">WhatsApp number</label>' +
            '<input class="form-input" id="studentCPWhatsApp" type="tel" maxlength="15" inputmode="numeric" autocomplete="tel">' +
            '<p class="form-hint">Required — we only contact you about test issues</p>' +
            '<p class="form-error" id="studentCPError" hidden></p>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">Save</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector("#studentCompleteProfileForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      const nameEl = document.getElementById("studentCPName");
      const waEl = document.getElementById("studentCPWhatsApp");
      const errEl = document.getElementById("studentCPError");
      const btn = overlay.querySelector('button[type="submit"]');
      const name = nameEl.value.trim();
      const wa = waEl.value.replace(/[\s-]/g, "");
      if (errEl) errEl.hidden = true;
      if (name.length < 2) {
        if (errEl) { errEl.textContent = "Please enter your name"; errEl.hidden = false; }
        return;
      }
      if (!/^[0-9]{10,15}$/.test(wa)) {
        if (errEl) { errEl.textContent = "Enter a valid WhatsApp number"; errEl.hidden = false; }
        return;
      }
      btn.disabled = true;
      try {
        const saved = await PK_STUDENT.saveProfile({ name: name, whatsapp: wa });
        PK_STUDENT.profile = saved;
        closeCompleteProfileModal();
        renderHeader();
        fireAuthChanged();
      } catch (err) {
        if (errEl) { errEl.textContent = err.message || "Failed to save"; errEl.hidden = false; }
      } finally {
        btn.disabled = false;
      }
    });
  }

  function openCompleteProfileModal() {
    ensureCompleteProfileModal();
    const overlay = document.getElementById("studentCompleteProfileOverlay");
    const nameEl = document.getElementById("studentCPName");
    const user = PK_STUDENT.user;
    if (nameEl) nameEl.value = (PK_STUDENT.profile && PK_STUDENT.profile.name) || (user && user.displayName) || "";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      const w = document.getElementById("studentCPWhatsApp");
      if (w) w.focus();
    }, 60);
  }

  function closeCompleteProfileModal() {
    const overlay = document.getElementById("studentCompleteProfileOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  /* ---------- render header ---------- */

  function renderHeader() {
    const loggedIn = !!PK_STUDENT.user;
    renderDesktopNav(loggedIn);
    if (loggedIn) {
      ensureProfileBtn(PK_STUDENT.user, PK_STUDENT.profile);
    } else {
      ensureSigninBtn();
    }
    renderMobilePanel(loggedIn);
  }

  function escapeHTML(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  /* ---------- auth bootstrap ---------- */

  async function init() {
    try {
      await window.PK_FIREBASE.ready;
    } catch (err) {
      PK_STUDENT.error = err;
      renderHeader();
      fireAuthChanged();
      return;
    }

    const auth = window.PK_FIREBASE.auth;

    auth.onAuthStateChanged(async function (fbUser) {
      if (fbUser) {
        PK_STUDENT.user = { uid: fbUser.uid, email: fbUser.email || "", displayName: fbUser.displayName || "" };
        storeUser(PK_STUDENT.user);
        try {
          const token = await fbUser.getIdToken();
          storeToken(token);
        } catch (e) {}

        const profile = await fetchProfile();
        PK_STUDENT.profile = profile;
        storeProfile(profile);

        renderHeader();
        fireAuthChanged();

        if (profile && profile.profileCompleted === false && !completeProfileShownThisSession) {
          completeProfileShownThisSession = true;
          setTimeout(openCompleteProfileModal, 300);
        }
      } else {
        PK_STUDENT.user = null;
        PK_STUDENT.profile = null;
        storeUser(null);
        storeToken(null);
        storeProfile(null);
        renderHeader();
        fireAuthChanged();
      }
    });
  }

  PK_STUDENT.ready = init();

})();
