"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const validModes = ["login", "signup", "forgot"];
    const panels = document.querySelectorAll("[data-auth-panel]");
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    const activeMode = validModes.includes(requestedMode) ? requestedMode : "login";

    // Show the requested authentication screen.
    panels.forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== activeMode;
    });

    // Keep the selected mode in the URL when the user switches screens.
    document.querySelectorAll('a[href*="auth.html?mode="]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetUrl = new URL(link.href, window.location.href);

            if (targetUrl.origin === window.location.origin) {
                event.preventDefault();
                window.location.href = targetUrl.pathname + targetUrl.search;
            }
        });
    });

    // Show or hide password fields.
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const inputId = button.dataset.togglePassword;
            const passwordInput = document.getElementById(inputId);

            if (!passwordInput) return;

            const shouldShow = passwordInput.type === "password";
            passwordInput.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";
            button.setAttribute("aria-pressed", String(shouldShow));
            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );
        });
    });

    // Login: static preview until Firebase Authentication is connected.
    const loginForm = document.getElementById("login-form");
    const loginMessage = document.getElementById("login-message");

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        loginMessage.textContent =
            "Login will be available after authentication is connected.";
    });

    // Signup: validate matching passwords, but do not create a real account yet.
    const signupForm = document.getElementById("signup-form");
    const signupPassword = document.getElementById("signup-password");
    const signupConfirmPassword = document.getElementById("signup-confirm-password");
    const signupMessage = document.getElementById("signup-message");

    signupForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (signupPassword.value !== signupConfirmPassword.value) {
            signupMessage.textContent = "Passwords do not match.";
            signupConfirmPassword.focus();
            return;
        }

        signupMessage.textContent =
            "Account creation will be available after authentication is connected.";
    });

    // Password reset: static preview until Firebase is connected.
    const forgotForm = document.getElementById("forgot-form");
    const forgotMessage = document.getElementById("forgot-message");

    forgotForm.addEventListener("submit", (event) => {
        event.preventDefault();

        forgotMessage.textContent =
            "Password recovery will be available after authentication is connected.";
    });
});
