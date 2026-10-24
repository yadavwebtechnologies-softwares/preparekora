/* ==========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   1. ELEMENTS
========================================== */

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

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

const mockModal = document.getElementById("mock-modal");
const mockTitle = document.getElementById("mock-title");
const mockCounter = document.getElementById("mock-counter");
const mockProgress = document.getElementById("mock-progress-value");
const mockQuestionArea = document.getElementById("mock-question-area");
const mockNavigation = document.getElementById("mock-navigation");
const mockPreviousButton = document.querySelector('[data-action="mock-prev"]');
const mockNextButton = document.querySelector('[data-action="mock-next"]');
const mockResult = document.getElementById("mock-result");
const mockScore = document.getElementById("mock-score");
const mockReview = document.getElementById("mock-review");

const AUTO_MOCK_KEY = "studynow-free-mock-shown";


/* ==========================================
   2. SAMPLE QUESTIONS
========================================== */

const questions = [
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
   3. APPLICATION STATE
========================================== */

let currentQuestionIndex = 0;
let selectedAnswers = new Array(questions.length).fill(null);
let authMode = "login";
let autoMockTimer = null;
let lastFocusedElement = null;


/* ==========================================
   4. SESSION STORAGE
========================================== */

function hasAutoMockBeenShown() {
    try {
        return sessionStorage.getItem(AUTO_MOCK_KEY) === "true";
    } catch {
        return false;
    }
}

function markAutoMockAsShown() {
    try {
        sessionStorage.setItem(AUTO_MOCK_KEY, "true");
    } catch {
        // The website remains functional without session storage.
    }
}


/* ==========================================
   5. BODY SCROLL
========================================== */

function updateBodyScroll() {
    const authIsOpen = authModal && !authModal.hidden;
    const mockIsOpen = mockModal && !mockModal.hidden;

    document.body.classList.toggle(
        "modal-open",
        Boolean(authIsOpen || mockIsOpen)
    );
}


/* ==========================================
   6. MOBILE NAVIGATION
========================================== */

function toggleNavigation() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function closeNavigation() {
    if (!menuToggle || !mainNav) return;

    mainNav.classList.remove("is-open");
    menuToggle.classList.remove("is-active");
    menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle) {
    menuToggle.addEventListener("click", toggleNavigation);
}

if (mainNav) {
    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNavigation);
    });
}

document.addEventListener("click", (event) => {
    if (
        mainNav &&
        mainNav.classList.contains("is-open") &&
        !event.target.closest(".header-inner")
    ) {
        closeNavigation();
    }
});


/* ==========================================
   7. AUTHENTICATION MODAL
========================================== */

function openAuth(mode = "login") {
    if (!authModal) return;

    lastFocusedElement = document.activeElement;

    // Prevent two modals from being displayed together.
    if (mockModal) {
        mockModal.hidden = true;
    }

    setAuthMode(mode);

    if (authForm) {
        authForm.reset();
    }

    if (authMessage) {
        authMessage.textContent = "";
    }

    authModal.hidden = false;
    updateBodyScroll();

    const firstInput = mode === "signup" ? authName : authEmail;

    window.setTimeout(() => {
        if (firstInput && !authModal.hidden) {
            firstInput.focus();
        }
    }, 50);
}

function closeAuth() {
    if (!authModal) return;

    authModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}

function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";

    if (!authTitle || !authDescription || !authSubmit || !authSwitch) {
        return;
    }

    if (authMessage) {
        authMessage.textContent = "";
    }

    if (authMode === "signup") {
        authTitle.textContent = "Create your account";
        authDescription.textContent =
            "Create a StudyNow account to continue your preparation.";

        authSubmit.textContent = "Create Account";

        if (nameField) nameField.hidden = false;
        if (authName) authName.required = true;

        if (authPassword) {
            authPassword.autocomplete = "new-password";
        }

        authSwitch.replaceChildren();

        authSwitch.append(
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

        if (nameField) nameField.hidden = true;
        if (authName) authName.required = false;

        if (authPassword) {
            authPassword.autocomplete = "current-password";
        }

        authSwitch.replaceChildren();

        authSwitch.append(
            document.createTextNode("New to StudyNow? ")
        );

        const signupButton = document.createElement("button");
        signupButton.type = "button";
        signupButton.className = "text-link";
        signupButton.dataset.action = "switch-signup";
        signupButton.textContent = "Create an account";

        authSwitch.appendChild(signupButton);
    }
}


/* ==========================================
   8. LOGIN / SIGNUP FORM
========================================== */

