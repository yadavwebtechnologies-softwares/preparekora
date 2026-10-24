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

const AUTO_MOCK_KEY = "studynow-free-mock-shown";

let currentQuestionIndex = 0;
let selectedAnswers = [];
let activeMockTitle = "StudyNow Free Mock Test";
let authMode = "login";
let autoMockTimer = null;
let lastFocusedElement = null;


/* ==========================================
   2. SAMPLE MOCK TEST QUESTIONS

   Frontend preview only.
   Real exam question banks will be added later.
========================================== */

const sampleQuestions = [
    {
        question: "What is the capital of Assam?",
        options: ["Guwahati", "Dispur", "Jorhat", "Silchar"],
        answer: 1,
        explanation:
            "Dispur is the capital of Assam and is located within Guwahati."
    },
    {
        question: "Which country shares an international border with Assam?",
        options: ["Sri Lanka", "Maldives", "Bangladesh", "Indonesia"],
        answer: 2,
        explanation:
            "Assam shares international borders with Bangladesh and Bhutan."
    },
    {
        question: "What is 25% of 200?",
        options: ["25", "40", "50", "75"],
        answer: 2,
        explanation:
            "25% of 200 = (25 / 100) × 200 = 50."
    },
    {
        question: "Find the next number: 2, 4, 8, 16, __",
        options: ["20", "24", "30", "32"],
        answer: 3,
        explanation:
            "Each number is multiplied by 2. Therefore, 16 × 2 = 32."
    },
    {
        question: "Which of these is an input device?",
        options: ["Monitor", "Printer", "Keyboard", "Speaker"],
        answer: 2,
        explanation:
            "A keyboard is an input device used to enter text, numbers and commands."
    }
];


/* ==========================================
   3. CREATE MODAL ELEMENTS

   Modal markup is generated here because
   the approved HTML contains no modal markup.
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

        <div class="modal-overlay" id="mock-modal" hidden>
            <section
                class="modal-panel mock-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mock-title"
            >
                <button
                    type="button"
                    class="modal-close"
                    data-action="close-mock"
                    aria-label="Close mock test"
                >&times;</button>

                <div class="mock-header">
                    <div>
                        <span class="eyebrow">FREE PRACTICE SESSION</span>
                        <h2 id="mock-title">StudyNow Free Mock Test</h2>
                    </div>

                    <span class="mock-counter" id="mock-counter">
                        Question 1 of 5
                    </span>
                </div>

                <div class="mock-progress-track">
                    <div
                        class="mock-progress-value"
                        id="mock-progress-value"
                    ></div>
                </div>

                <div
                    class="mock-question-area"
                    id="mock-question-area"
                ></div>

                <div
                    class="mock-navigation"
                    id="mock-navigation"
                >
                    <button
                        type="button"
                        class="btn btn-outline"
                        data-action="mock-prev"
                    >Previous</button>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="mock-next"
                    >Next</button>
                </div>

                <div class="mock-result" id="mock-result" hidden>
                    <span class="eyebrow">TEST COMPLETED</span>
                    <h2>Your Result</h2>

                    <p class="mock-score" id="mock-score"></p>

                    <div class="mock-review" id="mock-review"></div>

                    <div class="mock-result-actions">
                        <button
                            type="button"
                            class="btn btn-outline"
                            data-action="retry-mock"
                        >Try Again</button>

                        <button
                            type="button"
                            class="btn btn-primary"
                            data-action="signup"
                        >Create Account</button>
                    </div>
                </div>
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
   4. MODAL REFERENCES
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

const mockModal = document.getElementById("mock-modal");
const mockTitle = document.getElementById("mock-title");
const mockCounter = document.getElementById("mock-counter");
const mockProgress = document.getElementById("mock-progress-value");
const mockQuestionArea = document.getElementById("mock-question-area");
const mockNavigation = document.getElementById("mock-navigation");
const mockPreviousButton = document.querySelector(
    '[data-action="mock-prev"]'
);
const mockNextButton = document.querySelector(
    '[data-action="mock-next"]'
);
const mockResult = document.getElementById("mock-result");
const mockScore = document.getElementById("mock-score");
const mockReview = document.getElementById("mock-review");

const noticeModal = document.getElementById("notice-modal");
const noticeTitle = document.getElementById("notice-title");
const noticeMessage = document.getElementById("notice-message");


/* ==========================================
   5. NAVIGATION
========================================== */

function toggleNavigation() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
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
   6. MODAL AND PAGE SCROLL HELPERS
========================================== */

function getOpenModal() {
    return [authModal, mockModal, noticeModal].find(
        (modal) => modal && !modal.hidden
    ) || null;
}

function updateBodyScroll() {
    document.body.classList.toggle(
        "modal-open",
        Boolean(getOpenModal())
    );
}

