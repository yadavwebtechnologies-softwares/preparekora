
/* =====================================================
   studyKora — Current Affairs
   Category selection, search, URL state and page headings
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("current-affairs-search");

    const categoryCards = Array.from(
        document.querySelectorAll("[data-ca-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-ca-filter]")
    );

    const mainHero = document.getElementById(
        "current-affairs-main-hero"
    );

    const categoryHero = document.getElementById(
        "current-affairs-category-hero"
    );

    const categoryLabel = document.getElementById(
        "current-affairs-category-label"
    );

    const categoryTitle = document.getElementById(
        "current-affairs-category-title"
    );

    const categoryDescription = document.getElementById(
        "current-affairs-category-description"
    );

    const contentHeading = document.getElementById(
        "current-affairs-content-heading"
    );

    const contentDescription = document.getElementById(
        "current-affairs-content-description"
    );

    const resultCount = document.getElementById(
        "current-affairs-result-count"
    );

    const emptyTitle = document.getElementById(
        "current-affairs-empty-title"
    );

    const emptyDescription = document.getElementById(
        "current-affairs-empty-description"
    );

    const categoryDetails = {
        daily: {
            title: "Daily Updates",
            description:
                "Review dated current affairs updates and important events for competitive exam preparation.",
            contentHeading: "Daily Current Affairs",
            contentDescription:
                "Search and explore daily news and revision material.",
            emptyTitle: "Daily updates are not available yet",
            emptyDescription:
                "Verified, dated current affairs content will appear here once it is added."
        },

        assam: {
            title: "Assam Affairs",
            description:
                "Explore Assam-related events, government initiatives, culture and important developments.",
            contentHeading: "Assam Current Affairs",
            contentDescription:
                "Find updates related to Assam and its important developments.",
            emptyTitle: "Assam updates are not available yet",
            emptyDescription:
                "Verified Assam-related updates will appear here once they are added."
        },

        national: {
            title: "National Affairs",
            description:
                "Review important national developments, public policies and events across India.",
            contentHeading: "National Current Affairs",
            contentDescription:
                "Explore national updates relevant to competitive examinations.",
            emptyTitle: "National updates are not available yet",
            emptyDescription:
                "Verified, dated national updates will appear here once they are added."
        },

        quiz: {
            title: "Current Affairs Quiz",
            description:
                "Test your understanding of current affairs through multiple-choice questions.",
            contentHeading: "Current Affairs Practice",
            contentDescription:
                "Search and explore available current affairs practice material.",
            emptyTitle: "Current affairs quizzes are not available yet",
            emptyDescription:
                "Quiz cards will appear here once question sets are configured."
        }
    };

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "").trim().toLocaleLowerCase();
    }

    function getCategoryFromCard(card) {
        return card.dataset.caId || "";
    }

    function updateUrl(category) {
        const url = new URL(window.location.href);

        if (category === "all") {
            url.searchParams.delete("category");
        } else {
            url.searchParams.set("category", category);
        }

        window.history.replaceState({}, "", url);
    }

    function updateBanner(category) {
        const isSpecificCategory =
            category !== "all" && Boolean(categoryDetails[category]);

        if (mainHero) {
            mainHero.hidden = isSpecificCategory;
        }

        if (categoryHero) {
            categoryHero.hidden = !isSpecificCategory;
        }

        if (!isSpecificCategory) {
            document.title = "Current Affairs | studyKora";
            return;
        }

        const details = categoryDetails[category];

        if (categoryLabel) {
            categoryLabel.textContent = "Current Affairs";
        }

        if (categoryTitle) {
            categoryTitle.textContent = details.title;
        }

        if (categoryDescription) {
            categoryDescription.textContent = details.description;
        }

        if (contentHeading) {
            contentHeading.textContent = details.contentHeading;
        }

        if (contentDescription) {
            contentDescription.textContent =
                details.contentDescription;
        }

        if (emptyTitle) {
            emptyTitle.textContent = details.emptyTitle;
        }

        if (emptyDescription) {
            emptyDescription.textContent = details.emptyDescription;
        }

        document.title = `${details.title} | studyKora`;
    }

    function updateFilters() {
        filterButtons.forEach((button) => {
            const isActive =
                button.dataset.caFilter === activeCategory;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function updateCards() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        categoryCards.forEach((card) => {
            const category = getCategoryFromCard(card);

            const searchableText = normalize([
                card.dataset.caName,
                card.dataset.caDescription,
                card.dataset.caKeywords,
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
                    visibleCount === 1 ? "category" : "categories"
                } found`;
        }
    }

    function setCategory(category, syncUrl = true) {
        const isValidCategory =
            category === "all" ||
            Object.prototype.hasOwnProperty.call(
                categoryDetails,
                category
            );

        activeCategory = isValidCategory ? category : "all";

        updateBanner(activeCategory);
        updateFilters();
        updateCards();

        if (syncUrl) {
            updateUrl(activeCategory);
        }
    }

    /* Category filter buttons */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.caFilter;

            if (category) {
                setCategory(category);
            }
        });
    });

    /* Search category cards */

    if (searchInput) {
        searchInput.addEventListener("input", updateCards);
    }

    /* Support direct links such as ?category=assam */

    function loadCategoryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const requestedCategory = normalize(params.get("category"));

        if (
            requestedCategory &&
            Object.prototype.hasOwnProperty.call(
                categoryDetails,
                requestedCategory
            )
        ) {
            setCategory(requestedCategory, false);
        } else {
            setCategory("all", false);
        }
    }

    window.addEventListener("popstate", loadCategoryFromUrl);

    /* Initial page state */

    loadCategoryFromUrl();
});
