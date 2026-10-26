/* StudyKora FAQ Accordion
   Handles FAQ open/close interactions only.
   No search or filter functionality.
*/

(() => {
    "use strict";

    const faqQuestions = document.querySelectorAll(".faq-question");

    if (!faqQuestions.length) return;

    function setFaqState(button, isOpen) {
        const panelId = button.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;

        if (!panel) return;

        button.setAttribute("aria-expanded", String(isOpen));
        panel.hidden = !isOpen;

        const toggle = button.querySelector(".faq-toggle");

        if (toggle) {
            toggle.textContent = isOpen ? "\u2212" : "+";
        }
    }

    faqQuestions.forEach((button) => {
        const panelId = button.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;

        if (!panel) return;

        // Keep the initial accordion state consistent with the HTML.
        setFaqState(
            button,
            button.getAttribute("aria-expanded") === "true" && !panel.hidden
        );

        button.addEventListener("click", () => {
            const shouldOpen = button.getAttribute("aria-expanded") !== "true";

            // Close other questions before opening the selected question.
            faqQuestions.forEach((otherButton) => {
                if (otherButton !== button) {
                    setFaqState(otherButton, false);
                }
            });

            setFaqState(button, shouldOpen);
        });
    });
})();
