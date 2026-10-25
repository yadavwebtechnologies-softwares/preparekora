
/* =====================================================
   studykora — Homepage JavaScript
   Sample MCQ and language switching
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const questionText = document.getElementById("sample-question-text");
    const categoryText = document.getElementById("sample-category");
    const optionsContainer = document.getElementById("sample-options");
    const feedback = document.getElementById("sample-feedback");

    const languageButtons = document.querySelectorAll(
        "[data-sample-language]"
    );

    if (!questionText || !optionsContainer || !feedback) return;

    const questions = {
        en: {
            category: "Assam General Knowledge",
            question: "Which city is the capital of Assam?",
            options: [
                "Guwahati",
                "Silchar",
                "Dispur",
                "Jorhat"
            ],
            correctAnswer: "C",
            prompt: "Select an option to check your answer.",
            correctMessage: "Correct! Dispur is the capital of Assam.",
            incorrectMessage: "Not quite. The correct answer is Dispur."
        },

        as: {
            category: "অসমৰ সাধাৰণ জ্ঞান",
            question: "অসমৰ ৰাজধানী কোনখন চহৰ?",
            options: [
                "গুৱাহাটী",
                "শিলচৰ",
                "দিছপুৰ",
                "যোৰহাট"
            ],
            correctAnswer: "C",
            prompt: "আপোনাৰ উত্তৰ পৰীক্ষা কৰিবলৈ এটা বিকল্প বাছনি কৰক।",
            correctMessage: "শুদ্ধ উত্তৰ! দিছপুৰ অসমৰ ৰাজধানী।",
            incorrectMessage: "শুদ্ধ উত্তৰটো হৈছে দিছপুৰ।"
        }
    };

    let currentLanguage = "en";
    let answered = false;

    function resetQuestion() {
        answered = false;

        optionsContainer.querySelectorAll(".option-item").forEach((option) => {
            option.classList.remove("is-selected");
            option.setAttribute("aria-pressed", "false");
            option.disabled = false;
        });

        feedback.textContent = questions[currentLanguage].prompt;
        feedback.removeAttribute("data-result");
    }

    function renderQuestion(language) {
        const data = questions[language];

        if (!data) return;

        currentLanguage = language;

        categoryText.textContent = data.category;
        questionText.textContent = data.question;

        optionsContainer.querySelectorAll(".option-item").forEach((option) => {
            const answer = option.dataset.answer;
            const optionText = option.querySelector("span:nth-child(2)");

            if (!optionText || !answer) return;

            const index = answer.charCodeAt(0) - 65;

            optionText.textContent = data.options[index] ?? "";
        });

        languageButtons.forEach((button) => {
            const isActive = button.dataset.sampleLanguage === language;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        resetQuestion();
    }

    function checkAnswer(selectedOption) {
        if (answered) return;

        const selectedAnswer = selectedOption.dataset.answer;
        const data = questions[currentLanguage];

        if (!selectedAnswer || !data) return;

        answered = true;

        optionsContainer.querySelectorAll(".option-item").forEach((option) => {
            const isSelected = option === selectedOption;

            option.classList.toggle("is-selected", isSelected);
            option.setAttribute("aria-pressed", String(isSelected));
            option.disabled = true;
        });

        const isCorrect = selectedAnswer === data.correctAnswer;

        feedback.textContent = isCorrect
            ? data.correctMessage
            : data.incorrectMessage;

        feedback.dataset.result = isCorrect ? "correct" : "incorrect";
    }

    optionsContainer.addEventListener("click", (event) => {
        const option = event.target.closest(".option-item");

        if (!option || !optionsContainer.contains(option)) return;

        checkAnswer(option);
    });

    languageButtons.forEach((button) => {
        button.addEventListener("click", () => {
            renderQuestion(button.dataset.sampleLanguage);
        });
    });

    renderQuestion("en");
});
