/* ==========================================
   StudyNow — Subject Details
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

const subjectData = {
    assamese: {
        name: "Assamese",
        tests: 15,
        questions: "448"
    },
    culture: {
        name: "Culture",
        tests: 10,
        questions: "200"
    },
    computer: {
        name: "Computer Knowledge",
        tests: 9,
        questions: "270"
    },
    driving: {
        name: "Driving Knowledge",
        tests: 6,
        questions: "57"
    },
    economics: {
        name: "Economics",
        tests: 5,
        questions: "49"
    },
    english: {
        name: "English",
        tests: 27,
        questions: "800"
    },
    "general-knowledge": {
        name: "General Knowledge",
        tests: 17,
        questions: "1,628"
    },
    geography: {
        name: "Geography",
        tests: 10,
        questions: "200"
    }
};

const subjectTitle = document.getElementById("subject-title");
const subjectDescription = document.getElementById("subject-description");
const subjectTestCount = document.getElementById("subject-test-count");
const subjectQuestionCount = document.getElementById("subject-question-count");
const subjectPracticeList = document.getElementById("subject-practice-list");
const subjectAboutText = document.getElementById("subject-about-text");


function createPracticeCard(title, description, index) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "listing-card test-card";
    card.dataset.practiceSet = String(index);

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.background = "var(--green-soft)";
    icon.style.color = "var(--green)";

    icon.innerHTML = `
        <svg viewBox="0 0 24 24">
            <rect x="6" y="4.5" width="12" height="16" rx="2"></rect>
            <path d="M9 4.5V3h6v1.5"></path>
            <path d="m9 12 2 2 4-4"></path>
        </svg>
    `;

    const content = document.createElement("span");
    content.className = "card-content";

    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = "PRACTICE RESOURCE";

    const cardTitle = document.createElement("span");
    cardTitle.className = "card-title";
    cardTitle.textContent = title;

    const cardDescription = document.createElement("span");
    cardDescription.className = "card-description";
    cardDescription.textContent = description;

    content.append(category, cardTitle, cardDescription);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(icon, content, arrow);

    return card;
}


function renderSubject(subject) {
    subjectTitle.textContent = subject.name;

    subjectDescription.textContent =
        `Explore ${subject.name} practice resources and strengthen your exam preparation.`;

    subjectTestCount.textContent = `${subject.tests} Tests`;
    subjectQuestionCount.textContent = `${subject.questions} MCQs`;

    subjectAboutText.textContent =
        `${subject.name} practice resources help you revise concepts and prepare for competitive examinations. Explore the available practice options below.`;

    document.title = `${subject.name} Practice — StudyNow`;

    subjectPracticeList.replaceChildren(
        createPracticeCard("Practice Set 1", "Question practice preview", 1),
        createPracticeCard("Topic-wise Practice", "Review subject topics", 2),
        createPracticeCard("Revision Practice", "Revise important concepts", 3)
    );
}


function renderSubjectNotFound() {
    subjectTitle.textContent = "Subject Not Found";
    subjectDescription.textContent =
        "This subject is unavailable. Return to the homepage to select a subject.";

    subjectTestCount.textContent = "Browse";
    subjectQuestionCount.textContent = "Available Subjects";

    subjectAboutText.textContent =
        "Choose an available subject from the StudyNow homepage.";

    subjectPracticeList.replaceChildren();

    document.title = "Subject Not Found — StudyNow";
}


function handlePracticeClick(event) {
    const card = event.target.closest("[data-practice-set]");

    if (!card || !subjectPracticeList.contains(card)) return;

    const noticeModal = document.getElementById("notice-modal");
    const noticeTitle = document.getElementById("notice-title");
    const noticeMessage = document.getElementById("notice-message");

    if (!noticeModal || !noticeTitle || !noticeMessage) return;

    noticeTitle.textContent =
        card.querySelector(".card-title")?.textContent || "Practice Resource";

    noticeMessage.textContent =
        "This practice resource is a frontend placeholder. Its full content will be added in a later upgrade.";

    noticeModal.hidden = false;
    document.body.classList.add("modal-open");

    const closeButton = noticeModal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) closeButton.focus();
}


function initializeSubjectPage() {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get("subject") || "english";
    const subject = subjectData[subjectId];

    if (subject) {
        renderSubject(subject);
    } else {
        renderSubjectNotFound();
    }

    subjectPracticeList.addEventListener("click", handlePracticeClick);
}

initializeSubjectPage();
