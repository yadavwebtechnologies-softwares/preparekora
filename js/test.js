/* ==========================================
   StudyNow — Test Page Controller
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
       1. DOM REFERENCES
    ========================================== */

    const testTitle = document.getElementById("test-title");
    const testStatus = document.getElementById("test-status");
    const testForm = document.getElementById("test-form");

    const instructionsSection = document.getElementById("instructions");
    const questionSection = document.getElementById("questions");

    const questionHeading =
        questionSection?.querySelector(".section-title");

    const questionDescription =
        questionSection?.querySelector(":scope > p");

    const heroDescription =
        document.querySelector(".hero-content > p");

    const heroHighlights =
        document.querySelectorAll(".hero-highlights span");

    const backLink =
        document.querySelector(".hero-actions .btn-outline");

    const metaDescription =
        document.querySelector('meta[name="description"]');

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
       3. EXAM CATALOGUE
    ========================================== */

    const exams = {
        "adre-grade-iii": {
            title: "ADRE Grade III",
            organization: "Assam Direct Recruitment",
            description: "Prepare for ADRE Grade III with focused mock test practice.",
            hasSampleQuestions: true
        },

        "adre-grade-iv": {
            title: "ADRE Grade IV",
            organization: "Assam Direct Recruitment",
            description: "Explore ADRE Grade IV practice and revision.",
            hasSampleQuestions: false
        },

        "assam-vfa": {
            title: "Assam VFA",
            organization: "Recruitment Exam",
            description: "Explore Assam VFA exam preparation.",
            hasSampleQuestions: false
        },

        "anm-entrance": {
            title: "ANM Entrance",
            organization: "Healthcare Entrance",
            description: "Explore ANM entrance practice and revision.",
            hasSampleQuestions: false
        },

        "assam-police-si": {
            title: "Assam Police Sub-Inspector",
            organization: "Assam Police",
            description: "Explore Sub-Inspector exam preparation.",
            hasSampleQuestions: false
        },

        "assam-police-constable": {
            title: "Assam Police Constable",
            organization: "Assam Police",
            description: "Explore constable recruitment practice.",
            hasSampleQuestions: false
        },

        "apsc-cce": {
            title: "APSC Combined Competitive Examination",
            organization: "APSC",
            description: "Explore APSC CCE preparation.",
            hasSampleQuestions: false
        }
    };


    /* ==========================================
       4. ORIGINAL HTML CONTENT
    ========================================== */

    const originalQuestionHeading =
        questionHeading?.textContent.trim() || "Sample Questions";

    const originalQuestionDescription =
        questionDescription?.textContent.trim() ||
        "Explore the test questions.";

    const originalHeroDescription =
        heroDescription?.textContent.trim() ||
        "Practise for competitive examinations on StudyNow.";

    const params = new URLSearchParams(window.location.search);

    const subjectParam = params.get("subject");
    const examParam = params.get("exam");

    const rawTestNumber = Number(params.get("test") || 1);

    const testNumber =
        Number.isInteger(rawTestNumber) &&
        rawTestNumber >= 1 &&
        rawTestNumber <= 10
            ? rawTestNumber
            : 1;

    let pageMode = "test";


    /* ==========================================
       5. HELPERS
    ========================================== */

    function setText(element, value) {
        if (element) element.textContent = value;
    }

    function setBackLink(url, label) {
        if (!backLink) return;

        backLink.href = url;
        backLink.textContent = label;
    }

    function setHighlights(first, second, third) {
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

    function setQuestionSection(title, description) {
        setText(questionHeading, title);
        setText(questionDescription, description);
    }

    function setMetaDescription(description) {
        if (metaDescription) {
            metaDescription.content = description;
        }
    }

    function showExistingTestContent(show) {
        if (instructionsSection) {
            instructionsSection.hidden = !show;
        }

        /*
         * The existing HTML sample questions belong to
         * ADRE Grade III. Do not show them for other exams.
         */
        if (testForm) {
            testForm.hidden = !show;
        }
    }


    /* ==========================================
       6. SUBJECT MODE

       Example:
       test.html?subject=economics
    ========================================== */

    function initializeSubject(subjectId) {
        pageMode = "subject";

        const id = subjectId.trim().toLowerCase();
        const name = subjects[id];

        showExistingTestContent(false);

        setBackLink(
            "subjects.html#available-subjects",
            "Back to Subjects"
        );

        if (!name) {
            setText(testTitle, "Subject Not Found");
            setText(testStatus, "SUBJECT UNAVAILABLE");

            setText(
                heroDescription,
                "This subject is unavailable. Return to the subject list and select a valid subject."
            );

            setHighlights(
                "Subject unavailable",
                "Browse subjects",
                "Select again"
            );

            setQuestionSection(
                "Subject Unavailable",
                "Please return to Subjects and choose an available subject."
            );

            setMetaDescription(
                "The requested subject is unavailable on StudyNow."
            );

            document.title = "Subject Not Found | StudyNow";
            return;
        }

        setText(testTitle, `${name} Practice`);
        setText(testStatus, "SUBJECT PRACTICE");

        setText(
            heroDescription,
            `Explore ${name} practice. Subject-specific questions and learning content will appear here when available.`
        );

        setHighlights(
            name,
            "Subject-wise learning",
            "Practice preview"
        );

        setQuestionSection(
            `${name} Practice`,
            `The ${name} practice page is ready for its subject-specific question collection.`
        );

        setMetaDescription(
            `Explore ${name} practice and exam preparation on StudyNow.`
        );

        document.title = `${name} Practice | StudyNow`;
    }


    /* ==========================================
       7. EXAM MODE

       Example:
       test.html?exam=adre-grade-iii&test=1
    ========================================== */

    function initializeExam(examId) {
        pageMode = "exam";

        const id = examId.trim().toLowerCase();
        const exam = exams[id];

        if (!exam) {
            showExistingTestContent(false);

            setText(testTitle, "Exam Not Found");
            setText(testStatus, "EXAM UNAVAILABLE");

            setText(
                heroDescription,
                "This examination is unavailable. Return to the exam list and choose another option."
            );

            setHighlights(
                "Exam unavailable",
                "Browse examinations",
                "Select again"
            );

            setQuestionSection(
                "Exam Unavailable",
                "Please select an available examination from StudyNow."
            );

            setBackLink("mock-tests.html", "Back to Mock Tests");

            setMetaDescription(
                "The requested examination is unavailable on StudyNow."
            );

            document.title = "Exam Not Found | StudyNow";
            return;
        }

        const showSampleQuestions =
            exam.hasSampleQuestions && testNumber === 1;

        showExistingTestContent(showSampleQuestions);

        setText(
            testTitle,
            `${exam.title} — Mock Test ${testNumber}`
        );

        setText(
            testStatus,
            showSampleQuestions
                ? "FREE TEST PREVIEW"
                : testNumber === 1
                    ? "TEST PREVIEW"
                    : "PREMIUM TEST PREVIEW"
        );

        setText(heroDescription, exam.description);

        setHighlights(
            exam.organization,
            `Mock Test ${testNumber}`,
            "Exam practice"
        );

        setQuestionSection(
            showSampleQuestions
                ? originalQuestionHeading
                : `${exam.title} Practice`,
            showSampleQuestions
                ? originalQuestionDescription
                : `The ${exam.title} test collection is selected. Its specific questions will appear here when the content is available.`
        );

        setBackLink(
            `mock-tests.html?exam=${encodeURIComponent(id)}`,
            "Back to Mock Tests"
        );

        setMetaDescription(
            `${exam.title} mock test practice on StudyNow.`
        );

        document.title =
            `${exam.title} Mock Test ${testNumber} | StudyNow`;
    }


    /* ==========================================
       8. DEFAULT ADRE PREVIEW

       Example:
       test.html
       test.html?test=1
    ========================================== */

    function initializeDefaultTest() {
        pageMode = "test";

        showExistingTestContent(true);

        setText(
            testTitle,
            `ADRE Grade III — Mock Test ${testNumber}`
        );

        setText(
            testStatus,
            testNumber === 1
                ? "FREE TEST PREVIEW"
                : "PREMIUM TEST PREVIEW"
        );

        setText(heroDescription, originalHeroDescription);

        setHighlights(
            "150 Questions in Full Test",
            "180 Minutes",
            "English"
        );

        setQuestionSection(
            originalQuestionHeading,
            originalQuestionDescription
        );

        setBackLink(
            "mock-tests.html?exam=adre-grade-iii",
            "Back to Mock Tests"
        );

        setMetaDescription(
            "Explore ADRE Grade III mock test practice on StudyNow."
        );

        document.title =
            `ADRE Grade III Mock Test ${testNumber} | StudyNow`;
    }


    /* ==========================================
       9. SUBMIT HANDLING

       Static preview only.
       No generated modal or fake score.
    ========================================== */

    if (testForm) {
        testForm.addEventListener("submit", (event) => {
            event.preventDefault();

            if (pageMode !== "test" && pageMode !== "exam") {
                return;
            }

            setText(
                testStatus,
                "PREVIEW ONLY"
            );

            setQuestionSection(
                originalQuestionHeading,
                "Test submission and scoring will be connected when the test engine is implemented."
            );
        });
    }


    /* ==========================================
       10. INITIALIZE FROM URL
    ========================================== */

    if (subjectParam !== null) {
        initializeSubject(subjectParam);
    } else if (examParam !== null) {
        initializeExam(examParam);
    } else {
        initializeDefaultTest();
    }
});
