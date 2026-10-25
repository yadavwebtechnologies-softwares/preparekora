/* ==========================================
   StudyNow — Test Page
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

const testForm = document.getElementById("test-form");
const testTitle = document.getElementById("test-title");
const testStatus = document.getElementById("test-status");

const subjectCatalogue = {
    assamese: { name: "Assamese" },
    culture: { name: "Culture" },
    computer: { name: "Computer Knowledge" },
    driving: { name: "Driving Knowledge" },
    economics: { name: "Economics" },
    geography: { name: "Geography" },
    english: { name: "English" },
    "general-knowledge": { name: "General Knowledge" },
    polity: { name: "Polity" }
};

function setSubjectPreview(subjectId) {
    const subject = subjectCatalogue[subjectId];

    const heroDescription = document.querySelector(".hero-content > p");
    const highlights = document.querySelectorAll(".hero-highlights span");
    const backLink = document.querySelector(".hero-actions a.btn-outline");
    const instructionsSection = document.getElementById("instructions");
    const questionSection = document.getElementById("questions");

    if (!subject) {
        testTitle.textContent = "Subject Not Found";
        testStatus.textContent = "SUBJECT UNAVAILABLE";
        document.title = "Subject Not Found | StudyNow";

        if (heroDescription) {
            heroDescription.textContent =
                "This subject link is unavailable. Return to the subject list and choose another subject.";
        }

        if (testForm) testForm.hidden = true;
        if (instructionsSection) instructionsSection.hidden = true;

        if (questionSection) {
            const heading = questionSection.querySelector(".section-title");
            const intro = questionSection.querySelector(":scope > p");

            if (heading) heading.textContent = "Subject Unavailable";

            if (intro) {
                intro.textContent =
                    "Please select a valid subject from the StudyNow subject list.";
            }
        }

        if (backLink) {
            backLink.href = "subjects.html#available-subjects";
            backLink.textContent = "Back to Subjects";
        }

        return;
    }

    testTitle.textContent = `${subject.name} Practice`;
    testStatus.textContent = "SUBJECT PRACTICE PREVIEW";
    document.title = `${subject.name} Practice | StudyNow`;

    const metaDescription = document.querySelector(
        'meta[name="description"]'
    );

    if (metaDescription) {
        metaDescription.content =
            `Explore ${subject.name} practice on StudyNow.`;
    }

    if (heroDescription) {
        heroDescription.textContent =
            `You selected ${subject.name}. This page is prepared for subject-wise practice. Subject-specific question content will be added in the content upgrade.`;
    }

    if (highlights[0]) {
        highlights[0].textContent = subject.name;
    }

    if (highlights[1]) {
        highlights[1].textContent = "Subject practice";
    }

    if (highlights[2]) {
        highlights[2].textContent = "MCQ content preview";
    }

    if (backLink) {
        backLink.href = "subjects.html#available-subjects";
        backLink.textContent = "Back to Subjects";
    }

    // The standard instructions are for the ADRE sample test only.
    if (instructionsSection) {
        instructionsSection.hidden = true;
    }

    // Do not show ADRE sample questions for another subject.
    if (testForm) {
        testForm.hidden = true;
    }

    if (questionSection) {
        const heading = questionSection.querySelector(".section-title");
        const intro = questionSection.querySelector(":scope > p");

        if (heading) {
            heading.textContent = `${subject.name} Practice`;
        }

        if (intro) {
            intro.textContent =
                `The ${subject.name} practice page is ready. Subject-specific questions, answers and explanations will be connected in the next content phase.`;
        }

        let placeholder = document.getElementById(
            "subject-practice-placeholder"
        );

        if (!placeholder) {
            placeholder = document.createElement("article");
            placeholder.id = "subject-practice-placeholder";
            placeholder.className = "why-card";

            const placeholderTitle = document.createElement("h3");
            placeholderTitle.textContent = "Practice content";

            const placeholderText = document.createElement("p");
            placeholderText.textContent =
                "This is a static preview. Subject questions will be loaded here when the practice content is connected.";

            placeholder.append(placeholderTitle, placeholderText);

            if (testForm) {
                testForm.insertAdjacentElement("afterend", placeholder);
            } else {
                questionSection.appendChild(placeholder);
            }
        }
    }
}

function initializeTestPage() {
    const params = new URLSearchParams(window.location.search);

    // Subject mode: test.html?subject=economics
    if (params.has("subject")) {
        const subjectId = (params.get("subject") || "").trim().toLowerCase();
        setSubjectPreview(subjectId);
        return;
    }

    // Existing ADRE test mode: test.html?test=1
    const rawNumber = Number(params.get("test") || 1);

    const testNumber =
        Number.isInteger(rawNumber) && rawNumber >= 1 && rawNumber <= 10
            ? rawNumber
            : 1;

    if (testTitle) {
        testTitle.innerHTML = `ADRE Grade III<br>Mock Test ${testNumber}`;
    }

    if (testStatus) {
        testStatus.textContent =
            testNumber === 1
                ? "FREE TEST PREVIEW"
                : "PREMIUM TEST PREVIEW";
    }

    document.title =
        `ADRE Grade III Mock Test ${testNumber} — StudyNow`;
}

function handleTestSubmit(event) {
    event.preventDefault();

    const noticeModal = document.getElementById("notice-modal");
    const noticeTitle = document.getElementById("notice-title");
    const noticeMessage = document.getElementById("notice-message");

    if (!noticeModal || !noticeTitle || !noticeMessage) return;

    noticeTitle.textContent = "Preview Only";
    noticeMessage.textContent =
        "Answer checking, scoring, timer and test submission will be enabled during the functionality upgrade.";

    noticeModal.hidden = false;
    document.body.classList.add("modal-open");

    const closeButton = noticeModal.querySelector(
        '[data-action="close-notice"]'
    );

    if (closeButton) closeButton.focus();
}

if (testForm) {
    testForm.addEventListener("submit", handleTestSubmit);
}

initializeTestPage();
