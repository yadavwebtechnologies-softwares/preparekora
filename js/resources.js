
/* =====================================================
   studyKora — Resources Page
   Search, category filters and result visibility
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("resource-search");

    const resourceCards = Array.from(
        document.querySelectorAll("[data-resource-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-resource-filter]")
    );

    const resultCount = document.getElementById("resource-result-count");
    const emptyState = document.getElementById("resource-empty-state");

    if (!resourceCards.length) return;

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "").trim().toLocaleLowerCase();
    }

    function updateResources() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        resourceCards.forEach((card) => {
            const category = card.dataset.resourceCategory || "";

            const searchableText = normalize([
                card.dataset.resourceName,
                card.dataset.resourceDescription,
                category,
                card.textContent
            ].join(" "));

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                category === activeCategory;

            const isVisible = matchesSearch && matchesCategory;

            card.hidden = !isVisible;

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${
                    visibleCount === 1 ? "resource" : "resources"
                } found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    function setActiveCategory(category) {
        activeCategory = category;

        filterButtons.forEach((button) => {
            const isActive =
                button.dataset.resourceFilter === category;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        updateResources();
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.resourceFilter;

            if (!category) return;

            setActiveCategory(category);
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", updateResources);
    }

    updateResources();
});