function stopAutoMockTimer() {
    if (autoMockTimer !== null) {
        window.clearTimeout(autoMockTimer);
        autoMockTimer = null;
    }
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
    [authModal, mockModal, noticeModal].forEach((modal) => {
        if (modal) modal.hidden = true;
    });

    updateBodyScroll();
    restoreFocus();
}


/* ==========================================
   7. LOGIN AND SIGNUP
========================================== */

function openAuth(mode = "login") {
    stopAutoMockTimer();
    markAutoMockShown();
    rememberFocus();

    [mockModal, noticeModal].forEach((modal) => {
        if (modal) modal.hidden = true;
    });

    if (authForm) authForm.reset();

    setAuthMode(mode);

    if (authMessage) {
        authMessage.textContent = "";
    }

    authModal.hidden = false;
    updateBodyScroll();

    const firstInput = mode === "signup" ? authName : authEmail;

    window.setTimeout(() => {
        if (!authModal.hidden && firstInput) firstInput.focus();
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
       The UI must not claim login/signup has succeeded.
    */

    authMessage.textContent = authMode === "signup"
        ? "Account creation will be enabled after Firebase Authentication is connected."
        : "Login will be enabled after Firebase Authentication is connected.";
});

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
   8. MOCK TEST — OPEN AND CLOSE
========================================== */

function openMockTest(title = "StudyNow Free Mock Test") {
    stopAutoMockTimer();
    markAutoMockShown();
    rememberFocus();

    authModal.hidden = true;
    noticeModal.hidden = true;

    activeMockTitle = title;
    mockTitle.textContent = title;

    resetMockTest();

    mockModal.hidden = false;
    updateBodyScroll();

    const closeButton = mockModal.querySelector(
        '[data-action="close-mock"]'
    );

    if (closeButton) closeButton.focus();
}

function closeMockTest() {
    mockModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}

function resetMockTest() {
    currentQuestionIndex = 0;
    selectedAnswers = new Array(sampleQuestions.length).fill(null);

    mockQuestionArea.hidden = false;
    mockNavigation.hidden = false;
    mockResult.hidden = true;
    mockReview.replaceChildren();

    renderQuestion();
}


/* ==========================================
   9. RENDER QUESTION
========================================== */

function renderQuestion() {
    const question = sampleQuestions[currentQuestionIndex];

    mockQuestionArea.replaceChildren();

    mockCounter.textContent =
        `Question ${currentQuestionIndex + 1} of ${sampleQuestions.length}`;

    const progress = (
        (currentQuestionIndex + 1) / sampleQuestions.length
    ) * 100;

    mockProgress.style.width = `${progress}%`;

    const numberLabel = document.createElement("div");
    numberLabel.className = "question-number";
    numberLabel.textContent = `QUESTION ${currentQuestionIndex + 1}`;

    const questionText = document.createElement("h3");
    questionText.className = "question-text";
    questionText.textContent = question.question;

    const options = document.createElement("div");
    options.className = "question-options";

    question.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "question-option";

        const selected = selectedAnswers[currentQuestionIndex] === index;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));

        const marker = document.createElement("span");
        marker.className = "option-marker";
        marker.textContent = String.fromCharCode(65 + index);

        const optionLabel = document.createElement("span");
        optionLabel.textContent = option;

        button.append(marker, optionLabel);

        button.addEventListener("click", () => {
            selectedAnswers[currentQuestionIndex] = index;
            renderQuestion();
        });

        options.appendChild(button);
    });

    mockQuestionArea.append(numberLabel, questionText, options);

    mockPreviousButton.disabled = currentQuestionIndex === 0;

    mockNextButton.textContent =
        currentQuestionIndex === sampleQuestions.length - 1
            ? "Submit Test"
            : "Next";
}

function previousQuestion() {
    if (currentQuestionIndex <= 0) return;

    currentQuestionIndex--;
    renderQuestion();
}

function nextQuestion() {
    if (currentQuestionIndex < sampleQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        submitMockTest();
    }
}


/* ==========================================
   10. SUBMIT TEST AND SHOW RESULT
========================================== */

function submitMockTest() {
    const unanswered = selectedAnswers.filter(
        (answer) => answer === null
    ).length;

    const confirmation = unanswered > 0
        ? `${unanswered} question(s) are unanswered. Submit anyway?`
        : "Are you sure you want to submit your test?";

    if (!window.confirm(confirmation)) return;

    showMockResult();
}

