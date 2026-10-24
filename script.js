/* ==========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   1. ELEMENTS AND STATE
========================================== */

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

let authMode = "login";
let lastFocusedElement = null;


/* ==========================================
   2. CREATE MODAL ELEMENTS

   Login and notice modals are generated here
   because the approved HTML contains no modal
   markup for them.
========================================== */

function createModalElements() {
    const modalContainer = document.createElement("div");

    modalContainer.innerHTML = `
        <div class="modal-overlay" id="auth-modal" hidden>
            <section
                class="modal-panel auth-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
            >
                <button
                    type="button"
                    class="modal-close"
                    data-action="close-auth"
                    aria-label="Close account panel"
                >&times;</button>

                <div class="modal-heading">
                    <span class="eyebrow">YOUR STUDYNOW ACCOUNT</span>
                    <h2 id="auth-title">Welcome back</h2>
                    <p id="auth-description">
                        Sign in to continue your preparation.
                    </p>
                </div>

                <form id="auth-form">
                    <div class="form-field" id="name-field" hidden>
                        <label for="auth-name">Full name</label>
                        <input
                            type="text"
                            id="auth-name"
                            name="name"
                            autocomplete="name"
                            placeholder="Enter your full name"
                        >
                    </div>

                    <div class="form-field">
                        <label for="auth-email">Email address</label>
                        <input
                            type="email"
                            id="auth-email"
                            name="email"
                            autocomplete="email"
                            placeholder="you@example.com"
                            required
                        >
                    </div>

                    <div class="form-field">
                        <label for="auth-password">Password</label>
                        <input
                            type="password"
                            id="auth-password"
                            name="password"
                            autocomplete="current-password"
                            placeholder="Enter your password"
                            minlength="6"
                            required
                        >
                    </div>

                    <button
                        type="button"
                        class="text-link forgot-password"
                        data-action="forgot-password"
                    >Forgot password?</button>

                    <p class="form-message" id="auth-message" role="status"></p>

                    <button
                        type="submit"
                        class="btn btn-primary btn-full"
                        id="auth-submit"
                    >Login</button>
                </form>

                <p class="auth-switch" id="auth-switch">
                    New to StudyNow?
                    <button
                        type="button"
                        class="text-link"
                        data-action="switch-signup"
                    >Create an account</button>
                </p>
            </section>
        </div>

        <div class="modal-overlay" id="notice-modal" hidden>
            <section
                class="modal-panel notice-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-title"
            >
                <button
                    type="button"
                    class="modal-close"
                    data-action="close-notice"
                    aria-label="Close message"
                >&times;</button>

                <span class="eyebrow">STUDYNOW</span>
                <h2 id="notice-title">Coming soon</h2>
                <p id="notice-message"></p>
            </section>
        </div>
    `;

    while (modalContainer.firstChild) {
        document.body.appendChild(modalContainer.firstChild);
    }
}

createModalElements();


/* ==========================================
   3. MODAL REFERENCES
========================================== */

const authModal = document.getElementById("auth-modal");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const authSwitch = document.getElementById("auth-switch");
const nameField = document.getElementById("name-field");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");

const forgotPasswordButton = document.querySelector(
    '[data-action="forgot-password"]'
);

const noticeModal = document.getElementById("notice-modal");
const noticeTitle = document.getElementById("notice-title");
const noticeMessage = document.getElementById("notice-message");


/* ==========================================
   4. NAVIGATION
========================================== */

function toggleNavigation() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
    );
}

function closeNavigation() {
    if (!menuToggle || !mainNav) return;

    mainNav.classList.remove("is-open");
    menuToggle.classList.remove("is-active");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

if (menuToggle) {
    menuToggle.addEventListener("click", toggleNavigation);
}

if (mainNav) {
    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNavigation);
    });
}


/* ==========================================
   5. MODAL AND PAGE SCROLL HELPERS
========================================== */

function getOpenModal() {
    return [authModal, noticeModal].find(
        (modal) => modal && !modal.hidden
    ) || null;
}

function updateBodyScroll() {
    document.body.classList.toggle(
        "modal-open",
        Boolean(getOpenModal())
    );
}

function rememberFocus() {
    lastFocusedElement = document.activeElement;
}

function restoreFocus() {
    if (
        lastFocusedElement &&
        lastFocusedElement.isConnected &&
        typeof lastFocusedElement.focus === "function"
    ) {
        lastFocusedElement.focus();
    }

    lastFocusedElement = null;
}

function closeAllModals() {
    [authModal, noticeModal].forEach((modal) => {
        if (modal) {
            modal.hidden = true;
        }
    });

    updateBodyScroll();
    restoreFocus();
}


/* ==========================================
   6. LOGIN AND SIGNUP
========================================== */

function openAuth(mode = "login") {
    rememberFocus();

    if (noticeModal) {
        noticeModal.hidden = true;
    }

    if (authForm) {
        authForm.reset();
    }

    setAuthMode(mode);

    if (authMessage) {
        authMessage.textContent = "";
    }

    authModal.hidden = false;
    updateBodyScroll();

    const firstInput = mode === "signup"
        ? authName
        : authEmail;

    window.setTimeout(() => {
        if (!authModal.hidden && firstInput) {
            firstInput.focus();
        }
    }, 30);
}

