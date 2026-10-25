
/* studyKora — Account Profile UI
   Stable IDs for future administration panel integration.
   This file controls UI only; it does not modify Firebase data.
*/

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const authenticated = $("account-authenticated");
    const guest = $("account-guest");
    const trigger = $("account-profile-trigger");
    const profilePanel = $("account-profile-panel");
    const closeButton = $("account-panel-close");
    const settingsOpen = $("account-settings-open");
    const settingsPanel = $("account-settings-panel");
    const logoutOpen = $("account-logout-open");
    const logoutConfirmation = $("account-logout-confirmation");
    const logoutCancel = $("account-logout-cancel");
    const deleteOpen = $("account-delete-request-open");
    const deletePanel = $("account-delete-request-panel");

    function openProfile() {
        if (!profilePanel || !trigger) return;

        profilePanel.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
    }

    function closeProfile() {
        if (!profilePanel || !trigger) return;

        profilePanel.hidden = true;
        trigger.setAttribute("aria-expanded", "false");

        if (settingsPanel) settingsPanel.hidden = true;
        if (logoutConfirmation) logoutConfirmation.hidden = true;
        if (deletePanel) deletePanel.hidden = true;
    }

    trigger?.addEventListener("click", () => {
        if (profilePanel.hidden) {
            openProfile();
        } else {
            closeProfile();
        }
    });

    closeButton?.addEventListener("click", closeProfile);

    settingsOpen?.addEventListener("click", () => {
        if (settingsPanel) settingsPanel.hidden = false;
        if (logoutConfirmation) logoutConfirmation.hidden = true;
        if (deletePanel) deletePanel.hidden = true;
    });

    logoutOpen?.addEventListener("click", () => {
        if (settingsPanel) settingsPanel.hidden = false;
        if (logoutConfirmation) logoutConfirmation.hidden = false;
        if (deletePanel) deletePanel.hidden = true;
    });

    logoutCancel?.addEventListener("click", () => {
        if (logoutConfirmation) logoutConfirmation.hidden = true;
    });

    deleteOpen?.addEventListener("click", () => {
        if (settingsPanel) settingsPanel.hidden = false;
        if (deletePanel) deletePanel.hidden = false;
        if (logoutConfirmation) logoutConfirmation.hidden = true;
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeProfile();
    });

    /*
      Authentication state is intentionally not guessed here.
      A later integration step will read the verified studyKora
      session and toggle the guest/authenticated sections.
    */

    if (guest) guest.hidden = false;
    if (authenticated) authenticated.hidden = true;
});
