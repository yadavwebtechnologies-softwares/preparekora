"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const DB_BASE = "https://studykora-fc91d-default-rtdb.firebaseio.com";

    const el = {
        directoryHero: document.getElementById("subject-directory-hero"),
        detailHero: document.getElementById("subject-detail-hero"),
        directory: document.getElementById("subject-directory"),
        detailContent: document.getElementById("subject-detail-content"),

        search: document.getElementById("subject-search"),
        filters: document.getElementById("subject-filters"),
        grid: document.getElementById("subject-grid"),
        resultCount: document.getElementById("subject-result-count"),
        emptyState: document.getElementById("subject-empty-state"),

        category: document.getElementById("subject-detail-category"),
        title: document.getElementById("subject-detail-title"),
        description: document.getElementById("subject-detail-description"),
        about: document.getElementById("subject-detail-about"),
        tags: document.getElementById("subject-detail-tags"),
        topics: document.getElementById("subject-topics"),

        startTest: document.getElementById("subject-start-test"),
        practiceButton: document.getElementById("subject-practice-button")
    };

    const rtdbSubjects = {};

    function createElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function makeTestUrl(subjectId, topic) {
        const params = new URLSearchParams();
        params.set("subject", subjectId);
        if (topic) params.set("topic", topic);
        return `test.html?${params.toString()}`;
    }

    function makeTopicSlug(topic) {
        return topic
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function deriveFilter(category) {
        const c = String(category || "").toLowerCase();
        if (c.includes("language")) return "language";
        if (c.includes("aptitude")) return "aptitude";
        if (c.includes("general")) return "general";
        return "other";
    }

    function updateSubjectDirectory() {
        if (!el.grid) return;

        const searchTerm = el.search
            ? el.search.value.trim().toLowerCase()
            : "";

        const activeButton = el.filters
            ? el.filters.querySelector(
                '[data-subject-filter][aria-pressed="true"]'
            )
            : null;

        const activeFilter = activeButton
            ? activeButton.dataset.subjectFilter
            : "all";

        const cards = Array.from(
            el.grid.querySelectorAll("[data-subject-card]")
        );

        let visibleCount = 0;

        cards.forEach((card) => {
            const name = card.dataset.subjectName || "";
            const id = card.dataset.subjectId || "";
            const category = card.dataset.subjectCategory || "";
            const description =
                card.querySelector(".card-description")?.textContent || "";

            const searchText =
                `${name} ${id} ${category} ${description}`.toLowerCase();

            const matchesSearch = searchText.includes(searchTerm);
            const matchesFilter =
                activeFilter === "all" || category === activeFilter;
            const visible = matchesSearch && matchesFilter;

            card.hidden = !visible;
            if (visible) visibleCount++;
        });

        if (el.resultCount) {
            el.resultCount.textContent =
                `Showing ${visibleCount} of ${cards.length} subjects.`;
        }

        if (el.emptyState) {
            el.emptyState.hidden = visibleCount > 0;
        }
    }

    if (el.search) {
        el.search.addEventListener("input", updateSubjectDirectory);
    }

    if (el.filters) {
        el.filters.addEventListener("click", (event) => {
            const button = event.target.closest("[data-subject-filter]");
            if (!button || !el.filters.contains(button)) return;

            el.filters
                .querySelectorAll("[data-subject-filter]")
                .forEach((filterButton) => {
                    const selected = filterButton === button;
                    filterButton.classList.toggle("is-active", selected);
                    filterButton.setAttribute(
                        "aria-pressed",
                        String(selected)
                    );
                });

            updateSubjectDirectory();
        });
    }

    function renderSubject(subjectId) {
        const subject = rtdbSubjects[subjectId];
        if (!subject) return false;

        if (el.directoryHero) {
            el.directoryHero.hidden = true;
            el.directoryHero.setAttribute("aria-hidden", "true");
        }
        if (el.directory) el.directory.hidden = true;
        if (el.detailHero) el.detailHero.hidden = false;
        if (el.detailContent) el.detailContent.hidden = false;
        if (el.category) el.category.textContent = subject.category;
        if (el.title) el.title.textContent = subject.name;
        if (el.description) el.description.textContent = subject.description;
        if (el.about) el.about.textContent = subject.about;

        document.title = `${subject.name} Practice | StudyKora`;

        const metaDescription = document.querySelector(
            'meta[name="description"]'
        );
        if (metaDescription) {
            metaDescription.content =
                `${subject.description} Practise with StudyKora.`;
        }

        const testUrl = makeTestUrl(subjectId);
        if (el.startTest) el.startTest.href = testUrl;
        if (el.practiceButton) el.practiceButton.href = testUrl;

        if (el.tags) {
            el.tags.replaceChildren();
            (subject.tags || []).forEach((tag) => {
                const chip = createElement(
                    "span",
                    "chip chip-primary",
                    tag
                );
                el.tags.appendChild(chip);
            });
        }

        if (el.topics) {
            el.topics.replaceChildren();
            (subject.topics || []).forEach((topic, index) => {
                const link = createElement("a", "listing-card");
                link.href = makeTestUrl(
                    subjectId,
                    makeTopicSlug(topic)
                );
                const icon = createElement(
                    "span",
                    "card-icon",
                    String(index + 1).padStart(2, "0")
                );
                icon.setAttribute("aria-hidden", "true");
                const content = createElement("span", "card-content");
                const title = createElement(
                    "span",
                    "card-title",
                    topic
                );
                const description = createElement(
                    "span",
                    "card-description",
                    `Practise ${topic.toLowerCase()} questions.`
                );
                content.append(title, description);
                const arrow = createElement(
                    "span",
                    "card-arrow",
                    "›"
                );
                arrow.setAttribute("aria-hidden", "true");
                link.append(icon, content, arrow);
                el.topics.appendChild(link);
            });
        }

        return true;
    }

    function createRemoteSubjectCard(id, subject) {
        const link = createElement("a", "listing-card");
        link.href = `subject.html?subject=${encodeURIComponent(id)}`;
        link.setAttribute("data-subject-card", "");
        link.dataset.subjectId = id;
        link.dataset.subjectName = subject.name;
        link.dataset.subjectCategory = subject.category;

        const icon = createElement("span", "card-icon");
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none">' +
            '<path d="M4 5h9a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3V5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
            '<path d="M20 5h-4a3 3 0 0 0-3 3v11h4a3 3 0 0 1 3 3V5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
            '</svg>';

        const content = createElement("span", "card-content");
        const title = createElement("span", "card-title", subject.name);
        const desc = createElement(
            "span",
            "card-description",
            subject.description || subject.category || ""
        );
        content.append(title, desc);

        const arrow = createElement("span", "card-arrow", "›");
        arrow.setAttribute("aria-hidden", "true");

        link.append(icon, content, arrow);
        return link;
    }

    async function loadRemoteSubjects() {
        if (!el.grid) return;
        try {
            const response = await fetch(`${DB_BASE}/subjects.json`, {
                cache: "no-store"
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const subjects = await response.json();
            if (!subjects || typeof subjects !== "object") {
                updateSubjectDirectory();
                return;
            }

            Object.entries(subjects).forEach(([id, subject]) => {
                if (!subject || typeof subject !== "object") return;
                if (subject.published === false) return;

                rtdbSubjects[id] = {
                    name: subject.name || id,
                    category: subject.category || "General Studies",
                    filter: deriveFilter(subject.category),
                    description: subject.description || "",
                    about: subject.about || subject.description || "",
                    tags: Array.isArray(subject.tags) ? subject.tags : [],
                    topics: Array.isArray(subject.topics) ? subject.topics : []
                };

                const card = createRemoteSubjectCard(
                    id,
                    rtdbSubjects[id]
                );
                el.grid.appendChild(card);
            });

            updateSubjectDirectory();
        } catch (error) {
            console.warn(
                "[StudyKora Subject] Could not load remote subjects.",
                error
            );
            updateSubjectDirectory();
        }
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSubject = (
        params.get("subject") || ""
    ).trim().toLowerCase();

    loadRemoteSubjects().then(() => {
        if (requestedSubject && rtdbSubjects[requestedSubject]) {
            renderSubject(requestedSubject);
        } else {
            updateSubjectDirectory();
        }
    });
});
