/* StudyKora FAQ Accordion */

document.addEventListener("DOMContentLoaded", () => {
    const faqList = document.getElementById("faq-list");

    if (!faqList) return;

    const questions = faqList.querySelectorAll(".faq-question");

    questions.forEach((question) => {
        question.addEventListener("click", () => {
            const answerId = question.getAttribute("aria-controls");
            const answer = document.getElementById(answerId);

            if (!answer) return;

            const isExpanded =
                question.getAttribute("aria-expanded") === "true";

            // Close all FAQ answers for a consistent accordion layout
            questions.forEach((item) => {
                const itemAnswerId = item.getAttribute("aria-controls");
                const itemAnswer = document.getElementById(itemAnswerId);

                item.setAttribute("aria-expanded", "false");

                if (itemAnswer) {
                    itemAnswer.hidden = true;
                }

                const toggle = item.querySelector(".faq-toggle");

                if (toggle) {
                    toggle.textContent = "+";
                }
            });

            // Open the selected answer if it was previously closed
            if (!isExpanded) {
                question.setAttribute("aria-expanded", "true");
                answer.hidden = false;

                const toggle = question.querySelector(".faq-toggle");

                if (toggle) {
                    toggle.textContent = "−";
                }
            }
        });
    });
});
