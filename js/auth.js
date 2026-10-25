/* ==========================================
   StudyNow — Authentication UI Controller
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
       1. SELECT AUTHENTICATION MODE
    ========================================== */

    const validModes = ["login", "signup", "forgot"];
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode") || "login";

    const activeMode = validModes.includes(requestedMode)
        ? requestedMode
        : "login";

    document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== activeMode;
    });


    /* ==========================================
       2. VALIDATE WHATSAPP NUMBER FORMAT

       This checks only the format.
       It does not verify account ownership.
    ========================================== */

    function isValidWhatsAppNumber(value) {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
    }


    /* ==========================================
       3. PASSWORD VISIBILITY
    ========================================== */

    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(
                button.dataset.togglePassword
            );

            if (!input) return;

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


    /* ==========================================
       4. LOGIN

       Connect Firebase Authentication here later.
    ========================================== */

    const loginForm = document.getElementById("login-form");
    const loginMessage = document.getElementById("login-message");

    if (loginForm && loginMessage) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            loginMessage.textContent =
                "Login is not active yet. Firebase Authentication must be connected.";
        });
    }


    /* ==========================================
       5. SIGNUP

       Required fields:
       Name, email, WhatsApp, password,
       confirm password.
    ========================================== */

    const signupForm = document.getElementById("signup-form");
    const signupName = document.getElementById("signup-name");
    const signupEmail = document.getElementById("signup-email");
    const signupWhatsApp = document.getElementById("signup-whatsapp");
    const signupPassword = document.getElementById("signup-password");
    const signupConfirmPassword = document.getElementById(
        "signup-confirm-password"
    );
    const signupMessage = document.getElementById("signup-message");

    if (signupForm && signupMessage) {
        signupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            signupMessage.textContent = "";

            if (!isValidWhatsAppNumber(signupWhatsApp.value.trim())) {
                signupMessage.textContent =
                    "Enter a valid WhatsApp number with its country code.";
                signupWhatsApp.focus();
                return;
            }

            if (signupPassword.value !== signupConfirmPassword.value) {
                signupMessage.textContent = "Passwords do not match.";
                signupConfirmPassword.focus();
                return;
            }

            /*
             * Later integration:
             * 1. Create the Firebase Auth account.
             * 2. Verify the WhatsApp number using an OTP service.
             * 3. Store the verified WhatsApp number with the user's
             *    profile in Firebase Realtime Database.
             *
             * Do not store passwords in Realtime Database.
             */

            signupMessage.textContent =
                "Form validation passed. Account creation and WhatsApp verification require backend integration.";
        });
    }


    /* ==========================================
       6. FORGOT PASSWORD — ACCOUNT DETAILS

       Email + WhatsApp number are required.
       Client-side code must not decide whether
       the pair matches a registered account.
    ========================================== */

    const forgotForm = document.getElementById("forgot-form");
    const forgotEmail = document.getElementById("forgot-email");
    const forgotWhatsApp = document.getElementById("forgot-whatsapp");
    const forgotMessage = document.getElementById("forgot-message");

    const verificationFields = document.getElementById(
        "forgot-verification-fields"
    );

    if (forgotForm && forgotMessage) {
        forgotForm.addEventListener("submit", (event) => {
            event.preventDefault();
            forgotMessage.textContent = "";

            if (!forgotEmail.checkValidity()) {
                forgotMessage.textContent =
                    "Enter a valid registered email address.";
                forgotEmail.focus();
                return;
            }

            if (!isValidWhatsAppNumber(forgotWhatsApp.value.trim())) {
                forgotMessage.textContent =
                    "Enter a valid WhatsApp number with its country code.";
                forgotWhatsApp.focus();
                return;
            }

            /*
             * Backend flow to implement:
             * 1. Match email + WhatsApp number against the account.
             * 2. If the pair matches, initiate WhatsApp OTP delivery.
             * 3. Verify the OTP on the server.
             * 4. Permit password reset only after OTP verification.
             *
             * Never trust a browser-only match or a client-set flag.
             */

            if (verificationFields) {
                verificationFields.hidden = true;
            }

            forgotMessage.textContent =
                "Secure account verification is not connected yet. Password reset will be enabled after email/WhatsApp matching and WhatsApp OTP verification are implemented.";
        });
    }


    /* ==========================================
       7. COMPLETE PASSWORD RESET

       This handler deliberately does not reset
       a password in the static frontend.
    ========================================== */

    const completeResetButton = document.getElementById(
        "complete-password-reset"
    );

    const forgotOtp = document.getElementById("forgot-otp");
    const resetPassword = document.getElementById("reset-password");
    const resetConfirmPassword = document.getElementById(
        "reset-confirm-password"
    );

    if (completeResetButton && forgotMessage) {
        completeResetButton.addEventListener("click", () => {
            if (!forgotOtp.value.trim()) {
                forgotMessage.textContent =
                    "Enter the WhatsApp verification code.";
                forgotOtp.focus();
                return;
            }

            if (resetPassword.value.length < 8) {
                forgotMessage.textContent =
                    "Your new password must contain at least 8 characters.";
                resetPassword.focus();
                return;
            }

            if (resetPassword.value !== resetConfirmPassword.value) {
                forgotMessage.textContent =
                    "The new passwords do not match.";
                resetConfirmPassword.focus();
                return;
            }

            forgotMessage.textContent =
                "Password reset is not active yet. The OTP must be verified by the backend before the password can be changed.";
        });
    }
});
