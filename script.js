/* =========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
========================================= */

"use strict";


/* =========================================
   1. ELEMENTS
========================================= */

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

const mockModal = document.getElementById("mock-modal");
const mockTitle = document.getElementById("mock-title");
const mockCounter = document.getElementById("mock-counter");
const mockProgress = document.getElementById("mock-progress-value");
const mockQuestionArea = document.getElementById("mock-question-area");
const mockNavigation = document.getElementById("mock-navigation");
const mockResult = document.getElementById("mock-result");
const mockScore = document.getElementById("mock-score");
const mockReview = document.getElementById("mock-review");

const mockPrevButton = document.querySelector(
    '[data-action="mock-prev"]'
);

const mockNextButton = document.querySelector(
    '[data-action="mock-next"]'
);

const AUTO_MOCK_KEY = "studynow-mock-shown";


/* =========================================
   2. SAMPLE QUESTIONS
========================================= */

const questions = [
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
            "Dispur is the capital of Assam and is located within Guwahati."
    },
    {
        question: "Which country shares an international border with Assam?",
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
            "25% of 200 = (25 / 100) × 200 = 50."
    },
    {
        question: "Find the next number: 2, 4, 8, 16, __",
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
        question: "Which of these is an input device?",
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


/* =========================================
   3. STATE
========================================= */

let currentQuestion = 0;
let selectedAnswers = new Array(questions.length).fill(null);
let autoMockTimer = null;
let lastFocusedElement = null;


/* =========================================
   4. SESSION STORAGE
========================================= */

function hasShownAutoMock() {
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
        // The website remains usable if sessionStorage is unavailable.
    }
}


/* =========================================
   5. MOBILE NAVIGATION
========================================= */

function toggleMenu() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function closeMenu() {
    if (!menuToggle || !mainNav) return;

    mainNav.classList.remove("is-open");
    menuToggle.classList.remove("is-active");
    menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle) {
    menuToggle.addEventListener("click", toggleMenu);
}

if (mainNav) {
    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });
}

document.addEventListener("click", (event) => {
    if (
        mainNav &&
        mainNav.classList.contains("is-open") &&
        !event.target.closest(".header-inner")
    ) {
        closeMenu();
    }
});


/* =========================================
   6. MODAL HELPERS
========================================= */

function updatePageScroll() {
    const modalOpen = mockModal && !mockModal.hidden;

    document.body.classList.toggle("modal-open", Boolean(modalOpen));
}

function stopAutoMockTimer() {
    if (autoMockTimer !== null) {
        clearTimeout(autoMockTimer);
        autoMockTimer = null;
    }
}


/* =========================================
   7. OPEN AND CLOSE MOCK TEST
========================================= */

function openMockTest(title = "StudyNow Mock Test") {
    if (!mockModal) return;

    stopAutoMockTimer();
    markAutoMockShown();

    lastFocusedElement = document.activeElement;

    if (mockTitle) {
        mockTitle.textContent = title;
    }

    resetMockTest();

    mockModal.hidden = false;
    updatePageScroll();

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
    updatePageScroll();

    if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus === "function"
    ) {
        lastFocusedElement.focus();
    }
}


/* =========================================
   8. RESET TEST
========================================= */

function resetMockTest() {
    currentQuestion = 0;
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


/* =========================================
   9. RENDER QUESTION
========================================= */

function renderQuestion() {
    if (
        !mockQuestionArea ||
        !mockCounter ||
        !mockProgress ||
        !mockPrevButton ||
        !mockNextButton
    ) {
        return;
    }

    const item = questions[currentQuestion];

    if (!item) return;

    mockQuestionArea.replaceChildren();

    mockCounter.textContent =
        `Question ${currentQuestion + 1} of ${questions.length}`;

    mockProgress.style.width =
        `${((currentQuestion + 1) / questions.length) * 100}%`;

    const number = document.createElement("div");
    number.className = "question-number";
    number.textContent = `QUESTION ${currentQuestion + 1}`;

    const heading = document.createElement("h3");
    heading.className = "question-text";
    heading.textContent = item.question;

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "question-options";

    item.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "question-option";

        const isSelected = selectedAnswers[currentQuestion] === index;

        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));

        const marker = document.createElement("span");
        marker.className = "option-marker";
        marker.textContent = String.fromCharCode(65 + index);

        const text = document.createElement("span");
        text.textContent = option;

        button.append(marker, text);

        button.addEventListener("click", () => {
            selectedAnswers[currentQuestion] = index;
            renderQuestion();
        });

        optionsContainer.appendChild(button);
    });

    mockQuestionArea.append(number, heading, optionsContainer);

    mockPrevButton.disabled = currentQuestion === 0;

    mockNextButton.textContent =
        currentQuestion === questions.length - 1
            ? "Submit Test"
            : "Next";
}


