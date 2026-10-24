"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /*
     * Static preview only.
     * Later, load the submitted test result from the test flow
     * and save/retrieve result history through Firebase Realtime Database.
     */

    const resultStatus = document.getElementById("result-status");

    if (resultStatus) {
        resultStatus.textContent =
            "No completed test result is available yet.";
    }
});
