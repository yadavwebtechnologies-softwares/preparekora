
/* =====================================================
   studyKora — Authentication Page
   Login, signup, recovery UI and frontend validation
   Firebase/backend authentication is not connected yet
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const panels = Array.from(
        document.querySelectorAll("[data-auth-panel]")
    );

    const validModes = new Set(["login", "signup", "forgot"]);

    /* 1. URL-based authentication panels */

    function getModeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const mode = (params.get("mode") || "login").toLowerCase();

        return validModes.has(mode) ? mode : "login";
    }

    function updateUrl(mode) {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", mode);

        window.history.pushState({ mode }, "", url);
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

    function showPanel(mode, changeUrl = false) {
        const safeMode = validModes.has(mode) ? mode : "login";

        panels.forEach((panel) => {
            panel.hidden = panel.dataset.authPanel !== safeMode;
        });

        const titles = {
            login: "Login | studyKora",
            signup: "Create Account | studyKora",
            forgot: "Recover Account | studyKora"
        };

        document.title = titles[safeMode];

        clearMessages();

        if (changeUrl) {
            updateUrl(safeMode);
        }

        const activePanel = document.querySelector(
            `[data-auth-panel="${safeMode}"]`
        );

        const firstInput = activePanel?.querySelector("input");

        if (firstInput) {
            firstInput.focus({ preventScroll: true });
        }
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

    /* 2. Form messages and validation */

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

    function validateForm(form, messageElement) {
        if (!form) return false;

        if (!form.checkValidity()) {
            form.reportValidity();

            setMessage(
                messageElement,
                "Please complete all required fields with valid information.",
                "error"
            );

            return false;
        }

        return true;
    }

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizePhone(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function isValidPhone(value) {
        const digits = normalizePhone(value);
        return digits.length >= 10 && digits.length <= 15;
    }

    /* 3. Password visibility */

    /*
       Shared script.js initializes the password toggles first.
       This fallback initializes them only if they are not ready.
    */

    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        if (button.dataset.passwordToggleReady === "true") return;

        const input = $(button.dataset.togglePassword);

        if (!input) return;

        button.dataset.passwordToggleReady = "true";

        button.addEventListener("click", () => {
            const shouldShow = input.type === "password";

            input.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";

            button.setAttribute("aria-pressed", String(shouldShow));
            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );
        });
    });

    /* 4. Login form */

    const loginForm = $("login-form");
    const loginMessage = $("login-message");

    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!validateForm(loginForm, loginMessage)) return;

        const email = normalizeEmail($("login-email")?.value);
        const password = $("login-password")?.value || "";

        if (!email || !password) {
            setMessage(
                loginMessage,
                "Enter your email address and password.",
                "error"
            );

            return;
        }

        setMessage(
            loginMessage,
            "Frontend validation passed. Sign-in is not connected yet; Firebase Authentication must be integrated.",
            "error"
        );
    });

    /* 5. Signup form */

    const signupForm = $("signup-form");
    const signupMessage = $("signup-message");

    signupForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!validateForm(signupForm, signupMessage)) return;

        const name = String($("signup-name")?.value || "").trim();
        const email = normalizeEmail($("signup-email")?.value);
        const whatsapp = String($("signup-whatsapp")?.value || "").trim();
        const password = $("signup-password")?.value || "";
        const confirmPassword =
            $("signup-confirm-password")?.value || "";

        if (name.length < 2) {
            setMessage(
                signupMessage,
                "Please enter your full name.",
                "error"
            );

            $("signup-name")?.focus();
            return;
        }

        if (!email) {
            setMessage(
                signupMessage,
                "Enter a valid email address.",
                "error"
            );

            $("signup-email")?.focus();
            return;
        }

        if (!isValidPhone(whatsapp)) {
            setMessage(
                signupMessage,
                "Enter a valid WhatsApp number, including your country code.",
                "error"
            );

            $("signup-whatsapp")?.focus();
            return;
        }

        if (password.length < 8) {
            setMessage(
                signupMessage,
                "Your password must contain at least 8 characters.",
                "error"
            );

            $("signup-password")?.focus();
            return;
        }

        if (password !== confirmPassword) {
            setMessage(
                signupMessage,
                "The passwords do not match. Please check both fields.",
                "error"
            );

            $("signup-confirm-password")?.focus();
            return;
        }

        setMessage(
            signupMessage,
            "Your details passed frontend checks. Account creation requires Firebase Authentication and secure WhatsApp-number storage.",
            "error"
        );
    });

    /* 6. Forgot-password form */

    const forgotForm = $("forgot-form");
    const forgotMessage = $("forgot-message");
    const resetFields = $("forgot-reset-fields");

    /*
       Reset fields stay hidden until a trusted verification
       flow is integrated. Browser-side checks cannot verify
       whether email and WhatsApp belong to the same account.
    */

    if (resetFields) {
        resetFields.hidden = true;
    }

    forgotForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!validateForm(forgotForm, forgotMessage)) return;

        const email = normalizeEmail($("forgot-email")?.value);
        const whatsapp = String($("forgot-whatsapp")?.value || "").trim();

        if (!email) {
            setMessage(
                forgotMessage,
                "Enter your registered email address.",
                "error"
            );

            $("forgot-email")?.focus();
            return;
        }

        if (!isValidPhone(whatsapp)) {
            setMessage(
                forgotMessage,
                "Enter a valid WhatsApp number, including your country code.",
                "error"
            );

            $("forgot-whatsapp")?.focus();
            return;
        }

        setMessage(
            forgotMessage,
            "The recovery form is ready. Account verification is not connected yet. A trusted backend must verify the registered details and issue a verification code.",
            "error"
        );
    });

    /* 7. Password reset button */

    const resetButton = $("forgot-reset-submit");

    resetButton?.addEventListener("click", () => {
        const otp = String($("forgot-otp")?.value || "").trim();
        const password = $("forgot-new-password")?.value || "";
        const confirmPassword =
            $("forgot-confirm-password")?.value || "";

        if (!otp || !password || !confirmPassword) {
            setMessage(
                forgotMessage,
                "Enter the verification code and both new-password fields after account verification is enabled.",
                "error"
            );

            return;
        }

        if (password.length < 8) {
            setMessage(
                forgotMessage,
                "The new password must contain at least 8 characters.",
                "error"
            );

            $("forgot-new-password")?.focus();
            return;
        }

        if (password !== confirmPassword) {
            setMessage(
                forgotMessage,
                "The new passwords do not match.",
                "error"
            );

            $("forgot-confirm-password")?.focus();
            return;
        }

        setMessage(
            forgotMessage,
            "Password reset is not connected yet. The verification code must be validated by the backend before a password can be changed.",
            "error"
        );
    });

    /* 8. Normalize phone formatting on blur */

    ["signup-whatsapp", "forgot-whatsapp"].forEach((id) => {
        const input = $(id);

        input?.addEventListener("blur", () => {
            const value = String(input.value || "").trim();

            if (!value) return;

            const digits = normalizePhone(value);

            input.value = value.startsWith("+")
                ? `+${digits}`
                : digits;
        });
    });

    /* 9. Initial panel */

    showPanel(
        new URLSearchParams(window.location.search).get("mode") || "login"
    );
});
