"use strict";

(function () {

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

  function initialOf(name, email) {
    return String(name || email || "U").trim().charAt(0).toUpperCase();
  }

  /* ---------- Modals helper ---------- */

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

  if (dashEditBtn) dashEditBtn.addEventListener("click", function () { setTab("settings"); });

  /* ---------- Render ---------- */

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

  function renderTrend(points) {
    if (!dashTrendCanvas) return;
    const ctx = dashTrendCanvas.getContext("2d");
    if (!ctx) return;
    const W = dashTrendCanvas.width, H = dashTrendCanvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + i * ((H - 20) / 4);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    if (!points.length) { if (dashTrendLabels) dashTrendLabels.innerHTML = ""; return; }
    const n = points.length, padX = 40, usableW = W - padX * 2, usableH = H - 40, topY = 15;
    const coords = points.map(function (p, i) {
      const x = n === 1 ? W / 2 : padX + (i / (n - 1)) * usableW;
      const y = topY + usableH - (Math.min(100, Math.max(0, p.avgPercent)) / 100) * usableH;
      return { x: x, y: y, val: p.avgPercent };
    });
    ctx.strokeStyle = "#222222"; ctx.lineWidth = 2;
    ctx.beginPath();
    coords.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    coords.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#222222"; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#737373"; ctx.font = "11px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(p.val + "%", p.x, p.y - 12);
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

  async function fetchDashboardData(token) {
    try {
      const res = await fetch(API_BASE + "/students/me/dashboard", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function loadAll(force) {
    if (loadingInProgress) return;
    try { await window.PK_STUDENT.ready; }
    catch (e) { showSection("authRequired"); return; }

    const loggedIn = window.PK_STUDENT.isLoggedIn();
    const currentUid = loggedIn ? ((window.PK_STUDENT.getUser() || {}).uid || "unknown") : null;
    if (!force && hasRenderedOnce && lastAuthUid === currentUid) return;

    loadingInProgress = true;
    try {
      if (!loggedIn) {
        showSection("authRequired");
        lastAuthUid = null; hasRenderedOnce = true;
        return;
      }
      const token = await window.PK_STUDENT.getToken();
      if (!token) {
        showSection("authRequired");
        lastAuthUid = null; hasRenderedOnce = true;
        return;
      }
      if (!hasRenderedOnce) showSection("loading");

      state.user = window.PK_STUDENT.getUser() || {};
      state.profile = window.PK_STUDENT.getProfile() || {};

      try {
        const pr = await fetch(API_BASE + "/students/me", { headers: { Authorization: "Bearer " + token } });
        if (pr.ok) {
          const fresh = await pr.json();
          state.profile = fresh;
          try { localStorage.setItem("pk_student_profile", JSON.stringify(fresh)); } catch (e) {}
        }
      } catch (e) {}

      showSection("main");
      renderProfile();
      updateProviderUI();

      const data = await fetchDashboardData(token);
      state.stats = data || { totalTests: 0, avgPercent: 0, bestPercent: 0, totalQuestions: 0, scoreTrend: [], subjects: [], recentSubmissions: [] };
      renderStats();

      lastAuthUid = currentUid; hasRenderedOnce = true;
    } finally { loadingInProgress = false; }
  }

  if (dashSignInBtn) {
    dashSignInBtn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    });
  }

  /* ---------- Provider detection ---------- */

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
    if (dashDeleteInstructions) {
      if (hasPass) dashDeleteInstructions.textContent = "Enter your current password to confirm.";
      else if (userHasGoogle()) dashDeleteInstructions.textContent = "You'll be asked to re-confirm with Google before deletion.";
      else dashDeleteInstructions.textContent = "This cannot be undone.";
    }
    if (dashDeletePasswordField) {
      dashDeletePasswordField.style.display = hasPass ? "" : "none";
    }
  }

  /* ---------- Change password ---------- */

  const dashChangePassOverlay = document.getElementById("dashChangePassOverlay");
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

  /* ---------- Logout with confirmation ---------- */

  const dashLogoutOverlay = document.getElementById("dashLogoutOverlay");
  const dashLogoutCancel = document.getElementById("dashLogoutCancel");
  const dashLogoutConfirm = document.getElementById("dashLogoutConfirm");

  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener("click", function () {
      openOverlay("dashLogoutOverlay");
    });
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

  /* ---------- Delete account ---------- */

  const dashDeleteOverlay = document.getElementById("dashDeleteOverlay");
  const dashDeleteForm = document.getElementById("dashDeleteForm");
  const dashDeletePasswordField = document.getElementById("dashDeletePasswordField");
  const dashDeletePassword = document.getElementById("dashDeletePassword");
  const dashDeleteError = document.getElementById("dashDeleteError");
  const dashDeleteCancel = document.getElementById("dashDeleteCancel");
  const dashDeleteConfirm = document.getElementById("dashDeleteConfirm");
  const dashDeleteInstructions = document.getElementById("dashDeleteInstructions");

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

  /* ---------- Settings save ---------- */

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

  /* ---------- Auth listener ---------- */

  document.addEventListener("pk:student-auth-changed", function () { loadAll(false); });

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  loadAll(false);

})();
