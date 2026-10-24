/* ========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
======================================== */

"use strict";

/* ---------- 1. Select Elements ---------- */

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


/* ---------- 2. Free Sample Questions ---------- */

/*
   These are sample questions for the frontend preview.
   Replace or expand them with verified, exam-specific questions later.
*/

const mockQuestions = [
    {
        question: "What is the capital of Assam?",
        options: [
            "Guwahati",
            "Dispur",
            "Jorhat",
            "Silchar"
        ],
        answer: 1,
        explanation:
            "Dispur is the capital of Assam. It is located within Guwahati."
    },

    {
        question: "Which of these is a neighbouring country of Assam?",
        options: [
            "Sri Lanka",
            "Maldives",
            "Bangladesh",
            "Indonesia"
        ],
        answer: 2,
        explanation:
            "Assam shares an international border with Bangladesh and Bhutan."
    },

    {
        question: "What is 25% of 200?",
        options: [
            "25",
            "40",
            "50",
            "75"
        ],
        answer: 2,
        explanation:
            "25% of 200 = 25 ÷ 100 × 200 = 50."
    },

    {
        question: "Find the next number in this series: 2, 4, 8, 16, __",
        options: [
            "20",
            "24",
            "30",
            "32"
        ],
        answer: 3,
        explanation:
            "Each number is multiplied by 2. Therefore, 16 × 2 = 32."
    },

    {
        question: "Which of the following is an input device?",
        options: [
            "Monitor",
            "Printer",
            "Keyboard",
            "Speaker"
        ],
        answer: 2,
        explanation:
            "A keyboard is an input device used to enter text, numbers and commands."
    }
];


/* ---------- 3. Application State ---------- */

let currentQuestionIndex = 0;
let selectedAnswers = new Array(mockQuestions.length).fill(null);
let authMode = "login";
let autoMockTimer = null;

const AUTO_MOCK_KEY = "studynow-free-mock-shown";


/* ---------- 4. Session Storage Helpers ---------- */

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
        // The website can still work if session storage is unavailable.
    }
}


/* ---------- 5. Body Scroll Control ---------- */

function updateBodyScroll() {
    const authIsOpen = authModal && !authModal.hidden;
    const mockIsOpen = mockModal && !mockModal.hidden;

    document.body.classList.toggle(
        "modal-open",
        Boolean(authIsOpen || mockIsOpen)
    );
}


/* ---------- 6. Mobile Navigation ---------- */

function closeNavigation() {
    if (!menuToggle || !mainNav) return;

    menuToggle.classList.remove("is-active");
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
}

function toggleNavigation() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
}

if (menuToggle) {
    menuToggle.addEventListener("click", toggleNavigation);
}

if (mainNav) {
    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNavigation);
    });
}


/* ---------- 7. Authentication Modal ---------- */

function stopAutoMockTimer() {
    if (autoMockTimer !== null) {
        clearTimeout(autoMockTimer);
        autoMockTimer = null;
    }
}

function openAuth(mode = "login") {
    if (!authModal) return;

    stopAutoMockTimer();
    markAutoMockAsShown();

    // Avoid displaying two modals on top of each other.
    if (mockModal) {
        mockModal.hidden = true;
    }

    if (authForm) {
        authForm.reset();
    }

    setAuthMode(mode);

    authModal.hidden = false;
    updateBodyScroll();

    const firstInput = mode === "signup" ? authName :
        document.getElementById("auth-email");

    if (firstInput) {
        window.setTimeout(() => firstInput.focus(), 50);
    }
}

function closeAuth() {
    if (!authModal) return;

    authModal.hidden = true;
    updateBodyScroll();
}

function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";

    if (!authTitle || !authDescription || !authSubmit ||
        !authSwitch || !authMessage) {
        return;
    }

    authMessage.textContent = "";

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

        if (forgotPasswordButton) {
            forgotPasswordButton.hidden = true;
        }

        authSwitch.innerHTML =
            'Already have an account? ' +
            '<button type="button" class="text-link" ' +
            'data-action="switch-login">Login</button>';
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

        if (forgotPasswordButton) {
            forgotPasswordButton.hidden = false;
        }

        authSwitch.innerHTML =
            'New to StudyNow? ' +
            '<button type="button" class="text-link" ' +
            'data-action="switch-signup">Create an account</button>';
    }
}

if (authForm) {
    authForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!authMessage) return;

        /*
           Authentication is not connected yet.
           Do not pretend that a login or account was created.
        */

        authMessage.textContent =
            "Login and account creation will work after Firebase Authentication is connected.";
    });
}


