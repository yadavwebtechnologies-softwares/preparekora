
/* StudyKora Current Affairs */
"use strict";

(function () {
    const searchInput = document.getElementById("current-affairs-search");
    const categorySelect = document.getElementById("current-affairs-category");
    const sortSelect = document.getElementById("current-affairs-sort");
    const grid = document.getElementById("current-affairs-grid");
    const resultCount = document.getElementById("current-affairs-result-count");
    const emptyState = document.getElementById("current-affairs-empty");
    const resetButton = document.getElementById("current-affairs-reset");
    const emptyResetButton = document.getElementById("current-affairs-empty-reset");
    const yearElement = document.getElementById("current-year");

    if (
        !searchInput ||
        !categorySelect ||
        !sortSelect ||
        !grid ||
        !resultCount ||
        !emptyState
    ) {
        console.error("[StudyKora Current Affairs] Required page elements are missing.");
        return;
    }

    /*
     * Replace these sample entries with verified current-affairs data.
     * Dates must use YYYY-MM-DD format.
     *
     * For a production news feed, load articles from a trusted API or
     * your own Firebase-backed publishing system.
     */
    const articles = [
        {
            id: "sample-assam",
            title: "Assam Current Affairs",
            summary: "Add a verified update about Assam, with its date and reliable source.",
            category: "assam",
            date: "2026-01-01",
            sourceName: "Add official source",
            sourceUrl: ""
        },
        {
            id: "sample-national",
            title: "National Current Affairs",
            summary: "Add a verified national news update relevant to competitive examinations.",
            category: "national",
            date: "2026-01-02",
            sourceName: "Add official source",
            sourceUrl: ""
        },
        {
            id: "sample-international",
            title: "International Current Affairs",
            summary: "Add a verified international development and its examination-relevant facts.",
            category: "international",
            date: "2026-01-03",
            sourceName: "Add official source",
            sourceUrl: ""
        }
    ];

    const categoryNames = {
        assam: "Assam",
        national: "National",
        international: "International",
        economy: "Economy",
        science: "Science and Technology",
        environment: "Environment",
        sports: "Sports",
        awards: "Awards and Appointments"
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function isValidSourceURL(url) {
        if (!url) return false;

        try {
            const parsedURL = new URL(url);
            return parsedURL.protocol === "https:" || parsedURL.protocol === "http:";
        } catch {
            return false;
        }
    }

    function createArticleCard(article) {
        const category = categoryNames[article.category] || "General Awareness";
        const safeTitle = escapeHTML(article.title);
        const safeSummary = escapeHTML(article.summary);
        const safeCategory = escapeHTML(category);
        const safeDate = escapeHTML(formatDate(article.date));
        const safeSource = escapeHTML(article.sourceName || "Source not provided");

        const sourceLink = isValidSourceURL(article.sourceUrl)
            ? `<a class="current-affairs-source-link"
                   href="${escapeHTML(article.sourceUrl)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   View source
               </a>`
            : "";

        return `
            <article class="panel current-affairs-card" data-article-id="${escapeHTML(article.id)}">
                <div class="current-affairs-card-top">
                    <span class="current-affairs-category">${safeCategory}</span>
                    <time datetime="${escapeHTML(article.date)}">${safeDate}</time>
                </div>

                <div class="current-affairs-card-body">
                    <h3>${safeTitle}</h3>
                    <p>${safeSummary}</p>
                </div>

                <div class="current-affairs-card-footer">
                    <span class="current-affairs-source">${safeSource}</span>
                    ${sourceLink}
                </div>
            </article>
        `;
    }

    function getFilteredArticles() {
        const query = searchInput.value.trim().toLocaleLowerCase();
        const selectedCategory = categorySelect.value;
        const selectedSort = sortSelect.value;

        const filtered = articles.filter(function (article) {
            const matchesCategory =
                selectedCategory === "all" ||
                article.category === selectedCategory;

            const searchableText = [
                article.title,
                article.summary,
                article.category,
                article.sourceName
            ].join(" ").toLocaleLowerCase();

            const matchesSearch = !query || searchableText.includes(query);

            return matchesCategory && matchesSearch;
        });

        filtered.sort(function (a, b) {
            if (selectedSort === "oldest") {
                return a.date.localeCompare(b.date);
            }

            if (selectedSort === "title") {
                return a.title.localeCompare(b.title);
            }

            return b.date.localeCompare(a.date);
        });

        return filtered;
    }

    function renderArticles() {
        const filteredArticles = getFilteredArticles();

        grid.innerHTML = filteredArticles.map(createArticleCard).join("");

        resultCount.textContent =
            `Showing ${filteredArticles.length} of ${articles.length} updates.`;

        const hasResults = filteredArticles.length > 0;

        emptyState.hidden = hasResults;
        grid.hidden = !hasResults;

        console.info(
            "[StudyKora Current Affairs] Rendered:",
            filteredArticles.length,
            "of",
            articles.length
        );
    }

    function resetFilters() {
        searchInput.value = "";
        categorySelect.value = "all";
        sortSelect.value = "newest";
        renderArticles();
    }

    searchInput.addEventListener("input", renderArticles);
    categorySelect.addEventListener("change", renderArticles);
    sortSelect.addEventListener("change", renderArticles);

    if (resetButton) {
        resetButton.addEventListener("click", resetFilters);
    }

    if (emptyResetButton) {
        emptyResetButton.addEventListener("click", resetFilters);
    }

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    renderArticles();

    console.info("[StudyKora Current Affairs] Initialized.");
})();
