"use strict";

(function () {

  /* ---------- Config ---------- */

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

  /* ---------- DOM ---------- */

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

  /* ---------- State ---------- */

  const state = {
    user: null,
    profile: null,
    stats: null
  };

  /* ---------- Utilities ---------- */

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

  function toast(message, kind) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
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
    const day = d.getDate();
    return mon + " " + day;
  }

  function initialOf(name, email) {
    const s = (name || email || "U").trim();
    return s.charAt(0).toUpperCase();
  }

  /* ---------- Tabs ---------- */

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
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setTab(t.dataset.tab); });
  });

  if (dashEditBtn) {
    dashEditBtn.addEventListener("click", function () { setTab("settings"); });
  }

  /* ---------- Profile render ---------- */

  function renderProfile() {
    const user = state.user || {};
    const profile = state.profile || {};
    const name = profile.name || user.displayName || (user.email ? user.email.split("@")[0] : "User");
    const email = user.email || profile.email || "";

    if (dashAvatar) dashAvatar.textContent = initialOf(name, email);
    if (dashName) dashName.textContent = name;

    const lines = [];
    if (email) lines.push(email);
    if (profile.whatsapp) lines.push(profile.whatsapp);
    if (profile.dob) lines.push(profile.dob);
    if (dashMeta) dashMeta.innerHTML = lines.map(esc).join(" · ");

    if (dashPlanChip) dashPlanChip.textContent = "Free Account";

    if (dashFieldName) dashFieldName.value = profile.name || "";
    if (dashFieldEmail) dashFieldEmail.value = email;
    if (dashFieldWhatsApp) dashFieldWhatsApp.value = profile.whatsapp || "";
    if (dashFieldDob) dashFieldDob.value = profile.dob || "";
    if (dashFieldPincode) dashFieldPincode.value = profile.pincode || "";
  }

  /* ---------- Stats render ---------- */

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
  }

  /* ---------- Score trend chart ---------- */

  function renderTrend(points) {
    if (!dashTrendCanvas) return;
    const ctx = dashTrendCanvas.getContext("2d");
    if (!ctx) return;

    const W = dashTrendCanvas.width;
    const H = dashTrendCanvas.height;
    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + i * ((H - 20) / 4);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!points.length) {
      if (dashTrendLabels) dashTrendLabels.innerHTML = "";
      return;
    }

    const n = points.length;
    const padX = 40;
    const usableW = W - padX * 2;
    const usableH = H - 40;
    const topY = 15;

    const coords = points.map(function (p, i) {
      const x = n === 1 ? W / 2 : padX + (i / (n - 1)) * usableW;
      const y = topY + usableH - (Math.min(100, Math.max(0, p.avgPercent)) / 100) * usableH;
      return { x: x, y: y, val: p.avgPercent, count: p.count };
    });

    // line
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    coords.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // dots
    coords.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#222222";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#737373";
      ctx.font = "11px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.val + "%", p.x, p.y - 12);
    });

    // x-axis labels
    if (dashTrendLabels) {
      dashTrendLabels.innerHTML = "";
      const maxLabels = 6;
      const step = Math.max(1, Math.ceil(n / maxLabels));
      points.forEach(function (p, i) {
        if (i % step !== 0 && i !== n - 1) return;
        const span = document.createElement("span");
        span.textContent = formatDateShort(p.at);
        dashTrendLabels.appendChild(span);
      });
    }
  }

  /* ---------- Subjects ---------- */

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

  /* ---------- Recent submissions ---------- */

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

  /* ---------- Data loading ---------- */

  async function fetchDashboardData(token) {
    try {
      const res = await fetch(API_BASE + "/students/me/dashboard", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function loadAll() {
    showSection("loading");

    try {
      await window.PK_STUDENT.ready;
    } catch (e) {
      showSection("authRequired");
      return;
    }

    if (!window.PK_STUDENT.isLoggedIn()) {
      showSection("authRequired");
      return;
    }

    const token = await window.PK_STUDENT.getToken();
    if (!token) {
      showSection("authRequired");
      return;
    }

    state.user = window.PK_STUDENT.getUser() || {};
    state.profile = window.PK_STUDENT.getProfile() || {};

    // Fresh profile from server
    try {
      const pr = await fetch(API_BASE + "/students/me", {
        headers: { Authorization: "Bearer " + token }
      });
      if (pr.ok) {
        const fresh = await pr.json();
        state.profile = fresh;
        try { localStorage.setItem("pk_student_profile", JSON.stringify(fresh)); } catch (e) {}
      }
    } catch (e) {}

    showSection("main");
    renderProfile();

    // Load dashboard stats
    const data = await fetchDashboardData(token);
    state.stats = data || { totalTests: 0, avgPercent: 0, bestPercent: 0, totalQuestions: 0, scoreTrend: [], subjects: [], recentSubmissions: [] };
    renderStats();
  }

  /* ---------- Sign in from auth-required state ---------- */

  if (dashSignInBtn) {
    dashSignInBtn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    });
  }

  /* ---------- Settings: save profile ---------- */

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
      if (!/^[0-9]{10,15}$/.test(whatsapp)) {
        if (dashSettingsError) { dashSettingsError.textContent = "Enter a valid WhatsApp number (10-15 digits)"; dashSettingsError.hidden = false; }
        return;
      }

      if (dashSaveProfileBtn) dashSaveProfileBtn.disabled = true;

      try {
        const saved = await window.PK_STUDENT.saveProfile({
          name: name,
          whatsapp: whatsapp,
          dob: dob,
          pincode: pincode
        });
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

  /* ---------- Change password ---------- */

  if (dashChangePasswordBtn) {
    dashChangePasswordBtn.addEventListener("click", async function () {
      const user = state.user || {};
      const email = user.email || (state.profile && state.profile.email) || "";
      if (!email) {
        toast("No email on file", "error");
        return;
      }
      try {
        await window.PK_FIREBASE.ready;
        await window.PK_FIREBASE.auth.sendPasswordResetEmail(email);
        toast("Password reset link sent to " + email, "success");
      } catch (err) {
        toast((err && err.message) || "Could not send reset email", "error");
      }
    });
  }

  /* ---------- Log out ---------- */

  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener("click", async function () {
      try { await window.PK_STUDENT.logout(); } catch (e) {}
      window.location.href = "index.html";
    });
  }

  /* ---------- Delete account (coming soon — worker endpoint pending) ---------- */

  if (dashDeleteAccountBtn) {
    dashDeleteAccountBtn.addEventListener("click", function () {
      toast("Account deletion is coming soon. Please email yadavwebdeveloper@gmail.com to request.", "error");
    });
  }

  /* ---------- Auth state listener ---------- */

  document.addEventListener("pk:student-auth-changed", function () {
    loadAll();
  });

  /* ---------- Year ---------- */

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Init ---------- */

  loadAll();

})();