function showMockResult() {
    const correctCount = sampleQuestions.reduce(
        (total, question, index) => {
            return total + (
                selectedAnswers[index] === question.answer ? 1 : 0
            );
        },
        0
    );

    const percentage = Math.round(
        (correctCount / sampleQuestions.length) * 100
    );

    mockCounter.textContent = "Test completed";
    mockProgress.style.width = "100%";
    mockQuestionArea.hidden = true;
    mockNavigation.hidden = true;

    mockScore.textContent =
        `${correctCount} / ${sampleQuestions.length} correct · ${percentage}%`;

    renderAnswerReview();
    mockResult.hidden = false;
}

function renderAnswerReview() {
    mockReview.replaceChildren();

    sampleQuestions.forEach((question, index) => {
        const selected = selectedAnswers[index];
        const correct = selected === question.answer;

        const review = document.createElement("article");
        review.className = "review-item";

        const status = document.createElement("span");
        status.className = `review-status ${
            correct ? "correct" : "incorrect"
        }`;

        status.textContent = correct
            ? "Correct"
            : selected === null
                ? "Not answered"
                : "Incorrect";

        const heading = document.createElement("h3");
        heading.textContent = `Q${index + 1}. ${question.question}`;

        const userAnswer = document.createElement("p");
        userAnswer.textContent = selected === null
            ? "Your answer: Not answered"
            : `Your answer: ${question.options[selected]}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${question.options[question.answer]}`;

        const explanation = document.createElement("p");
        explanation.textContent = `Explanation: ${question.explanation}`;

        review.append(
            status,
            heading,
            userAnswer,
            correctAnswer,
            explanation
        );

        mockReview.appendChild(review);
    });
}


/* ==========================================
   11. PLACEHOLDER NOTICE MODAL
========================================== */

function openNotice(title, message) {
    stopAutoMockTimer();
    markAutoMockAsShown();
    rememberFocus();

    authModal.hidden = true;
    mockModal.hidden = true;

    noticeTitle.textContent = title;
    noticeMessage.textContent = message;

    noticeModal.hidden = false;
    updateBodyScroll();

    const closeButton = noticeModal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) closeButton.focus();
}

function closeNotice() {
    noticeModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}


/* ==========================================
   12. CARD HANDLERS

   Dedicated pages and actual content will be
   connected in the next implementation phase.
========================================== */

function handleOrganizationCard(card) {
    const name = card.querySelector(".card-title")?.textContent.trim();

    if (!name) return;

    openNotice(
        name,
        "The organization details page will be connected when its dedicated page is created."
    );
}

function handlePracticeCard(card) {
    const name = card.querySelector(".card-title")?.textContent.trim();

    if (!name) return;

    openNotice(
        name,
        "This exam or subject page will be connected when its dedicated content and access rules are finalized."
    );
}

function handleCurrentAffairsCard(card) {
    const name = card.querySelector(".card-title")?.textContent.trim();

    if (!name) return;

    openNotice(
        name,
        "Current affairs content will be added after the section structure and content source are finalized."
    );
}


/* ==========================================
   13. AUTOMATIC MOCK POPUP

   Shows once per session, after 5 seconds.
========================================== */

function hasAutoMockBeenShown() {
    try {
        return sessionStorage.getItem(AUTO_MOCK_KEY) === "true";
    } catch {
        return false;
    }
}

function markAutoMockShown() {
    try {
        sessionStorage.setItem(AUTO_MOCK_KEY, "true");
    } catch {
        // Continue without session storage when unavailable.
    }
}

function scheduleAutoMock() {
    if (hasAutoMockBeenShown()) return;

    autoMockTimer = window.setTimeout(() => {
        autoMockTimer = null;

        // Avoid interrupting a modal already opened by the user.
        if (getOpenModal()) return;

        openMockTest("StudyNow Free Mock Test");
    }, 5000);
}


/* ==========================================
   14. CENTRAL CLICK HANDLER
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

            case "start-free-mock":
                openMockTest("StudyNow Free Mock Test");
                return;

            case "close-mock":
                closeMockTest();
                return;

            case "mock-prev":
                previousQuestion();
                return;

            case "mock-next":
                nextQuestion();
                return;

            case "retry-mock":
                resetMockTest();
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
        handlePracticeCard(subjectCard);
        return;
    }

    const affairsCard = event.target.closest("[data-current-affairs]");

    if (affairsCard) {
        handleCurrentAffairsCard(affairsCard);
    }
});


/* ==========================================
   15. MODAL CLOSING RULES

   Modals close only through their X buttons.
   Backdrop clicks and Escape do not close them.
========================================== */

[authModal, mockModal, noticeModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            event.preventDefault();
        }
    });
});


/* ==========================================
   16. INITIALIZE
========================================== */

function initializeStudyNow() {
    closeNavigation();

    [authModal, mockModal, noticeModal].forEach((modal) => {
        modal.hidden = true;
    });

    updateBodyScroll();
    scheduleAutoMock();
}

initializeStudyNow();
