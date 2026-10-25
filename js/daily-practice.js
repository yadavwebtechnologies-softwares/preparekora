/* ==========================================
   StudyNow — Daily Practice
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const dailySetList = document.getElementById("daily-set-list");

    const dailySets = [
        {
            id: "general-knowledge",
            title: "Daily General Knowledge",
            description: "Practise important facts and general awareness.",
            category: "DAILY PRACTICE",
            icon: "knowledge"
        },
        {
            id: "english",
            title: "English Practice",
            description: "Revise grammar, vocabulary and comprehension.",
            category: "LANGUAGE",
            icon: "book"
        },
        {
            id: "geography",
            title: "Geography Revision",
            description: "Review geography concepts and key facts.",
            category: "REVISION",
            icon: "globe"
        },
        {
            id: "economics",
            title: "Economics Practice",
            description: "Strengthen your understanding of economics.",
            category: "SUBJECT PRACTICE",
            icon: "chart"
        },
        {
            id: "polity",
            title: "Polity Revision",
            description: "Revise constitutional and political concepts.",
            category: "REVISION",
            icon: "building"
        },
        {
            id: "assamese",
            title: "Assamese Practice",
            description: "Practise Assamese language-related questions.",
            category: "LANGUAGE",
            icon: "book"
        }
    ];

    const iconMarkup = {
        knowledge: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6
                         c-1.1 1-1.9 1.3-1.9 2.9"/>
                <path d="M12 17h.01"/>
            </svg>
        `,
        book: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v19H7.5
                         A3.5 3.5 0 0 0 4 24z"/>
                <path d="M4 5.5V24M8 7h8M8 11h8"/>
            </svg>
        `,
        globe: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18
                         M12 3a15 15 0 0 0 0 18"/>
            </svg>
        `,
        chart: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20V4M4 20h17"/>
                <path d="m7 15 4-4 3 2 5-6"/>
            </svg>
        `,
        building: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m3 8 9-5 9 5M4 20h16"/>
                <path d="M6 9v8M10 9v8M14 9v8M18 9v8M3 21h18"/>
            </svg>
        `
    };

    function createDailyCard(item) {
        const link = document.createElement("a");

        link.className = "listing-card";
        link.href = `test.html?subject=${encodeURIComponent(item.id)}`;
        link.setAttribute("aria-label", `Open ${item.title}`);

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.style.background = "var(--green-soft)";
        icon.style.color = "var(--green)";
        icon.innerHTML = iconMarkup[item.icon] || iconMarkup.book;

        const content = document.createElement("span");
        content.className = "card-content";

        const category = document.createElement("span");
        category.className = "card-category";
        category.textContent = item.category;

        const title = document.createElement("span");
        title.className = "card-title";
        title.textContent = item.title;

        const description = document.createElement("span");
        description.className = "card-description";
        description.textContent = item.description;

        content.append(category, title, description);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        link.append(icon, content, arrow);

        return link;
    }

    if (dailySetList) {
        const fragment = document.createDocumentFragment();

        dailySets.forEach((item) => {
            fragment.appendChild(createDailyCard(item));
        });

        dailySetList.replaceChildren(fragment);
    }

    /*
     * Existing revision-category controls:
     * send supported subjects directly to their practice preview.
     * Categories without a dedicated subject route go to the subject list.
     */
    const revisionRoutes = {
        "general-knowledge": "test.html?subject=general-knowledge",
        english: "test.html?subject=english",
        "assam-history": "subjects.html#available-subjects",
        reasoning: "subjects.html#available-subjects"
    };

    document.querySelectorAll("[data-revision]").forEach((control) => {
        const revisionId = control.dataset.revision;
        const destination = revisionRoutes[revisionId];

        if (!destination) return;

        if (control.tagName === "A") {
            control.href = destination;
            return;
        }

        // Keep existing button appearance, but use real page navigation.
        control.addEventListener("click", () => {
            window.location.href = destination;
        });
    });
});
