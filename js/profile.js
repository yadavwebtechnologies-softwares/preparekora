// StudyKora Profile
document.addEventListener("DOMContentLoaded", async () => {
    const $ = (id) => document.getElementById(id);

    const authRequired = $("profile-auth-required");
    const profileContent = $("profile-content");
    const profileForm = $("profile-form");
    const profileName = $("profile-name");
    const profileEmail = $("profile-email");
    const profilePhoto = $("profile-photo");
    const profileMessage = $("profile-message");

    const DATABASE_URL =
        "https://studykora-fc91d-default-rtdb.firebaseio.com";

    let session = null;
    let profileData = {};

    function readSession() {
        try {
            return JSON.parse(
                sessionStorage.getItem("studyKoraSession") || "null"
            );
        } catch {
            return null;
        }
    }

    function showMessage(element, message, isError = false) {
        if (!element) return;

        element.textContent = message;
        element.dataset.status = isError ? "error" : "success";
    }

    function getUid() {
        return session?.user?.localId || session?.user?.uid || null;
    }

    async function databaseRequest(method, path, data) {
        const uid = getUid();

        if (!uid || !session?.idToken) {
            throw new Error("Your session has expired. Please log in again.");
        }

        const url =
            `${DATABASE_URL}/${path}.json?auth=` +
            encodeURIComponent(session.idToken);

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            ...(data !== undefined
                ? { body: JSON.stringify(data) }
                : {})
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || result?.error) {
            throw new Error(
                typeof result?.error === "string"
                    ? result.error
                    : "Unable to access your profile. Please try again."
            );
        }

        return result;
    }

    function requireLogin() {
        if (authRequired) authRequired.hidden = false;
        if (profileContent) profileContent.hidden = true;
    }

    async function loadProfile() {
        session = readSession();

        if (!session?.idToken || !getUid() || !session?.user?.email) {
            requireLogin();
            return;
        }

        if (authRequired) authRequired.hidden = true;
        if (profileContent) profileContent.hidden = false;

        profileEmail.value = session.user.email;

        try {
            const data = await databaseRequest(
                "GET",
                `users/${encodeURIComponent(getUid())}`
            );

            profileData = data || {};

            profileName.value =
                profileData.displayName ||
                profileData.name ||
                session.user.displayName ||
                "";

            profileEmail.value =
                session.user.email || profileData.email || "";

            profilePhoto.value = profileData.photoURL || "";
        } catch (error) {
            showMessage(profileMessage, error.message, true);
        }
    }

    profileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = profileName.value.trim();
        const photoURL = profilePhoto.value.trim();

        if (!name) {
            showMessage(profileMessage, "Please enter your name.", true);
            return;
        }

        if (photoURL) {
            try {
                new URL(photoURL);
            } catch {
                showMessage(
                    profileMessage,
                    "Please enter a valid photo URL.",
                    true
                );
                return;
            }
        }

        const saveButton = $("profile-save");
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const updatedProfile = {
                displayName: name,
                email: session.user.email,
                photoURL: photoURL || null
            };

            await databaseRequest(
                "PATCH",
                `users/${encodeURIComponent(getUid())}`,
                updatedProfile
            );

            // Update the locally saved session information.
            session.user.displayName = name;
            session.user.photoURL = photoURL || null;

            sessionStorage.setItem(
                "studyKoraSession",
                JSON.stringify(session)
            );

            profileData = {
                ...profileData,
                ...updatedProfile
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

    // Account deletion request: backend endpoint is not available yet.
    $("profile-delete-open")?.addEventListener("click", () => {
        const form = $("profile-delete-form");
        if (form) form.hidden = false;
    });

    $("profile-delete-cancel")?.addEventListener("click", () => {
        const form = $("profile-delete-form");
        if (form) form.hidden = true;
    });

    $("profile-delete-form")?.addEventListener("submit", (event) => {
        event.preventDefault();

        const confirmation = $("profile-delete-confirm").value.trim();
        const message = $("profile-delete-message");

        if (confirmation !== "DELETE") {
            showMessage(
                message,
                "Type DELETE exactly to confirm your request.",
                true
            );
            return;
        }

        showMessage(
            message,
            "Deletion requests are not connected to the secure backend yet. No request has been submitted.",
            true
        );
    });

    // Email change requires Firebase re-authentication and verification.
    $("profile-change-email")?.addEventListener("click", () => {
        window.alert(
            "Email changes will be available after secure verification is connected."
        );
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