if (authForm) {
    authForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!authMessage) return;

        /*
           Firebase Authentication is not connected yet.
           Do not pretend that login or signup succeeded.
        */

        authMessage.textContent =
            authMode === "signup"
                ? "Account creation will be available after Firebase Authentication is connected."
                : "Login will be available after Firebase Authentication is connected.";
    });
}


/* ==========================================
   9. FORGOT PASSWORD
========================================== */

function handleForgotPassword() {
    if (!authMessage) return;

    const email = authEmail ? authEmail.value.trim() : "";

    if (!email) {
        authMessage.textContent = "Enter your email address first.";

        if (authEmail) {
            authEmail.focus();
        }

        return;
    }

    if (!authEmail.checkValidity()) {
        authMessage.textContent = "Enter a valid email address.";
        authEmail.focus();
        return;
    }

    authMessage.textContent =
        "Password recovery will be available after Firebase Authentication is connected.";
}


/* ==========================================
   10. MOCK TEST — OPEN / CLOSE
========================================== */

function stopAutoMockTimer() {
    if (autoMockTimer !== null) {
        clearTimeout(autoMockTimer);
        autoMockTimer = null;
    }
}

function openMockTest(title = "StudyNow Free Mock Test") {
    if (!mockModal) return;

    stopAutoMockTimer();
    markAutoMockAsShown();

    lastFocusedElement = document.activeElement;

    if (authModal) {
        authModal.hidden = true;
    }

    if (mockTitle) {
        mockTitle.textContent = title;
    }

    resetMockTest();

    mockModal.hidden = false;
    updateBodyScroll();

    const closeButton = mockModal.querySelector(
        '[data-action="close-mock"]'
    );

    if (closeButton) {
        closeButton.focus();
    }
}

function closeMockTest() {
    if (!mockModal) return;

    mockModal.hidden = true;
    updateBodyScroll();
    restoreFocus();
}

function restoreFocus() {
    if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus === "function" &&
        lastFocusedElement.isConnected
    ) {
        lastFocusedElement.focus();
    }

    lastFocusedElement = null;
}


/* ==========================================
   11. RESET MOCK TEST
========================================== */

function resetMockTest() {
    currentQuestionIndex = 0;
    selectedAnswers = new Array(questions.length).fill(null);

    if (mockQuestionArea) {
        mockQuestionArea.hidden = false;
    }

    if (mockNavigation) {
        mockNavigation.hidden = false;
    }

    if (mockResult) {
        mockResult.hidden = true;
    }

    if (mockReview) {
        mockReview.replaceChildren();
    }

    renderQuestion();
}


/* ==========================================
   12. RENDER QUESTION
========================================== */

