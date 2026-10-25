"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const questionPanel = document.getElementById("sample-question");

    if (!questionPanel) return;

    const languageButtons = Array.from(
        questionPanel.querySelectorAll("[data-sample-language]")
    );

    const optionButtons = Array.from(
        questionPanel.querySelectorAll("[data-answer]")
    );

    const categoryElement = document.getElementById("sample-category");
    const questionElement = document.getElementById("sample-question-text");
    const feedbackElement = document.getElementById("sample-feedback");
    const labelElement = document.getElementById("sample-label");

    const correctAnswer = "C";

    const questions = {
        en: {
            label: "Try a Sample MCQ",
            category: "Assam General Knowledge",
            question: "Which city is the capital of Assam?",
            options: {
                A: "Guwahati",
                B: "Silchar",
                C: "Dispur",
                D: "Jorhat"
            },
            choose: "Select an option to check your answer.",
            correct: "Correct! Dispur is the capital of Assam.",
            incorrect: "Not quite. The correct answer is Dispur."
        },

        as: {
            label: "এটা নমুনা MCQ চেষ্টা কৰক",
            category: "অসমৰ সাধাৰণ জ্ঞান",
            question: "অসমৰ ৰাজধানী কোনখন চহৰ?",
            options: {
                A: "গুৱাহাটী",
                B: "শিলচৰ",
                C: "দিছপুৰ",
                D: "যোৰহাট"
            },
            choose: "উত্তৰ পৰীক্ষা কৰিবলৈ এটা বিকল্প বাছনি কৰক।",
            correct: "শুদ্ধ উত্তৰ! দিছপুৰ অসমৰ ৰাজধানী।",
            incorrect: "উত্তৰটো শুদ্ধ নহয়। সঠিক উত্তৰ হৈছে দিছপুৰ।"
        }
    };

    let currentLanguage = "en";
    let answered = false;

    function resetQuestion() {
        answered = false;

        optionButtons.forEach((button) => {
            button.disabled = false;
            button.classList.remove(
                "is-selected",
                "is-correct",
                "is-incorrect"
            );

            button.setAttribute("aria-pressed", "false");
        });

        if (feedbackElement) {
            feedbackElement.textContent =
                questions[currentLanguage].choose;
        }
    }

    function renderQuestion(language) {
        currentLanguage = language;

        const question = questions[language];

        if (!question) return;

        if (labelElement) {
            labelElement.textContent = question.label;
        }

        if (categoryElement) {
            categoryElement.textContent = question.category;
        }

        if (questionElement) {
            questionElement.textContent = question.question;
        }

        optionButtons.forEach((button) => {
            const answer = button.dataset.answer;
            const textElement = button.querySelector("[data-option-text]");

            if (textElement && question.options[answer]) {
                textElement.textContent = question.options[answer];
            }
        });

        languageButtons.forEach((button) => {
            const selected = button.dataset.sampleLanguage === language;

            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });

        resetQuestion();
    }

    function selectAnswer(button) {
        if (answered || button.disabled) return;

        answered = true;

        const selectedAnswer = button.dataset.answer;
        const isCorrect = selectedAnswer === correctAnswer;
        const question = questions[currentLanguage];

        optionButtons.forEach((option) => {
            const answer = option.dataset.answer;
            const isSelected = option === button;

            option.disabled = true;

            option.classList.toggle("is-selected", isSelected);
            option.setAttribute("aria-pressed", String(isSelected));

            if (answer === correctAnswer) {
                option.classList.add("is-correct");
            } else if (isSelected && !isCorrect) {
                option.classList.add("is-incorrect");
            }
        });

        if (feedbackElement) {
            feedbackElement.textContent = isCorrect
                ? question.correct
                : question.incorrect;
        }
    }

    languageButtons.forEach((button) => {
        button.addEventListener("click", () => {
            renderQuestion(button.dataset.sampleLanguage);
        });
    });

    optionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectAnswer(button);
        });
    });

    renderQuestion("en");
});
