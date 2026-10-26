/* =========================================================
   StudyKora Authentication
   File: js/auth.js

   Canonical session:
   - idToken
   - refreshToken
   - expiresIn
   - savedAt
   - expiresAt
   - user.uid / user.email / user.displayName

   Worker-compatible endpoints:
   - POST /auth/login
   - POST /auth/signup
   - POST /auth/forgot-password
========================================================= */

(() => {
    "use strict";

    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const SESSION_KEY = "studyKoraSession";
    const DEFAULT_EXPIRES_IN = 3600;
    const MAX_NAME_LENGTH = 80;

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    /* ---------------------------------------------------------
       API
    --------------------------------------------------------- */

    async function apiRequest(endpoint, payload) {
        let response;

        try {
            response = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                cache: "no-store",
                body: JSON.stringify(payload)
            });
        } catch {
            throw new Error(
                "Unable to connect to StudyKora. Check your internet connection."
            );
        }

        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = {};
            }
        }

        if (!response.ok) {
            const message =
                typeof data.error === "string"
                    ? data.error
                    : typeof data.message === "string"
                        ? data.message
                        : `Request failed (HTTP ${response.status}).`;

            throw new Error(message);
        }

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error(
                "The authentication service returned an invalid response."
            );
        }

        return data;
    }

    /* ---------------------------------------------------------
       Session
    --------------------------------------------------------- */

    function normalizeUser(rawUser, fallback = {}) {
        const user =
            rawUser && typeof rawUser === "object"
                ? rawUser
                : {};

        const uid =
            user.uid ||
            user.localId ||
            user.userId ||
            user.user_id ||
            "";

        const email = String(
            user.email || fallback.email || ""
        ).trim().toLowerCase();

        const displayName = String(
            user.displayName ||
            user.name ||
            user.fullName ||
            fallback.name ||
            ""
        ).trim();

        const photoURL = String(
            user.photoURL ||
            user.photoUrl ||
            ""
        ).trim();

        const whatsapp = String(
            user.whatsapp ||
            user.phone ||
            fallback.whatsapp ||
            ""
        ).trim();

        if (!uid || !email) {
            throw new Error(
                "The authentication service did not return a valid user identity."
            );
        }

        return {
            uid: String(uid),
            localId: String(user.localId || uid),
            email,
            displayName,
            photoURL,
            whatsapp
        };
    }

    function createSession(response, fallback = {}) {
        // This Worker returns Firebase's ID token under idToken.
        // Do not substitute arbitrary fields such as "token" or
        // "refreshToken" for the ID token.
        if (
            typeof response.idToken !== "string" ||
            !response.idToken.trim()
        ) {
            throw new Error(
                "The server did not return an ID token. Please try again."
            );
        }

        if (
            typeof response.refreshToken !== "string" ||
            !response.refreshToken.trim()
        ) {
            throw new Error(
                "The server did not return a refresh token. Please try again."
            );
        }

        const user = normalizeUser(response.user, fallback);

        const parsedExpiry = Number(response.expiresIn);

        const expiresIn =
            Number.isFinite(parsedExpiry) && parsedExpiry > 0
                ? parsedExpiry
                : DEFAULT_EXPIRES_IN;

        const savedAt = Date.now();

        return {
            schemaVersion: 1,
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            expiresIn,
            savedAt,
            expiresAt: savedAt + expiresIn * 1000,
            user
        };
    }

    function saveSession(response, fallback = {}) {
        const session = createSession(response, fallback);

        try {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(session)
            );
        } catch {
            throw new Error(
                "Could not save your login session. Check browser storage settings."
            );
        }

        // Verify that the newly saved session can be read back.
        try {
            const stored = JSON.parse(
                sessionStorage.getItem(SESSION_KEY) || "null"
            );

            if (
                !stored ||
                stored.idToken !== session.idToken ||
                stored.refreshToken !== session.refreshToken ||
                stored.user?.uid !== session.user.uid ||
                stored.user?.email !== session.user.email
            ) {
                sessionStorage.removeItem(SESSION_KEY);

                throw new Error(
                    "The saved login session could not be verified."
                );
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(
                    "The saved login session is invalid. Please try again."
                );
            }

            throw error;
        }

        return session;
    }

    /* ---------------------------------------------------------
       Messages
    --------------------------------------------------------- */

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.classList.remove("is-error", "is-success");

        if (type === "error") {
            element.classList.add("is-error");
        } else if (type === "success") {
            element.classList.add("is-success");
        }

        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
    }

    function clearMessages() {
        $$(".auth-message").forEach((element) => {
            element.textContent = "";
            element.classList.remove("is-error", "is-success");
        });
    }

    /* ---------------------------------------------------------
       Loading state
    --------------------------------------------------------- */

    async function withLoading(button, loadingText, callback) {
        if (!button) {
            return callback();
        }

        const originalText = button.textContent;

        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = loadingText;

        try {
            return await callback();
        } finally {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.textContent = originalText;
        }
    }

    /* ---------------------------------------------------------
       Validation
    --------------------------------------------------------- */

    function getFieldValue(id) {
        return $(`#${id}`)?.value.trim() || "";
    }

    function getPassword(id) {
        return $(`#${id}`)?.value || "";
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
    }

    function isValidPassword(password) {
        return password.length >= 8 && password.length <= 128;
    }

    /* ---------------------------------------------------------
       Auth mode switching
    --------------------------------------------------------- */

    const panels = $$("[data-auth-panel]");

    function setMode(mode, updateUrl = true) {
        const validModes = ["login", "signup", "forgot"];

        if (!validModes.includes(mode)) {
            mode = "login";
        }

        panels.forEach((panel) => {
            panel.hidden = panel.dataset.authPanel !== mode;
        });

        clearMessages();

        const titles = {
            login: "Login | StudyKora",
            signup: "Create Account | StudyKora",
            forgot: "Recover Account | StudyKora"
        };

        document.title = titles[mode];

        if (updateUrl) {
            const url = new URL(window.location.href);

            if (url.searchParams.get("mode") !== mode) {
                url.searchParams.set("mode", mode);
                window.history.pushState({ mode }, "", url);
            }
        }
    }

    $$("[data-show-auth]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            const mode = link.dataset.showAuth;

            if (mode) {
                setMode(mode);
            }
        });
    });

    window.addEventListener("popstate", () => {
        const mode =
            new URLSearchParams(window.location.search).get("mode");

        setMode(mode || "login", false);
    });

    /* ---------------------------------------------------------
       Login
    --------------------------------------------------------- */

    $("#login-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = getFieldValue("login-email").toLowerCase();
        const password = getPassword("login-password");

        const message = $("#login-message");
        const button = $("#login-submit");

        if (!isValidEmail(email)) {
            showMessage(message, "Enter a valid email address.", "error");
            return;
        }

        if (!password || password.length > 128) {
            showMessage(message, "Enter a valid password.", "error");
            return;
        }

        clearMessages();

        try {
            await withLoading(button, "Logging in...", async () => {
                const response = await apiRequest("/auth/login", {
                    email,
                    password
                });

                // Save the canonical session before redirecting.
                saveSession(response, { email });

                window.location.assign("index.html");
            });
        } catch (error) {
            showMessage(
                message,
                error.message || "Login failed. Please try again.",
                "error"
            );
        }
    });

    /* ---------------------------------------------------------
       Signup
    --------------------------------------------------------- */

    $("#signup-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = getFieldValue("signup-name");
        const email = getFieldValue("signup-email").toLowerCase();
        const whatsapp = getFieldValue("signup-whatsapp");
        const password = getPassword("signup-password");
        const confirmPassword = getPassword("signup-confirm-password");

        const message = $("#signup-message");
        const button = $("#signup-submit");

        if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
            showMessage(
                message,
                "Name must contain between 2 and 80 characters.",
                "error"
            );
            return;
        }

        if (!isValidEmail(email)) {
            showMessage(message, "Enter a valid email address.", "error");
            return;
        }

        if (!isValidPhone(whatsapp)) {
            showMessage(
                message,
                "Enter a valid WhatsApp number with country code.",
                "error"
            );
            return;
        }

        if (!isValidPassword(password)) {
            showMessage(
                message,
                "Password must contain between 8 and 128 characters.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            showMessage(
                message,
                "The passwords do not match.",
                "error"
            );
            return;
        }

        clearMessages();

        try {
            await withLoading(button, "Creating account...", async () => {
                const response = await apiRequest("/auth/signup", {
                    name,
                    email,
                    whatsapp,
                    password
                });

                saveSession(response, {
                    name,
                    email,
                    whatsapp
                });

                window.location.assign("index.html");
            });
        } catch (error) {
            showMessage(
                message,
                error.message || "Account creation failed. Please try again.",
                "error"
            );
        }
    });

    /* ---------------------------------------------------------
       Forgot password

       Worker contract:
       POST /auth/forgot-password
       { email }

       Firebase sends the password reset email. The current Worker
       does not implement WhatsApp OTP verification.
    --------------------------------------------------------- */

    $("#forgot-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = getFieldValue("forgot-email");
        const message = $("#forgot-message");
        const button = $("#forgot-submit");

        if (!isValidEmail(email)) {
            showMessage(
                message,
                "Enter a valid email address.",
                "error"
            );
            return;
        }

        clearMessages();

        try {
            await withLoading(button, "Sending request...", async () => {
                const response = await apiRequest(
                    "/auth/forgot-password",
                    { email }
                );

                const resetFields = $("#forgot-reset-fields");

                if (resetFields) {
                    resetFields.hidden = true;
                }

                showMessage(
                    message,
                    response.message ||
                        "If the account exists, a password reset email will be sent. Check your inbox and follow the link.",
                    "success"
                );
            });
        } catch (error) {
            showMessage(
                message,
                error.message ||
                    "Could not request a password reset. Please try again.",
                "error"
            );
        }
    });

    /* ---------------------------------------------------------
       Initialise
    --------------------------------------------------------- */

    function initialiseAuthPage() {
        const params = new URLSearchParams(window.location.search);
        const requestedMode = params.get("mode") || "login";

        setMode(requestedMode, false);

        const resetFields = $("#forgot-reset-fields");

        if (resetFields) {
            resetFields.hidden = true;
        }
    }

    initialiseAuthPage();
})();
