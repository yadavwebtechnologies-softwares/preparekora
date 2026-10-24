/* ==========================================
   StudyNow — Mock Test Preview
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

const testForm = document.getElementById("test-form");
const testTitle = document.getElementById("test-title");
const testStatus = document.getElementById("test-status");


/* ==========================================
   LOAD TEST NUMBER FROM URL
========================================== */

function initializeTestPage() {
    const params = new URLSearchParams(window.location.search);
    const rawNumber = Number(params.get("test") || 1);

    const testNumber =
        Number.isInteger(rawNumber) && rawNumber >= 1 && rawNumber <= 10
            ? rawNumber
            : 1;

    testTitle.innerHTML = `ADRE Grade III<br>Mock Test ${testNumber}`;

    testStatus.textContent = testNumber === 1
        ? "FREE TEST PREVIEW"
        : "PREMIUM TEST PREVIEW";

    document.title =
        `ADRE Grade III Mock Test ${testNumber} — StudyNow`;
}


/* ==========================================
   SUBMIT PREVIEW
========================================== */

function handleTestSubmit(event) {
    event.preventDefault();

    const noticeModal = document.getElementById("notice-modal");
    const noticeTitle = document.getElementById("notice-title");
    const noticeMessage = document.getElementById("notice-message");

    if (!noticeModal || !noticeTitle || !noticeMessage) {
        return;
    }

    noticeTitle.textContent = "Preview Only";

    noticeMessage.textContent =
        "Answer checking, scoring, timer and test submission will be enabled during the functionality upgrade.";

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

if (testForm) {
    testForm.addEventListener("submit", handleTestSubmit);
}

initializeTestPage();
