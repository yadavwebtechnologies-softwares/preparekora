
/* =====================================================
   studyKora — Mock Tests
   Search, filters, category banners and URL handling
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("mock-test-search");

    const testCards = Array.from(
        document.querySelectorAll("[data-mock-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-mock-filter]")
    );

    const mainHero = document.getElementById("mock-tests-main-hero");
    const categoryHero = document.getElementById("mock-category-hero");

    const categoryLabel = document.getElementById("mock-category-label");
    const categoryTitle = document.getElementById("mock-category-title");
    const categoryDescription = document.getElementById(
        "mock-category-description"
    );

    const listHeading = document.getElementById("mock-list-heading");
    const listDescription = document.getElementById("mock-list-description");

    const resultCount = document.getElementById("mock-test-result-count");
    const emptyState = document.getElementById("mock-test-empty-state");

    if (!testCards.length) return;

    const categories = {
        administration: {
            label: "Civil Services",
            title: "APSC Mock Tests",
            description:
                "Explore practice tests prepared for APSC examination preparation.",
            heading: "APSC Practice Tests",
            listDescription:
                "Browse the APSC-related test entries currently listed."
        },

        recruitment: {
            label: "Recruitment",
            title: "Recruitment Mock Tests",
            description:
                "Explore recruitment-oriented practice tests, including ADRE.",
            heading: "Recruitment Practice Tests",
            listDescription:
                "Search and review recruitment test listings."
        },

        police: {
            label: "Police Recruitment",
            title: "Assam Police Mock Tests",
            description:
                "Find practice test entries for Assam Police recruitment preparation.",
            heading: "Police Practice Tests",
            listDescription:
                "Browse police examination practice listings."
        },

        health: {
            label: "Health Sciences",
            title: "Health Entrance Mock Tests",
            description:
                "Explore nursing and health sciences entrance practice entries.",
            heading: "Health Sciences Tests",
            listDescription:
                "Browse health-related entrance practice listings."
        },

        education: {
            label: "Education",
            title: "Teacher Eligibility Tests",
            description:
                "Explore teacher eligibility examination practice entries.",
            heading: "Education Practice Tests",
            listDescription:
                "Browse teacher eligibility test listings."
        },

        other: {
            label: "Other Examinations",
            title: "Other Mock Tests",
            description:
                "Explore additional competitive examination practice entries.",
            heading: "Other Practice Tests",
            listDescription:
                "Browse other examination practice listings."
        }
    };

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "").trim().toLocaleLowerCase();
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
        const selectedCategory = categories[category];
        const hasSpecificCategory = Boolean(selectedCategory);

        if (mainHero) {
            mainHero.hidden = hasSpecificCategory;
        }

        if (categoryHero) {
            categoryHero.hidden = !hasSpecificCategory;
        }

        if (!selectedCategory) {
            document.title = "Mock Tests | studyKora";

            if (listHeading) {
                listHeading.textContent = "Find Your Mock Test";
            }

            if (listDescription) {
                listDescription.textContent =
                    "Search by exam name or filter tests by category.";
            }

            return;
        }

        if (categoryLabel) {
            categoryLabel.textContent = selectedCategory.label;
        }

        if (categoryTitle) {
            categoryTitle.textContent = selectedCategory.title;
        }

        if (categoryDescription) {
            categoryDescription.textContent =
                selectedCategory.description;
        }

        if (listHeading) {
            listHeading.textContent = selectedCategory.heading;
        }

        if (listDescription) {
            listDescription.textContent =
                selectedCategory.listDescription;
        }

        document.title = `${selectedCategory.title} | studyKora`;
    }

    function updateActiveButtons() {
        filterButtons.forEach((button) => {
            const isActive =
                button.dataset.mockFilter === activeCategory;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function updateCards() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        testCards.forEach((card) => {
            const searchableText = normalize([
                card.dataset.mockId,
                card.dataset.mockName,
                card.dataset.mockDescription,
                card.dataset.mockCategory,
                card.textContent
            ].join(" "));

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                card.dataset.mockCategory === activeCategory;

            const isVisible = matchesSearch && matchesCategory;

            card.hidden = !isVisible;

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${
                    visibleCount === 1 ? "test" : "tests"
                } found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    function setCategory(category, syncUrl = true) {
        const isValidCategory =
            category === "all" ||
            Object.prototype.hasOwnProperty.call(categories, category);

        activeCategory = isValidCategory ? category : "all";

        updateBanner(activeCategory);
        updateActiveButtons();
        updateCards();

        if (syncUrl) {
            updateUrl(activeCategory);
        }
    }

    /* Category filters */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.mockFilter;

            if (category) {
                setCategory(category);
            }
        });
    });

    /* Search input */

    if (searchInput) {
        searchInput.addEventListener("input", updateCards);
    }

    /* Direct URLs and browser navigation */

    function loadCategoryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const requestedCategory = normalize(params.get("category"));

        setCategory(requestedCategory || "all", false);
    }

    window.addEventListener("popstate", loadCategoryFromUrl);

    /* Initial state */

    loadCategoryFromUrl();
});
