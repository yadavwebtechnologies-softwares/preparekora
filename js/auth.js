
/* =========================================================
   StudyKora Authentication
   File: js/auth.js

   Features:
   - Login and registration
   - Forgot/reset password
   - Show/hide password
   - Form validation and loading states
   - Authentication session storage
   - Auth mode navigation
========================================================= */

(() => {
    "use strict";

    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const SESSION_KEY = "studyKoraSession";

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    let forgotChallenge = null;

    /* ---------------------------------------------------------
       API helpers
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
                body: JSON.stringify(payload)
            });
        } catch (error) {
            throw new Error(
                "Unable to connect to the authentication service. Please check your internet connection and try again."
            );
        }

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = { message: responseText };
            }
        }

        const errorMessage =
            typeof data.message === "string"
                ? data.message
                : typeof data.error === "string"
                    ? data.error
                    : typeof data.error?.message === "string"
                        ? data.error.message
                        : typeof data.details === "string"
                            ? data.details
                            : "";

        if (
            !response.ok ||
            data.success === false ||
            data.ok === false
        ) {
            throw new Error(
                errorMessage ||
                `The request failed (${response.status}). Please try again.`
            );
        }

        return data;
    }

    function getResponseLayers(result) {
        const layers = [
            result,
            result?.data,
            result?.result,
            result?.session,
            result?.data?.session,
            result?.result?.session
        ];

        return layers.filter(
            (item) =>
                item &&
                typeof item === "object" &&
                !Array.isArray(item)
        );
    }

    function findValue(layers, keys) {
        for (const layer of layers) {
            for (const key of keys) {
                const value = layer[key];

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                ) {
                    return value;
                }
            }
        }

        return null;
    }

    /* ---------------------------------------------------------
       Session handling
    --------------------------------------------------------- */

    function saveSession(result, fallback = {}) {
        const layers = getResponseLayers(result);

        const accessToken = findValue(layers, [
            "accessToken",
            "access_token",
            "idToken",
            "id_token",
            "sessionToken",
            "token",
            "jwt"
        ]);

        const refreshToken = findValue(layers, [
            "refreshToken",
            "refresh_token"
        ]);

        const returnedUser = findValue(layers, [
            "user",
            "profile",
            "account"
        ]);

        const hasUserDetails = layers.some((layer) =>
            Boolean(
                layer.uid ||
                layer.userId ||
                layer.user_id ||
                layer.email
            )
        );

        const userDetails =
            returnedUser && typeof returnedUser === "object"
                ? returnedUser
                : hasUserDetails
                    ? layers.find((layer) =>
                        Boolean(
                            layer.uid ||
                            layer.userId ||
                            layer.user_id ||
                            layer.email
                        )
                    )
                    : null;

        // Never create a signed-in session from form data alone.
        if (!accessToken && !refreshToken && !userDetails) {
            return false;
        }

        const user = {
            ...(userDetails || {}),
            name:
                userDetails?.name ||
                userDetails?.fullName ||
                fallback.name ||
                "",
            email:
                userDetails?.email ||
                fallback.email ||
                "",
            whatsapp:
                userDetails?.whatsapp ||
                userDetails?.phone ||
                fallback.whatsapp ||
                ""
        };

        const expiresIn = Number(
            findValue(layers, ["expiresIn", "expires_in"])
        );

        const expiresAtValue = findValue(layers, [
            "expiresAt",
            "expires_at"
        ]);

        let expiresAt = null;

        if (expiresAtValue) {
            expiresAt = Number.isFinite(Number(expiresAtValue))
                ? Number(expiresAtValue)
                : Date.parse(expiresAtValue);
        } else if (Number.isFinite(expiresIn) && expiresIn > 0) {
            expiresAt = Date.now() + expiresIn * 1000;
        }

        const session = {
            accessToken: accessToken || null,
            token: accessToken || null,
            refreshToken: refreshToken || null,
            expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
            user,
            uid:
                user.uid ||
                user.userId ||
                user.user_id ||
                user.id ||
                "",
            name: user.name,
            email: user.email
        };

        try {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(session)
            );

            return true;
        } catch {
            throw new Error(
                "Your browser could not save the login session. Check your browser storage settings and try again."
            );
        }
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    /* ---------------------------------------------------------
       Message and button helpers
    --------------------------------------------------------- */

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.dataset.state = type;
        element.setAttribute("role", "status");
    }

    function clearMessages() {
        $$(".auth-message").forEach((element) => {
            element.textContent = "";
            delete element.dataset.state;
        });
    }

    async function withLoading(button, loadingText, callback) {
        if (!button) {
            return callback();
        }

        const originalText = button.textContent.trim();

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
       Validation helpers
    --------------------------------------------------------- */

    function getFieldValue(id) {
        return $(`#${id}`)?.value.trim() || "";
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
    }

    function validatePassword(password) {
        return password.length >= 8;
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
            panel.hidden =
                panel.dataset.authPanel !== mode;
        });

        if (mode !== "forgot") {
            const resetFields = $("#forgot-reset-fields");

            if (resetFields) {
                resetFields.hidden = true;
            }

            forgotChallenge = null;
        }

        clearMessages();

        const pageTitles = {
            login: "Login | studyKora",
            signup: "Create Account | studyKora",
            forgot: "Recover Account | studyKora"
        };

        document.title = pageTitles[mode];

        if (updateUrl) {
            const url = new URL(window.location.href);
            const currentMode = url.searchParams.get("mode");

            if (currentMode !== mode) {
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
       Show/hide password controls
    --------------------------------------------------------- */

    $$("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const inputId = button.dataset.togglePassword;
            const input = document.getElementById(inputId);

            if (!input) return;

            const showPassword = input.type === "password";

            input.type = showPassword ? "text" : "password";
            button.textContent = showPassword ? "Hide" : "Show";
            button.setAttribute(
                "aria-label",
                showPassword ? "Hide password" : "Show password"
            );
            button.setAttribute(
                "aria-pressed",
                String(showPassword)
            );
        });
    });

    /* ---------------------------------------------------------
       Login
    --------------------------------------------------------- */

    const loginForm = $("#login-form");

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = getFieldValue("login-email");
        const password = $("#login-password")?.value || "";
        const message = $("#login-message");
        const button = $("#login-submit");

        if (!isValidEmail(email)) {
            showMessage(message, "Enter a valid email address.", "error");
            return;
        }

        if (!password) {
            showMessage(message, "Enter your password.", "error");
            return;
        }

        clearMessages();

        try {
            await withLoading(button, "Logging in...", async () => {
                const result = await apiRequest("/auth/login", {
                    email,
                    password
                });

                const saved = saveSession(result, { email });

                if (!saved) {
                    throw new Error(
                        "The login service did not return a usable session. Please check the Worker response configuration."
                    );
                }

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

    const signupForm = $("#signup-form");

    signupForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = getFieldValue("signup-name");
        const email = getFieldValue("signup-email");
        const whatsapp = getFieldValue("signup-whatsapp");
        const password = $("#signup-password")?.value || "";
        const confirmPassword =
            $("#signup-confirm-password")?.value || "";

        const message = $("#signup-message");
        const button = $("#signup-submit");

        if (name.length < 2) {
            showMessage(
                message,
                "Enter your full name.",
                "error"
            );
            return;
        }

        if (!isValidEmail(email)) {
            showMessage(
                message,
                "Enter a valid email address.",
                "error"
            );
            return;
        }

        if (!isValidPhone(whatsapp)) {
            showMessage(
                message,
                "Enter a valid WhatsApp number with the country code.",
                "error"
            );
            return;
        }

        if (!validatePassword(password)) {
            showMessage(
                message,
                "Your password must contain at least 8 characters.",
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
                const result = await apiRequest("/auth/signup", {
                    name,
                    email,
                    whatsapp,
                    password
                });

                const saved = saveSession(result, {
                    name,
                    email,
                    whatsapp
                });

                if (saved) {
                    window.location.assign("index.html");
                    return;
                }

                // If signup does not return a session, ask the user to log in.
                const loginEmail = $("#login-email");

                if (loginEmail) {
                    loginEmail.value = email;
                }

                setMode("login");

                showMessage(
                    $("#login-message"),
                    "Your account was created. Please log in to continue.",
                    "success"
                );
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
       Forgot password: verify account / request reset
    --------------------------------------------------------- */

    const forgotForm = $("#forgot-form");

    forgotForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = getFieldValue("forgot-email");
        const whatsapp = getFieldValue("forgot-whatsapp");

        const message = $("#forgot-message");
        const button = $("#forgot-submit");
        const resetFields = $("#forgot-reset-fields");

        if (!isValidEmail(email)) {
            showMessage(
                message,
                "Enter a valid registered email address.",
                "error"
            );
            return;
        }

        if (!isValidPhone(whatsapp)) {
            showMessage(
                message,
                "Enter a valid registered WhatsApp number.",
                "error"
            );
            return;
        }

        clearMessages();

        try {
            await withLoading(button, "Verifying...", async () => {
                const result = await apiRequest("/auth/forgot-password", {
                    email,
                    whatsapp
                });

                const layers = getResponseLayers(result);

                forgotChallenge = {
                    challengeId: findValue(layers, [
                        "challengeId",
                        "challenge_id",
                        "verificationId",
                        "verification_id"
                    ]),
                    resetToken: findValue(layers, [
                        "resetToken",
                        "reset_token"
                    ])
                };

                if (resetFields) {
                    resetFields.hidden = false;
                }

                showMessage(
                    message,
                    result.message ||
                    "Continue with the verification code and your new password, if requested by the verification process.",
                    "success"
                );

                $("#forgot-otp")?.focus();
            });
        } catch (error) {
            showMessage(
                message,
                error.message ||
                "Account verification could not be completed.",
                "error"
            );
        }
    });

    /* ---------------------------------------------------------
       Forgot password: reset password
    --------------------------------------------------------- */

    const resetButton = $("#forgot-reset-submit");

    resetButton?.addEventListener("click", async () => {
        const email = getFieldValue("forgot-email");
        const whatsapp = getFieldValue("forgot-whatsapp");
        const otp = getFieldValue("forgot-otp");

        const newPassword = $("#forgot-new-password")?.value || "";
        const confirmPassword =
            $("#forgot-confirm-password")?.value || "";

        const message = $("#forgot-message");

        if (!isValidEmail(email) || !isValidPhone(whatsapp)) {
            showMessage(
                message,
                "Enter your registered email and WhatsApp number first.",
                "error"
            );
            return;
        }

        if (!otp) {
            showMessage(
                message,
                "Enter the verification code.",
                "error"
            );
            return;
        }

        if (!validatePassword(newPassword)) {
            showMessage(
                message,
                "Your new password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage(
                message,
                "The new passwords do not match.",
                "error"
            );
            return;
        }

        clearMessages();

        try {
            await withLoading(
                resetButton,
                "Resetting password...",
                async () => {
                    const payload = {
                        email,
                        whatsapp,
                        otp,
                        newPassword
                    };

                    if (forgotChallenge?.challengeId) {
                        payload.challengeId =
                            forgotChallenge.challengeId;
                    }

                    if (forgotChallenge?.resetToken) {
                        payload.resetToken =
                            forgotChallenge.resetToken;
                    }

                    const result = await apiRequest(
                        "/auth/reset-password",
                        payload
                    );

                    // Clear temporary reset data and show login.
                    $("#login-email").value = email;
                    $("#login-password").value = "";
                    $("#forgot-form").reset();

                    if ($("#forgot-reset-fields")) {
                        $("#forgot-reset-fields").hidden = true;
                    }

                    forgotChallenge = null;

                    setMode("login");

                    showMessage(
                        $("#login-message"),
                        result.message ||
                        "Password reset completed. You can now log in with your new password.",
                        "success"
                    );
                }
            );
        } catch (error) {
            showMessage(
                message,
                error.message ||
                "Password reset failed. Please verify your details and try again.",
                "error"
            );
        }
    });

    /* ---------------------------------------------------------
       Initialise page
    --------------------------------------------------------- */

    function initialiseAuthPage() {
        const params = new URLSearchParams(window.location.search);
        const requestedMode = params.get("mode") || "login";

        setMode(requestedMode, false);

        // Reset fields should never be visible on initial page load.
        const resetFields = $("#forgot-reset-fields");

        if (resetFields) {
            resetFields.hidden = true;
        }
    }

    initialiseAuthPage();

})();
