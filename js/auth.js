
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // studyKora Cloudflare Worker
    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const SESSION_KEY = "studyKoraSession";
    const panels = Array.from(
        document.querySelectorAll("[data-auth-panel]")
    );

    const validModes = new Set(["login", "signup", "forgot"]);

    /* ---------- API connection ---------- */

    async function apiPost(path, payload) {
        let response;

        try {
            response = await fetch(`${API_BASE}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch {
            throw new Error(
                "Could not connect to studyKora. Please check your internet connection."
            );
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
            throw new Error(
                data.message || "Request failed. Please try again."
            );
        }

        return data;
    }

    function saveSession(data) {
        if (!data.idToken || !data.refreshToken || !data.user?.uid) {
            throw new Error(
                "The server returned an invalid session. Please try again."
            );
        }

        try {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    user: data.user,
                    idToken: data.idToken,
                    refreshToken: data.refreshToken,
                    expiresIn: data.expiresIn,
                    savedAt: Date.now()
                })
            );
        } catch {
            throw new Error(
                "Could not save your login session in this browser."
            );
        }
    }

    /* ---------- Panel navigation ---------- */

    function getModeFromUrl() {
        const mode = (
            new URLSearchParams(window.location.search).get("mode") ||
            "login"
        ).toLowerCase();

        return validModes.has(mode) ? mode : "login";
    }

    function clearMessages() {
        [
            "login-message",
            "signup-message",
            "forgot-message"
        ].forEach((id) => {
            const element = $(id);
            if (!element) return;

            element.textContent = "";
            element.classList.remove("is-error", "is-success");
            delete element.dataset.type;
        });
    }

    function setMessage(element, message, type = "") {
        if (!element) return;

        element.textContent = message;
        element.classList.remove("is-error", "is-success");

        if (type === "error") {
            element.classList.add("is-error");
        } else if (type === "success") {
            element.classList.add("is-success");
        }

        if (type) {
            element.dataset.type = type;
        } else {
            delete element.dataset.type;
        }
    }

    function showPanel(mode, changeUrl = false) {
        const safeMode = validModes.has(mode) ? mode : "login";

        panels.forEach((panel) => {
            panel.hidden = panel.dataset.authPanel !== safeMode;
        });

        document.title = {
            login: "Login | studyKora",
            signup: "Create Account | studyKora",
            forgot: "Recover Account | studyKora"
        }[safeMode];

        clearMessages();

        if (changeUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", safeMode);
            history.pushState({ mode: safeMode }, "", url);
        }

        document.querySelector(
            `[data-auth-panel="${safeMode}"] input`
        )?.focus({ preventScroll: true });
    }

    document.querySelectorAll("[data-show-auth]").forEach((link) => {
        link.addEventListener("click", (event) => {
            const mode = link.dataset.showAuth;

            if (!validModes.has(mode)) return;

            event.preventDefault();
            showPanel(mode, true);
        });
    });

    window.addEventListener("popstate", () => {
        showPanel(getModeFromUrl());
    });

    /* ---------- Validation helpers ---------- */

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizePhone(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function validateForm(form, messageElement) {
        if (!form) return false;

        if (!form.checkValidity()) {
            form.reportValidity();

            setMessage(
                messageElement,
                "Please complete the required fields correctly.",
                "error"
            );

            return false;
        }

        return true;
    }

    function setBusy(button, busy, busyText = "Please wait...") {
        if (!button) return;

        if (busy) {
            button.dataset.originalText = button.textContent;
            button.textContent = busyText;
            button.disabled = true;
        } else {
            button.textContent =
                button.dataset.originalText || button.textContent;
            button.disabled = false;
        }
    }

    function getSubmitButton(form) {
        return form?.querySelector(
            'button[type="submit"], input[type="submit"], button:not([type])'
        );
    }

    /* ---------- Password visibility ---------- */

    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        if (button.dataset.passwordToggleReady === "true") return;

        const input = $(button.dataset.togglePassword);
        if (!input) return;

        button.dataset.passwordToggleReady = "true";

        button.addEventListener("click", () => {
            const visible = input.type === "password";

            input.type = visible ? "text" : "password";
            button.textContent = visible ? "Hide" : "Show";
            button.setAttribute("aria-pressed", String(visible));
            button.setAttribute(
                "aria-label",
                visible ? "Hide password" : "Show password"
            );
        });
    });

    /* ---------- Login ---------- */

    const loginForm = $("login-form");
    const loginMessage = $("login-message");

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(loginForm, loginMessage)) return;

        const email = normalizeEmail($("login-email")?.value);
        const password = $("login-password")?.value || "";
        const button = getSubmitButton(loginForm);

        setBusy(button, true);

        try {
            const data = await apiPost("/auth/login", {
                email,
                password
            });

            saveSession(data);

            setMessage(
                loginMessage,
                "Login successful. Opening studyKora...",
                "success"
            );

            window.location.assign("./index.html");
        } catch (error) {
            setMessage(
                loginMessage,
                error.message || "Login failed. Please try again.",
                "error"
            );
        } finally {
            setBusy(button, false);
        }
    });

    /* ---------- Signup ---------- */

    const signupForm = $("signup-form");
    const signupMessage = $("signup-message");

    signupForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(signupForm, signupMessage)) return;

        const name = String($("signup-name")?.value || "").trim();
        const email = normalizeEmail($("signup-email")?.value);
        const whatsapp = String(
            $("signup-whatsapp")?.value || ""
        ).trim();
        const password = $("signup-password")?.value || "";
        const confirmPassword =
            $("signup-confirm-password")?.value || "";

        if (name.length < 2 || name.length > 80) {
            setMessage(
                signupMessage,
                "Please enter a valid name.",
                "error"
            );
            $("signup-name")?.focus();
            return;
        }

        const phoneDigits = normalizePhone(whatsapp);

        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            setMessage(
                signupMessage,
                "Enter a valid WhatsApp number with country code.",
                "error"
            );
            $("signup-whatsapp")?.focus();
            return;
        }

        if (password.length < 8 || password.length > 128) {
            setMessage(
                signupMessage,
                "Password must contain 8–128 characters.",
                "error"
            );
            $("signup-password")?.focus();
            return;
        }

        if (password !== confirmPassword) {
            setMessage(
                signupMessage,
                "The passwords do not match.",
                "error"
            );
            $("signup-confirm-password")?.focus();
            return;
        }

        const button = getSubmitButton(signupForm);
        setBusy(button, true);

        try {
            const data = await apiPost("/auth/signup", {
                name,
                email,
                whatsapp,
                password
            });

            saveSession(data);

            setMessage(
                signupMessage,
                "Account created successfully. Opening studyKora...",
                "success"
            );

            window.location.assign("./index.html");
        } catch (error) {
            setMessage(
                signupMessage,
                error.message || "Account creation failed.",
                "error"
            );
        } finally {
            setBusy(button, false);
        }
    });

    /* ---------- Forgot password ---------- */

    const forgotForm = $("forgot-form");
    const forgotMessage = $("forgot-message");
    const resetFields = $("forgot-reset-fields");
    const forgotWhatsapp = $("forgot-whatsapp");

    // Current Worker supports Firebase email-link recovery,
    // not WhatsApp OTP recovery.
    if (resetFields) resetFields.hidden = true;

    // WhatsApp is not used by the current email-recovery endpoint.
    if (forgotWhatsapp) {
        forgotWhatsapp.required = false;
        forgotWhatsapp.removeAttribute("required");
    }

    forgotForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = normalizeEmail($("forgot-email")?.value);

        if (!email || !$("forgot-email")?.checkValidity()) {
            setMessage(
                forgotMessage,
                "Enter a valid registered email address.",
                "error"
            );
            $("forgot-email")?.reportValidity();
            return;
        }

        const button = getSubmitButton(forgotForm);
        setBusy(button, true);

        try {
            const data = await apiPost("/auth/forgot-password", {
                email
            });

            setMessage(
                forgotMessage,
                data.message ||
                    "If the account exists, password-reset instructions will be sent.",
                "success"
            );
        } catch (error) {
            setMessage(
                forgotMessage,
                error.message || "Could not request a password reset.",
                "error"
            );
        } finally {
            setBusy(button, false);
        }
    });

    /* ---------- Normalize phone fields ---------- */

    ["signup-whatsapp", "forgot-whatsapp"].forEach((id) => {
        $(id)?.addEventListener("blur", (event) => {
            const input = event.currentTarget;
            const value = String(input.value || "").trim();

            if (!value) return;

            const digits = normalizePhone(value);
            input.value = value.startsWith("+")
                ? `+${digits}`
                : digits;
        });
    });

    /* ---------- Initial screen ---------- */

    showPanel(getModeFromUrl());
});
