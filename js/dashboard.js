"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const dashboardName = document.getElementById("dashboard-name");

    // Static preview only. Replace with authenticated user data later.
    if (dashboardName) {
        dashboardName.textContent = "Student";
    }
});