function closeAuth() {
    if (!authModal) return;

    authModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}

function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";

    if (authMode === "signup") {
        authTitle.textContent = "Create your account";

        authDescription.textContent =
            "Create a StudyNow account to continue your preparation.";

        authSubmit.textContent = "Create Account";

        nameField.hidden = false;
        authName.required = true;
        authPassword.autocomplete = "new-password";
        forgotPasswordButton.hidden = true;

        authSwitch.replaceChildren(
            document.createTextNode("Already have an account? ")
        );

        const loginButton = document.createElement("button");

        loginButton.type = "button";
        loginButton.className = "text-link";
        loginButton.dataset.action = "switch-login";
        loginButton.textContent = "Login";

        authSwitch.appendChild(loginButton);
    } else {
        authTitle.textContent = "Welcome back";

        authDescription.textContent =
            "Sign in to continue your preparation.";

        authSubmit.textContent = "Login";

        nameField.hidden = true;
        authName.required = false;
        authPassword.autocomplete = "current-password";
        forgotPasswordButton.hidden = false;

        authSwitch.replaceChildren(
            document.createTextNode("New to StudyNow? ")
        );

        const signupButton = document.createElement("button");

        signupButton.type = "button";
        signupButton.className = "text-link";
        signupButton.dataset.action = "switch-signup";
        signupButton.textContent = "Create an account";

        authSwitch.appendChild(signupButton);
    }

    authMessage.textContent = "";
}

authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    /*
       Firebase Authentication is not connected yet.
       Do not claim that login or signup succeeded.
    */

    authMessage.textContent = authMode === "signup"
        ? "Account creation will be enabled after Firebase Authentication is connected."
        : "Login will be enabled after Firebase Authentication is connected.";
});


/* ==========================================
   7. FORGOT PASSWORD
========================================== */

function handleForgotPassword() {
    const email = authEmail.value.trim();

    if (!email) {
        authMessage.textContent = "Enter your email address first.";
        authEmail.focus();
        return;
    }

    if (!authEmail.checkValidity()) {
        authMessage.textContent = "Enter a valid email address.";
        authEmail.focus();
        return;
    }

    authMessage.textContent =
        "Password recovery will be available after Firebase is connected.";
}


/* ==========================================
   8. PLACEHOLDER NOTICE MODAL
========================================== */

function openNotice(title, message) {
    rememberFocus();

    authModal.hidden = true;

    noticeTitle.textContent = title;
    noticeMessage.textContent = message;

    noticeModal.hidden = false;
    updateBodyScroll();

    const closeButton = noticeModal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) {
        closeButton.focus();
    }
}

function closeNotice() {
    noticeModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}


/* ==========================================
   9. CARD HANDLERS

   Dedicated pages and actual content will be
   connected in the next implementation phase.
========================================== */

function handleOrganizationCard(card) {
    const name = card
        .querySelector(".card-title")
        ?.textContent.trim();

    if (!name) return;

    openNotice(
        name,
        "The organization details page will be connected when its dedicated page is created."
    );
}

function handlePracticeCard(card) {
    const name = card
        .querySelector(".card-title")
        ?.textContent.trim();

    if (!name) return;

    openNotice(
        name,
        "This exam or subject page will be connected when its dedicated content and access rules are finalized."
    );
}

function handleCurrentAffairsCard(card) {
    const categoryId = card.dataset.currentAffairs;

    if (!categoryId) return;

    window.location.href =
        `current-affairs.html?category=${encodeURIComponent(categoryId)}`;
}


/* ==========================================
   10. CENTRAL CLICK HANDLER
========================================== */

document.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");

    if (actionElement) {
        const action = actionElement.dataset.action;

        switch (action) {
            case "login":
                openAuth("login");
                return;

            case "signup":
                openAuth("signup");
                return;

            case "switch-signup":
                setAuthMode("signup");
                return;

            case "switch-login":
                setAuthMode("login");
                return;

            case "close-auth":
                closeAuth();
                return;

            case "forgot-password":
                handleForgotPassword();
                return;

            case "close-notice":
                closeNotice();
                return;

            default:
                break;
        }
    }

    const organizationCard = event.target.closest("[data-org]");

    if (organizationCard) {
        handleOrganizationCard(organizationCard);
        return;
    }

    const testCard = event.target.closest("[data-test]");

    if (testCard) {
        handlePracticeCard(testCard);
        return;
    }

const subjectCard = event.target.closest("[data-subject]");

if (subjectCard) {
    const subjectId = subjectCard.dataset.subject;

    if (subjectId) {
        window.location.href =
            `subject.html?subject=${encodeURIComponent(subjectId)}`;
    }

    return;
}

    const affairsCard = event.target.closest("[data-current-affairs]");

    if (affairsCard) {
        handleCurrentAffairsCard(affairsCard);
    }
});


/* ==========================================
   11. MODAL CLOSING RULES

   Modals close only through their X buttons.
   Backdrop clicks and Escape do not close them.
========================================== */

[authModal, noticeModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            event.preventDefault();
        }
    });
});


/* ==========================================
   12. INITIALIZE
========================================== */

function initializeStudyNow() {
    closeNavigation();

    [authModal, noticeModal].forEach((modal) => {
        modal.hidden = true;
    });

    updateBodyScroll();
}

initializeStudyNow();
