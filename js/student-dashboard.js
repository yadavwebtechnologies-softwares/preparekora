"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" ||
      host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const DASH_CACHE_KEY = "pk_dash_cache_v1";

  function readDashCache() {
    try {
      const raw = sessionStorage.getItem(DASH_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeDashCache(data) {
    try { sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function readCachedProfile() {
    try {
      const raw = localStorage.getItem("pk_student_profile");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function readCachedUser() {
    try {
      const raw = localStorage.getItem("pk_student_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  const sections = {
    loading: document.getElementById("dashLoading"),
    authRequired: document.getElementById("dashAuthRequired"),
    main: document.getElementById("dashMain")
  };

  const dashSignInBtn = document.getElementById("dashSignInBtn");
  const dashAvatar = document.getElementById("dashAvatar");
  const dashName = document.getElementById("dashName");
  const dashMeta = document.getElementById("dashMeta");
  const dashEditBtn = document.getElementById("dashEditBtn");
  const dashPlanChip = document.getElementById("dashPlanChip");
  const dashStatTests = document.getElementById("dashStatTests");
  const dashStatAvg = document.getElementById("dashStatAvg");
  const dashStatBest = document.getElementById("dashStatBest");
  const dashTrendSub = document.getElementById("dashTrendSub");
  const dashTrendCanvas = document.getElementById("dashTrendCanvas");
  const dashTrendLabels = document.getElementById("dashTrendLabels");
  const dashSubjects = document.getElementById("dashSubjects");
  const dashRecent = document.getElementById("dashRecent");
  const dashRecommended = document.getElementById("dashRecommended");

  const dashSettingsForm = document.getElementById("dashSettingsForm");
  const dashFieldName = document.getElementById("dashFieldName");
  const dashFieldEmail = document.getElementById("dashFieldEmail");
  const dashFieldWhatsApp = document.getElementById("dashFieldWhatsApp");
  const dashFieldDob = document.getElementById("dashFieldDob");
  const dashFieldPincode = document.getElementById("dashFieldPincode");
  const dashSettingsError = document.getElementById("dashSettingsError");
  const dashSaveProfileBtn = document.getElementById("dashSaveProfileBtn");

  const dashChangePasswordBtn = document.getElementById("dashChangePasswordBtn");
  const dashLogoutBtn = document.getElementById("dashLogoutBtn");
  const dashDeleteAccountBtn = document.getElementById("dashDeleteAccountBtn");

  const state = { user: null, profile: null, stats: null };

  let loadingInProgress = false;
  let lastAuthUid = null;
  let hasRenderedOnce = false;

  function showSection(name) {
    Object.keys(sections).forEach(function (k) {
      if (sections[k]) sections[k].hidden = (k !== name);
    });
  }

  function esc(v) {
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

  function toast(message, kind) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-IN", { month: "short" });
    return day + " " + mon + " " + d.getFullYear();
  }

  function formatDateShort(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    const mon = d.toLocaleString("en-IN", { month: "short" });
    return mon + " " + d.getDate();
  }

  function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
  }

  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const focused = document.activeElement;
    if (focused && el.contains(focused) && typeof focused.blur === "function") focused.blur();
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", function (e) {
    const overlay = e.target.closest(".modal-overlay.open");
    if (overlay && e.target === overlay) overlay.classList.remove("open");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.open").forEach(function (el) {
        el.classList.remove("open");
      });
    }
  });

  const tabs = document.querySelectorAll(".dash-tab");
  const panels = document.querySelectorAll(".dash-panel");

  function setTab(name) {
    tabs.forEach(function (t) {
      const active = t.dataset.tab === name;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    panels.forEach(function (p) {
      p.classList.toggle("is-active", p.dataset.panel === name);
    });
    if (name === "premium") loadPremiumTab();
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setTab(t.dataset.tab); });
  });

  if (dashEditBtn) dashEditBtn.addEventListener("click", function () { setTab("settings"); });

  function renderProfile() {
    const user = state.user || {};
    const profile = state.profile || {};
    const name = profile.name || user.displayName || (user.email ? user.email.split("@")[0] : "User");
    const email = user.email || profile.email || "";
    const photoURL = user.photoURL || "";
    const initials = initialsOf(name, email);

    if (dashAvatar) {
      if (photoURL && typeof photoURL === "string" && photoURL.length > 0) {
        dashAvatar.innerHTML = '<img src="' + esc(photoURL) + '" alt="' + esc(initials) + '" loading="lazy" onerror="this.parentNode.textContent=this.alt;">';
      } else {
        dashAvatar.textContent = initials;
      }
    }
    if (dashName) dashName.textContent = name;

    const lines = [];
    if (email) lines.push(email);
    if (profile.whatsapp) lines.push(profile.whatsapp);
    if (profile.dob) lines.push(profile.dob);
    if (dashMeta) dashMeta.innerHTML = lines.map(esc).join(" · ");
    if (dashPlanChip) {
      let isPrem = false;
      try {
        const raw = localStorage.getItem("pk_student_premium");
        if (raw) {
          const p = JSON.parse(raw);
          isPrem = p && Number(p.expiresAt) > Date.now();
        }
      } catch (e) {}
      dashPlanChip.textContent = isPrem ? "Premium" : "Free Account";
    }
    if (dashFieldName) dashFieldName.value = profile.name || "";
    if (dashFieldEmail) dashFieldEmail.value = email;
    if (dashFieldWhatsApp) dashFieldWhatsApp.value = profile.whatsapp || "";
    if (dashFieldDob) dashFieldDob.value = profile.dob || "";
    if (dashFieldPincode) dashFieldPincode.value = profile.pincode || "";
  }

  async function loadAllTestsForRecommendation() {
    try {
      const raw = sessionStorage.getItem("pk_tests_cache_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tests)) return parsed.tests;
      }
    } catch (e) {}

    try {
      const r = await fetch(API_BASE + "/tests", { headers: { Accept: "application/json" } });
      if (!r.ok) return [];
      const d = await r.json();
      const tests = Array.isArray(d.tests) ? d.tests : [];
      try {
        sessionStorage.setItem("pk_tests_cache_v1", JSON.stringify({
          tests: tests,
          gatingEnabled: d.gatingEnabled === true
        }));
      } catch (e) {}
      return tests;
    } catch (e) { return []; }
  }

  async function renderRecommendedPractice() {
    if (!dashRecommended) return;
    dashRecommended.innerHTML = '<div class="dash-rec-empty">Loading…</div>';

    const allTests = await loadAllTestsForRecommendation();
    const attempted = (state.stats && Array.isArray(state.stats.attemptedTestIds))
      ? state.stats.attemptedTestIds : [];
    const attemptedSet = {};
    attempted.forEach(function (id) { attemptedSet[id] = true; });

    const unattempted = allTests.filter(function (t) {
      return t && t.id && !attemptedSet[t.id];
    });
    unattempted.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    const picks = unattempted.slice(0, 2);

    if (picks.length === 0) {
      dashRecommended.innerHTML = '<div class="dash-rec-empty">You\'ve attempted all available tests. Great work!</div>';
      return;
    }

    dashRecommended.innerHTML = "";
    const list = document.createElement("div");
    list.className = "dash-rec-list";

    picks.forEach(function (t) {
      const card = document.createElement("a");
      card.className = "dash-rec-card";
      card.href = "mock-test.html?test=" + encodeURIComponent(t.id);
      card.innerHTML = '<span class="dash-rec-title">' + esc(t.title || "Untitled") + '</span>';
      list.appendChild(card);
    });

    dashRecommended.appendChild(list);
  }

  function renderStats() {
    const d = state.stats || {};
    if (dashStatTests) dashStatTests.textContent = String(d.totalTests || 0);
    if (dashStatAvg) dashStatAvg.textContent = (d.avgPercent || 0) + "%";
    if (dashStatBest) dashStatBest.textContent = (d.bestPercent || 0) + "%";
    if (dashTrendSub) {
      dashTrendSub.textContent = (d.totalTests || 0) + " test" + (d.totalTests === 1 ? "" : "s") + " · " + (d.totalQuestions || 0) + " questions";
    }
    renderTrend(d.scoreTrend || []);
    renderSubjects(d.subjects || []);
    renderRecent(d.recentSubmissions || []);
    renderRecommendedPractice();
  }

  function renderTrend(points) {
    if (!dashTrendCanvas) return;
    const ctx = dashTrendCanvas.getContext("2d");
    if (!ctx) return;
    const W = dashTrendCanvas.width, H = dashTrendCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 52, padR = 16, padT = 12, padB = 8;
    const usableW = W - padL - padR;
    const usableH = H - padT - padB;

    const yLevels = [
      { pct: 100, label: "100%" },
      { pct: 50,  label: "50%"  },
      { pct: 0,   label: "0%"   }
    ];

    yLevels.forEach(function (lvl) {
      const y = padT + usableH - (lvl.pct / 100) * usableH;
      ctx.strokeStyle = "#e7e7e7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      ctx.fillStyle = "#737373";
      ctx.font = "10px Arial, Helvetica, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(lvl.label, padL - 8, y);
    });

    if (!points.length) {
      if (dashTrendLabels) dashTrendLabels.innerHTML = "";
      return;
    }

    const n = points.length;
    const coords = points.map(function (p, i) {
      const x = n === 1 ? padL + usableW / 2 : padL + (i / (n - 1)) * usableW;
      const y = padT + usableH - (Math.min(100, Math.max(0, p.avgPercent)) / 100) * usableH;
      return { x: x, y: y, val: p.avgPercent };
    });

    if (n >= 2) {
      ctx.beginPath();
      ctx.moveTo(coords[0].x, padT + usableH);
      coords.forEach(function (p) { ctx.lineTo(p.x, p.y); });
      ctx.lineTo(coords[coords.length - 1].x, padT + usableH);
      ctx.closePath();
      ctx.fillStyle = "#f7f7f7";
      ctx.fill();

      ctx.strokeStyle = "#222222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      coords.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    coords.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#222222";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#737373";
      ctx.font = "10px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(p.val + "%", p.x, p.y - 10);
    });

    if (dashTrendLabels) {
      dashTrendLabels.innerHTML = "";
      const step = Math.max(1, Math.ceil(n / 6));
      points.forEach(function (p, i) {
        if (i % step !== 0 && i !== n - 1) return;
        const span = document.createElement("span");
        span.textContent = formatDateShort(p.at);
        dashTrendLabels.appendChild(span);
      });
    }
  }

  function renderSubjects(subjects) {
    if (!dashSubjects) return;
    dashSubjects.innerHTML = "";
    if (!subjects.length) {
      dashSubjects.innerHTML = '<p class="muted-text" style="font-size: 13px;">Take a test to see your strengths and weaknesses here.</p>';
      return;
    }
    subjects.forEach(function (s) {
      const row = document.createElement("div");
      row.className = "dash-subject-row";
      row.innerHTML =
        '<span class="dash-subject-name">' + esc(s.testTitle) + '</span>' +
        '<span class="dash-subject-count">' + s.count + ' test' + (s.count === 1 ? "" : "s") + '</span>' +
        '<span class="dash-subject-pct">' + s.avgPercent + '%</span>';
      dashSubjects.appendChild(row);
    });
  }

  function renderRecent(list) {
    if (!dashRecent) return;
    dashRecent.innerHTML = "";
    if (!list.length) {
      dashRecent.innerHTML = '<p class="muted-text" style="font-size: 13px;">No tests taken yet. Start with a free test on the homepage.</p>';
      return;
    }
    list.forEach(function (sub) {
      const row = document.createElement("div");
      row.className = "dash-recent-row";
      row.innerHTML =
        '<div class="dash-recent-main">' +
          '<div class="dash-recent-title">' + esc(sub.testTitle || "Untitled") + '</div>' +
          '<div class="dash-recent-meta">' + esc(formatDate(sub.submittedAt)) + ' · ' + sub.correct + '/' + sub.total + ' correct</div>' +
        '</div>' +
        '<span class="dash-recent-score">' + sub.percent + '%</span>';
      dashRecent.appendChild(row);
    });
  }

  async function fetchAllData(token) {
    const [pr, dr] = await Promise.all([
      fetch(API_BASE + "/students/me", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(API_BASE + "/students/me/dashboard", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]);
    return { profile: pr, dashboard: dr };
  }

  async function loadAll(force) {
    if (loadingInProgress) return;

    const cachedUser = readCachedUser();
    const cachedProfile = readCachedProfile();
    const cachedDash = readDashCache();

    if (cachedUser && cachedProfile && cachedDash && !force) {
      state.user = cachedUser;
      state.profile = cachedProfile;
      state.stats = cachedDash;
      showSection("main");
      renderProfile();
      renderStats();
      updateProviderUI();
      hasRenderedOnce = true;
      lastAuthUid = cachedUser.uid || "unknown";
    }

    // Show a lightweight skeleton immediately if not rendered yet — no white blank
    if (!hasRenderedOnce) {
      showSection("loading");
      setTimeout(function () {
        try {
          if (sections.loading && !sections.loading.hidden) {
            sections.loading.innerHTML = '<div class="card" style="max-width:480px;margin:40px auto;text-align:center;"><p class="muted-text">Loading dashboard…</p></div>';
          }
        } catch (e) {}
      }, 200);
    }
    try {
      await Promise.race([
        window.PK_STUDENT.ready,
        new Promise(function (r) { setTimeout(r, 2500); })
      ]);
    } catch (e) {
      if (!hasRenderedOnce) showSection("authRequired");
      return;
    }

    const loggedIn = window.PK_STUDENT.isLoggedIn();
    const currentUid = loggedIn ? ((window.PK_STUDENT.getUser() || {}).uid || "unknown") : null;

    if (!loggedIn) {
      try { sessionStorage.removeItem(DASH_CACHE_KEY); } catch (e) {}
      showSection("authRequired");
      lastAuthUid = null;
      hasRenderedOnce = true;
      return;
    }

    const sameUser = hasRenderedOnce && lastAuthUid === currentUid;

    loadingInProgress = true;
    try {
      if (!hasRenderedOnce) showSection("loading");

      const token = await window.PK_STUDENT.getToken();
      if (!token) {
        showSection("authRequired");
        lastAuthUid = null;
        hasRenderedOnce = true;
        return;
      }

      state.user = window.PK_STUDENT.getUser() || {};
      state.profile = window.PK_STUDENT.getProfile() || {};

      if (!hasRenderedOnce) {
        showSection("main");
        renderProfile();
        updateProviderUI();
      }

      const { profile, dashboard } = await fetchAllData(token);

      if (profile) {
        state.profile = profile;
        try { localStorage.setItem("pk_student_profile", JSON.stringify(profile)); } catch (e) {}
      }

      if (dashboard) {
        state.stats = dashboard;
        writeDashCache(dashboard);
      } else {
        state.stats = state.stats || { totalTests: 0, avgPercent: 0, bestPercent: 0, totalQuestions: 0, scoreTrend: [], subjects: [], recentSubmissions: [] };
      }

      showSection("main");
      renderProfile();
      renderStats();
      updateProviderUI();

      lastAuthUid = currentUid;
      hasRenderedOnce = true;

      try {
        const pres = await fetch(API_BASE + "/premium/me", {
          headers: { Authorization: "Bearer " + token, Accept: "application/json" }
        });
        if (pres.ok) {
          const pdata = await pres.json();
          if (pdata && pdata.premium) {
            localStorage.setItem("pk_student_premium", JSON.stringify({
              expiresAt: pdata.premium.expiresAt || 0,
              active: pdata.premium.active === true
            }));
          }
        }
      } catch (e) {}
    } finally {
      loadingInProgress = false;
    }
  }

  if (dashSignInBtn) {
    dashSignInBtn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    });
  }

  function currentFirebaseUser() {
    try { return window.PK_FIREBASE && window.PK_FIREBASE.auth ? window.PK_FIREBASE.auth.currentUser : null; }
    catch (e) { return null; }
  }

  function userHasPassword() {
    const u = currentFirebaseUser();
    if (!u || !Array.isArray(u.providerData)) return false;
    return u.providerData.some(function (p) { return p && p.providerId === "password"; });
  }

  function userHasGoogle() {
    const u = currentFirebaseUser();
    if (!u || !Array.isArray(u.providerData)) return false;
    return u.providerData.some(function (p) { return p && p.providerId === "google.com"; });
  }

  function updateProviderUI() {
    const hasPass = userHasPassword();
    if (dashChangePasswordBtn) {
      if (hasPass) {
        dashChangePasswordBtn.textContent = "Change password";
        dashChangePasswordBtn.disabled = false;
      } else if (userHasGoogle()) {
        dashChangePasswordBtn.textContent = "Signed in with Google";
        dashChangePasswordBtn.disabled = true;
        dashChangePasswordBtn.title = "You sign in with Google — no password to change.";
      } else {
        dashChangePasswordBtn.textContent = "Change password";
        dashChangePasswordBtn.disabled = false;
      }
    }
    const dashDeletePasswordField = document.getElementById("dashDeletePasswordField");
    const dashDeleteInstructions = document.getElementById("dashDeleteInstructions");
    if (dashDeleteInstructions) {
      if (hasPass) dashDeleteInstructions.textContent = "Enter your current password to confirm.";
      else if (userHasGoogle()) dashDeleteInstructions.textContent = "You'll be asked to re-confirm with Google before deletion.";
      else dashDeleteInstructions.textContent = "This cannot be undone.";
    }
    if (dashDeletePasswordField) dashDeletePasswordField.style.display = hasPass ? "" : "none";
  }

  const dashChangePassForm = document.getElementById("dashChangePassForm");
  const dashCurrentPass = document.getElementById("dashCurrentPass");
  const dashNewPass = document.getElementById("dashNewPass");
  const dashConfirmPass = document.getElementById("dashConfirmPass");
  const dashChangePassError = document.getElementById("dashChangePassError");
  const dashChangePassCancel = document.getElementById("dashChangePassCancel");
  const dashChangePassSubmit = document.getElementById("dashChangePassSubmit");

  function changePassError(msg) {
    if (!dashChangePassError) return;
    if (!msg) { dashChangePassError.hidden = true; dashChangePassError.textContent = ""; return; }
    dashChangePassError.textContent = msg;
    dashChangePassError.hidden = false;
  }

  function mapAuthError(err) {
    const code = (err && err.code) || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") return "Current password is incorrect";
    if (code === "auth/weak-password") return "New password is too weak (min 6 characters)";
    if (code === "auth/requires-recent-login") return "Please sign in again and retry";
    if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
    if (code === "auth/user-not-found") return "Account not found";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Cancelled";
    return (err && err.message) || "Something went wrong";
  }

  if (dashChangePasswordBtn) {
    dashChangePasswordBtn.addEventListener("click", function () {
      if (!userHasPassword()) {
        if (userHasGoogle()) toast("You sign in with Google — no password to change.", "error");
        else toast("Password change is unavailable for this account.", "error");
        return;
      }
      if (dashCurrentPass) dashCurrentPass.value = "";
      if (dashNewPass) dashNewPass.value = "";
      if (dashConfirmPass) dashConfirmPass.value = "";
      changePassError("");
      openOverlay("dashChangePassOverlay");
      setTimeout(function () { if (dashCurrentPass) dashCurrentPass.focus(); }, 60);
    });
  }

  if (dashChangePassCancel) {
    dashChangePassCancel.addEventListener("click", function () { closeOverlay("dashChangePassOverlay"); });
  }

  if (dashChangePassForm) {
    dashChangePassForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      changePassError("");

      const cur = dashCurrentPass ? dashCurrentPass.value : "";
      const np = dashNewPass ? dashNewPass.value : "";
      const cp = dashConfirmPass ? dashConfirmPass.value : "";

      if (!cur) return changePassError("Enter your current password");
      if (np.length < 6) return changePassError("New password must be at least 6 characters");
      if (np !== cp) return changePassError("New passwords do not match");
      if (np === cur) return changePassError("New password must be different from current");

      if (dashChangePassSubmit) dashChangePassSubmit.disabled = true;

      try {
        await window.PK_FIREBASE.ready;
        const user = currentFirebaseUser();
        if (!user) throw new Error("Not signed in");

        const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, cur);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(np);

        closeOverlay("dashChangePassOverlay");
        toast("Password changed successfully", "success");
      } catch (err) {
        changePassError(mapAuthError(err));
      } finally {
        if (dashChangePassSubmit) dashChangePassSubmit.disabled = false;
      }
    });
  }

  const dashLogoutCancel = document.getElementById("dashLogoutCancel");
  const dashLogoutConfirm = document.getElementById("dashLogoutConfirm");

  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener("click", function () { openOverlay("dashLogoutOverlay"); });
  }

  if (dashLogoutCancel) {
    dashLogoutCancel.addEventListener("click", function () { closeOverlay("dashLogoutOverlay"); });
  }

  if (dashLogoutConfirm) {
    dashLogoutConfirm.addEventListener("click", async function () {
      dashLogoutConfirm.disabled = true;
      try { await window.PK_STUDENT.logout(); } catch (e) {}
      window.location.href = "index.html";
    });
  }

  const dashDeleteForm = document.getElementById("dashDeleteForm");
  const dashDeletePassword = document.getElementById("dashDeletePassword");
  const dashDeleteError = document.getElementById("dashDeleteError");
  const dashDeleteCancel = document.getElementById("dashDeleteCancel");
  const dashDeleteConfirm = document.getElementById("dashDeleteConfirm");

  function deleteError(msg) {
    if (!dashDeleteError) return;
    if (!msg) { dashDeleteError.hidden = true; dashDeleteError.textContent = ""; return; }
    dashDeleteError.textContent = msg;
    dashDeleteError.hidden = false;
  }

  if (dashDeleteAccountBtn) {
    dashDeleteAccountBtn.addEventListener("click", function () {
      if (dashDeletePassword) dashDeletePassword.value = "";
      deleteError("");
      updateProviderUI();
      openOverlay("dashDeleteOverlay");
      setTimeout(function () {
        if (userHasPassword() && dashDeletePassword) dashDeletePassword.focus();
      }, 60);
    });
  }

  if (dashDeleteCancel) {
    dashDeleteCancel.addEventListener("click", function () { closeOverlay("dashDeleteOverlay"); });
  }

  if (dashDeleteForm) {
    dashDeleteForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      deleteError("");

      const hasPass = userHasPassword();
      const password = dashDeletePassword ? dashDeletePassword.value : "";

      if (hasPass && !password) return deleteError("Enter your current password");

      if (dashDeleteConfirm) dashDeleteConfirm.disabled = true;

      try {
        await window.PK_FIREBASE.ready;
        const user = currentFirebaseUser();
        if (!user) throw new Error("Not signed in");

        if (hasPass) {
          const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, password);
          await user.reauthenticateWithCredential(credential);
        } else if (userHasGoogle()) {
          const provider = new window.firebase.auth.GoogleAuthProvider();
          await user.reauthenticateWithPopup(provider);
        }

        const freshToken = await user.getIdToken(true);
        const res = await fetch(API_BASE + "/students/me/delete-account", {
          method: "POST",
          headers: { Authorization: "Bearer " + freshToken }
        });
        const data = await res.json().catch(function () { return null; });
        if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));

        closeOverlay("dashDeleteOverlay");
        toast("Account deleted. Goodbye.", "success");

        setTimeout(function () {
          window.PK_STUDENT.logout().catch(function () {});
          window.location.href = "index.html";
        }, 1200);
      } catch (err) {
        deleteError(mapAuthError(err));
      } finally {
        if (dashDeleteConfirm) dashDeleteConfirm.disabled = false;
      }
    });
  }

  if (dashSettingsForm) {
    dashSettingsForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (dashSettingsError) dashSettingsError.hidden = true;

      const name = dashFieldName ? dashFieldName.value.trim() : "";
      const whatsapp = dashFieldWhatsApp ? dashFieldWhatsApp.value.replace(/[\s-]/g, "") : "";
      const dob = dashFieldDob ? dashFieldDob.value.trim() : "";
      const pincode = dashFieldPincode ? dashFieldPincode.value.trim() : "";

      if (name.length < 2) {
        if (dashSettingsError) { dashSettingsError.textContent = "Name must be at least 2 characters"; dashSettingsError.hidden = false; }
        return;
      }
      if (whatsapp.length > 0 && !/^[0-9]{10,15}$/.test(whatsapp)) {
        if (dashSettingsError) { dashSettingsError.textContent = "Enter a valid WhatsApp number (10-15 digits)"; dashSettingsError.hidden = false; }
        return;
      }

      if (dashSaveProfileBtn) dashSaveProfileBtn.disabled = true;
      try {
        const saved = await window.PK_STUDENT.saveProfile({ name, whatsapp, dob, pincode });
        state.profile = saved;
        renderProfile();
        toast("Profile saved", "success");
      } catch (err) {
        if (dashSettingsError) {
          dashSettingsError.textContent = err.message || "Failed to save";
          dashSettingsError.hidden = false;
        }
      } finally {
        if (dashSaveProfileBtn) dashSaveProfileBtn.disabled = false;
      }
    });
  }

  document.addEventListener("pk:student-auth-changed", function () { loadAll(false); });

  /* ========== PREMIUM MODULE ========== */

  const PREM_WHATSAPP_FALLBACK = "917896579939";
  const premState = { plans: null, premium: null, requests: [], selectedPlan: null, config: null, quota: null, notif: null };

  function premWhatsapp() {
    const c = premState.config || {};
    if (typeof c.whatsapp === "string" && c.whatsapp.trim()) return c.whatsapp.trim();
    return PREM_WHATSAPP_FALLBACK;
  }

  function premSetStatus(html) {
    const box = document.getElementById("premStatusBox");
    if (box) box.innerHTML = html;
  }
  function premSetPlans(html) {
    const box = document.getElementById("premPlansBox");
    if (box) box.innerHTML = html;
  }
  function premSetRequests(html) {
    const box = document.getElementById("premRequestsBox");
    if (box) box.innerHTML = html;
  }
  function premSetError(msg) {
    const el = document.getElementById("premError");
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.textContent = msg;
    el.hidden = false;
  }
  function premFmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return d.getDate() + " " + d.toLocaleString("en-IN", { month: "short" }) + " " + d.getFullYear();
  }
  function premStatusBadge(status) {
    if (status === "approved") return '<span class="user-status active">Approved</span>';
    if (status === "rejected") return '<span class="user-status disabled">Rejected</span>';
    return '<span class="user-status" style="color:#737373;border-color:#e7e7e7;background:#f7f7f7;">Pending</span>';
  }

  async function loadPremiumTab() {
    if (!window.PK_STUDENT || !window.PK_STUDENT.isLoggedIn()) return;
    const token = await window.PK_STUDENT.getToken();
    if (!token) return;
    const hdr = { Authorization: "Bearer " + token, Accept: "application/json" };

    premSetStatus('<p class="muted-text">Loading…</p>');
    premSetPlans('<p class="muted-text">Loading…</p>');
    premSetRequests('<p class="muted-text">Loading…</p>');

    try {
      const [plansRes, premRes, reqRes, quotaRes, notifRes] = await Promise.all([
        fetch(API_BASE + "/premium/plans", { headers: { Accept: "application/json" } }).then(function (r) { return r.ok ? r.json() : { plans: {} }; }).catch(function () { return { plans: {} }; }),
        fetch(API_BASE + "/premium/me", { headers: hdr }).then(function (r) { return r.ok ? r.json() : { premium: null }; }).catch(function () { return { premium: null }; }),
        fetch(API_BASE + "/premium/requests", { headers: hdr }).then(function (r) { return r.ok ? r.json() : { requests: [] }; }).catch(function () { return { requests: [] }; }),
        fetch(API_BASE + "/premium/daily-quota", { headers: hdr }).then(function (r) { return r.ok ? r.json() : { quota: 1, used: 0, remaining: 1 }; }).catch(function () { return { quota: 1, used: 0, remaining: 1 }; }),
        fetch(API_BASE + "/premium/notifications", { headers: hdr }).then(function (r) { return r.ok ? r.json() : { enabled: false, expiringSoon: false }; }).catch(function () { return { enabled: false, expiringSoon: false }; })
      ]);

      premState.plans = plansRes.plans || {};
      premState.config = plansRes.config || null;
      premState.premium = premRes.premium || null;
      premState.requests = Array.isArray(reqRes.requests) ? reqRes.requests : [];
      premState.quota = quotaRes || null;
      premState.notif = notifRes || null;

      renderPremStatus();
      renderPremPlans();
      renderPremRequests();
      syncPremiumBanner();
      renderDailyQuota();
      renderExpiryBanner();

      try {
        const p = premState.premium || {};
        localStorage.setItem("pk_student_premium", JSON.stringify({
          expiresAt: p.expiresAt || 0,
          active: p.active === true
        }));
      } catch (e) {}

      // Re-apply premium classes after status updates
      try {
        if (window.PK_STUDENT && typeof window.PK_STUDENT.reapplyPremiumStyle === "function") {
          window.PK_STUDENT.reapplyPremiumStyle();
        }
      } catch (e) {}
    } catch (e) {
      premSetStatus('<p class="muted-text">Could not load premium data. Refresh and retry.</p>');
    }
  }

  function renderDailyQuota() {
    const box = document.getElementById("premQuotaBox");
    if (!box) return;
    const q = premState.quota || {};
    if (q.premiumActive) {
      box.innerHTML = '<p class="muted-text" style="margin: 0;">You have <strong>unlimited</strong> access to all tests.</p>';
      return;
    }
    const quota = Number(q.quota) || 0;
    const used = Number(q.used) || 0;
    const remaining = Math.max(0, quota - used);
    const pct = quota > 0 ? Math.round((used / quota) * 100) : 100;
    box.innerHTML =
      '<p class="muted-text" style="margin: 0 0 10px;"><strong>' + used + '</strong> of <strong>' + quota + '</strong> free tests used today</p>' +
      '<div style="height: 6px; background: #e7e7e7; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">' +
        '<div style="height: 100%; width: ' + pct + '%; background: #222222;"></div>' +
      '</div>' +
      '<p class="muted-text" style="margin: 0; font-size: 12px;">' + (remaining > 0 ? (remaining + ' test' + (remaining === 1 ? "" : "s") + ' remaining — resets at midnight IST.') : 'Quota exhausted. Upgrade to Premium for unlimited access.') + '</p>';
  }

  function renderExpiryBanner() {
    const card = document.getElementById("premExpiryBannerCard");
    const text = document.getElementById("premExpiryBannerText");
    if (!card || !text) return;
    const n = premState.notif || {};
    if (n.enabled && n.expiringSoon && n.message) {
      card.hidden = false;
      text.innerHTML = '<strong>Heads up:</strong> ' + esc(n.message);
    } else {
      card.hidden = true;
      text.innerHTML = "";
    }
  }

  function renderPremStatus() {
    const p = premState.premium || {};
    if (p.active) {
      premSetStatus(
        '<div class="chip plan" style="margin-bottom: 10px;">Premium Active</div>' +
        '<p class="muted-text" style="margin: 0 0 6px;"><strong>' + esc(p.planLabel) + '</strong> · ' + p.remainingDays + ' day' + (p.remainingDays === 1 ? "" : "s") + ' left</p>' +
        '<p class="muted-text" style="margin: 0;">Expires on ' + esc(premFmtDate(p.expiresAt)) + '</p>'
      );
    } else if (p.expiresAt && p.expiresAt > 0) {
      premSetStatus(
        '<p class="muted-text" style="margin: 0 0 6px;">Your last plan expired on ' + esc(premFmtDate(p.expiresAt)) + '.</p>' +
        '<p class="muted-text" style="margin: 0;">Choose a plan below to renew.</p>'
      );
    } else {
      premSetStatus('<p class="muted-text" style="margin: 0;">You are on the free plan. Choose a plan below to unlock every mock test.</p>');
    }
  }

  function renderPremPlans() {
    const plans = premState.plans || {};
    const keys = Object.keys(plans).filter(function (k) { return plans[k] && plans[k].active !== false && !plans[k].archived; });
    if (keys.length === 0) {
      premSetPlans('<p class="muted-text">No plans available right now.</p>');
      return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    keys.forEach(function (key) {
      const plan = plans[key];
      html +=
        const featLine = Array.isArray(plan.features) && plan.features.length > 0
          ? '<div style="font-size:11px;color:#737373;margin-top:4px;">' + plan.features.map(function (f) { return '• ' + esc(f); }).join(' ') + '</div>'
          : '';
        const priceHtml = plan.originalPrice && plan.originalPrice > plan.price
          ? '<div style="text-align:right;"><div style="font-size:11px;color:#737373;text-decoration:line-through;">₹' + plan.originalPrice + '</div><div style="font-size:18px;font-weight:700;color:#171717;font-variant-numeric:tabular-nums;">₹' + plan.price + '</div></div>'
          : '<div style="font-size:18px;font-weight:700;color:#171717;font-variant-numeric:tabular-nums;">₹' + plan.price + '</div>';
        html +=
        '<button type="button" class="guide-card" data-plan="' + esc(key) + '" style="text-align:left;cursor:pointer;border:1px solid #e7e7e7;border-radius:8px;padding:14px;background:#ffffff;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
          '<div style="flex:1;">' +
            '<div style="font-size:14px;font-weight:600;color:#171717;">' + esc(plan.label) + '</div>' +
            '<div style="font-size:12px;color:#737373;margin-top:2px;">' + plan.days + ' days · Unlimited mock tests</div>' +
            featLine +
          '</div>' +
          priceHtml +
        '</button>';
    });
    html += '</div>';
    premSetPlans(html);

    document.querySelectorAll("#premPlansBox [data-plan]").forEach(function (btn) {
      btn.addEventListener("click", function () { selectPremPlan(btn.getAttribute("data-plan")); });
    });
  }

  function selectPremPlan(key) {
    const plan = (premState.plans || {})[key];
    if (!plan) return;
    premState.selectedPlan = { key: key, plan: plan };
    const card = document.getElementById("premOrderCard");
    const label = document.getElementById("premSelectedLabel");
    if (label) label.textContent = plan.label + " — ₹" + plan.price + " for " + plan.days + " days";
    if (card) card.hidden = false;

    const nameEl = document.getElementById("premFieldName");
    const waEl = document.getElementById("premFieldWhatsApp");
    const profile = state.profile || {};
    if (nameEl && !nameEl.value) nameEl.value = profile.name || "";
    if (waEl && !waEl.value) waEl.value = profile.whatsapp || "";

    premSetError("");
    setTimeout(function () { card && card.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }

  function renderPremRequests() {
    const list = premState.requests || [];
    if (list.length === 0) {
      premSetRequests('<p class="muted-text">No requests yet.</p>');
      return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    list.forEach(function (r) {
      html +=
        '<div style="border:1px solid #e7e7e7;border-radius:8px;padding:12px;background:#ffffff;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<div style="font-size:13px;font-weight:600;color:#171717;">' + esc(r.planLabel) + ' · ₹' + r.planPrice + '</div>' +
            premStatusBadge(r.status) +
          '</div>' +
          '<div style="font-size:11px;color:#737373;">Submitted ' + esc(premFmtDate(r.submittedAt)) + '</div>' +
          (r.status === "rejected" && r.rejectionReason ? '<div style="font-size:11px;color:#737373;margin-top:6px;">Reason: ' + esc(r.rejectionReason) + '</div>' : '') +
        '</div>';
    });
    html += '</div>';
    premSetRequests(html);
  }

  function syncPremiumBanner() {
    const p = premState.premium || {};
    const title = document.getElementById("dashPremiumTitle");
    const sub = document.getElementById("dashPremiumSub");
    const btn = document.getElementById("dashPremiumCtaBtn");
    const chip = document.getElementById("dashPlanChip");

    if (p.active) {
      if (title) title.textContent = "Premium active";
      if (sub) sub.textContent = p.planLabel + " · " + p.remainingDays + " day" + (p.remainingDays === 1 ? "" : "s") + " left";
      if (btn) { btn.style.display = "none"; }
      if (chip) chip.textContent = "Premium";
    } else if (p.expiresAt && p.expiresAt > 0) {
      if (title) title.textContent = "Premium expired";
      if (sub) sub.textContent = "Your plan ended on " + premFmtDate(p.expiresAt) + ". Renew to regain access.";
      if (btn) { btn.style.display = ""; btn.textContent = "Renew"; btn.setAttribute("data-action", "open-premium"); }
      if (chip) chip.textContent = "Free Account";
    } else {
      if (title) title.textContent = "No active plan";
      if (sub) sub.textContent = "Unlock every test series with Premium.";
      if (btn) { btn.style.display = ""; btn.textContent = "Get Premium"; btn.setAttribute("data-action", "open-premium"); }
      if (chip) chip.textContent = "Free Account";
    }
  }

  function submitPremiumOrder() {
    premSetError("");
    if (!premState.selectedPlan) { premSetError("Choose a plan first."); return; }
    const nameEl = document.getElementById("premFieldName");
    const waEl = document.getElementById("premFieldWhatsApp");
    const name = nameEl ? nameEl.value.trim() : "";
    const whatsapp = waEl ? waEl.value.replace(/[\s-]/g, "") : "";
    if (name.length < 2) { premSetError("Enter your name (min 2 chars)."); return; }
    if (!whatsapp || !/^[0-9]{10,15}$/.test(whatsapp)) { premSetError("Enter a valid WhatsApp number (10-15 digits)."); return; }

    const plan = premState.selectedPlan.plan;
    const planKey = premState.selectedPlan.key;

    const btn = document.getElementById("premPayBtn");
    if (btn) btn.disabled = true;

    (async function () {
      try {
        const token = await window.PK_STUDENT.getToken();
        if (!token) throw new Error("Please sign in again.");
        const res = await fetch(API_BASE + "/premium/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ planKey: planKey, name: name, whatsapp: whatsapp })
        });
        const data = await res.json().catch(function () { return null; });
        if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));

        const msg =
          "Premium Subscription Request\n\n" +
          "Plan: " + plan.label + " — ₹" + plan.price + " (" + plan.days + " days)\n" +
          "Name: " + name + "\n" +
          "WhatsApp: " + whatsapp + "\n" +
          "Request ID: " + (data.request && data.request.id ? data.request.id : "—") + "\n\n" +
          "I have selected this plan. Please share the UPI details for payment.";

        const url = "https://wa.me/" + premWhatsapp() + "?text=" + encodeURIComponent(msg);
        window.open(url, "_blank");

        toast("Request submitted. Complete payment on WhatsApp.", "success");
        const card = document.getElementById("premOrderCard");
        if (card) card.hidden = true;
        premState.selectedPlan = null;
        loadPremiumTab();
      } catch (err) {
        premSetError(err.message || "Could not submit request.");
      } finally {
        if (btn) btn.disabled = false;
      }
    })();
  }

  document.addEventListener("click", function (e) {
    const trigger = e.target.closest("[data-action='open-premium']");
    if (trigger) {
      e.preventDefault();
      setTab("premium");
    }
  });

  (function wirePremiumUI() {
    const cta = document.getElementById("dashPremiumCtaBtn");
    if (cta && !cta.getAttribute("data-action")) cta.setAttribute("data-action", "open-premium");

    const payBtn = document.getElementById("premPayBtn");
    if (payBtn) payBtn.addEventListener("click", submitPremiumOrder);

    const cancelBtn = document.getElementById("premCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", function () {
      premState.selectedPlan = null;
      const card = document.getElementById("premOrderCard");
      if (card) card.hidden = true;
      premSetError("");
    });
  })();

  /* ========== END PREMIUM MODULE ========== */

  /* ========== PREMIUM CACHE SYNC ========== */
  async function syncPremiumCache() {
    try {
      if (!window.PK_STUDENT || !window.PK_STUDENT.isLoggedIn()) {
        try { localStorage.removeItem("pk_student_premium"); } catch (e) {}
        if (dashPlanChip) dashPlanChip.textContent = "Free Account";
        return;
      }
      const token = await window.PK_STUDENT.getToken();
      if (!token) return;
      const res = await fetch(API_BASE + "/premium/me", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.premium) {
        localStorage.setItem("pk_student_premium", JSON.stringify({
          expiresAt: data.premium.expiresAt || 0,
          active: data.premium.active === true
        }));
        const isPrem = data.premium.active === true;
        if (dashPlanChip) dashPlanChip.textContent = isPrem ? "Premium" : "Free Account";

        // Re-sync premium visual classes everywhere
        try {
          if (window.PK_STUDENT && typeof window.PK_STUDENT.reapplyPremiumStyle === "function") {
            window.PK_STUDENT.reapplyPremiumStyle();
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  document.addEventListener("pk:student-auth-changed", syncPremiumCache);
  syncPremiumCache();

  /* ========== END PREMIUM CACHE SYNC ========== */

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  loadAll(false);

})();
