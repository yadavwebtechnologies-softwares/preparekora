/* ==========================================
   StudyNow — Subject Listing
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const subjectList = document.getElementById("subject-list");

    if (!subjectList) return;

    /*
     * Static subject catalogue.
     * Later this data can be loaded from Firebase Realtime Database
     * or managed through the StudyNow Control Room.
     */
    const subjects = [
        {
            id: "assamese",
            name: "Assamese",
            details: "15 Tests · 448 MCQs",
            icon: "book"
        },
        {
            id: "culture",
            name: "Culture",
            details: "10 Tests · 200 MCQs",
            icon: "book"
        },
        {
            id: "computer",
            name: "Computer Knowledge",
            details: "9 Tests · 270 MCQs",
            icon: "computer"
        },
        {
            id: "driving",
            name: "Driving Knowledge",
            details: "6 Tests · 57 MCQs",
            icon: "driving"
        },
        {
            id: "economics",
            name: "Economics",
            details: "5 Tests · 49 MCQs",
            icon: "economics"
        },
        {
            id: "geography",
            name: "Geography",
            details: "10 Tests · 200 MCQs",
            icon: "geography"
        },
        {
            id: "english",
            name: "English",
            details: "27 Tests · 800 MCQs",
            icon: "english"
        },
        {
            id: "general-knowledge",
            name: "General Knowledge",
            details: "17 Tests · 1,628 MCQs",
            icon: "knowledge"
        },
        {
            id: "polity",
            name: "Polity",
            details: "Topic-wise practice",
            icon: "polity"
        }
    ];

    const icons = {
        book: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v19H7.5A3.5 3.5 0 0 0 4 24z"></path>
                <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v19h4.5a3.5 3.5 0 0 1 3.5 3z"></path>
            </svg>
        `,
        computer: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="13" rx="2"></rect>
                <path d="M8 21h8M12 17v4M7 8h10"></path>
            </svg>
        `,
        driving: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 11 1.5-5h11L19 11"></path>
                <path d="M3 11h18v7H3z"></path>
                <path d="M6 18v2M18 18v2M7 14h.01M17 14h.01"></path>
            </svg>
        `,
        economics: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20V4M4 20h17"></path>
                <path d="m7 15 4-4 3 2 5-6"></path>
            </svg>
        `,
        geography: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>
            </svg>
        `,
        english: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v19H7.5A3.5 3.5 0 0 0 4 24z"></path>
                <path d="M8 7h8M8 11h8M8 15h5"></path>
            </svg>
        `,
        knowledge: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1-1.9 1.3-1.9 2.9M12 17h.01"></path>
            </svg>
        `,
        polity: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m3 8 9-5 9 5M4 20h16M6 9v8M10 9v8M14 9v8M18 9v8M3 21h18"></path>
            </svg>
        `
    };

    function createSubjectCard(subject) {
        const link = document.createElement("a");

        link.className = "listing-card subject-card";
        link.href = `test.html?subject=${encodeURIComponent(subject.id)}`;
        link.setAttribute(
            "aria-label",
            `Open ${subject.name} practice`
        );

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");

        // Keep the icon aligned with StudyNow's green accent.
        icon.style.background = "var(--green-soft)";
        icon.style.color = "var(--green)";
        icon.innerHTML = icons[subject.icon] || icons.book;

        const content = document.createElement("span");
        content.className = "card-content";

        const category = document.createElement("span");
        category.className = "card-category";
        category.textContent = "SUBJECT PRACTICE";

        const title = document.createElement("span");
        title.className = "card-title";
        title.textContent = subject.name;

        const description = document.createElement("span");
        description.className = "card-description";
        description.textContent = subject.details;

        content.append(category, title, description);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        link.append(icon, content, arrow);

        return link;
    }

    const fragment = document.createDocumentFragment();

    subjects.forEach((subject) => {
        fragment.appendChild(createSubjectCard(subject));
    });

    subjectList.replaceChildren(fragment);
});
