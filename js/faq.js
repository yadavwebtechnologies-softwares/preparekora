```javascript
document.addEventListener("DOMContentLoaded", () => {
    const faqList = document.getElementById("faq-list");
    const searchInput = document.getElementById("faq-search");
    const resultCount = document.getElementById("faq-result-count");
    const emptyState = document.getElementById("faq-empty-state");

    if (!faqList) return;

    const faqItems = Array.from(
        faqList.querySelectorAll("[data-faq-item]")
    );

    function closeFaq(item) {
        const question = item.querySelector(".faq-question");
        const answer = question
            ? document.getElementById(question.getAttribute("aria-controls"))
            : null;
        const toggle = item.querySelector(".faq-toggle");

        if (question) {
            question.setAttribute("aria-expanded", "false");
        }

        if (answer) {
            answer.hidden = true;
        }

        if (toggle) {
            toggle.textContent = "+";
        }
    }

    function openFaq(item) {
        const question = item.querySelector(".faq-question");
        const answer = question
            ? document.getElementById(question.getAttribute("aria-controls"))
            : null;
        const toggle = item.querySelector(".faq-toggle");

        if (!question || !answer) return;

        question.setAttribute("aria-expanded", "true");
        answer.hidden = false;

        if (toggle) {
            toggle.textContent = "−";
        }
    }

    // Accordion: keep only one answer open.
    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question");

        if (!question) return;

        question.addEventListener("click", () => {
            if (item.hidden) return;

            const isExpanded =
                question.getAttribute("aria-expanded") === "true";

            faqItems.forEach(closeFaq);

            if (!isExpanded) {
                openFaq(item);
            }
        });
    });

    // Search questions and answers.
    function filterFaqs() {
        const query = (searchInput?.value || "")
            .trim()
            .toLowerCase();

        let visibleCount = 0;

        faqItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            const matches = !query || text.includes(query);

            item.hidden = !matches;

            if (matches) {
                visibleCount++;
            } else {
                closeFaq(item);
            }
        });

        if (emptyState) {
            emptyState.hidden = visibleCount > 0;
        }

        if (resultCount) {
            if (!query) {
                resultCount.textContent = "Showing all questions.";
            } else {
                resultCount.textContent =
                    `${visibleCount} question${visibleCount === 1 ? "" : "s"} found.`;
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterFaqs);
    }

    // Set the correct initial state.
    faqItems.forEach((item) => {
        closeFaq(item);
        item.hidden = false;
    });

    filterFaqs();
});
```
