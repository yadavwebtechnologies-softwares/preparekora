/* ==========================================
   StudyNow — Test Page Controller
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
       1. ELEMENT REFERENCES
    ========================================== */

    const testTitle = document.getElementById("test-title");
    const testStatus = document.getElementById("test-status");
    const testForm = document.getElementById("test-form");

    const instructionsSection = document.getElementById("instructions");
    const questionSection = document.getElementById("questions");

    const questionHeading = questionSection?.querySelector(".section-title");
    const questionDescription = questionSection?.querySelector(":scope > p");

    const heroDescription = document.querySelector(".hero-content > p");
    const heroHighlights = document.querySelectorAll(".hero-highlights span");

    const backLink = document.querySelector(".hero-actions .btn-outline");
    const metaDescription = document.querySelector('meta[name="description"]');

    if (!testTitle || !testStatus) return;


    /* ==========================================
       2. SUBJECT CATALOGUE
    ========================================== */

    const subjects = {
        assamese: "Assamese",
        culture: "Culture",
        computer: "Computer Knowledge",
        driving: "Driving Knowledge",
        economics: "Economics",
        geography: "Geography",
        english: "English",
        "general-knowledge": "General Knowledge",
        polity: "Polity"
    };


    /* ==========================================
       3. ORIGINAL STATIC TEST CONTENT
    ========================================== */

    const defaultQuestionHeading =
        questionHeading?.textContent.trim() || "Sample Questions";

    const defaultQuestionDescription =
        questionDescription?.textContent.trim() ||
        "These questions demonstrate the test layout.";

    const defaultHeroDescription =
        heroDescription?.textContent.trim() ||
        "Practise sample questions on StudyNow.";

    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get("subject");

    let pageMode = "test";

    let defaultTestNumber = Number(params.get("test") || 1);

    if (
        !Number.isInteger(defaultTestNumber) ||
        defaultTestNumber < 1 ||
        defaultTestNumber > 10
    ) {
        defaultTestNumber = 1;
    }


    /* ==========================================
       4. COMMON HELPERS
    ========================================== */

    function updateMetaDescription(description) {
        if (metaDescription) {
            metaDescription.content = description;
        }
    }

    function updateHighlights(first, second, third) {
        if (heroHighlights[0]) {
            heroHighlights[0].textContent = first;
        }

        if (heroHighlights[1]) {
            heroHighlights[1].textContent = second;
        }

        if (heroHighlights[2]) {
            heroHighlights[2].textContent = third;
        }
    }

    function setBackLink(url, label) {
        if (!backLink) return;

        backLink.href = url;
        backLink.textContent = label;
    }

    function setQuestionSection(heading, description) {
        if (questionHeading) {
            questionHeading.textContent = heading;
        }

        if (questionDescription) {
            questionDescription.textContent = description;
        }
    }


    /* ==========================================
       5. SUBJECT PRACTICE MODE

       Example:
       test.html?subject=economics

       No subject is selected automatically.
       Only the subject supplied in the URL is used.
    ========================================== */

    function initializeSubjectMode(subjectId) {
        pageMode = "subject";

        const normalizedId = subjectId.trim().toLowerCase();
        const subjectName = subjects[normalizedId];

        // Hide ADRE-only content in subject mode.
        if (instructionsSection) {
            instructionsSection.hidden = true;
        }

        if (testForm) {
            testForm.hidden = true;
        }

        setBackLink(
            "subjects.html#available-subjects",
            "Back to Subjects"
        );

        if (!subjectName) {
            testTitle.textContent = "Subject Not Found";
            testStatus.textContent = "SUBJECT UNAVAILABLE";

            document.title = "Subject Not Found | StudyNow";

            if (heroDescription) {
                heroDescription.textContent =
                    "This subject is unavailable. Return to the subject list and choose a valid subject.";
            }

            updateHighlights(
                "Subject unavailable",
                "Choose a subject",
                "Try again"
            );

            setQuestionSection(
                "Subject Unavailable",
                "Please return to the subject list and select an available subject."
            );

            updateMetaDescription(
                "The requested subject is unavailable on StudyNow."
            );

            return;
        }

        testTitle.textContent = `${subjectName} Practice`;
        testStatus.textContent = "SUBJECT PRACTICE";

        document.title = `${subjectName} Practice | StudyNow`;

        if (heroDescription) {
            heroDescription.textContent =
                `Explore ${subjectName} practice. Subject-specific questions and learning content will be shown here when connected.`;
        }

        updateHighlights(
            subjectName,
            "Subject-wise learning",
            "Practice preview"
        );

        setQuestionSection(
            `${subjectName} Practice`,
            `The ${subjectName} practice page is ready. Its questions, answers and explanations will be connected during the content phase.`
        );

        updateMetaDescription(
            `Explore ${subjectName} practice and prepare for competitive examinations with StudyNow.`
        );
    }


    /* ==========================================
       6. MOCK TEST MODE

       Examples:
       test.html
       test.html?test=1
       test.html?test=2

       Existing HTML sample questions remain static.
    ========================================== */

    function initializeMockTestMode() {
        pageMode = "test";

        if (instructionsSection) {
            instructionsSection.hidden = false;
        }

        if (testForm) {
            testForm.hidden = false;
        }

        const testLabel = defaultTestNumber === 1
            ? "FREE TEST PREVIEW"
            : "PREMIUM TEST PREVIEW";

        testTitle.textContent =
            `ADRE Grade III — Mock Test ${defaultTestNumber}`;

        testStatus.textContent = testLabel;

        document.title =
            `ADRE Grade III Mock Test ${defaultTestNumber} | StudyNow`;

        if (heroDescription) {
            heroDescription.textContent = defaultHeroDescription;
        }

        updateHighlights(
            "150 Questions in Full Test",
            "180 Minutes",
            "English"
        );

        setBackLink(
            "mock-tests.html?exam=adre-grade-iii",
            "Back to Mock Tests"
        );

        setQuestionSection(
            defaultQuestionHeading,
            defaultQuestionDescription
        );

        updateMetaDescription(
            "Practise sample questions and explore the StudyNow mock test interface."
        );
    }


    /* ==========================================
       7. TEST SUBMISSION PREVIEW

       No generated popup or fake result.
       Scoring will be connected later.
    ========================================== */

    function handleTestSubmit(event) {
        event.preventDefault();

        if (pageMode !== "test") return;

        testStatus.textContent = "PREVIEW ONLY";

        setQuestionSection(
            defaultQuestionHeading,
            "This is a static preview. Answer checking, score calculation, result saving and test history will be connected in the functionality phase."
        );
    }

    if (testForm) {
        testForm.addEventListener("submit", handleTestSubmit);

        testForm.addEventListener("reset", () => {
            window.setTimeout(() => {
                if (pageMode !== "test") return;

                testStatus.textContent = defaultTestNumber === 1
                    ? "FREE TEST PREVIEW"
                    : "PREMIUM TEST PREVIEW";

                setQuestionSection(
                    defaultQuestionHeading,
                    defaultQuestionDescription
                );
            }, 0);
        });
    }


    /* ==========================================
       8. INITIALIZE PAGE FROM URL
    ========================================== */

    if (subjectParam !== null) {
        initializeSubjectMode(subjectParam);
    } else {
        initializeMockTestMode();
    }
});
