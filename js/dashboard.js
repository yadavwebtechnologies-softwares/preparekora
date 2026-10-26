/* =====================================================
   StudyKora — Dashboard
   File: js/dashboard.js

   Session contract:
   - idToken
   - refreshToken
   - expiresIn
   - savedAt
   - expiresAt
   - user.uid / user.email / user.displayName

   Uses Firebase Realtime Database for dashboard activity
   and profile data, with Firebase ID-token authentication.
===================================================== */

"use strict";

(() => {
    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const DATABASE_URL =
        "https://studykora-fc91d-default-rtdb.firebaseio.com";

    const SESSION_KEY = "studyKoraSession";
    const ADMIN_UID = "uG8gJRil9wSwl0xanyyCbhqBhJm2";
    const DEFAULT_EXPIRES_IN = 3600;
    const REFRESH_BUFFER_MS = 120000;

    const $ = (id) => document.getElementById(id);

    let session = null;
    let profile = null;
    let refreshPromise = null;

    /* -----------------------------------------------------
       Session management and legacy-session migration
    ----------------------------------------------------- */

    function readSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;

            const stored = JSON.parse(raw);

            if (!stored || typeof stored !== "object") {
                return null;
            }

            const oldUser =
                stored.user && typeof stored.user === "object"
                    ? stored.user
                    : {};

            const uid = String(
                oldUser.uid ||
                oldUser.localId ||
                oldUser.userId ||
                stored.uid ||
                ""
            );

            const email = String(
                oldUser.email || stored.email || ""
            ).trim().toLowerCase();

            const idToken = String(
                stored.idToken ||
                stored.accessToken ||
                stored.token ||
                ""
            );

            const refreshToken = String(stored.refreshToken || "");

            const parsedExpiresIn = Number(stored.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiresIn) && parsedExpiresIn > 0
                    ? parsedExpiresIn
                    : DEFAULT_EXPIRES_IN;

            const parsedSavedAt = Number(stored.savedAt);
            let savedAt =
                Number.isFinite(parsedSavedAt) && parsedSavedAt > 0
                    ? parsedSavedAt
                    : 0;

            const parsedExpiresAt = Number(stored.expiresAt);
            let expiresAt =
                Number.isFinite(parsedExpiresAt) && parsedExpiresAt > 0
                    ? parsedExpiresAt
                    : 0;

            if (!savedAt && expiresAt) {
                savedAt = expiresAt - expiresIn * 1000;
            }

            if (!expiresAt && savedAt) {
                expiresAt = savedAt + expiresIn * 1000;
            }

            return {
                schemaVersion: 1,
                idToken,
                refreshToken,
                expiresIn,
                savedAt,
                expiresAt,
                user: {
                    ...oldUser,
                    uid,
                    localId: String(oldUser.localId || uid),
                    email,
                    displayName: String(
                        oldUser.displayName ||
                        oldUser.name ||
                        stored.name ||
                        ""
                    ),
                    photoURL: String(
                        oldUser.photoURL ||
                        oldUser.photoUrl ||
                        ""
                    ),
                    whatsapp: String(
                        oldUser.whatsapp ||
                        oldUser.phone ||
                        ""
                    )
                }
            };
        } catch (error) {
            console.error(
                "[StudyKora Dashboard] Could not read session:",
                error.message
            );
            return null;
        }
    }

    function storeSession(next) {
        if (
            !next ||
            !next.idToken ||
            !next.refreshToken ||
            !next.user?.uid ||
            !next.user?.email
        ) {
            throw new Error(
                "The refreshed login session is incomplete."
            );
        }

        session = next;

        try {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(session)
            );
        } catch {
            throw new Error(
                "Could not save your session in browser storage."
            );
        }

        window.dispatchEvent(
            new CustomEvent("studyKora:auth-state", {
                detail: { authenticated: true }
            })
        );
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // Continue logout if browser storage is unavailable.
        }

        session = null;

        window.dispatchEvent(
            new CustomEvent("studyKora:auth-state", {
                detail: { authenticated: false }
            })
        );
    }

    function logout() {
        clearSession();
        window.location.replace("./auth.html?mode=login");
    }

    /* -----------------------------------------------------
       Messages and basic helpers
    ----------------------------------------------------- */

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
        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return fallback;
        }

        return String(value);
    }

    function initials(name) {
        const parts = String(name || "Student")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        return (
            parts.slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || "S"
        );
    }

    function parseTimestamp(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return value < 1e12 ? value * 1000 : value;
        }

        if (typeof value === "string" && /^\d+$/.test(value)) {
            const number = Number(value);
            return number < 1e12 ? number * 1000 : number;
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    function formatDate(value) {
        const timestamp = parseTimestamp(value);
        if (!timestamp) return "—";

        return new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(timestamp));
    }

    function formatDateTime(value) {
        const timestamp = parseTimestamp(value);
        if (!timestamp) return "";

        return new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date(timestamp));
    }

    function setDateAndGreeting() {
        const now = new Date();
        const hour = now.getHours();

        if ($("greeting-text")) {
            $("greeting-text").textContent =
                hour < 12
                    ? "Good morning"
                    : hour < 17
                        ? "Good afternoon"
                        : "Good evening";
        }

        if ($("today-date")) {
            $("today-date").textContent =
                new Intl.DateTimeFormat(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                }).format(now);
        }

        if ($("today-label")) {
            $("today-label").textContent =
                new Intl.DateTimeFormat(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric"
                }).format(now).toUpperCase();
        }
    }

    /* -----------------------------------------------------
       Token refresh
    ----------------------------------------------------- */

    async function refreshSessionIfNeeded(force = false) {
        if (!session?.refreshToken || !session?.user?.uid) {
            throw new Error(
                "Your session is incomplete. Please log in again."
            );
        }

        if (refreshPromise) {
            await refreshPromise;
            return;
        }

        const expiresAt = Number(session.expiresAt) || 0;

        const needsRefresh =
            force ||
            !session.idToken ||
            !expiresAt ||
            Date.now() >= expiresAt - REFRESH_BUFFER_MS;

        if (!needsRefresh) return;

        const oldSession = session;

        refreshPromise = (async () => {
            let response;

            try {
                response = await fetch(`${API_BASE}/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    cache: "no-store",
                    body: JSON.stringify({
                        refreshToken: oldSession.refreshToken
                    })
                });
            } catch {
                throw new Error(
                    "Could not connect to StudyKora to refresh your session."
                );
            }

            const data = await response.json().catch(() => ({}));

            /*
             * The supplied Worker returns idToken, refreshToken,
             * expiresIn and user. It does not return data.ok.
             */
            if (
                !response.ok ||
                typeof data.idToken !== "string" ||
                !data.idToken ||
                typeof data.refreshToken !== "string" ||
                !data.refreshToken
            ) {
                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            const returnedUid = String(
                data.user?.uid ||
                data.user?.localId ||
                ""
            );

            if (
                returnedUid &&
                returnedUid !== oldSession.user.uid
            ) {
                throw new Error(
                    "The refreshed account does not match your signed-in account."
                );
            }

            const parsedExpiry = Number(data.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiry) && parsedExpiry > 0
                    ? parsedExpiry
                    : DEFAULT_EXPIRES_IN;

            const savedAt = Date.now();

            storeSession({
                ...oldSession,
                schemaVersion: 1,
                idToken: data.idToken,
                refreshToken: data.refreshToken,
                expiresIn,
                savedAt,
                expiresAt: savedAt + expiresIn * 1000,
                user: {
                    ...oldSession.user,
                    ...(data.user || {}),
                    uid: returnedUid || oldSession.user.uid,
                    localId:
                        data.user?.localId ||
                        data.user?.uid ||
                        oldSession.user.localId ||
                        oldSession.user.uid
                }
            });
        })();

        try {
            await refreshPromise;
        } finally {
            refreshPromise = null;
        }
    }

    /* -----------------------------------------------------
       Firebase Realtime Database
    ----------------------------------------------------- */

    async function databaseRequest(method, payload, retry = true) {
        await refreshSessionIfNeeded();

        const uid = encodeURIComponent(session.user.uid);
        const base = DATABASE_URL.replace(/\/+$/, "");

        const url =
            `${base}/users/${uid}.json?auth=` +
            encodeURIComponent(session.idToken);

        let response;

        try {
            response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                },
                cache: "no-store",
                ...(payload !== undefined
                    ? { body: JSON.stringify(payload) }
                    : {})
            });
        } catch {
            throw new Error(
                "Could not connect to your learning profile. Check your internet connection."
            );
        }

        const result = await response.json().catch(() => null);

        if (
            (response.status === 401 || response.status === 403) &&
            retry
        ) {
            /*
             * A failed database request can be caused by an expired
             * ID token. Refresh once, then retry the request.
             */
            await refreshSessionIfNeeded(true);
            return databaseRequest(method, payload, false);
        }

        if (!response.ok) {
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(
                    "Firebase denied access to your profile. Please check your account permissions or database rules."
                );
            }

            throw new Error(
                `Could not access your profile (HTTP ${response.status}).`
            );
        }

        return result;
    }

    async function getProfile() {
        const data = await databaseRequest("GET");

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error(
                "Your account exists, but its database profile was not found."
            );
        }

        if (data.uid && data.uid !== session.user.uid) {
            throw new Error(
                "The profile identity does not match your signed-in account."
            );
        }

        return data;
    }

    /* -----------------------------------------------------
       Learning metrics
    ----------------------------------------------------- */

    function getAttemptList(value) {
        if (Array.isArray(value)) {
            return value.filter(
                (item) => item && typeof item === "object"
            );
        }

        if (value && typeof value === "object") {
            return Object.values(value).filter(
                (item) => item && typeof item === "object"
            );
        }

        return [];
    }

    function calculateMetrics(data) {
        const attempts = getAttemptList(
            data.testAttempts ||
            data.attempts ||
            data.mockTestAttempts
        );

        let questions = 0;
        let correct = 0;
        let incorrect = 0;
        let latest = 0;

        for (const attempt of attempts) {
            const count = Number(
                attempt.questionsAttempted ??
                attempt.totalQuestions ??
                attempt.questionCount ??
                0
            );

            const right = Number(
                attempt.correctAnswers ??
                attempt.correct ??
                0
            );

            const wrong = Number(
                attempt.incorrectAnswers ??
                attempt.incorrect ??
                Math.max(0, count - right)
            );

            if (Number.isFinite(count) && count > 0) {
                questions += count;
            }

            if (Number.isFinite(right) && right > 0) {
                correct += right;
            }

            if (Number.isFinite(wrong) && wrong > 0) {
                incorrect += wrong;
            }

            const timestamp = Math.max(
                parseTimestamp(attempt.completedAt),
                parseTimestamp(attempt.createdAt),
                parseTimestamp(attempt.timestamp)
            );

            latest = Math.max(latest, timestamp);
        }

        const stats =
            data.stats && typeof data.stats === "object"
                ? data.stats
                : {};

        questions = Math.max(
            questions,
            Number(stats.questionsAttempted) || 0
        );

        correct = Math.max(
            correct,
            Number(stats.correctAnswers) || 0
        );

        incorrect = Math.max(
            incorrect,
            Number(stats.incorrectAnswers) || 0
        );

        const tests = Math.max(
            attempts.length,
            Number(stats.testsCompleted) || 0
        );

        const denominator = correct + incorrect;

        const accuracy = denominator > 0
            ? Math.round((correct / denominator) * 100)
            : null;

        const streak = Math.max(
            0,
            Number(
                data.progress?.streakDays ??
                stats.streakDays ??
                0
            ) || 0
        );

        const lastActivity = Math.max(
            latest,
            parseTimestamp(data.progress?.lastActivityAt),
            parseTimestamp(stats.lastActivityAt)
        );

        return {
            attempts,
            tests,
            questions,
            correct,
            incorrect,
            accuracy,
            streak,
            lastActivity
        };
    }

    /* -----------------------------------------------------
       Recent activity
    ----------------------------------------------------- */

    function renderRecentActivity(data, metrics) {
        const container = $("recent-activity");
        if (!container) return;

        container.replaceChildren();

        let entries = getAttemptList(data.recentActivity);

        entries = entries
            .slice()
            .sort((a, b) => {
                const aTime = Math.max(
                    parseTimestamp(a.timestamp),
                    parseTimestamp(a.createdAt),
                    parseTimestamp(a.completedAt)
                );

                const bTime = Math.max(
                    parseTimestamp(b.timestamp),
                    parseTimestamp(b.createdAt),
                    parseTimestamp(b.completedAt)
                );

                return bTime - aTime;
            })
            .slice(0, 5);

        if (!entries.length && metrics.attempts.length) {
            entries = metrics.attempts
                .slice()
                .sort((a, b) =>
                    Math.max(
                        parseTimestamp(b.completedAt),
                        parseTimestamp(b.createdAt),
                        parseTimestamp(b.timestamp)
                    ) -
                    Math.max(
                        parseTimestamp(a.completedAt),
                        parseTimestamp(a.createdAt),
                        parseTimestamp(a.timestamp)
                    )
                )
                .slice(0, 5)
                .map((attempt) => ({
                    title: safeText(
                        attempt.title || attempt.testName,
                        "Mock test completed"
                    ),
                    description:
                        `${Number(attempt.correctAnswers ?? attempt.correct ?? 0)} correct answers recorded`,
                    timestamp:
                        attempt.completedAt ||
                        attempt.createdAt ||
                        attempt.timestamp ||
                        0
                }));
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
            title.textContent = safeText(
                entry.title || entry.type,
                "Learning activity"
            );

            const description = document.createElement("p");
            description.textContent = safeText(
                entry.description || entry.summary,
                "Activity recorded on your account."
            );

            copy.append(title, description);

            const time = document.createElement("span");
            time.className = "sk-activity-time";
            time.textContent = formatDateTime(
                entry.timestamp ||
                entry.createdAt ||
                entry.completedAt
            );

            item.append(marker, copy, time);
            container.append(item);
        });
    }

    /* -----------------------------------------------------
       Render dashboard
    ----------------------------------------------------- */

    function renderDashboard(data) {
        profile = data;

        const name = safeText(
            data.displayName ||
            data.name ||
            session.user.displayName ||
            session.user.name ||
            session.user.email.split("@")[0],
            "Student"
        );

        const email = safeText(
            data.email || session.user.email
        );

        const avatarText = initials(name);
        const isAdmin = session.user.uid === ADMIN_UID;

        if ($("welcome-name")) {
            $("welcome-name").textContent = name.split(/\s+/)[0];
        }

        if ($("account-avatar")) {
            $("account-avatar").textContent = avatarText;
        }

        if ($("profile-avatar")) {
            $("profile-avatar").textContent = avatarText;
        }

        if ($("profile-name")) {
            $("profile-name").textContent = name;
        }

        if ($("profile-email")) {
            $("profile-email").textContent = email;
        }

        if ($("profile-whatsapp")) {
            $("profile-whatsapp").textContent = safeText(data.whatsapp);
        }

        if ($("profile-created")) {
            $("profile-created").textContent = formatDate(data.createdAt);
        }

        if ($("profile-status")) {
            $("profile-status").textContent = "Active";
        }

        if ($("account-role")) {
            $("account-role").textContent = isAdmin
                ? "Administrator account"
                : "Student account";
        }

        if ($("edit-name")) {
            $("edit-name").value =
                data.displayName || data.name || "";
        }

        if ($("edit-whatsapp")) {
            $("edit-whatsapp").value = data.whatsapp || "";
        }

        if ($("stat-tests-note")) {
            $("stat-tests-note").textContent = isAdmin
                ? "Your account activity"
                : "Your completed mock tests";
        }

        const metrics = calculateMetrics(data);

        if ($("stat-tests")) {
            $("stat-tests").textContent = String(metrics.tests);
        }

        if ($("stat-questions")) {
            $("stat-questions").textContent = String(metrics.questions);
        }

        if ($("stat-accuracy")) {
            $("stat-accuracy").textContent =
                metrics.accuracy === null
                    ? "—"
                    : `${metrics.accuracy}%`;
        }

        if ($("stat-streak")) {
            $("stat-streak").replaceChildren(
                document.createTextNode(`${metrics.streak} `)
            );

            const unit = document.createElement("small");
            unit.textContent = "days";
            $("stat-streak").append(unit);
        }

        if ($("progress-correct")) {
            $("progress-correct").textContent = String(metrics.correct);
        }

        if ($("progress-incorrect")) {
            $("progress-incorrect").textContent = String(metrics.incorrect);
        }

        if ($("progress-last")) {
            $("progress-last").textContent = metrics.lastActivity
                ? formatDateTime(metrics.lastActivity)
                : "Not yet";
        }

        const hasLearningData =
            metrics.tests > 0 ||
            metrics.questions > 0 ||
            metrics.streak > 0 ||
            metrics.lastActivity > 0;

        if ($("progress-empty")) {
            $("progress-empty").hidden = hasLearningData;
        }

        if ($("progress-summary")) {
            $("progress-summary").hidden = !hasLearningData;
        }

        renderRecentActivity(data, metrics);
    }

    /* -----------------------------------------------------
       Reload profile
    ----------------------------------------------------- */

    async function reloadProfile() {
        clearMessage();

        await refreshSessionIfNeeded();

        const data = await getProfile();

        renderDashboard(data);
    }

    /* -----------------------------------------------------
       Save dashboard profile
    ----------------------------------------------------- */

    async function saveProfile(event) {
        event.preventDefault();

        if (!profile || !session?.idToken) return;

        const name = String(
            $("edit-name")?.value || ""
        ).trim();

        const whatsapp = String(
            $("edit-whatsapp")?.value || ""
        ).trim();

        const digits = whatsapp.replace(/\D/g, "");

        if (name.length < 2 || name.length > 80) {
            showMessage(
                "Name must contain between 2 and 80 characters.",
                "error"
            );
            $("edit-name")?.focus();
            return;
        }

        if (whatsapp && (digits.length < 7 || digits.length > 15)) {
            showMessage(
                "Enter a valid WhatsApp number, including country code.",
                "error"
            );
            $("edit-whatsapp")?.focus();
            return;
        }

        const button = $("edit-save");

        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        try {
            await refreshSessionIfNeeded();

            /*
             * Keep the dashboard's existing profile schema compatible.
             * displayName is also used by the Worker-backed profile page.
             */
            const result = await databaseRequest("PATCH", {
                displayName: name,
                name,
                whatsapp
            });

            profile = {
                ...profile,
                ...(result && typeof result === "object" ? result : {}),
                displayName: name,
                name,
                whatsapp
            };

            session.user.displayName = name;
            session.user.name = name;
            session.user.whatsapp = whatsapp;

            storeSession({
                ...session,
                savedAt: session.savedAt,
                expiresAt: session.expiresAt
            });

            renderDashboard(profile);

            const form = $("edit-profile-form");
            if (form) form.hidden = true;

            showMessage("Profile updated successfully.", "success");
        } catch (error) {
            showMessage(
                error.message || "Could not save your profile.",
                "error"
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Save changes";
            }
        }
    }

    /* -----------------------------------------------------
       Feature placeholders
    ----------------------------------------------------- */

    function showFeatureUnavailable(name) {
        showMessage(
            `${name} has not been built yet. This feature will become available when its module is ready.`,
            "info"
        );

        $("dashboard-message")?.scrollIntoView({
            behavior: window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches ? "auto" : "smooth",
            block: "nearest"
        });
    }

    /* -----------------------------------------------------
       Dashboard interactions
    ----------------------------------------------------- */

    function setupInteractions() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", logout);
        });

        document.querySelectorAll("[data-feature]").forEach((button) => {
            button.addEventListener("click", () => {
                showFeatureUnavailable(button.dataset.feature);
            });
        });

        const form = $("edit-profile-form");
        const editToggle = $("edit-profile-toggle");
        const cancel = $("edit-cancel");

        editToggle?.addEventListener("click", () => {
            clearMessage();

            if (!form) return;

            form.hidden = !form.hidden;

            if (!form.hidden) {
                $("edit-name")?.focus();
            }
        });

        cancel?.addEventListener("click", () => {
            if (profile) {
                $("edit-name").value =
                    profile.displayName || profile.name || "";

                $("edit-whatsapp").value =
                    profile.whatsapp || "";
            }

            if (form) form.hidden = true;
            clearMessage();
        });

        form?.addEventListener("submit", saveProfile);

        $("account-avatar")?.addEventListener("click", () => {
            if (!form) return;

            form.hidden = false;

            $("edit-name")?.focus();

            form.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches ? "auto" : "smooth",
                block: "center"
            });
        });

        /* Mobile dashboard sidebar */
        const sidebar = $("dashboard-sidebar");
        const overlay = $("mobile-overlay");
        const menu = $("menu-toggle");

        function closeMenu() {
            sidebar?.classList.remove("is-open");

            if (overlay) overlay.hidden = true;

            menu?.setAttribute("aria-expanded", "false");
        }

        menu?.addEventListener("click", () => {
            if (!sidebar || !overlay) return;

            const shouldOpen =
                !sidebar.classList.contains("is-open");

            sidebar.classList.toggle("is-open", shouldOpen);
            overlay.hidden = !shouldOpen;

            menu.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );
        });

        overlay?.addEventListener("click", closeMenu);

        sidebar?.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 760) closeMenu();
        });
    }

    /* -----------------------------------------------------
       Initialise
    ----------------------------------------------------- */

    async function init() {
        setDateAndGreeting();
        setupInteractions();

        session = readSession();

        if (
            !session?.user?.uid ||
            !session.user.email ||
            !session.refreshToken
        ) {
            clearSession();
            window.location.replace("./auth.html?mode=login");
            return;
        }

        try {
            /*
             * Persist legacy-session migration before loading data.
             * The next refresh also writes the canonical format.
             */
            if (session.idToken && session.expiresAt) {
                storeSession(session);
            }

            await reloadProfile();
        } catch (error) {
            console.error(
                "[StudyKora Dashboard] Initialization failed:",
                error.message
            );

            showMessage(
                error.message || "Unable to load your dashboard.",
                "error"
            );

            if (
                /session has expired|session is incomplete|refreshed account does not match/i
                    .test(error.message || "")
            ) {
                clearSession();
                window.location.replace("./auth.html?mode=login");
            }
        }
    }

    document.addEventListener("DOMContentLoaded", init, { once: true });
})();
