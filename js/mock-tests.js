/* =====================================================
   StudyKora — Mock Tests
   Search, category filters and test access
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const searchInput = $("mock-test-search");
    const filterContainer = $("mock-test-filters");
    const resultCount = $("mock-test-result-count");
    const grid = $("mock-test-grid");
    const emptyState = $("mock-test-empty-state");

    const mainHero = $("mock-tests-main-hero");
    const categoryHero = $("mock-category-hero");
    const categoryLabel = $("mock-category-label");
    const categoryTitle = $("mock-category-title");
    const categoryDescription = $("mock-category-description");

    const listHeading = $("mock-list-heading");
    const listDescription = $("mock-list-description");

    if (!grid || !filterContainer) {
        console.error(
            "[StudyKora Mock Tests] Required elements not found.",
            { grid: Boolean(grid), filters: Boolean(filterContainer) }
        );
        return;
    }

    const cards = Array.from(grid.querySelectorAll("[data-mock-card]"));
    const filterButtons = Array.from(
        filterContainer.querySelectorAll("[data-mock-filter]")
    );

    const categories = {
        all: {
            label: "All Mock Tests",
            title: "Mock Tests",
            description: "Browse available mock tests across exam categories.",
            listTitle: "Find Your Mock Test",
            listDescription: "Search by exam name or filter tests by category."
        },

        administration: {
            label: "APSC",
            title: "APSC Mock Tests",
            description: "Explore practice tests for Assam civil services examinations.",
            listTitle: "APSC Practice Tests",
            listDescription: "Search and browse APSC practice test entries."
        },

        recruitment: {
            label: "ADRE",
            title: "ADRE Mock Tests",
            description: "Explore practice tests for Assam Direct Recruitment examinations.",
            listTitle: "ADRE Practice Tests",
            listDescription: "Search and browse ADRE practice test entries."
        },

        police: {
            label: "Assam Police",
            title: "Assam Police Mock Tests",
            description: "Browse practice tests for Assam Police recruitment.",
            listTitle: "Assam Police Practice Tests",
            listDescription: "Search and browse Assam Police practice test entries."
        },

        health: {
            label: "Health",
            title: "Health Entrance Mock Tests",
            description: "Explore health and nursing entrance practice tests.",
            listTitle: "Health Practice Tests",
            listDescription: "Search and browse health-related practice entries."
        },

        education: {
            label: "TET",
            title: "Teacher Eligibility Tests",
            description: "Explore practice tests for teacher eligibility examinations.",
            listTitle: "Education Practice Tests",
            listDescription: "Search and browse education-related practice entries."
        },

        other: {
            label: "Other Exams",
            title: "Other Competitive Exam Tests",
            description: "Browse practice entries for other competitive examinations.",
            listTitle: "Other Exam Practice Tests",
            listDescription: "Search and browse other exam practice entries."
        }
    };

    const categoryAliases = {
        apsc: "administration",
        administration: "administration",
        adre: "recruitment",
        recruitment: "recruitment",
        "assam-police": "police",
        police: "police",
        health: "health",
        tet: "education",
        education: "education",
        other: "other",
        ssc: "other",
        all: "all"
    };

    let activeCategory = "all";
    let searchTerm = "";

    /* ---------- Session state ---------- */

    function hasSavedLoginSession() {
        try {
            const session = JSON.parse(
                sessionStorage.getItem("studyKoraSession") || "null"
            );

            return Boolean(
                session?.idToken &&
                session?.user?.email
            );
        } catch {
            return false;
        }
    }

    /* ---------- Category selection ---------- */

    function setActiveCategory(category) {
        activeCategory = categories[category] ? category : "all";

        filterButtons.forEach((button) => {
            const isActive =
                button.dataset.mockFilter === activeCategory;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        updateCategoryBanner();
        applyFilters();
    }

    function updateCategoryBanner() {
        const data = categories[activeCategory] || categories.all;

        if (activeCategory === "all") {
            if (mainHero) mainHero.hidden = false;
            if (categoryHero) categoryHero.hidden = true;
        } else {
            if (mainHero) mainHero.hidden = true;
            if (categoryHero) categoryHero.hidden = false;

            if (categoryLabel) {
                categoryLabel.textContent = data.label;
            }

            if (categoryTitle) {
                categoryTitle.textContent = data.title;
            }

            if (categoryDescription) {
                categoryDescription.textContent = data.description;
            }
        }

        if (listHeading) {
            listHeading.textContent = data.listTitle;
        }

        if (listDescription) {
            listDescription.textContent = data.listDescription;
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.mockFilter;

            if (!categories[category]) {
                console.warn(
                    "[StudyKora Mock Tests] Unknown category:",
                    category
                );
                return;
            }

            setActiveCategory(category);
        });
    });

    /* ---------- Search and card filtering ---------- */

    function cardMatchesCategory(card) {
        if (activeCategory === "all") return true;

        return card.dataset.mockCategory === activeCategory;
    }

    function cardMatchesSearch(card) {
        if (!searchTerm) return true;

        const searchableText = [
            card.dataset.mockId || "",
            card.dataset.mockCategory || "",
            card.dataset.mockName || "",
            card.dataset.mockDescription || "",
            card.textContent || ""
        ].join(" ").toLowerCase();

        return searchableText.includes(searchTerm);
    }

    function applyFilters() {
        let visibleCount = 0;

        cards.forEach((card) => {
            const visible =
                cardMatchesCategory(card) &&
                cardMatchesSearch(card);

            card.hidden = !visible;

            if (visible) {
                visibleCount += 1;
            }
        });

        if (resultCount) {
            resultCount.textContent =
                `Showing ${visibleCount} of ${cards.length} mock tests.`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }

        if (grid) {
            grid.setAttribute("aria-busy", "false");
        }

        console.info("[StudyKora Mock Tests] Results updated:", {
            category: activeCategory,
            search: searchTerm,
            visible: visibleCount,
            total: cards.length
        });
    }

    searchInput?.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        applyFilters();
    });

    /* ---------- Category from URL ---------- */

    function initializeFromURL() {
        const params = new URLSearchParams(window.location.search);
        const requestedCategory = (
            params.get("category") || "all"
        ).trim().toLowerCase();

        const mappedCategory =
            categoryAliases[requestedCategory] || "all";

        setActiveCategory(mappedCategory);

        const requestedSearch = params.get("search");

        if (requestedSearch && searchInput) {
            searchInput.value = requestedSearch;
            searchTerm = requestedSearch.trim().toLowerCase();
            applyFilters();
        }
    }

    /* ---------- Login required for starting tests ---------- */

    function initializeTestAccess() {
        grid.querySelectorAll('a[href*="test.html?test="]').forEach((link) => {
            link.addEventListener("click", (event) => {
                if (hasSavedLoginSession()) {
                    return;
                }

                event.preventDefault();

                window.location.assign("auth.html?mode=login");
            });
        });
    }

    /* ---------- Initialize ---------- */

    initializeTestAccess();
    initializeFromURL();

    console.info("[StudyKora Mock Tests] Initialized successfully.");
});
