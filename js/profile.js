"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profile-form");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const examPreference = document.getElementById("exam-preference");
    const preferredLanguage = document.getElementById("preferred-language");
    const profileMessage = document.getElementById("profile-message");
    const logoutButton = document.getElementById("logout-button");
    const logoutMessage = document.getElementById("logout-message");

    // Static preview. Replace with Firebase user data later.
    profileName.value = "Student";
    profileEmail.value = "";

    profileForm.addEventListener("submit", (event) => {
        event.preventDefault();

        profileMessage.textContent =
            "Profile saving will be available after account integration.";
    });

    logoutButton.addEventListener("click", () => {
        logoutMessage.textContent =
            "Logout will be available after authentication is connected.";
    });
});
