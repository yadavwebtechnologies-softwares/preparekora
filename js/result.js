/* ==========================================
   StudyNow — Result Controller
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const resultDescription = document.getElementById("result-description");
    const resultTestName = document.getElementById("result-test-name");
    const resultStatus = document.getElementById("result-status");
    const resultCompletedAt = document.getElementById("result-completed-at");

    const scoreElement = document.getElementById("result-score");
    const correctElement = document.getElementById("result-correct");
    const incorrectElement = document.getElementById("result-incorrect");
    const unattemptedElement = document.getElementById("result-unattempted");
    const accuracyElement = document.getElementById("result-accuracy");
    const timeElement = document.getElementById("result-time");

    const reviewEmpty = document.getElementById("answer-review-empty");
    const reviewWrap = document.getElementById("answer-review-table-wrap");
    const reviewBody = document.getElementById("answer-review-body");
    const retakeLink = document.getElementById("retake-test");

    function formatDuration(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes} min ${String(seconds).padStart(2, "0")} sec`;
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function setUnavailable() {
        resultDescription.textContent =
            "No completed test result was found in this browser session.";

        resultTestName.textContent = "No Result Available";
        resultStatus.textContent =
            "Complete a practice test to view your score and answer review.";

        reviewEmpty.hidden = false;
        reviewWrap.hidden = true;
    }

    function addCell(row, text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.appendChild(cell);
    }

    function renderReview(questions) {
        reviewBody.replaceChildren();

        questions.forEach((question) => {
            const row = document.createElement("tr");

            addCell(
                row,
                `${String(question.number).padStart(2, "0")}. ${question.question}`
            );

            addCell(row, question.selectedAnswer);
            addCell(row, question.correctAnswer);

            const statusCell = document.createElement("td");
            statusCell.textContent = !question.attempted
                ? "Unattempted"
                : question.isCorrect
                    ? "Correct"
                    : "Incorrect";
            row.appendChild(statusCell);

            addCell(row, question.explanation || "No explanation available.");
            reviewBody.appendChild(row);
        });

        reviewEmpty.hidden = questions.length > 0;
        reviewWrap.hidden = questions.length === 0;
    }

    let result;

    try {
        const savedResult = sessionStorage.getItem("studynow:last-test-result");
        result = savedResult ? JSON.parse(savedResult) : null;
    } catch {
        result = null;
    }

    if (
        !result ||
        !Array.isArray(result.review) ||
        !Number.isFinite(result.total)
    ) {
        setUnavailable();
        return;
    }

    document.title = `${result.title} Result | StudyNow`;

    resultDescription.textContent =
        "Your practice attempt has been scored. Review the answers below.";

    resultTestName.textContent = result.title;

    resultStatus.textContent = result.timedOut
        ? "Time expired. Your answers were submitted automatically."
        : "Test submitted successfully.";

    resultCompletedAt.textContent = result.completedAt
        ? `Completed: ${formatDate(result.completedAt)}`
        : "";

    scoreElement.textContent =
        `${result.correct}/${result.total} (${result.scorePercentage}%)`;

    correctElement.textContent = String(result.correct);
    incorrectElement.textContent = String(result.incorrect);
    unattemptedElement.textContent = String(result.unattempted);
    accuracyElement.textContent = `${result.accuracy}%`;
    timeElement.textContent = formatDuration(result.elapsedSeconds);

    renderReview(result.review);

    if (result.attemptUrl) {
        retakeLink.href = result.attemptUrl;
    }
});
