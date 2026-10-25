// StudyKora Account Profile
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const guest = $("account-guest");
    const authenticated = $("account-authenticated");
    const trigger = $("account-profile-trigger");
    const panel = $("account-profile-panel");
    const closeButton = $("account-panel-close");
    const profileName = $("account-profile-name");
    const profileEmail = $("account-profile-email");

    function getSession() {
        try {
            const raw = sessionStorage.getItem("studyKoraSession");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function showGuest() {
        if (guest) guest.hidden = false;
        if (authenticated) authenticated.hidden = true;
        if (panel) panel.hidden = true;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function showAccount(session) {
        if (guest) guest.hidden = true;
        if (authenticated) authenticated.hidden = false;

        const user = session?.user || {};

        if (profileName) {
            profileName.textContent =
                user.displayName || user.name || "Account";
        }

        if (profileEmail) {
            profileEmail.textContent = user.email || "";
        }
    }

    function refreshProfile() {
        const session = getSession();

        if (
            session &&
            session.idToken &&
            session.user &&
            session.user.email
        ) {
            showAccount(session);
        } else {
            showGuest();
        }
    }

    function openProfile() {
        if (!panel || !trigger) return;

        panel.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
    }

    function closeProfile() {
        if (!panel || !trigger) return;

        panel.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    }

    trigger?.addEventListener("click", () => {
        if (panel?.hidden) {
            openProfile();
        } else {
            closeProfile();
        }
    });

    closeButton?.addEventListener("click", closeProfile);

    document.addEventListener("click", (event) => {
        if (
            panel &&
            trigger &&
            !panel.contains(event.target) &&
            !trigger.contains(event.target)
        ) {
            closeProfile();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeProfile();
    });

    // Settings button
    $("account-settings-open")?.addEventListener("click", () => {
        closeProfile();

        const settingsPanel = $("account-settings-panel");

        if (settingsPanel) {
            settingsPanel.hidden = false;
            settingsPanel.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });

    // Logout confirmation
    $("account-logout-open")?.addEventListener("click", () => {
        const confirmation = $("account-logout-confirmation");
        if (confirmation) confirmation.hidden = false;
    });

    $("account-logout-cancel")?.addEventListener("click", () => {
        const confirmation = $("account-logout-confirmation");
        if (confirmation) confirmation.hidden = true;
    });

    $("account-logout-confirm")?.addEventListener("click", () => {
        sessionStorage.removeItem("studyKoraSession");
        window.location.href = "./index.html";
    });

    // Initial session check
    refreshProfile();

    // Refresh when returning to the page
    window.addEventListener("pageshow", refreshProfile);
});
