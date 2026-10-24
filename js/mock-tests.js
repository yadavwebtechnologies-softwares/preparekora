/* ==========================================
   StudyNow — Mock Tests Page
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   MOCK TEST DATA
========================================== */

const mockTests = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;

    return {
        id: `adre-grade-iii-test-${number}`,
        number,
        title: `Mock Test ${number}`,
        status: number === 1 ? "FREE TEST" : "PREMIUM TEST",
        description: "150 MCQs · 180 Minutes"
    };
});


/* ==========================================
   ELEMENTS
========================================== */

const mockTestListing = document.getElementById("mock-test-listing");
const testLanguage = document.getElementById("test-language");
const languageSelection = document.getElementById("language-selection");


/* ==========================================
   CREATE REUSABLE TEST CARD
========================================== */

function createMockTestCard(test) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "listing-card test-card";
    card.dataset.mockTest = test.id;

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
    category.textContent = test.status;

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = test.title;

    const description = document.createElement("span");
    description.className = "card-description";
    description.textContent = test.description;

    content.append(category, title, description);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(icon, content, arrow);

    return card;
}


/* ==========================================
   RENDER MOCK TESTS
========================================== */

function renderMockTests() {
    if (!mockTestListing) return;

    const fragment = document.createDocumentFragment();

    mockTests.forEach((test) => {
        fragment.appendChild(createMockTestCard(test));
    });

    mockTestListing.replaceChildren(fragment);
}


/* ==========================================
   LANGUAGE SELECTOR
========================================== */

function updateSelectedLanguage() {
    if (!testLanguage || !languageSelection) return;

    const selectedOption =
        testLanguage.options[testLanguage.selectedIndex];

    languageSelection.textContent =
        `Selected language: ${selectedOption.textContent}`;
}

if (testLanguage) {
    testLanguage.addEventListener("change", updateSelectedLanguage);
}


/* ==========================================
   INITIALIZE
========================================== */

renderMockTests();
updateSelectedLanguage();
