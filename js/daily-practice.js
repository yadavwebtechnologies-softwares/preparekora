
/* =====================================================
   studyKora — Daily Practice
   Daily MCQ challenge, score, subject search and filters
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    /* -----------------------------------------------
       1. Date display
    ----------------------------------------------- */

    const dateElement = $("practice-date");

    if (dateElement) {
        const today = new Date();

        dateElement.textContent = today.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    /* -----------------------------------------------
       2. Daily challenge questions
       Sample content for frontend testing
    ----------------------------------------------- */

    const questions = [
        {
            category: "General Knowledge",
            question: "Which city is the capital of Assam?",
            options: ["Guwahati", "Silchar", "Dispur", "Jorhat"],
            answer: 2,
            explanation: "Dispur is the capital of Assam."
        },
        {
            category: "English",
            question: "Choose the synonym of 'Rapid'.",
            options: ["Slow", "Fast", "Weak", "Late"],
            answer: 1,
            explanation: "'Fast' is a synonym of 'rapid'."
        },
        {
            category: "Mathematics",
            question: "What is 25% of 200?",
            options: ["25", "40", "50", "75"],
            answer: 2,
            explanation: "25% of 200 is 200 × 25 / 100 = 50."
        },
        {
            category: "General Science",
            question: "What is the chemical formula of water?",
            options: ["CO₂", "O₂", "H₂O", "NaCl"],
            answer: 2,
            explanation: "A water molecule contains two hydrogen atoms and one oxygen atom."
        },
        {
            category: "Indian Polity",
            question: "Fundamental Rights are primarily contained in which part of the Indian Constitution?",
            options: ["Part I", "Part II", "Part III", "Part IV"],
            answer: 2,
            explanation: "Fundamental Rights are contained in Part III of the Constitution."
        }
    ];

    const challenge = {
        questionNumber: $("daily-question-number"),
        category: $("daily-question-category"),
        questionText: $("daily-question-text"),
        options: $("daily-question-options"),
        feedback: $("daily-question-feedback"),
        progress: $("daily-progress"),
        progressFill: $("daily-progress-fill"),
        nextButton: $("daily-next-button"),
        restartButton: $("daily-restart-button"),
        status: $("daily-challenge-status"),
        workspace: $("daily-challenge-workspace"),

        answeredCount: $("daily-answered-count"),
        correctCount: $("daily-correct-count"),
        liveScore: $("daily-live-score"),

        resultPanel: $("daily-result-panel"),
        resultMessage: $("daily-result-message"),
        resultScore: $("daily-result-score"),
        resultCorrect: $("daily-result-correct"),
        resultIncorrect: $("daily-result-incorrect"),
        resultAccuracy: $("daily-result-accuracy"),
        resultRetry: $("daily-result-retry")
    };

    let currentIndex = 0;
    let selectedAnswers = Array(questions.length).fill(null);
    let answerChecked = Array(questions.length).fill(false);
    let finished = false;

    function showFeedback(message, type = "") {
        if (!challenge.feedback) return;

        challenge.feedback.textContent = message;

        if (type) {
            challenge.feedback.dataset.type = type;
        } else {
            delete challenge.feedback.dataset.type;
        }
    }

    function getAnsweredCount() {
        return answerChecked.filter(Boolean).length;
    }

    function getCorrectCount() {
        return questions.reduce((total, question, index) => {
            return total + (
                answerChecked[index] &&
                selectedAnswers[index] === question.answer
                    ? 1
                    : 0
            );
        }, 0);
    }

    function updateProgress() {
        const answered = getAnsweredCount();
        const correct = getCorrectCount();
        const percentage = Math.round(
            (answered / questions.length) * 100
        );

        if (challenge.answeredCount) {
            challenge.answeredCount.textContent =
                `${answered} of ${questions.length}`;
        }

        if (challenge.correctCount) {
            challenge.correctCount.textContent = String(correct);
        }

        if (challenge.liveScore) {
            challenge.liveScore.textContent =
                `${correct} / ${questions.length}`;
        }

        if (challenge.progress) {
            challenge.progress.setAttribute(
                "aria-valuenow",
                String(percentage)
            );
        }

        if (challenge.progressFill) {
            challenge.progressFill.style.width = `${percentage}%`;
        }
    }

    function renderQuestion() {
        if (finished) return;

        const question = questions[currentIndex];

        challenge.questionNumber.textContent =
            `Question ${currentIndex + 1} of ${questions.length}`;

        challenge.category.textContent = question.category;
        challenge.questionText.textContent = question.question;

        challenge.options.replaceChildren();

        question.options.forEach((optionText, optionIndex) => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "option-item";

            const letter = document.createElement("span");
            letter.className = "option-letter";
            letter.textContent = String.fromCharCode(65 + optionIndex);

            const label = document.createElement("span");
            label.textContent = optionText;

            const isSelected =
                selectedAnswers[currentIndex] === optionIndex;

            if (isSelected) {
                button.classList.add("is-selected");
            }

            button.setAttribute(
                "aria-pressed",
                String(isSelected)
            );

            button.append(letter, label);

            if (answerChecked[currentIndex]) {
                button.disabled = true;

                if (optionIndex === question.answer) {
                    button.classList.add("is-selected");
                }
            } else {
                button.addEventListener("click", () => {
                    selectAnswer(optionIndex);
                });
            }

            challenge.options.appendChild(button);
        });

        if (answerChecked[currentIndex]) {
            const isCorrect =
                selectedAnswers[currentIndex] === question.answer;

            showFeedback(
                `${isCorrect ? "Correct!" : "Incorrect."} ${question.explanation}`,
                isCorrect ? "success" : "error"
            );

            challenge.nextButton.disabled = false;
        } else {
            showFeedback("Choose one option to check your answer.");
            challenge.nextButton.disabled = true;
        }

        challenge.nextButton.textContent =
            currentIndex === questions.length - 1
                ? "View Result"
                : "Next Question";

        if (challenge.status) {
            challenge.status.textContent =
                `${getAnsweredCount()} of ${questions.length} answered`;
        }

        updateProgress();
    }

    function selectAnswer(optionIndex) {
        if (finished || answerChecked[currentIndex]) return;

        const question = questions[currentIndex];

        selectedAnswers[currentIndex] = optionIndex;
        answerChecked[currentIndex] = true;

        const isCorrect = optionIndex === question.answer;

        showFeedback(
            `${isCorrect ? "Correct!" : "Incorrect."} ${question.explanation}`,
            isCorrect ? "success" : "error"
        );

        renderQuestion();
    }

    function finishChallenge() {
        finished = true;

        const correct = getCorrectCount();
        const answered = getAnsweredCount();
        const incorrect = answered - correct;
        const accuracy = answered > 0
            ? Math.round((correct / answered) * 100)
            : 0;

        challenge.workspace.hidden = true;
        challenge.resultPanel.hidden = false;

        challenge.resultMessage.textContent =
            `You answered ${answered} of ${questions.length} questions.`;

        challenge.resultScore.textContent =
            `${correct} / ${questions.length}`;

        challenge.resultCorrect.textContent = String(correct);
        challenge.resultIncorrect.textContent = String(incorrect);
        challenge.resultAccuracy.textContent = `${accuracy}%`;

        if (challenge.status) {
            challenge.status.textContent = "Challenge completed";
        }

        challenge.resultPanel.scrollIntoView({
            behavior: window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches ? "auto" : "smooth",
            block: "start"
        });
    }

    function resetChallenge() {
        currentIndex = 0;
        selectedAnswers = Array(questions.length).fill(null);
        answerChecked = Array(questions.length).fill(false);
        finished = false;

        challenge.workspace.hidden = false;
        challenge.resultPanel.hidden = true;

        if (challenge.status) {
            challenge.status.textContent = "Ready to practise";
        }

        renderQuestion();
    }

    if (challenge.nextButton) {
        challenge.nextButton.addEventListener("click", () => {
            if (finished || !answerChecked[currentIndex]) return;

            if (currentIndex === questions.length - 1) {
                finishChallenge();
                return;
            }

            currentIndex += 1;
            renderQuestion();
        });
    }

    if (challenge.restartButton) {
        challenge.restartButton.addEventListener("click", resetChallenge);
    }

    if (challenge.resultRetry) {
        challenge.resultRetry.addEventListener("click", resetChallenge);
    }

    renderQuestion();

    /* -----------------------------------------------
       3. Subject search and category filters
    ----------------------------------------------- */

    const searchInput = $("practice-subject-search");

    const subjectCards = Array.from(
        document.querySelectorAll("[data-practice-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-practice-filter]")
    );

    const resultCount = $("practice-subject-count");
    const emptyState = $("practice-subject-empty");

    let activeCategory = "all";

    function updateSubjectCards() {
        const query = String(searchInput?.value || "")
            .trim()
            .toLocaleLowerCase();

        let visibleCount = 0;

        subjectCards.forEach((card) => {
            const searchableText = [
                card.dataset.practiceName,
                card.dataset.practiceCategory,
                card.textContent
            ].join(" ").toLocaleLowerCase();

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                card.dataset.practiceCategory === activeCategory;

            const isVisible = matchesSearch && matchesCategory;

            card.hidden = !isVisible;

            if (isVisible) visibleCount += 1;
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${
                    visibleCount === 1 ? "subject" : "subjects"
                } found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.practiceFilter || "all";

            filterButtons.forEach((item) => {
                const isActive =
                    item.dataset.practiceFilter === activeCategory;

                item.classList.toggle("is-active", isActive);
                item.setAttribute("aria-pressed", String(isActive));
            });

            updateSubjectCards();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", updateSubjectCards);
    }

    updateSubjectCards();
});
