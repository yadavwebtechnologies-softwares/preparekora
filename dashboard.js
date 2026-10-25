"use strict";

(() => {
  const API_BASE = "https://studykora-api.yadavsubba2003.workers.dev";
  const DATABASE_URL = "https://studykora-fc91d-default-rtdb.firebaseio.com";
  const SESSION_KEY = "studyKoraSession";
  const ADMIN_UID = "uG8gJRil9wSwl0xanyyCbhqBhJm2";
  const $ = (id) => document.getElementById(id);

  let session = null;
  let profile = null;

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function storeSession(next) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    session = next;
  }

  function showMessage(message, type = "info") {
    const node = $("dashboard-message");
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
  }

  function clearMessage() {
    const node = $("dashboard-message");
    if (!node) return;
    node.textContent = "";
    node.hidden = true;
    delete node.dataset.type;
  }

  function safeText(value, fallback = "—") {
    if (value === null || value === undefined || String(value).trim() === "") return fallback;
    return String(value);
  }

  function initials(name) {
    const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
  }

  function formatDate(value) {
    if (value === null || value === undefined || value === "") return "—";
    const date = typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function formatDateTime(value) {
    if (value === null || value === undefined || value === "") return "";
    const date = typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
  }

  function setDateAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    $("greeting-text").textContent = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    $("today-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(now);
    $("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now).toUpperCase();
  }

  async function refreshSessionIfNeeded() {
    if (!session?.idToken || !session?.user?.uid || !session?.refreshToken) {
      throw new Error("Your session is missing or invalid. Please log in again.");
    }

    const expiresIn = Number(session.expiresIn || 3600) * 1000;
    const savedAt = Number(session.savedAt || 0);
    const expiresAt = savedAt + expiresIn;
    if (savedAt && Date.now() < expiresAt - 120000) return;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.idToken || !data.refreshToken) {
      throw new Error("Your session expired. Please log in again.");
    }
    storeSession({
      user: data.user,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: Number(data.expiresIn || 3600),
      savedAt: Date.now()
    });
  }

  async function getProfile() {
    const uid = encodeURIComponent(session.user.uid);
    const url = `${DATABASE_URL.replace(/\/+$/, "")}/users/${uid}.json?auth=${encodeURIComponent(session.idToken)}`;
    const response = await fetch(url, { headers: { "Cache-Control": "no-store" } });
    const data = await response.json().catch(() => null);

    if (response.status === 401 || response.status === 403) {
      throw new Error("Could not access your profile. Please log in again or check database rules.");
    }
    if (!response.ok) throw new Error("Could not load your profile from Firebase.");
    if (!data || typeof data !== "object") {
      throw new Error("Your account exists, but its database profile was not found.");
    }
    if (data.uid && data.uid !== session.user.uid) {
      throw new Error("Profile identity did not match your signed-in account.");
    }
    return data;
  }

  function getAttemptList(value) {
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
    if (value && typeof value === "object") return Object.values(value).filter((item) => item && typeof item === "object");
    return [];
  }

  function calculateMetrics(data) {
    // Future test/practice modules can save attempts, progress, or stats under this user's own record.
    const attempts = getAttemptList(data.testAttempts || data.attempts || data.mockTestAttempts);
    let questions = 0;
    let correct = 0;
    let incorrect = 0;
    let latest = 0;

    for (const attempt of attempts) {
      const count = Number(attempt.questionsAttempted ?? attempt.totalQuestions ?? attempt.questionCount ?? 0);
      const right = Number(attempt.correctAnswers ?? attempt.correct ?? 0);
      const wrong = Number(attempt.incorrectAnswers ?? attempt.incorrect ?? Math.max(0, count - right));
      questions += Number.isFinite(count) && count > 0 ? count : 0;
      correct += Number.isFinite(right) && right > 0 ? right : 0;
      incorrect += Number.isFinite(wrong) && wrong > 0 ? wrong : 0;
      const ts = Number(attempt.completedAt ?? attempt.createdAt ?? attempt.timestamp ?? 0);
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    }

    const stats = data.stats && typeof data.stats === "object" ? data.stats : {};
    questions = Math.max(questions, Number(stats.questionsAttempted || 0));
    correct = Math.max(correct, Number(stats.correctAnswers || 0));
    incorrect = Math.max(incorrect, Number(stats.incorrectAnswers || 0));
    const tests = Math.max(attempts.length, Number(stats.testsCompleted || 0));
    const denominator = correct + incorrect;
    const accuracy = denominator > 0 ? Math.round((correct / denominator) * 100) : null;
    const streak = Math.max(0, Number(data.progress?.streakDays ?? stats.streakDays ?? 0) || 0);
    const lastActivity = Math.max(latest, Number(data.progress?.lastActivityAt || 0), Number(stats.lastActivityAt || 0));
    return { attempts, tests, questions, correct, incorrect, accuracy, streak, lastActivity };
  }

  function renderRecentActivity(data, metrics) {
    const container = $("recent-activity");
    container.replaceChildren();
    const activities = getAttemptList(data.recentActivity);
    const entries = activities.length ? activities.slice().sort((a, b) => Number(b.timestamp || b.createdAt || 0) - Number(a.timestamp || a.createdAt || 0)).slice(0, 5) : [];

    if (!entries.length && metrics.attempts.length) {
      metrics.attempts.slice().sort((a, b) => Number(b.completedAt || b.createdAt || 0) - Number(a.completedAt || a.createdAt || 0)).slice(0, 5).forEach((attempt) => {
        entries.push({
          title: safeText(attempt.title || attempt.testName, "Mock test completed"),
          description: `${Number(attempt.correctAnswers ?? attempt.correct ?? 0)} correct answers recorded`,
          timestamp: attempt.completedAt || attempt.createdAt || attempt.timestamp || 0
        });
      });
    }

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "sk-muted-empty";
      empty.textContent = "No learning activity recorded yet.";
      container.append(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "sk-activity-item";
      const marker = document.createElement("span");
      marker.className = "sk-activity-marker";
      marker.setAttribute("aria-hidden", "true");
      const copy = document.createElement("div");
      copy.className = "sk-activity-copy";
      const title = document.createElement("strong");
      title.textContent = safeText(entry.title || entry.type, "Learning activity");
      const desc = document.createElement("p");
      desc.textContent = safeText(entry.description || entry.summary, "Activity recorded on your account.");
      copy.append(title, desc);
      const time = document.createElement("span");
      time.className = "sk-activity-time";
      time.textContent = formatDateTime(entry.timestamp || entry.createdAt || entry.completedAt);
      item.append(marker, copy, time);
      container.append(item);
    });
  }

  function renderDashboard(data) {
    profile = data;
    const name = safeText(data.name, session.user.email?.split("@")[0] || "Student");
    const email = safeText(data.email || session.user.email);
    const avatarText = initials(name);
    const isAdmin = session.user.uid === ADMIN_UID;

    $("welcome-name").textContent = name.split(/\s+/)[0];
    $("dashboard-user-name")?.replaceChildren?.();
    $("account-avatar").textContent = avatarText;
    $("profile-avatar").textContent = avatarText;
    $("profile-name").textContent = name;
    $("profile-email").textContent = email;
    $("profile-whatsapp").textContent = safeText(data.whatsapp);
    $("profile-created").textContent = formatDate(data.createdAt);
    $("profile-status").textContent = "Active";
    $("account-role").textContent = isAdmin ? "Administrator account" : "Student account";
    $("edit-name").value = data.name || "";
    $("edit-whatsapp").value = data.whatsapp || "";
    $("stat-tests-note").textContent = isAdmin ? "Your account activity" : "Your completed mock tests";

    const metrics = calculateMetrics(data);
    $("stat-tests").textContent = String(metrics.tests);
    $("stat-questions").textContent = String(metrics.questions);
    $("stat-accuracy").textContent = metrics.accuracy === null ? "—" : `${metrics.accuracy}%`;
    $("stat-streak").replaceChildren(document.createTextNode(String(metrics.streak) + " "));
    const unit = document.createElement("small");
    unit.textContent = "days";
    $("stat-streak").append(unit);
    $("progress-correct").textContent = String(metrics.correct);
    $("progress-incorrect").textContent = String(metrics.incorrect);
    $("progress-last").textContent = metrics.lastActivity ? formatDateTime(metrics.lastActivity) : "Not yet";

    const hasAnyLearningData = metrics.tests > 0 || metrics.questions > 0 || metrics.streak > 0 || metrics.lastActivity > 0;
    $("progress-empty").hidden = hasAnyLearningData;
    $("progress-summary").hidden = !hasAnyLearningData;
    renderRecentActivity(data, metrics);
  }

  async function reloadProfile() {
    clearMessage();
    await refreshSessionIfNeeded();
    const data = await getProfile();
    renderDashboard(data);
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!profile || !session?.idToken) return;
    const name = String($("edit-name").value || "").trim();
    const whatsapp = String($("edit-whatsapp").value || "").trim();
    const digits = whatsapp.replace(/\D/g, "");

    if (name.length < 2 || name.length > 80) {
      showMessage("Name must be between 2 and 80 characters.", "error");
      $("edit-name").focus();
      return;
    }
    if (whatsapp && (digits.length < 10 || digits.length > 15)) {
      showMessage("Enter a valid WhatsApp number, including country code.", "error");
      $("edit-whatsapp").focus();
      return;
    }

    const button = $("edit-save");
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await refreshSessionIfNeeded();
      const uid = encodeURIComponent(session.user.uid);
      const url = `${DATABASE_URL.replace(/\/+$/, "")}/users/${uid}.json?auth=${encodeURIComponent(session.idToken)}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Firebase denied this profile update. Please check your database rules or sign in again." : "Profile could not be saved.");
      profile = result && typeof result === "object" ? result : { ...profile, name, whatsapp };
      renderDashboard(profile);
      $("edit-profile-form").hidden = true;
      showMessage("Profile updated successfully.", "success");
    } catch (error) {
      showMessage(error.message || "Could not save your profile.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save changes";
    }
  }

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Browser storage may be unavailable. */ }
    window.location.replace("./auth.html?mode=login");
  }

  function showFeatureUnavailable(name) {
    showMessage(`${name} has not been built yet. This card will become active when that module is ready.`, "info");
    $("dashboard-message").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setupInteractions() {
    document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", logout));
    document.querySelectorAll("[data-feature]").forEach((button) => button.addEventListener("click", () => showFeatureUnavailable(button.dataset.feature)));

    const form = $("edit-profile-form");
    $("edit-profile-toggle").addEventListener("click", () => {
      clearMessage();
      form.hidden = !form.hidden;
      if (!form.hidden) $("edit-name").focus();
    });
    $("edit-cancel").addEventListener("click", () => {
      if (profile) {
        $("edit-name").value = profile.name || "";
        $("edit-whatsapp").value = profile.whatsapp || "";
      }
      form.hidden = true;
    });
    form.addEventListener("submit", saveProfile);
    $("account-avatar").addEventListener("click", () => {
      form.hidden = false;
      $("edit-name").focus();
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const sidebar = $("dashboard-sidebar");
    const overlay = $("mobile-overlay");
    const menu = $("menu-toggle");
    const closeMenu = () => {
      sidebar.classList.remove("is-open");
      overlay.hidden = true;
      menu.setAttribute("aria-expanded", "false");
    };
    menu.addEventListener("click", () => {
      const open = !sidebar.classList.contains("is-open");
      sidebar.classList.toggle("is-open", open);
      overlay.hidden = !open;
      menu.setAttribute("aria-expanded", String(open));
    });
    overlay.addEventListener("click", closeMenu);
    sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  }

  async function init() {
    setDateAndGreeting();
    setupInteractions();
    session = readSession();
    if (!session?.user?.uid || !session?.idToken || !session?.refreshToken) {
      window.location.replace("./auth.html?mode=login");
      return;
    }
    try {
      await reloadProfile();
    } catch (error) {
      showMessage(error.message || "Unable to load your dashboard.", "error");
      if (/log in again|session expired|session is missing|invalid session/i.test(error.message || "")) {
        setTimeout(() => logout(), 1600);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