function renderQuestion() {
    if (
        !mockQuestionArea ||
        !mockCounter ||
        !mockProgress ||
        !mockPreviousButton ||
        !mockNextButton
    ) {
        return;
    }

    const question = questions[currentQuestionIndex];

    if (!question) return;

    mockQuestionArea.replaceChildren();

    mockCounter.textContent =
        `Question ${currentQuestionIndex + 1} of ${questions.length}`;

    mockProgress.style.width =
        `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    const numberLabel = document.createElement("div");
    numberLabel.className = "question-number";
    numberLabel.textContent =
        `QUESTION ${currentQuestionIndex + 1}`;

    const questionText = document.createElement("h3");
    questionText.className = "question-text";
    questionText.textContent = question.question;

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "question-options";

    question.options.forEach((option, optionIndex) => {
        const optionButton = document.createElement("button");
        optionButton.type = "button";
        optionButton.className = "question-option";

        const selected =
            selectedAnswers[currentQuestionIndex] === optionIndex;

        optionButton.classList.toggle("is-selected", selected);
        optionButton.setAttribute("aria-pressed", String(selected));

        const marker = document.createElement("span");
        marker.className = "option-marker";
        marker.textContent = String.fromCharCode(65 + optionIndex);

        const optionText = document.createElement("span");
        optionText.textContent = option;

        optionButton.append(marker, optionText);

        optionButton.addEventListener("click", () => {
            selectedAnswers[currentQuestionIndex] = optionIndex;
            renderQuestion();
        });

        optionsContainer.appendChild(optionButton);
    });

    mockQuestionArea.append(
        numberLabel,
        questionText,
        optionsContainer
    );

    mockPreviousButton.disabled = currentQuestionIndex === 0;

    mockNextButton.textContent =
        currentQuestionIndex === questions.length - 1
            ? "Submit Test"
            : "Next";
}


/* ==========================================
   13. PREVIOUS / NEXT QUESTION
========================================== */

function previousQuestion() {
    if (currentQuestionIndex <= 0) return;

    currentQuestionIndex--;
    renderQuestion();
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        return;
    }

    submitTest();
}


/* ==========================================
   14. SUBMIT TEST
========================================== */

function submitTest() {
    const unanswered = selectedAnswers.filter(
        (answer) => answer === null
    ).length;

    const confirmation = unanswered > 0
        ? `${unanswered} question(s) are unanswered. Submit anyway?`
        : "Are you sure you want to submit your test?";

    if (!window.confirm(confirmation)) {
        return;
    }

    showResult();
}

function showResult() {
    const correctCount = questions.reduce(
        (total, question, index) => {
            return total + (
                selectedAnswers[index] === question.answer ? 1 : 0
            );
        },
        0
    );

    const percentage = Math.round(
        (correctCount / questions.length) * 100
    );

    if (mockCounter) {
        mockCounter.textContent = "Test completed";
    }

    if (mockProgress) {
        mockProgress.style.width = "100%";
    }

    if (mockQuestionArea) {
        mockQuestionArea.hidden = true;
    }

    if (mockNavigation) {
        mockNavigation.hidden = true;
    }

    if (mockScore) {
        mockScore.textContent =
            `${correctCount} / ${questions.length} correct · ${percentage}%`;
    }

    renderAnswerReview();

    if (mockResult) {
        mockResult.hidden = false;
    }
}


/* ==========================================
   15. ANSWER REVIEW
========================================== */

function renderAnswerReview() {
    if (!mockReview) return;

    mockReview.replaceChildren();

    questions.forEach((question, index) => {
        const selected = selectedAnswers[index];
        const correct = selected === question.answer;

        const reviewCard = document.createElement("article");
        reviewCard.className = "review-item";

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

        const yourAnswer = document.createElement("p");
        yourAnswer.textContent = selected === null
            ? "Your answer: Not answered"
            : `Your answer: ${question.options[selected]}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${question.options[question.answer]}`;

        const explanation = document.createElement("p");
        explanation.textContent =
            `Explanation: ${question.explanation}`;

        reviewCard.append(
            status,
            heading,
            yourAnswer,
            correctAnswer,
            explanation
        );

        mockReview.appendChild(reviewCard);
    });
}


/* ==========================================
   16. RETRY TEST
========================================== */

function retryTest() {
    resetMockTest();
}


/* ==========================================
   17. ORGANIZATION CARDS
========================================== */

function handleOrganizationCard(card) {
    const organizationName =
        card.querySelector("h3")?.textContent.trim();

    if (!organizationName) return;

    window.alert(
        `${organizationName} details page will be connected when its dedicated page is created.`
    );
}


/* ==========================================
   18. FEATURED TEST / SUBJECT CARDS
========================================== */

function handlePracticeCard(card) {
    const name = card.querySelector("h3")?.textContent.trim();

    if (!name) return;

    openMockTest(`${name} — Sample Practice`);
}


/* ==========================================
   19. AUTOMATIC MOCK POPUP
========================================== */

function scheduleAutoMock() {
    if (hasAutoMockBeenShown()) return;

    autoMockTimer = window.setTimeout(() => {
        autoMockTimer = null;

        // Do not interrupt the login panel.
        if (authModal && !authModal.hidden) {
            autoMockTimer = window.setTimeout(schedulePendingMock, 500);
            return;
        }

        if (mockModal && !mockModal.hidden) {
            return;
        }

        openMockTest("StudyNow Free Mock Test");
    }, 5000);
}

function schedulePendingMock() {
    autoMockTimer = null;

    if (hasAutoMockBeenShown()) return;

    if (authModal && !authModal.hidden) {
        autoMockTimer = window.setTimeout(schedulePendingMock, 500);
        return;
    }

    if (mockModal && !mockModal.hidden) {
        return;
    }

    openMockTest("StudyNow Free Mock Test");
}


/* ==========================================
   20. CENTRAL CLICK HANDLER
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
                retryTest();
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
    }
});


/* ==========================================
   21. MODAL BEHAVIOUR
========================================== */

/*
   As planned:
   - The X button closes a modal.
   - Clicking the backdrop does not close it.
   - Escape does not close it.
*/

[authModal, mockModal].forEach((modal) => {
    if (!modal) return;

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            event.stopPropagation();
        }
    });
});


/* ==========================================
   22. INITIALIZE
========================================== */

function initializeStudyNow() {
    if (authModal) {
        authModal.hidden = true;
    }

    if (mockModal) {
        mockModal.hidden = true;
    }

    updateBodyScroll();
    scheduleAutoMock();
}

initializeStudyNow();
