/* StudyKora - Daily Practice */
"use strict";

(() => {
    const PAGE_TAG = "[StudyKora Daily Practice]";

    // Sample questions for the front-end challenge. Replace/add questions here as content is verified.
    const QUESTIONS = [
        {
            category: "General Knowledge",
            question: "Which is the largest planet in our Solar System?",
            options: ["Earth", "Jupiter", "Saturn", "Mars"],
            answer: 1,
            explanation: "Jupiter is the largest planet in our Solar System."
        },
        {
            category: "Assam",
            question: "What is the capital of Assam?",
            options: ["Guwahati", "Jorhat", "Dispur", "Tezpur"],
            answer: 2,
            explanation: "Dispur, a locality in Guwahati, is the capital of Assam."
        },
        {
            category: "English",
            question: "Choose the correctly spelled word.",
            options: ["Accomodation", "Acommodation", "Accommodation", "Acommodetion"],
            answer: 2,
            explanation: "The correct spelling is “accommodation”, with double c and double m."
        },
        {
            category: "Mathematics",
            question: "What is 15% of 200?",
            options: ["15", "20", "25", "30"],
            answer: 3,
            explanation: "15% of 200 is 0.15 × 200 = 30."
        },
        {
            category: "Reasoning",
            question: "Find the next number in the series: 2, 4, 8, 16, __.",
            options: ["18", "24", "30", "32"],
            answer: 3,
            explanation: "Each number is multiplied by 2, so the next number is 32."
        }
    ];

    const SUBJECT_CATEGORIES = new Set(["all", "general", "language", "aptitude", "other"]);

    const elements = {
        date: document.getElementById("practice-date"),
        status: document.getElementById("daily-challenge-status"),
        workspace: document.getElementById("daily-challenge-workspace"),
        questionNumber: document.getElementById("daily-question-number"),
        questionCategory: document.getElementById("daily-question-category"),
        progress: document.getElementById("daily-progress"),
        progressFill: document.getElementById("daily-progress-fill"),
        questionText: document.getElementById("daily-question-text"),
        options: document.getElementById("daily-question-options"),
        feedback: document.getElementById("daily-question-feedback"),
        restart: document.getElementById("daily-restart-button"),
        next: document.getElementById("daily-next-button"),
        answeredCount: document.getElementById("daily-answered-count"),
        correctCount: document.getElementById("daily-correct-count"),
        liveScore: document.getElementById("daily-live-score"),
        resultPanel: document.getElementById("daily-result-panel"),
        resultMessage: document.getElementById("daily-result-message"),
        resultScore: document.getElementById("daily-result-score"),
        resultCorrect: document.getElementById("daily-result-correct"),
        resultIncorrect: document.getElementById("daily-result-incorrect"),
        resultAccuracy: document.getElementById("daily-result-accuracy"),
        resultRetry: document.getElementById("daily-result-retry"),
        subjectSearch: document.getElementById("practice-subject-search"),
        subjectFilters: document.getElementById("practice-subject-filters"),
        subjectCount: document.getElementById("practice-subject-count"),
        subjectGrid: document.getElementById("practice-subject-grid"),
        subjectEmpty: document.getElementById("practice-subject-empty")
    };

    const state = {
        index: 0,
        answered: 0,
        correct: 0,
        selectedAnswer: null,
        finished: false,
        subjectCategory: "all",
        subjectSearch: ""
    };

    function log(message, data) {
        if (data === undefined) console.info(`${PAGE_TAG} ${message}`);
        else console.info(`${PAGE_TAG} ${message}`, data);
    }

    function setStatus(message, statusClass = "is-success") {
        if (!elements.status) return;
        elements.status.textContent = message;
        elements.status.classList.remove("is-success", "is-warning", "is-error");
        elements.status.classList.add(statusClass);
    }

    function formatToday() {
        const now = new Date();
        return new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(now);
    }

    function createOptionButton(text, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-outline btn-full daily-option-button";
        button.dataset.optionIndex = String(index);
        button.textContent = text;
        return button;
    }

    function renderQuestion() {
        const current = QUESTIONS[state.index];
        if (!current || !elements.options || !elements.questionText) return;

        state.selectedAnswer = null;
        elements.questionNumber.textContent = `Question ${state.index + 1} of ${QUESTIONS.length}`;
        elements.questionCategory.textContent = current.category;
        elements.questionText.textContent = current.question;
        elements.options.replaceChildren();

        current.options.forEach((option, index) => {
            elements.options.appendChild(createOptionButton(option, index));
        });

        elements.feedback.textContent = "";
        elements.feedback.classList.remove("is-success", "is-error");
        elements.next.disabled = true;
        elements.next.textContent = state.index === QUESTIONS.length - 1 ? "View Results" : "Next Question";

        const progressPercent = Math.round((state.index / QUESTIONS.length) * 100);
        elements.progress.setAttribute("aria-valuenow", String(progressPercent));
        elements.progressFill.style.width = `${progressPercent}%`;
        updateProgressSummary();
    }

    function updateProgressSummary() {
        if (elements.answeredCount) {
            elements.answeredCount.textContent = `${state.answered} of ${QUESTIONS.length}`;
        }
        if (elements.correctCount) {
            elements.correctCount.textContent = String(state.correct);
        }
        if (elements.liveScore) {
            elements.liveScore.textContent = `${state.correct} / ${QUESTIONS.length}`;
        }
    }

    function chooseAnswer(event) {
        const button = event.target.closest("[data-option-index]");
        if (!button || state.selectedAnswer !== null || state.finished) return;

        const chosenIndex = Number(button.dataset.optionIndex);
        const current = QUESTIONS[state.index];
        if (!Number.isInteger(chosenIndex) || !current.options[chosenIndex]) return;

        state.selectedAnswer = chosenIndex;
        state.answered += 1;
        const isCorrect = chosenIndex === current.answer;
        if (isCorrect) state.correct += 1;

        elements.options.querySelectorAll("[data-option-index]").forEach((optionButton) => {
            optionButton.disabled = true;
            optionButton.setAttribute("aria-pressed", String(Number(optionButton.dataset.optionIndex) === chosenIndex));
            if (Number(optionButton.dataset.optionIndex) === current.answer) {
                optionButton.classList.add("is-correct");
            } else if (Number(optionButton.dataset.optionIndex) === chosenIndex) {
                optionButton.classList.add("is-incorrect");
            }
        });

        elements.feedback.textContent = `${isCorrect ? "Correct." : "Not quite."} ${current.explanation}`;
        elements.feedback.classList.remove("is-success", "is-error");
        elements.feedback.classList.add(isCorrect ? "is-success" : "is-error");
        elements.next.disabled = false;
        setStatus("Challenge in progress");

        const completedPercent = Math.round((state.answered / QUESTIONS.length) * 100);
        elements.progress.setAttribute("aria-valuenow", String(completedPercent));
        elements.progressFill.style.width = `${completedPercent}%`;
        updateProgressSummary();
    }

    function nextQuestion() {
        if (state.selectedAnswer === null || state.finished) return;
        if (state.index < QUESTIONS.length - 1) {
            state.index += 1;
            renderQuestion();
            return;
        }
        finishChallenge();
    }

    function finishChallenge() {
        state.finished = true;
        const incorrect = QUESTIONS.length - state.correct;
        const accuracy = Math.round((state.correct / QUESTIONS.length) * 100);

        elements.workspace.hidden = true;
        elements.resultPanel.hidden = false;
        elements.resultScore.textContent = `${state.correct} / ${QUESTIONS.length}`;
        elements.resultCorrect.textContent = String(state.correct);
        elements.resultIncorrect.textContent = String(incorrect);
        elements.resultAccuracy.textContent = `${accuracy}%`;
        elements.resultMessage.textContent = accuracy === 100
            ? "Excellent work! You answered every question correctly."
            : accuracy >= 60
                ? "Good effort. Review the explanations and keep practising."
                : "Keep going. Review the explanations and try again to improve your score.";

        elements.progress.setAttribute("aria-valuenow", "100");
        elements.progressFill.style.width = "100%";
        setStatus("Challenge complete");

        elements.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        log("Challenge completed.", { correct: state.correct, total: QUESTIONS.length, accuracy });
    }

    function restartChallenge() {
        state.index = 0;
        state.answered = 0;
        state.correct = 0;
        state.selectedAnswer = null;
        state.finished = false;

        elements.workspace.hidden = false;
        elements.resultPanel.hidden = true;
        setStatus("Ready to start");
        renderQuestion();
        log("Challenge restarted.");
    }

    function getSubjectCards() {
        if (!elements.subjectGrid) return [];
        return Array.from(elements.subjectGrid.querySelectorAll("[data-practice-card]"));
    }

    function filterSubjects() {
        const search = state.subjectSearch.trim().toLowerCase();
        let visible = 0;
        const cards = getSubjectCards();

        cards.forEach((card) => {
            const name = (card.dataset.practiceName || card.textContent || "").toLowerCase();
            const category = (card.dataset.practiceCategory || "other").toLowerCase();
            const matchesText = name.includes(search);
            const matchesCategory = state.subjectCategory === "all" || category === state.subjectCategory;
            const show = matchesText && matchesCategory;

            card.hidden = !show;
            if (show) visible += 1;
        });

        if (elements.subjectEmpty) elements.subjectEmpty.hidden = visible > 0;
        if (elements.subjectCount) {
            elements.subjectCount.textContent = `Showing ${visible} of ${cards.length} subjects.`;
        }
    }

    function handleSubjectFilter(event) {
        const button = event.target.closest("[data-practice-filter]");
        if (!button) return;

        const category = button.dataset.practiceFilter;
        if (!SUBJECT_CATEGORIES.has(category)) return;

        state.subjectCategory = category;
        elements.subjectFilters.querySelectorAll("[data-practice-filter]").forEach((filterButton) => {
            const active = filterButton === button;
            filterButton.classList.toggle("is-active", active);
            filterButton.setAttribute("aria-pressed", String(active));
        });
        filterSubjects();
    }

    function isLoggedIn() {
        try {
            const session = JSON.parse(sessionStorage.getItem("studyKoraSession") || "null");
            return Boolean(
                session &&
                typeof session.idToken === "string" &&
                session.idToken.length > 0 &&
                session.user &&
                typeof session.user.email === "string" &&
                session.user.email.length > 0
            );
        } catch (error) {
            console.warn(`${PAGE_TAG} Could not read session.`, error);
            return false;
        }
    }

    function gateMemberLinks(event) {
        const link = event.target.closest("a[data-requires-login]");
        if (!link || isLoggedIn()) return;

        event.preventDefault();
        const returnTo = link.getAttribute("href") || "subject.html";
        const loginUrl = new URL("auth.html", window.location.href);
        loginUrl.searchParams.set("mode", "login");
        loginUrl.searchParams.set("returnTo", returnTo);
        window.location.href = loginUrl.toString();
    }

    function initialize() {
        if (!elements.questionText || QUESTIONS.length === 0) {
            console.warn(`${PAGE_TAG} Question workspace is missing or no questions are configured.`);
            return;
        }

        if (elements.date) elements.date.textContent = formatToday();
        elements.options.addEventListener("click", chooseAnswer);
        elements.next.addEventListener("click", nextQuestion);
        elements.restart.addEventListener("click", restartChallenge);
        elements.resultRetry.addEventListener("click", restartChallenge);

        elements.subjectSearch?.addEventListener("input", (event) => {
            state.subjectSearch = event.target.value || "";
            filterSubjects();
        });
        elements.subjectFilters?.addEventListener("click", handleSubjectFilter);
        document.addEventListener("click", gateMemberLinks);

        renderQuestion();
        filterSubjects();
        log("Page initialized.", { questionCount: QUESTIONS.length, subjectCount: getSubjectCards().length });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