/* ---------- 8. Forgot Password ---------- */

function handleForgotPassword() {
    if (!authMessage) return;

    const emailInput = document.getElementById("auth-email");
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email) {
        authMessage.textContent =
            "Enter your email address first. Password recovery will be available after Firebase is connected.";

        if (emailInput) emailInput.focus();
        return;
    }

    authMessage.textContent =
        "Password reset is not connected yet. Firebase password recovery will be configured later.";
}


/* ---------- 9. Free Mock Test Modal ---------- */

function resetMockTest() {
    currentQuestionIndex = 0;
    selectedAnswers = new Array(mockQuestions.length).fill(null);

    if (mockResult) mockResult.hidden = true;
    if (mockQuestionArea) mockQuestionArea.hidden = false;
    if (mockNavigation) mockNavigation.hidden = false;

    renderMockQuestion();
}

function openMockTest() {
    if (!mockModal) return;

    stopAutoMockTimer();
    markAutoMockAsShown();

    // Close login/signup panel if it is open.
    if (authModal) {
        authModal.hidden = true;
    }

    if (mockTitle) {
        mockTitle.textContent = "StudyNow Free Mock Test";
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
}


/* ---------- 10. Render Current Question ---------- */

function renderMockQuestion() {
    if (
        !mockQuestionArea ||
        !mockCounter ||
        !mockProgress ||
        !mockPreviousButton ||
        !mockNextButton
    ) {
        return;
    }

    const question = mockQuestions[currentQuestionIndex];

    if (!question) return;

    mockQuestionArea.replaceChildren();

    mockCounter.textContent =
        `Question ${currentQuestionIndex + 1} of ${mockQuestions.length}`;

    const progressPercentage =
        ((currentQuestionIndex + 1) / mockQuestions.length) * 100;

    mockProgress.style.width = `${progressPercentage}%`;

    // Question number label.
    const questionNumber = document.createElement("div");
    questionNumber.className = "question-number";
    questionNumber.textContent = `QUESTION ${currentQuestionIndex + 1}`;

    // Question text.
    const questionText = document.createElement("h3");
    questionText.className = "question-text";
    questionText.textContent = question.question;

    // Options container.
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "question-options";

    question.options.forEach((option, optionIndex) => {
        const optionButton = document.createElement("button");

        optionButton.type = "button";
        optionButton.className = "question-option";
        optionButton.setAttribute(
            "aria-pressed",
            String(selectedAnswers[currentQuestionIndex] === optionIndex)
        );

        if (selectedAnswers[currentQuestionIndex] === optionIndex) {
            optionButton.classList.add("is-selected");
        }

        const marker = document.createElement("span");
        marker.className = "option-marker";
        marker.textContent = String.fromCharCode(65 + optionIndex);

        const optionText = document.createElement("span");
        optionText.textContent = option;

        optionButton.append(marker, optionText);

        optionButton.addEventListener("click", () => {
            selectedAnswers[currentQuestionIndex] = optionIndex;
            renderMockQuestion();
        });

        optionsContainer.appendChild(optionButton);
    });

    mockQuestionArea.append(
        questionNumber,
        questionText,
        optionsContainer
    );

    mockPreviousButton.disabled = currentQuestionIndex === 0;

    mockNextButton.textContent =
        currentQuestionIndex === mockQuestions.length - 1
            ? "Submit Test"
            : "Next";
}


/* ---------- 11. Navigate Mock Questions ---------- */

function previousMockQuestion() {
    if (currentQuestionIndex <= 0) return;

    currentQuestionIndex -= 1;
    renderMockQuestion();
}

function nextMockQuestion() {
    if (currentQuestionIndex < mockQuestions.length - 1) {
        currentQuestionIndex += 1;
        renderMockQuestion();
        return;
    }

    submitMockTest();
}


/* ---------- 12. Submit Mock Test ---------- */

function submitMockTest() {
    const unansweredCount = selectedAnswers.filter(
        (answer) => answer === null
    ).length;

    const confirmationMessage = unansweredCount > 0
        ? `You have ${unansweredCount} unanswered question(s). Submit the test anyway?`
        : "Are you sure you want to submit your test?";

    if (!window.confirm(confirmationMessage)) {
        return;
    }

    showMockResult();
}

function showMockResult() {
    const correctCount = mockQuestions.reduce(
        (total, question, index) => {
            return total + (
                selectedAnswers[index] === question.answer ? 1 : 0
            );
        },
        0
    );

    const percentage = Math.round(
        (correctCount / mockQuestions.length) * 100
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
            `${correctCount} / ${mockQuestions.length} correct · ${percentage}%`;
    }

    renderMockReview();

    if (mockResult) {
        mockResult.hidden = false;
    }
}


/* ---------- 13. Show Answers and Explanations ---------- */

function renderMockReview() {
    if (!mockReview) return;

    mockReview.replaceChildren();

    mockQuestions.forEach((question, index) => {
        const selectedAnswer = selectedAnswers[index];
        const isCorrect = selectedAnswer === question.answer;

        const reviewItem = document.createElement("article");
        reviewItem.className = "review-item";

        const status = document.createElement("span");
        status.className = isCorrect
            ? "review-status correct"
            : "review-status incorrect";

        status.textContent = isCorrect
            ? "Correct"
            : selectedAnswer === null
                ? "Not answered"
                : "Incorrect";

        const questionHeading = document.createElement("h3");
        questionHeading.textContent =
            `Q${index + 1}. ${question.question}`;

        const yourAnswer = document.createElement("p");
        yourAnswer.textContent = selectedAnswer === null
            ? "Your answer: Not answered"
            : `Your answer: ${question.options[selectedAnswer]}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${question.options[question.answer]}`;

        const explanation = document.createElement("p");
        explanation.textContent =
            `Explanation: ${question.explanation}`;

        reviewItem.append(
            status,
            questionHeading,
            yourAnswer,
            correctAnswer,
            explanation
        );

        mockReview.appendChild(reviewItem);
    });
}


/* ---------- 14. Retry Mock Test ---------- */

function retryMockTest() {
    resetMockTest();
}


/* ---------- 15. Organization Card Placeholder ---------- */

/*
   Organization detail pages will be connected when those pages
   are created. For now, do not send an organization click to an
   unrelated generic test.
*/

function handleOrganizationClick(card) {
    const organizationName =
        card.querySelector("h3")?.textContent.trim() || "This organization";

    window.alert(
        `${organizationName} details page will be connected when its page is created.`
    );
}


/* ---------- 16. Featured Tests and Subject Cards ---------- */

function handlePracticeCardClick(card) {
    const cardName =
        card.querySelector("h3")?.textContent.trim() || "Practice";

    /*
       The current modal contains five sample questions.
       Exam-specific tests and subject-specific question banks
       will be connected when their dedicated pages are developed.
    */

    if (mockTitle) {
        mockTitle.textContent = `${cardName} — Sample Practice`;
    }

    openMockTest();

    // Keep the sample-test heading consistent with the selected card.
    if (mockTitle) {
        mockTitle.textContent = `${cardName} — Sample Practice`;
    }
}


/* ---------- 17. Automatic Mock Popup ---------- */

function scheduleAutoMock() {
    if (hasAutoMockBeenShown()) return;

    autoMockTimer = window.setTimeout(() => {
        autoMockTimer = null;

        // Do not interrupt an already-open modal.
        if (
            authModal && !authModal.hidden ||
            mockModal && !mockModal.hidden
        ) {
            return;
        }

        openMockTest();
    }, 5000);
}


/* ---------- 18. Central Click Handler ---------- */

document.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");

    if (actionElement) {
        const action = actionElement.dataset.action;

        switch (action) {
            case "login":
                openAuth("login");
                break;

            case "signup":
                openAuth("signup");
                break;

            case "switch-signup":
                setAuthMode("signup");
                break;

            case "switch-login":
                setAuthMode("login");
                break;

            case "close-auth":
                closeAuth();
                break;

            case "forgot-password":
                handleForgotPassword();
                break;

            case "start-free-mock":
                openMockTest();
                break;

            case "close-mock":
                closeMockTest();
                break;

            case "mock-prev":
                previousMockQuestion();
                break;

            case "mock-next":
                nextMockQuestion();
                break;

            case "retry-mock":
                retryMockTest();
                break;

            default:
                break;
        }
    }

    const organizationCard = event.target.closest("[data-org]");

    if (organizationCard) {
        handleOrganizationClick(organizationCard);
    }

    const testCard = event.target.closest("[data-test]");

    if (testCard) {
        handlePracticeCardClick(testCard);
    }

    const subjectCard = event.target.closest("[data-subject]");

    if (subjectCard) {
        handlePracticeCardClick(subjectCard);
    }

    // Close the mobile navigation after clicking outside the header.
    if (
        mainNav &&
        mainNav.classList.contains("is-open") &&
        !event.target.closest(".header-inner")
    ) {
        closeNavigation();
    }
});


/* ---------- 19. Initialize ---------- */

function initializeStudyNow() {
    if (mockQuestionArea) {
        renderMockQuestion();
    }

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
