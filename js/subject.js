/* ==========================================
   StudyNow — Subject Listing
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const subjectList = document.getElementById("subject-list");

    if (!subjectList) return;

    /*
     * Static subject catalogue for now.
     * Later this data can be loaded from Firebase Realtime Database
     * and managed through the StudyNow Control Room.
     */

    const subjects = [
        {
            id: "assamese",
            name: "Assamese",
            description: "Practise Assamese language and literature.",
            icon: "book"
        },
        {
            id: "culture",
            name: "Culture",
            description: "Explore culture and important traditions.",
            icon: "culture"
        },
        {
            id: "computer",
            name: "Computer Knowledge",
            description: "Revise computer fundamentals and concepts.",
            icon: "computer"
        },
        {
            id: "driving",
            name: "Driving Knowledge",
            description: "Practise driving rules and road safety.",
            icon: "driving"
        },
        {
            id: "economics",
            name: "Economics",
            description: "Study economic concepts and fundamentals.",
            icon: "economics"
        },
        {
            id: "geography",
            name: "Geography",
            description: "Explore physical, Indian and world geography.",
            icon: "geography"
        },
        {
            id: "english",
            name: "English",
            description: "Improve grammar, vocabulary and comprehension.",
            icon: "english"
        },
        {
            id: "general-knowledge",
            name: "General Knowledge",
            description: "Revise important facts and general awareness.",
            icon: "knowledge"
        },
        {
            id: "polity",
            name: "Polity",
            description: "Study the Constitution and political system.",
            icon: "polity"
        }
    ];

    const icons = {
        book: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v19H7.5A3.5 3.5 0 0 0 4 24z"/>
                <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v19h4.5a3.5 3.5 0 0 1 3.5 3z"/>
            </svg>
        `,
        culture: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="5"/>
                <path d="M4 21a8 8 0 0 1 16 0M12 3v10M7 8h10"/>
            </svg>
        `,
        computer: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="13" rx="2"/>
                <path d="M8 21h8M12 17v4M7 8h10"/>
            </svg>
        `,
        driving: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m5 11 1.5-5h11L19 11"/>
                <path d="M3 11h18v7H3z"/>
                <path d="M6 18v2M18 18v2M7 14h.01M17 14h.01"/>
            </svg>
        `,
        economics: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20V4M4 20h17"/>
                <path d="m7 15 4-4 3 2 5-6"/>
            </svg>
        `,
        geography: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>
            </svg>
        `,
        english: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v19H7.5A3.5 3.5 0 0 0 4 24z"/>
                <path d="M8 7h8M8 11h8M8 15h5"/>
            </svg>
        `,
        knowledge: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1-1.9 1.3-1.9 2.9M12 17h.01"/>
            </svg>
        `,
        polity: `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m3 8 9-5 9 5M4 20h16M6 9v8M10 9v8M14 9v8M18 9v8M3 21h18"/>
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
        description.textContent = subject.description;

        content.append(category, title, description);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        link.append(icon, content, arrow);

        return link;
    }

    function renderSubjects() {
        const fragment = document.createDocumentFragment();

        subjects.forEach((subject) => {
            fragment.appendChild(createSubjectCard(subject));
        });

        subjectList.replaceChildren(fragment);
    }

    renderSubjects();
});
