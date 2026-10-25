/* StudyKora - Current Affairs Page */
"use strict";

(() => {
    const PAGE_TAG = "[StudyKora Current Affairs]";

    /*
     * Add verified, dated current affairs content to this array.
     *
     * Supported item properties:
     * {
     *   id: "unique-id",
     *   title: "Topic title",
     *   date: "2026-10-25",
     *   category: "daily", // daily, assam, national or quiz
     *   summary: "Short factual summary",
     *   source: "Source name",
     *   sourceUrl: "https://example.com/source",
     *   href: "article.html?id=unique-id" // optional
     * }
     *
     * No unverified news items are inserted by default.
     */

    const CURRENT_AFFAIRS_ITEMS = [];

    const CATEGORY_CONFIG = {
        daily: {
            name: "Daily Updates",
            description:
                "Review daily developments and important events relevant to competitive examinations.",
            heading: "Daily Current Affairs"
        },

        assam: {
            name: "Assam Affairs",
            description:
                "Explore Assam-related events, government initiatives, culture and important developments.",
            heading: "Assam Current Affairs"
        },

        national: {
            name: "National Affairs",
            description:
                "Review important national developments, government policies and events across India.",
            heading: "National Current Affairs"
        },

        quiz: {
            name: "Current Affairs Quiz",
            description:
                "Practise multiple-choice questions to revise current affairs.",
            heading: "Current Affairs Quiz"
        }
    };

    const elements = {
        mainHero: document.getElementById("current-affairs-main-hero"),
        categoryHero: document.getElementById("current-affairs-category-hero"),
        categoryLabel: document.getElementById("current-affairs-category-label"),
        categoryTitle: document.getElementById("current-affairs-category-title"),
        categoryDescription: document.getElementById("current-affairs-category-description"),

        categoriesSection: document.getElementById("current-affairs-categories"),

        search: document.getElementById("current-affairs-search"),
        filters: document.getElementById("current-affairs-filters"),
        filterButtons: Array.from(
            document.querySelectorAll("[data-ca-filter]")
        ),

        contentHeading: document.getElementById("current-affairs-content-heading"),
        contentDescription: document.getElementById("current-affairs-content-description"),
        resultCount: document.getElementById("current-affairs-result-count"),

        itemsContainer: document.getElementById("current-affairs-items"),
        emptyState: document.getElementById("current-affairs-empty-state"),
        emptyTitle: document.getElementById("current-affairs-empty-title"),
        emptyDescription: document.getElementById("current-affairs-empty-description")
    };

    const state = {
        category: "all",
        search: ""
    };

    function log(message, details) {
        if (details !== undefined) {
            console.info(`${PAGE_TAG} ${message}`, details);
        } else {
            console.info(`${PAGE_TAG} ${message}`);
        }
    }

    function warn(message, error) {
        console.warn(`${PAGE_TAG} ${message}`, error || "");
    }

    function getUrlParameters() {
        return new URLSearchParams(window.location.search);
    }

    function normalizeCategory(value) {
        const category = String(value || "").trim().toLowerCase();

        if (category === "all" || Object.hasOwn(CATEGORY_CONFIG, category)) {
            return category;
        }

        return "all";
    }

    function getCategoryConfig(category) {
        return CATEGORY_CONFIG[category] || null;
    }

    function updateHero(category) {
        const selectedCategory = getCategoryConfig(category);
        const showCategoryHero = Boolean(selectedCategory);

        if (elements.mainHero) {
            elements.mainHero.hidden = showCategoryHero;
        }

        if (elements.categoryHero) {
            elements.categoryHero.hidden = !showCategoryHero;
        }

        if (!selectedCategory) {
            return;
        }

        if (elements.categoryLabel) {
            elements.categoryLabel.textContent = selectedCategory.name;
        }

        if (elements.categoryTitle) {
            elements.categoryTitle.textContent = selectedCategory.name;
        }

        if (elements.categoryDescription) {
            elements.categoryDescription.textContent =
                selectedCategory.description;
        }
    }

    function updateCategorySection(category) {
        if (!elements.categoriesSection) {
            return;
        }

        /*
         * Keep category cards visible on the main page.
         * Show the selected category view when a specific category is active.
         */
        elements.categoriesSection.hidden = category !== "all";
    }

    function updateActiveFilter(category) {
        elements.filterButtons.forEach((button) => {
            const isActive = button.dataset.caFilter === category;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function updateHeading(category) {
        const config = getCategoryConfig(category);

        if (elements.contentHeading) {
            elements.contentHeading.textContent = config
                ? config.heading
                : "Explore Current Affairs";
        }

        if (elements.contentDescription) {
            elements.contentDescription.textContent = config
                ? config.description
                : "Search available topics or choose a category to narrow your view.";
        }
    }

    function matchesCategory(item, category) {
        return category === "all" || item.category === category;
    }

    function matchesSearch(item, search) {
        if (!search) {
            return true;
        }

        const searchableText = [
            item.title,
            item.summary,
            item.category,
            item.date,
            item.source
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(search);
    }

    function getFilteredItems() {
        const search = state.search.trim().toLowerCase();

        return CURRENT_AFFAIRS_ITEMS.filter((item) => {
            return (
                matchesCategory(item, state.category) &&
                matchesSearch(item, search)
            );
        });
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "";
        }

        const date = new Date(`${dateValue}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function isSafeHttpUrl(value) {
        if (!value) {
            return false;
        }

        try {
            const url = new URL(value, window.location.href);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }

    function createContentCard(item) {
        const article = createElement("article", "test-card current-affairs-card");

        article.dataset.caItem = "";
        article.dataset.caCategory = item.category || "";
        article.dataset.caId = item.id || "";

        const content = createElement("div", "card-content");

        if (item.date) {
            content.appendChild(
                createElement(
                    "p",
                    "current-affairs-date",
                    formatDate(item.date)
                )
            );
        }

        content.appendChild(
            createElement("h3", "card-title", item.title || "Untitled topic")
        );

        if (item.summary) {
            content.appendChild(
                createElement("p", "card-description", item.summary)
            );
        }

        if (item.source) {
            content.appendChild(
                createElement("p", "current-affairs-source", `Source: ${item.source}`)
            );
        }

        if (item.sourceUrl && isSafeHttpUrl(item.sourceUrl)) {
            const sourceLink = createElement(
                "a",
                "current-affairs-source-link",
                "View source"
            );

            sourceLink.href = item.sourceUrl;
            sourceLink.target = "_blank";
            sourceLink.rel = "noopener noreferrer";
            content.appendChild(sourceLink);
        }

        article.appendChild(content);

        if (item.href && isSafeHttpUrl(item.href)) {
            const action = createElement(
                "a",
                "btn btn-outline current-affairs-card-link",
                item.category === "quiz" ? "Practise Quiz" : "Read More"
            );

            action.href = item.href;
            article.appendChild(action);
        }

        return article;
    }

    function renderItems(items) {
        if (!elements.itemsContainer) {
            warn("Content container was not found.");
            return;
        }

        elements.itemsContainer
            .querySelectorAll("[data-ca-item]")
            .forEach((item) => item.remove());

        if (elements.emptyState) {
            elements.emptyState.hidden = items.length > 0;
        }

        items.forEach((item) => {
            elements.itemsContainer.appendChild(createContentCard(item));
        });

        updateEmptyState(items.length);

        log("Content rendered.", {
            totalConfigured: CURRENT_AFFAIRS_ITEMS.length,
            visible: items.length,
            category: state.category
        });
    }

    function updateEmptyState(visibleCount) {
        if (visibleCount > 0) {
            return;
        }

        if (elements.emptyTitle) {
            elements.emptyTitle.textContent =
                CURRENT_AFFAIRS_ITEMS.length === 0
                    ? "No current affairs content available yet"
                    : "No matching topics found";
        }

        if (elements.emptyDescription) {
            elements.emptyDescription.textContent =
                CURRENT_AFFAIRS_ITEMS.length === 0
                    ? "Verified current affairs updates and quiz questions will appear here once content is added."
                    : "Try another keyword or select a different category.";
        }
    }

    function updateResultCount(visibleCount) {
        if (!elements.resultCount) {
            return;
        }

        const total = CURRENT_AFFAIRS_ITEMS.length;

        if (total === 0) {
            elements.resultCount.textContent =
                "No current affairs content has been published yet.";
            return;
        }

        elements.resultCount.textContent =
            `Showing ${visibleCount} of ${total} current affairs items.`;
    }

    function renderPage() {
        updateHero(state.category);
        updateCategorySection(state.category);
        updateActiveFilter(state.category);
        updateHeading(state.category);

        const filteredItems = getFilteredItems();

        renderItems(filteredItems);
        updateResultCount(filteredItems.length);
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

    function selectCategory(category, options = {}) {
        state.category = normalizeCategory(category);

        if (options.updateUrl) {
            updateUrl(state.category);
        }

        renderPage();

        log("Category selected.", state.category);
    }

    function handleFilterClick(event) {
        const button = event.target.closest("[data-ca-filter]");

        if (!button) {
            return;
        }

        selectCategory(button.dataset.caFilter, {
            updateUrl: true
        });
    }

    function handleSearch(event) {
        state.search = event.target.value || "";

        const filteredItems = getFilteredItems();

        renderItems(filteredItems);
        updateResultCount(filteredItems.length);

        log("Search updated.", {
            query: state.search,
            visible: filteredItems.length
        });
    }

    function handleLoginRequiredLinks(event) {
        const link = event.target.closest("[data-requires-login]");

        if (!link) {
            return;
        }

        let session = null;

        try {
            session = JSON.parse(
                sessionStorage.getItem("studyKoraSession") || "null"
            );
        } catch (error) {
            warn("Could not read session.", error);
        }

        const isLoggedIn = Boolean(
            session &&
            typeof session.idToken === "string" &&
            session.idToken.length > 0 &&
            session.user &&
            typeof session.user.email === "string" &&
            session.user.email.length > 0
        );

        if (!isLoggedIn) {
            event.preventDefault();

            const returnTo = `${link.getAttribute("href") || "test.html?test=current-affairs"}`;

            const loginUrl = new URL("auth.html", window.location.href);
            loginUrl.searchParams.set("mode", "login");
            loginUrl.searchParams.set("returnTo", returnTo);

            window.location.href = loginUrl.toString();

            log("Guest redirected to login.");
        }
    }

    function initialize() {
        if (!elements.itemsContainer) {
            warn("Current affairs content container is missing.");
            return;
        }

        elements.filters?.addEventListener("click", handleFilterClick);
        elements.search?.addEventListener("input", handleSearch);

        document.addEventListener("click", handleLoginRequiredLinks);

        const params = getUrlParameters();

        state.category = normalizeCategory(params.get("category"));
        state.search = params.get("search") || "";

        if (elements.search) {
            elements.search.value = state.search;
        }

        renderPage();

        log("Page initialized.", {
            category: state.category,
            configuredItems: CURRENT_AFFAIRS_ITEMS.length
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
