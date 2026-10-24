/* ==========================================
   StudyNow — Organization Details
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   ORGANIZATION DATA
========================================== */

const organizations = {
    apsc: {
        name: "APSC",
        category: "STATE EXAMINATIONS",
        description:
            "Explore APSC exam categories and prepare with focused practice resources.",
        exams: 3,
        questions: "2,908",
        examList: [
            "Combined Competitive Examination",
            "Recruitment Exam Practice",
            "Other APSC Practice"
        ]
    },

    adre: {
        name: "Assam Direct Recruitment",
        category: "RECRUITMENT EXAMS",
        description:
            "Explore Assam Direct Recruitment exams and prepare through focused practice.",
        exams: 4,
        questions: "5,700",
        examList: [
            "ADRE Grade III",
            "ADRE Grade IV",
            "Driver Recruitment",
            "Other Recruitment Exams"
        ]
    },

    "assam-police": {
        name: "Assam Police",
        category: "UNIFORMED SERVICES",
        description:
            "Explore Assam Police exam categories and strengthen your preparation.",
        exams: 2,
        questions: "2,000",
        examList: [
            "Sub Inspector Exam",
            "Constable Exam"
        ]
    },

    ssuhs: {
        name: "SSUHS",
        category: "HEALTH EDUCATION",
        description:
            "Explore healthcare entrance exam practice and revision resources.",
        exams: 1,
        questions: "500",
        examList: [
            "Healthcare Entrance Exam"
        ]
    }
};


/* ==========================================
   ELEMENTS
========================================== */

const titleElement = document.getElementById("organization-title");
const categoryElement = document.getElementById("organization-category");
const descriptionElement = document.getElementById("organization-description");

const examCountElement = document.getElementById("exam-count");
const questionCountElement = document.getElementById("question-count");

const examListElement = document.getElementById("organization-exam-list");
const aboutElement = document.getElementById("organization-about-text");


/* ==========================================
   EXAM CARD TEMPLATE
   Reuses shared listing-card components
========================================== */

function createExamCard(exam, index) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "listing-card test-card";
    card.dataset.exam = String(index);

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");

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
    category.textContent = "EXAM CATEGORY";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = exam;

    const description = document.createElement("span");
    description.className = "card-description";
    description.textContent = "Explore exam practice";

    content.append(category, title, description);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(icon, content, arrow);

    return card;
}


/* ==========================================
   RENDER ORGANIZATION
========================================== */

function renderOrganization(organization) {
    titleElement.textContent = organization.name;
    categoryElement.textContent = organization.category;
    descriptionElement.textContent = organization.description;

    examCountElement.textContent =
        `${organization.exams} Exam Categories`;

    questionCountElement.textContent =
        `${organization.questions} MCQs`;

    aboutElement.textContent =
        `${organization.name} exam preparation resources are organized here. Explore the available exam categories and use this page to navigate to relevant practice material.`;

    examListElement.replaceChildren();

    organization.examList.forEach((exam, index) => {
        examListElement.appendChild(
            createExamCard(exam, index)
        );
    });

    document.title = `${organization.name} Exams — StudyNow`;
}


/* ==========================================
   UNKNOWN ORGANIZATION
========================================== */

function renderNotFound() {
    titleElement.textContent = "Organization Not Found";
    categoryElement.textContent = "STUDYNOW";

    descriptionElement.textContent =
        "This organization is unavailable. Return to the homepage to select an available organization.";

    examCountElement.textContent = "Explore";
    questionCountElement.textContent = "Available Exams";

    aboutElement.textContent =
        "Choose an organization from the StudyNow homepage to explore its exam categories.";

    examListElement.replaceChildren();

    document.title = "Organization Not Found — StudyNow";
}


/* ==========================================
   EXAM CARD PLACEHOLDER
========================================== */

function handleExamClick(event) {
    const card = event.target.closest("[data-exam]");

    if (!card || !examListElement.contains(card)) {
        return;
    }

    const examName = card.querySelector(".card-title")?.textContent.trim();

    const noticeModal = document.getElementById("notice-modal");
    const noticeTitle = document.getElementById("notice-title");
    const noticeMessage = document.getElementById("notice-message");

    if (!noticeModal || !noticeTitle || !noticeMessage) {
        return;
    }

    noticeTitle.textContent = examName || "Exam Details";

    noticeMessage.textContent =
        "The dedicated mock tests page for this exam will be added in the next step.";

    noticeModal.hidden = false;
    document.body.classList.add("modal-open");

    const closeButton = noticeModal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) {
        closeButton.focus();
    }
}


/* ==========================================
   INITIALIZE
========================================== */

function initializeOrganizationPage() {
    const params = new URLSearchParams(window.location.search);
    const organizationId = params.get("org") || "adre";

    const organization = organizations[organizationId];

    if (organization) {
        renderOrganization(organization);
    } else {
        renderNotFound();
    }

    examListElement.addEventListener("click", handleExamClick);
}

initializeOrganizationPage();
