/* ==========================================
   StudyNow — Authentication Page
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   1. ELEMENTS AND STATE
========================================== */

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");

const nameField = document.getElementById("name-field");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");

const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");

const loginOptions = document.getElementById("login-options");
const forgotPasswordButton = document.getElementById("forgot-password");

const authSwitchText = document.getElementById("auth-switch-text");
const authSwitchButton = document.getElementById("auth-switch-button");

let authMode = "login";


/* ==========================================
   2. MESSAGE HANDLER
========================================== */

function showMessage(message, type = "info") {
    authMessage.textContent = message;
    authMessage.dataset.type = type;
}


/* ==========================================
   3. UPDATE URL
========================================== */

function updatePageMode(mode) {
    const url = new URL(window.location.href);

    if (mode === "signup") {
        url.searchParams.set("mode", "signup");
    } else {
        url.searchParams.delete("mode");
    }

    window.history.replaceState({}, "", url);
}


/* ==========================================
   4. LOGIN / SIGNUP MODE
========================================== */

function setAuthMode(mode, updateUrl = true) {
    authMode = mode === "signup" ? "signup" : "login";

    authForm.reset();
    showMessage("");

    const isSignup = authMode === "signup";

    authTitle.textContent = isSignup
        ? "Create your account"
        : "Welcome back";

    authDescription.textContent = isSignup
        ? "Create a StudyNow account to continue your exam preparation."
        : "Sign in to continue your exam preparation.";

    authSubmit.textContent = isSignup
        ? "Create Account"
        : "Login";

    nameField.hidden = !isSignup;
    authName.required = isSignup;

    authPassword.autocomplete = isSignup
        ? "new-password"
        : "current-password";

    loginOptions.hidden = isSignup;

    authSwitchText.textContent = isSignup
        ? "Already have an account?"
        : "New to StudyNow?";

    authSwitchButton.textContent = isSignup
        ? "Login"
        : "Create an account";

    document.title = isSignup
        ? "Create Account — StudyNow"
        : "Login — StudyNow";

    if (updateUrl) {
        updatePageMode(authMode);
    }
}


/* ==========================================
   5. SWITCH BETWEEN MODES
========================================== */

authSwitchButton.addEventListener("click", () => {
    setAuthMode(
        authMode === "login" ? "signup" : "login"
    );

    const firstInput = authMode === "signup"
        ? authName
        : authEmail;

    firstInput.focus();
});


/* ==========================================
   6. FORGOT PASSWORD
========================================== */

forgotPasswordButton.addEventListener("click", () => {
    const email = authEmail.value.trim();

    if (!email) {
        showMessage(
            "Enter your email address first.",
            "error"
        );

        authEmail.focus();
        return;
    }

    if (!authEmail.checkValidity()) {
        showMessage(
            "Enter a valid email address.",
            "error"
        );

        authEmail.focus();
        return;
    }

    showMessage(
        "Password recovery will be available after Firebase Authentication is connected.",
        "info"
    );
});


/* ==========================================
   7. FORM SUBMISSION
========================================== */

authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage("");

    const name = authName.value.trim();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (authMode === "signup" && !name) {
        showMessage(
            "Enter your full name.",
            "error"
        );

        authName.focus();
        return;
    }

    if (!email || !authEmail.checkValidity()) {
        showMessage(
            "Enter a valid email address.",
            "error"
        );

        authEmail.focus();
        return;
    }

    if (password.length < 6) {
        showMessage(
            "Password must contain at least 6 characters.",
            "error"
        );

        authPassword.focus();
        return;
    }

    /*
       Firebase Authentication is not connected yet.
       No account is created and no login is performed.
    */

    showMessage(
        authMode === "signup"
            ? "Account creation is not active yet. Firebase Authentication needs to be connected first."
            : "Login is not active yet. Firebase Authentication needs to be connected first.",
        "info"
    );
});


/* ==========================================
   8. INITIALIZE FROM URL
========================================== */

function initializeAuthPage() {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");

    setAuthMode(
        requestedMode === "signup" ? "signup" : "login",
        false
    );
}

initializeAuthPage();
