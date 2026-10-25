// StudyKora Profile — Cloudflare Worker API
document.addEventListener("DOMContentLoaded", async () => {
    const $ = (id) => document.getElementById(id);

    const API_BASE = "https://studykora-api.yadavsubba2003.workers.dev";

    const authRequired = $("profile-auth-required");
    const profileContent = $("profile-content");
    const profileForm = $("profile-form");
    const profileName = $("profile-name");
    const profileEmail = $("profile-email");
    const profilePhoto = $("profile-photo");
    const profileMessage = $("profile-message");

    let session = readSession();
    let currentProfile = {};

    function readSession() {
        try {
            return JSON.parse(
                sessionStorage.getItem("studyKoraSession") || "null"
            );
        } catch {
            return null;
        }
    }

    function saveSession() {
        sessionStorage.setItem("studyKoraSession", JSON.stringify(session));
    }

    function showMessage(element, message, isError = false) {
        if (!element) return;
        element.textContent = message;
        element.dataset.status = isError ? "error" : "success";
    }

    async function apiRequest(path, method = "GET", data = {}) {
        if (!session?.idToken) {
            throw new Error("Please log in again.");
        }

        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.idToken}`
            },
            ...(method !== "GET"
                ? {
                    body: JSON.stringify({
                        ...data,
                        idToken: session.idToken
                    })
                }
                : {})
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || "Request failed. Please try again.");
        }

        return result;
    }

    function showLoggedOut() {
        if (authRequired) authRequired.hidden = false;
        if (profileContent) profileContent.hidden = true;
    }

    async function loadProfile() {
        session = readSession();

        if (!session?.idToken || !session?.user?.email) {
            showLoggedOut();
            return;
        }

        try {
            const result = await apiRequest("/profile");
            currentProfile = result.profile || {};

            if (authRequired) authRequired.hidden = true;
            if (profileContent) profileContent.hidden = false;

            profileName.value =
                currentProfile.displayName ||
                session.user.displayName ||
                "";

            profileEmail.value =
                result.user?.email ||
                session.user.email ||
                "";

            profilePhoto.value =
                currentProfile.photoURL ||
                session.user.photoURL ||
                "";
        } catch (error) {
            showMessage(profileMessage, error.message, true);

            if (
                /session|token|authentication|log in/i.test(error.message)
            ) {
                showLoggedOut();
            }
        }
    }

    // Save name and photo through the Worker
    profileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = profileName.value.trim();
        const photoURL = profilePhoto.value.trim();
        const saveButton = $("profile-save");

        if (!name) {
            showMessage(profileMessage, "Please enter your name.", true);
            return;
        }

        if (photoURL) {
            try {
                const url = new URL(photoURL);
                if (!["http:", "https:"].includes(url.protocol)) {
                    throw new Error();
                }
            } catch {
                showMessage(profileMessage, "Enter a valid photo URL.", true);
                return;
            }
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const result = await apiRequest("/profile", "PATCH", {
                displayName: name,
                photoURL
            });

            // Keep the returned refreshed tokens, if supplied by the Worker.
            if (result.idToken) session.idToken = result.idToken;
            if (result.refreshToken) session.refreshToken = result.refreshToken;
            if (result.expiresIn) session.expiresIn = result.expiresIn;
            if (result.user) {
                session.user = { ...session.user, ...result.user };
            }

            session.user.displayName = name;
            session.user.photoURL = photoURL;

            saveSession();

            currentProfile = {
                ...currentProfile,
                displayName: name,
                photoURL
            };

            showMessage(profileMessage, "Profile updated successfully.");
        } catch (error) {
            showMessage(profileMessage, error.message, true);
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        }
    });

    // Show account deletion request form
    $("profile-delete-open")?.addEventListener("click", () => {
        const form = $("profile-delete-form");
        if (form) form.hidden = false;
    });

    $("profile-delete-cancel")?.addEventListener("click", () => {
        const form = $("profile-delete-form");
        if (form) form.hidden = true;
    });

    // Submit deletion request; this does not delete the account.
    $("profile-delete-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = $("profile-delete-password").value;
        const confirmation = $("profile-delete-confirm").value.trim();
        const submitButton = $("profile-delete-submit");
        const message = $("profile-delete-message");

        if (!password) {
            showMessage(message, "Enter your account password.", true);
            return;
        }

        if (confirmation !== "DELETE") {
            showMessage(message, 'Type DELETE exactly to confirm.', true);
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            const result = await apiRequest(
                "/profile/deletion-request",
                "POST",
                { password, confirmation }
            );

            showMessage(
                message,
                result.message || "Deletion request submitted."
            );

            $("profile-delete-password").value = "";
            $("profile-delete-confirm").value = "";
        } catch (error) {
            showMessage(message, error.message, true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Submit Deletion Request";
            }
        }
    });

    // Request email-change verification
    $("profile-change-email")?.addEventListener("click", async () => {
        const newEmail = window.prompt("Enter your new email address:");
        if (!newEmail) return;

        const email = newEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            window.alert("Enter a valid email address.");
            return;
        }

        try {
            const result = await apiRequest(
                "/profile/email-change",
                "POST",
                { newEmail: email }
            );

            window.alert(
                result.message ||
                "Check your email for verification instructions."
            );
        } catch (error) {
            window.alert(error.message);
        }
    });

    // Logout confirmation
    $("profile-logout")?.addEventListener("click", () => {
        const confirmation = $("profile-logout-confirmation");
        if (confirmation) confirmation.hidden = false;
    });

    $("profile-logout-cancel")?.addEventListener("click", () => {
        const confirmation = $("profile-logout-confirmation");
        if (confirmation) confirmation.hidden = true;
    });

    $("profile-logout-confirm")?.addEventListener("click", () => {
        sessionStorage.removeItem("studyKoraSession");
        window.location.replace("./index.html");
    });

    await loadProfile();
});
