/* ==========================================
   StudyNow — Test Engine
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    const testTitle = document.getElementById("test-title");
    const testStatus = document.getElementById("test-status");
    const testDescription = document.getElementById("test-description");
    const questionCount = document.getElementById("question-count");
    const timeLimitText = document.getElementById("time-limit-text");
    const timerElement = document.getElementById("test-timer");
    const timerLabel = document.getElementById("timer-label");
    const progressBar = document.getElementById("test-progress");
    const answeredCount = document.getElementById("answered-count");
    const questionIntroduction = document.getElementById("question-introduction");
    const testMessage = document.getElementById("test-message");
    const testForm = document.getElementById("test-form");
    const questionList = document.getElementById("question-list");
    const unavailablePanel = document.getElementById("subject-content-unavailable");
    const backLink = document.getElementById("back-link");
    const questionCards = [...document.querySelectorAll("[data-question-card]")];

    if (!testForm || !questionList) return;

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

    const exams = {
        "adre-grade-iii": "ADRE Grade III",
        "adre-grade-iv": "ADRE Grade IV",
        "adre-other": "Other ADRE Recruitment",
        "assam-vfa": "Assam VFA",
        "anm-entrance": "ANM Entrance",
        "driver-recruitment": "Driver Recruitment",
        "assam-police-si": "Assam Police Sub-Inspector",
        "assam-police-constable": "Assam Police Constable",
        "healthcare-entrance": "Healthcare Entrance",
        "apsc-cce": "APSC Combined Competitive Examination",
        "apsc-recruitment": "APSC Recruitment",
        "apsc-other": "Other APSC Practice"
    };

    const subjectId = params.get("subject");
    const examId = params.get("exam");
    const rawTestNumber = Number(params.get("test") || 1);
    const testNumber = Number.isInteger(rawTestNumber) && rawTestNumber > 0
        ? rawTestNumber
        : 1;

    const isSubjectMode = subjectId !== null;
    const normalizedSubjectId = subjectId?.trim().toLowerCase();
    const normalizedExamId = examId?.trim().toLowerCase();

    let visibleQuestions = [];
    let testMode = "exam";
    let durationSeconds = 20 * 60;
    let startedAt = Date.now();
    let timerInterval = null;
    let submitted = false;

    function setMessage(message) {
        testMessage.textContent = message;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    function updateAnsweredProgress() {
        const total = visibleQuestions.length;
        const answered = visibleQuestions.filter((card) =>
            card.querySelector('input[type="radio"]:checked')
        ).length;

        answeredCount.textContent = `${answered} of ${total} answered`;
        progressBar.style.width = total ? `${(answered / total) * 100}%` : "0%";
    }

    function configurePage() {
        let pageName = "ADRE Grade III";
        let backHref = "mock-tests.html";
        let backText = "Back to Mock Tests";

        if (isSubjectMode) {
            const subjectName = subjects[normalizedSubjectId];

            if (!subjectName) {
                showUnavailable("Unknown subject", "subjects.html#available-subjects");
                return false;
            }

            testMode = "subject";
            pageName = subjectName;
            durationSeconds = 5 * 60;
            backHref = "subjects.html#available-subjects";
            backText = "Back to Subjects";

            visibleQuestions = questionCards.filter((card) =>
                card.dataset.subject === normalizedSubjectId
            );

            testTitle.textContent = `${subjectName} Practice`;
            testStatus.textContent = "SUBJECT PRACTICE";
            testDescription.textContent =
                `Answer these ${subjectName} sample questions and review your score at the end.`;
            questionIntroduction.textContent =
                `Questions for ${subjectName}.`;
            questionCount.textContent =
                `${visibleQuestions.length} sample questions`;
            timeLimitText.textContent = "5-minute preview";
            document.title = `${subjectName} Practice | StudyNow`;
        } else {
            const examName = normalizedExamId
                ? exams[normalizedExamId]
                : "ADRE Grade III";

            if (normalizedExamId && !examName) {
                showUnavailable("Unknown examination", "mock-tests.html");
                return false;
            }

            pageName = examName;
            testMode = "exam";
            durationSeconds = 20 * 60;
            visibleQuestions = [...questionCards];

            testTitle.textContent = `${examName} — Sample Test ${testNumber}`;
            testStatus.textContent = "MIXED PRACTICE PREVIEW";
            testDescription.textContent =
                "Attempt the mixed sample questions, then submit to see your score and answer explanations.";
            questionIntroduction.textContent =
                "This is a sample question set, not a complete official examination.";
            questionCount.textContent = `${visibleQuestions.length} sample questions`;
            timeLimitText.textContent = "20-minute preview";
            document.title = `${examName} Sample Test | StudyNow`;
        }

        backLink.href = backHref;
        backLink.textContent = backText;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content =
                `Practise ${pageName} sample questions on StudyNow.`;
        }

        questionCards.forEach((card) => {
            card.hidden = !visibleQuestions.includes(card);
        });

        if (visibleQuestions.length === 0) {
            showUnavailable("Questions are not available yet.", backHref);
            return false;
        }

        testForm.hidden = false;
        questionList.hidden = false;
        unavailablePanel.hidden = true;
        updateAnsweredProgress();

        return true;
    }

    function showUnavailable(message, backHref) {
        testForm.hidden = true;
        questionList.hidden = true;
        unavailablePanel.hidden = false;

        const description = unavailablePanel.querySelector("p");
        if (description) description.textContent = message;

        const returnLink = unavailablePanel.querySelector("a");
        if (returnLink) {
            returnLink.href = backHref;
            returnLink.textContent = backHref.startsWith("subjects")
                ? "Back to Subjects"
                : "Back to Mock Tests";
        }

        testTitle.textContent = "Practice Unavailable";
        testStatus.textContent = "NOT AVAILABLE";
        testDescription.textContent =
            "Choose another subject or test from StudyNow.";
        timerElement.textContent = "--:--";
        document.title = "Practice Unavailable | StudyNow";
    }

    function getOptionText(card, value) {
        const input = [...card.querySelectorAll('input[type="radio"]')]
            .find((option) => option.value === value);

        return input ? input.closest("label").textContent.trim() : "Not answered";
    }

    function submitTest(timedOut = false) {
        if (submitted) return;

        submitted = true;
        clearInterval(timerInterval);

        const elapsedSeconds = Math.min(
            Math.floor((Date.now() - startedAt) / 1000),
            durationSeconds
        );

        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;

        const review = visibleQuestions.map((card, index) => {
            const selectedInput = card.querySelector('input[type="radio"]:checked');
            const selectedValue = selectedInput?.value || "";
            const correctValue = card.dataset.answer;
            const isCorrect = selectedValue !== "" && selectedValue === correctValue;
            const attempted = selectedValue !== "";

            if (!attempted) {
                unattempted += 1;
            } else if (isCorrect) {
                correct += 1;
            } else {
                incorrect += 1;
            }

            return {
                number: index + 1,
                subject: card.dataset.subject,
                question: card.querySelector("h3")?.textContent.trim() || "",
                selectedAnswer: selectedValue
                    ? getOptionText(card, selectedValue)
                    : "Not answered",
                correctAnswer: getOptionText(card, correctValue),
                isCorrect,
                attempted,
                explanation: card.dataset.explanation || ""
            };
        });

        const total = visibleQuestions.length;
        const attempted = correct + incorrect;
        const scorePercentage = total ? (correct / total) * 100 : 0;
        const accuracy = attempted ? (correct / attempted) * 100 : 0;

        const result = {
            title: testTitle.textContent.trim(),
            mode: testMode,
            total,
            correct,
            incorrect,
            unattempted,
            attempted,
            scorePercentage: Number(scorePercentage.toFixed(1)),
            accuracy: Number(accuracy.toFixed(1)),
            elapsedSeconds,
            timedOut,
            completedAt: new Date().toISOString(),
            attemptUrl: `${window.location.pathname}${window.location.search}`,
            review
        };

        try {
            sessionStorage.setItem("studynow:last-test-result", JSON.stringify(result));
            window.location.href = "result.html";
        } catch (error) {
            submitted = false;
            setMessage("The browser could not save this result. Please check your browser storage settings.");
        }
    }

    if (!configurePage()) return;

    const totalTime = durationSeconds;
    let remainingSeconds = totalTime;

    timerElement.textContent = formatTime(remainingSeconds);
    timerLabel.textContent = "Time Remaining";

    visibleQuestions.forEach((card) => {
        card.querySelectorAll('input[type="radio"]').forEach((input) => {
            input.addEventListener("change", updateAnsweredProgress);
        });
    });

    testForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitTest(false);
    });

    testForm.addEventListener("reset", () => {
        window.setTimeout(updateAnsweredProgress, 0);
    });

    timerInterval = window.setInterval(() => {
        remainingSeconds -= 1;
        timerElement.textContent = formatTime(Math.max(remainingSeconds, 0));

        if (remainingSeconds <= 0) {
            submitTest(true);
        }
    }, 1000);
});
