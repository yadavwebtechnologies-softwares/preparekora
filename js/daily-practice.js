/* ==========================================
   StudyNow — Daily Practice
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

const dailyPracticeSets = [
    {
        id: "general-knowledge",
        number: "01",
        title: "Daily General Knowledge",
        description: "Practise general awareness questions"
    },
    {
        id: "assam-history",
        number: "02",
        title: "Assam History Revision",
        description: "Revise important historical topics"
    },
    {
        id: "reasoning",
        number: "03",
        title: "Reasoning Practice",
        description: "Strengthen logical thinking"
    },
    {
        id: "english",
        number: "04",
        title: "English Practice",
        description: "Practise vocabulary and grammar"
    },
    {
        id: "geography",
        number: "05",
        title: "Geography Revision",
        description: "Review geographical concepts"
    },
    {
        id: "computer",
        number: "06",
        title: "Computer Knowledge",
        description: "Revise fundamental computer concepts"
    }
];

const dailySetList = document.getElementById("daily-set-list");


/* ==========================================
   CREATE SHARED LISTING CARD
========================================== */

function createDailySetCard(set) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "listing-card";
    card.dataset.dailySet = set.id;

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.background = "var(--green-soft)";
    icon.style.color = "var(--green)";

    icon.innerHTML = `
        <svg viewBox="0 0 24 24">
            <rect x="6" y="4.5" width="12" height="16" rx="2"></rect>
            <path d="M9 4.5V3h6v1.5"></path>
            <path d="M9 11h6M9 15h6"></path>
        </svg>
    `;

    const content = document.createElement("span");
    content.className = "card-content";

    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = `PRACTICE SET ${set.number}`;

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = set.title;

    const description = document.createElement("span");
    description.className = "card-description";
    description.textContent = set.description;

    content.append(category, title, description);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(icon, content, arrow);

    return card;
}


/* ==========================================
   RENDER SETS
========================================== */

function renderDailySets() {
    if (!dailySetList) return;

    const fragment = document.createDocumentFragment();

    dailyPracticeSets.forEach((set) => {
        fragment.appendChild(createDailySetCard(set));
    });

    dailySetList.replaceChildren(fragment);
}


/* ==========================================
   FRONTEND PLACEHOLDER NOTICE
========================================== */

function showPracticeNotice(title) {
    const modal = document.getElementById("notice-modal");
    const modalTitle = document.getElementById("notice-title");
    const modalMessage = document.getElementById("notice-message");

    if (!modal || !modalTitle || !modalMessage) return;

    modalTitle.textContent = title;
    modalMessage.textContent =
        "This practice set is currently a static frontend preview. Its questions will be added in a later upgrade.";

    modal.hidden = false;
    document.body.classList.add("modal-open");

    const closeButton = modal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) closeButton.focus();
}


/* ==========================================
   CARD INTERACTIONS
========================================== */

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const dailyCard = event.target.closest("[data-daily-set]");

    if (dailyCard) {
        const set = dailyPracticeSets.find(
            (item) => item.id === dailyCard.dataset.dailySet
        );

        if (set) showPracticeNotice(set.title);

        return;
    }

    const revisionCard = event.target.closest("[data-revision]");

    if (revisionCard) {
        const title =
            revisionCard.querySelector(".card-title")?.textContent.trim();

        if (title) showPracticeNotice(title);
    }
});


/* ==========================================
   INITIALIZE
========================================== */

renderDailySets();
