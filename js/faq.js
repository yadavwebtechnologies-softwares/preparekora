
/* =====================================================
   studyKora — FAQ Page
   Search, category filters and expandable answers
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("faq-search");

    const faqItems = Array.from(
        document.querySelectorAll("[data-faq-item]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-faq-filter]")
    );

    const resultCount = document.getElementById("faq-result-count");
    const emptyState = document.getElementById("faq-empty-state");

    if (!faqItems.length) return;

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "")
            .trim()
            .toLocaleLowerCase();
    }

    function setItemExpanded(item, expanded) {
        const button = item.querySelector(".faq-question");
        const answerId = button?.getAttribute("aria-controls");
        const answer = answerId
            ? document.getElementById(answerId)
            : null;

        if (!button || !answer) return;

        button.setAttribute("aria-expanded", String(expanded));
        answer.hidden = !expanded;

        const toggle = button.querySelector(".faq-toggle");

        if (toggle) {
            toggle.textContent = expanded ? "−" : "+";
        }
    }

    function updateFaqItems() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        faqItems.forEach((item) => {
            const category = item.dataset.faqCategory || "";

            const searchableText = normalize([
                item.dataset.faqQuestion,
                item.dataset.faqAnswer,
                item.textContent
            ].join(" "));

            const matchesQuery = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                category === activeCategory;

            const isVisible = matchesQuery && matchesCategory;

            item.hidden = !isVisible;

            if (!isVisible) {
                setItemExpanded(item, false);
            }

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${
                    visibleCount === 1 ? "question" : "questions"
                } found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount > 0;
        }
    }

    function setActiveFilter(category) {
        activeCategory = category;

        filterButtons.forEach((button) => {
            const active =
                button.dataset.faqFilter === category;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        updateFaqItems();
    }

    /* Expand/collapse each FAQ */

    faqItems.forEach((item) => {
        const button = item.querySelector(".faq-question");

        if (!button) return;

        button.addEventListener("click", () => {
            const isExpanded =
                button.getAttribute("aria-expanded") === "true";

            setItemExpanded(item, !isExpanded);
        });
    });

    /* Search */

    if (searchInput) {
        searchInput.addEventListener("input", updateFaqItems);
    }

    /* Category filters */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.faqFilter;

            if (category) {
                setActiveFilter(category);
            }
        });
    });

    /* Initial state */

    updateFaqItems();
});
