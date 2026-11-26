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

  function storeUser(user) {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || ""
        }));
      } else {
        localStorage.removeItem(USER_KEY);
      }
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

  PK_STUDENT.hasPremium = function () {
    try {
      const raw = localStorage.getItem("pk_student_premium");
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || typeof p !== "object") return false;
      return Number(p.expiresAt) > Date.now();
    } catch (e) { return false; }
  };

  const PREM_STYLE_CACHE_KEY = "pk_premium_style_v1";
  const PREM_STYLE_DEFAULTS_LOCAL = {
    mode: "auto",
    colors: ["#FFD700", "#FFF8DC", "#DAA520"],
    dayThemes: {
      "0": ["#FFD700", "#FFF8DC", "#DAA520"],
      "1": ["#9D4EDD", "#E0AAFF", "#5A189A"],
      "2": ["#10B981", "#6EE7B7", "#047857"],
      "3": ["#F43F5E", "#FDA4AF", "#BE123C"],
      "4": ["#3B82F6", "#93C5FD", "#1E40AF"],
      "5": ["#E5E5E5", "#FFFFFF", "#A3A3A3"],
      "6": ["#FFD700", "#FFF8DC", "#DAA520"]
    },
    speed: "medium"
  };

  function readPremStyleCache() {
    try {
      const raw = sessionStorage.getItem(PREM_STYLE_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writePremStyleCache(s) {
    try { sessionStorage.setItem(PREM_STYLE_CACHE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  async function fetchPremiumStyle() {
    const cached = readPremStyleCache();
    if (cached) return cached;
    try {
      const res = await fetch(API_BASE + "/premium/style", { headers: { Accept: "application/json" } });
      if (!res.ok) return PREM_STYLE_DEFAULTS_LOCAL;
      const data = await res.json();
      const s = data.style || PREM_STYLE_DEFAULTS_LOCAL;
      writePremStyleCache(s);
      return s;
    } catch (e) { return PREM_STYLE_DEFAULTS_LOCAL; }
  }

  const PREM_PALETTES = {
    gold: ["#FFD700", "#FFF8DC", "#DAA520"],
    rainbow: ["#FF6B6B", "#FFE66D", "#4ECDC4"],
    ocean: ["#3B82F6", "#93C5FD", "#1E40AF"],
    sunset: ["#F97316", "#FDA4AF", "#DB2777"],
    forest: ["#10B981", "#6EE7B7", "#047857"],
    candy: ["#EC4899", "#F9A8D4", "#A855F7"]
  };

  function resolvePremColors(style) {
    if (!style) return PREM_STYLE_DEFAULTS_LOCAL.colors;
    if (style.palette && style.palette !== "custom" && PREM_PALETTES[style.palette]) {
      return PREM_PALETTES[style.palette];
    }
    if (style.mode === "manual") {
      return Array.isArray(style.colors) && style.colors.length === 3 ? style.colors : PREM_STYLE_DEFAULTS_LOCAL.colors;
    }
    const day = String(new Date().getDay());
    const dt = style.dayThemes || {};
    return Array.isArray(dt[day]) && dt[day].length === 3 ? dt[day] : PREM_STYLE_DEFAULTS_LOCAL.colors;
  }

  async function applyPremiumStyle() {
    try {
      if (!PK_STUDENT.hasPremium()) return;
      const style = await fetchPremiumStyle();
      const colors = resolvePremColors(style);
      const speed = style && (style.speed === "slow" || style.speed === "fast") ? style.speed : "medium";
      const dur = speed === "slow" ? "8s" : (speed === "fast" ? "2s" : "4s");
      const isAuto = style && style.mode === "auto";

      const applyTo = function (el) {
        if (!el) return;
        el.classList.add("is-premium-user");
        el.classList.toggle("is-premium-auto", !!isAuto);
        el.classList.toggle("is-premium-static", !isAuto);
        el.style.setProperty("--prem-c1", colors[0]);
        el.style.setProperty("--prem-c2", colors[1]);
        el.style.setProperty("--prem-c3", colors[2]);
        el.style.setProperty("--prem-speed", dur);
        const rotSpeed = style && style.rotationSpeed ? style.rotationSpeed + "s" : "4s";
        const transSpeed = style && style.transitionSpeed ? style.transitionSpeed + "s" : "0.8s";
        const intensityVal = style && style.intensity ? String(style.intensity) : "1";
        el.style.setProperty("--prem-rotation-speed", rotSpeed);
        el.style.setProperty("--prem-transition", transSpeed);
        el.style.setProperty("--prem-intensity", intensityVal);
      };

      document.querySelectorAll(".profile-btn").forEach(applyTo);

      const dashSelectors = [
        "#dashProfileHead",
        "#dashPlanChip",
        "#dashPremiumCtaBtn",
        "#dashPremiumBanner",
        "#premStatusBox",
        "#premStatusBox .chip.plan",
        ".prem-plan-card",
        "#premExpiryBannerCard"
      ];
      dashSelectors.forEach(function (sel) {
        try {
          document.querySelectorAll(sel).forEach(applyTo);
        } catch (e) {}
      });
    } catch (e) {}
  }

  PK_STUDENT.reapplyPremiumStyle = function () {
    try { applyPremiumStyle(); } catch (e) {}
  };

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
    try { localStorage.removeItem("pk_student_premium"); } catch (e) {}
    PK_STUDENT.user = null;
    PK_STUDENT.profile = null;
  };

  PK_STUDENT.saveProfile = async function (data) {
    const saved = await saveProfileToServer(data);
    PK_STUDENT.profile = saved;
    storeProfile(saved);
    return saved;
  };

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
      prem.href = "dashboard.html#premium";
      prem.textContent = "Premium";
      prem.setAttribute("data-pk-injected", "true");

      nav.appendChild(dash);
      nav.appendChild(prem);
    }
  }

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
    const displayName = (profile && profile.name) || (user && user.displayName) || (user && user.email ? user.email.split("@")[0] : "Account");
    const email = (user && user.email) || "";
    const photoURL = (user && user.photoURL) || "";
    const initials = initialsOf(displayName, email);

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
      avatarHTML(photoURL, initials, "profile-avatar") +
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

    applyPremiumStyle();
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
        { href: "dashboard.html#premium", label: "Premium", icon: '<path d="M12 2 15.09 8.26 22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>' }
      ];

      items.forEach(function (it) {
        const a = document.createElement("a");
        a.href = it.href;
        a.setAttribute("data-pk-injected", "true");
        a.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" ' +
            'width="16" height="16" ' +
            'fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" ' +
            'style="width:16px;height:16px;flex-shrink:0;">' +
            it.icon +
          '</svg>' +
          '<span>' + it.label + '</span>';
        if (insertBefore) panel.insertBefore(a, insertBefore);
        else panel.appendChild(a);
      });
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
      '<div class="modal complete-profile-modal" style="position: relative;">' +
        '<button type="button" id="studentCPClose" aria-label="Close" style="position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 6px; background: transparent; cursor: pointer; color: var(--muted);">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>' +
        '</button>' +
        '<h2 id="studentCompleteProfileTitle">Complete your profile</h2>' +
        '<p class="complete-profile-sub">Add your WhatsApp number to stay updated. Optional — you can skip and add it later from Settings.</p>' +
        '<form class="complete-profile-form" id="studentCompleteProfileForm" novalidate>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentCPName">Full name</label>' +
            '<input class="form-input" id="studentCPName" type="text" maxlength="60" autocomplete="name">' +
          '</div>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentCPWhatsApp">WhatsApp number (optional)</label>' +
            '<input class="form-input" id="studentCPWhatsApp" type="tel" maxlength="15" inputmode="numeric" autocomplete="tel">' +
            '<p class="form-hint">Only used if we need to contact you about test issues.</p>' +
            '<p class="form-error" id="studentCPError" hidden></p>' +
          '</div>' +
          '<div class="modal-actions" style="margin-top: 12px;">' +
            '<button class="btn" type="button" id="studentCPSkip">Skip for now</button>' +
            '<button class="btn btn-primary" type="submit">Save</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector("#studentCPClose").addEventListener("click", closeCompleteProfileModal);
    overlay.querySelector("#studentCPSkip").addEventListener("click", closeCompleteProfileModal);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeCompleteProfileModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        closeCompleteProfileModal();
      }
    });

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
      if (wa.length > 0 && !/^[0-9]{10,15}$/.test(wa)) {
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

  function initialsOf(name, email) {
    const source = String(name || "").trim() || String(email || "").trim() || "U";
    const parts = source.split(/\s+/).filter(function (p) { return p.length > 0; });
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return source.charAt(0).toUpperCase();
  }

  function avatarHTML(photoURL, initials, sizeClass) {
    const cls = sizeClass || "profile-avatar";
    const safeInitials = escapeHTML(initials);
    if (photoURL && typeof photoURL === "string" && photoURL.length > 0) {
      return '<span class="' + cls + '"><img src="' + escapeHTML(photoURL) + '" alt="' + safeInitials + '" loading="lazy" onerror="this.parentNode.textContent=this.alt;"></span>';
    }
    return '<span class="' + cls + '">' + safeInitials + '</span>';
  }

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

    // Pre-warm token so mock-test / dashboard fetch immediately after auth ready
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken().then(function (t) {
          try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}

    auth.onAuthStateChanged(async function (fbUser) {
      if (fbUser) {
        PK_STUDENT.user = {
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || "",
          photoURL: fbUser.photoURL || ""
        };
        storeUser(PK_STUDENT.user);
        try {
          const token = await fbUser.getIdToken(true);
          storeToken(token);
          window.PK_STUDENT._tokenCachedAt = Date.now();
        } catch (e) {}

        try {
          const sessUid = sessionStorage.getItem("pk_login_session_uid");
          if (sessUid !== fbUser.uid) {
            sessionStorage.setItem("pk_login_session_uid", fbUser.uid);
            const token = await fbUser.getIdToken();
            const providerId = (Array.isArray(fbUser.providerData) && fbUser.providerData[0])
              ? fbUser.providerData[0].providerId : "";
            fetch(API_BASE + "/students/me/login-event", {
              method: "POST",
              headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: providerId || "",
                userAgent: (navigator.userAgent || "").slice(0, 200)
              })
            }).catch(function () {});
          }
        } catch (e) {}

        const providers = Array.isArray(fbUser.providerData) ? fbUser.providerData : [];
        const isGoogleUser = providers.some(function (p) { return p && p.providerId === "google.com"; });

        const profile = await fetchProfile();
        PK_STUDENT.profile = profile;
        storeProfile(profile);

        renderHeader();
        fireAuthChanged();
        applyPremiumStyle();
      } else {
        try { sessionStorage.removeItem("pk_login_session_uid"); } catch (e) {}
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

  try {
    const cu = localStorage.getItem("pk_student_user");
    if (cu) {
      PK_STUDENT.user = JSON.parse(cu);
      const cp = localStorage.getItem("pk_student_profile");
      PK_STUDENT.profile = cp ? JSON.parse(cp) : null;
    }
  } catch (e) {}
  renderHeader();

  PK_STUDENT.ready = init();

})();
