/* ==========================================
   StudyNow — Current Affairs
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const categoryButtons = document.querySelectorAll(
        "[data-affairs-category]"
    );

    const resourceList = document.getElementById("affairs-resource-list");
    const resourceHeading = document.getElementById("resource-heading");
    const resourceSection = document.getElementById("practice-resources");

    if (!resourceList || !resourceHeading) return;

    /* ==========================================
       1. RESOURCE CONFIGURATION

       All destination URLs use existing page names.
       Replace resource data with real content later.
    ========================================== */

    const resourceGroups = {
        daily: {
            heading: "Daily Current Affairs Resources",
            resources: [
                {
                    title: "Daily Practice",
                    category: "PRACTICE",
                    description: "Explore available daily question sets.",
                    href: "daily-practice.html#daily-sets",
                    icon: "practice"
                },
                {
                    title: "Mock Tests",
                    category: "EXAM PREPARATION",
                    description: "Explore available competitive exam tests.",
                    href: "mock-tests.html",
                    icon: "test"
                },
                {
                    title: "Subject Revision",
                    category: "REVISION",
                    description: "Choose a subject for focused practice.",
                    href: "subjects.html#available-subjects",
                    icon: "book"
                }
            ]
        },

        assam: {
            heading: "Assam Current Affairs Resources",
            resources: [
                {
                    title: "Assam Exam Preparation",
                    category: "EXAM PREPARATION",
                    description: "Explore available Assam exam resources.",
                    href: "organization.html",
                    icon: "book"
                },
                {
                    title: "Mock Tests",
                    category: "PRACTICE",
                    description: "Browse available examination practice tests.",
                    href: "mock-tests.html",
                    icon: "test"
                },
                {
                    title: "Daily Practice",
                    category: "DAILY LEARNING",
                    description: "Continue your daily study routine.",
                    href: "daily-practice.html",
                    icon: "practice"
                }
            ]
        },

        national: {
            heading: "National Current Affairs Resources",
            resources: [
                {
                    title: "Mock Tests",
                    category: "EXAM PREPARATION",
                    description: "Browse available competitive exam tests.",
                    href: "mock-tests.html",
                    icon: "test"
                },
                {
                    title: "General Knowledge",
                    category: "SUBJECT PRACTICE",
                    description: "Explore general knowledge practice.",
                    href: "test.html?subject=general-knowledge",
                    icon: "book"
                },
                {
                    title: "Subject Revision",
                    category: "REVISION",
                    description: "Browse available study subjects.",
                    href: "subjects.html#available-subjects",
                    icon: "practice"
                }
            ]
        },

        quiz: {
            heading: "Current Affairs Quiz Resources",
            resources: [
                {
                    title: "Daily Practice Sets",
                    category: "QUESTION SETS",
                    description: "Explore available daily question sets.",
                    href: "daily-practice.html#daily-sets",
                    icon: "practice"
                },
                {
                    title: "Mock Test Practice",
                    category: "MOCK TESTS",
                    description: "Browse available mock tests.",
                    href: "mock-tests.html",
                    icon: "test"
                },
                {
                    title: "Subject-wise Practice",
                    category: "SUBJECTS",
                    description: "Choose a subject to continue practising.",
                    href: "subjects.html#available-subjects",
                    icon: "book"
                }
            ]
        }
    };


    /* ==========================================
       2. SVG ICONS
    ========================================== */

    const icons = {
        practice: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 3h14v18H5z"/>
                <path d="m8 9 2 2 4-4M8 15h8"/>
            </svg>
        `,

        test: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="3" width="16" height="18" rx="2"/>
                <path d="M8 8h8M8 12h8M8 16h5"/>
            </svg>
        `,

        book: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v19H7.5
                         A3.5 3.5 0 0 0 4 24z"/>
                <path d="M4 5.5V24M8 7h8M8 11h8"/>
            </svg>
        `
    };


    /* ==========================================
       3. CREATE RESOURCE CARDS
    ========================================== */

    function createResourceCard(resource) {
        const link = document.createElement("a");

        link.className = "listing-card";
        link.href = resource.href;

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.style.background = "var(--green-soft)";
        icon.style.color = "var(--green)";
        icon.innerHTML = icons[resource.icon] || icons.book;

        const content = document.createElement("span");
        content.className = "card-content";

        const category = document.createElement("span");
        category.className = "card-category";
        category.textContent = resource.category;

        const title = document.createElement("span");
        title.className = "card-title";
        title.textContent = resource.title;

        const description = document.createElement("span");
        description.className = "card-description";
        description.textContent = resource.description;

        content.append(category, title, description);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        link.append(icon, content, arrow);

        return link;
    }


    /* ==========================================
       4. RENDER SELECTED CATEGORY
    ========================================== */

    function renderResources(categoryId, updateUrl = true) {
        const group = resourceGroups[categoryId];

        if (!group) {
            resourceHeading.textContent = "Current Affairs Resources";

            categoryButtons.forEach((button) => {
                button.setAttribute("aria-pressed", "false");
            });

            resourceList.replaceChildren();

            const fragment = document.createDocumentFragment();

            resourceGroups.daily.resources.forEach((resource) => {
                fragment.appendChild(createResourceCard(resource));
            });

            resourceList.appendChild(fragment);
            return;
        }

        resourceHeading.textContent = group.heading;

        categoryButtons.forEach((button) => {
            const isSelected =
                button.dataset.affairsCategory === categoryId;

            button.setAttribute("aria-pressed", String(isSelected));
        });

        const fragment = document.createDocumentFragment();

        group.resources.forEach((resource) => {
            fragment.appendChild(createResourceCard(resource));
        });

        resourceList.replaceChildren(fragment);

        if (updateUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("category", categoryId);

            window.history.replaceState({}, "", url);
        }
    }


    /* ==========================================
       5. CATEGORY BUTTONS
    ========================================== */

    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const categoryId = button.dataset.affairsCategory;

            if (!resourceGroups[categoryId]) return;

            renderResources(categoryId);

            resourceSection?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });


    /* ==========================================
       6. INITIAL STATE FROM URL
    ========================================== */

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get("category");

    if (initialCategory && resourceGroups[initialCategory]) {
        renderResources(initialCategory, false);
    } else {
        renderResources(null, false);
    }
});