/* =========================================
   10. QUESTION NAVIGATION
========================================= */

function previousQuestion() {
    if (currentQuestion <= 0) return;

    currentQuestion--;
    renderQuestion();
}

function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        renderQuestion();
        return;
    }

    submitTest();
}


/* =========================================
   11. SUBMIT TEST
========================================= */

function submitTest() {
    const unanswered = selectedAnswers.filter(
        (answer) => answer === null
    ).length;

    const message = unanswered > 0
        ? `${unanswered} question(s) remain unanswered. Submit anyway?`
        : "Are you sure you want to submit the test?";

    if (!window.confirm(message)) return;

    showResult();
}

function showResult() {
    const correctAnswers = questions.reduce((total, item, index) => {
        return total + (
            selectedAnswers[index] === item.answer ? 1 : 0
        );
    }, 0);

    const percentage = Math.round(
        (correctAnswers / questions.length) * 100
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
            `${correctAnswers} / ${questions.length} correct · ${percentage}%`;
    }

    renderReview();

    if (mockResult) {
        mockResult.hidden = false;
    }
}


/* =========================================
   12. ANSWER REVIEW
========================================= */

function renderReview() {
    if (!mockReview) return;

    mockReview.replaceChildren();

    questions.forEach((item, index) => {
        const selected = selectedAnswers[index];
        const correct = selected === item.answer;

        const card = document.createElement("article");
        card.className = "review-item";

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
        heading.textContent = `Q${index + 1}. ${item.question}`;

        const userAnswer = document.createElement("p");
        userAnswer.textContent = selected === null
            ? "Your answer: Not answered"
            : `Your answer: ${item.options[selected]}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${item.options[item.answer]}`;

        const explanation = document.createElement("p");
        explanation.textContent = `Explanation: ${item.explanation}`;

        card.append(
            status,
            heading,
            userAnswer,
            correctAnswer,
            explanation
        );

        mockReview.appendChild(card);
    });
}


/* =========================================
   13. RETRY TEST
========================================= */

function retryTest() {
    resetMockTest();
}


/* =========================================
   14. ORGANIZATION CARDS
========================================= */

function handleOrganization(card) {
    const name = card.querySelector("h3")?.textContent.trim();

    if (!name) return;

    window.alert(
        `${name} details page will be connected when the organization pages are created.`
    );
}


/* =========================================
   15. TEST AND SUBJECT CARDS
========================================= */

function handlePracticeCard(card) {
    const name = card.querySelector("h3")?.textContent.trim();

    if (!name) return;

    openMockTest(`${name} — Sample Practice`);
}


/* =========================================
   16. LOGIN AND ACCOUNT PLACEHOLDERS
========================================= */

function handleAccountAction(action) {
    if (action === "login") {
        window.alert(
            "Login panel will be connected when authentication is implemented."
        );
        return;
    }

    if (action === "signup") {
        window.alert(
            "Create Account will be connected when authentication is implemented."
        );
    }
}


/* =========================================
   17. AUTOMATIC MOCK TEST POPUP
========================================= */

function scheduleAutoMock() {
    if (hasShownAutoMock()) return;

    autoMockTimer = window.setTimeout(() => {
        autoMockTimer = null;

        if (mockModal && !mockModal.hidden) return;

        openMockTest("StudyNow Free Mock Test");
    }, 5000);
}


/* =========================================
   18. CENTRAL CLICK HANDLER
========================================= */

document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
        const action = actionButton.dataset.action;

        switch (action) {
            case "login":
            case "signup":
                handleAccountAction(action);
                return;

            case "start-mock":
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
        handleOrganization(organizationCard);
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


/* =========================================
   19. INITIALIZE
========================================= */

function initializeStudyNow() {
    if (mockModal) {
        mockModal.hidden = true;
    }

    updatePageScroll();
    scheduleAutoMock();
}

initializeStudyNow();
