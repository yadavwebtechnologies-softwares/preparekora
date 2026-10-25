/* =====================================================
   StudyKora — Profile and Account Settings
   Uses the existing Cloudflare Worker API
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const SESSION_KEY = "studyKoraSession";

    const authRequired = $("profile-auth-required");
    const profileLoading = $("profile-loading");
    const profileContent = $("profile-content");

    const profileForm = $("profile-form");
    const profileName = $("profile-name");
    const profileEmail = $("profile-email");
    const profilePhoto = $("profile-photo");
    const profileMessage = $("profile-message");

    const avatarPreview = $("profile-avatar-preview");
    const displayName = $("profile-display-name");
    const displayEmail = $("profile-display-email");

    let session = readSession();
    let profileData = {};

    /* ---------- Session ---------- */

    function readSession() {
        try {
            return JSON.parse(
                sessionStorage.getItem(SESSION_KEY) || "null"
            );
        } catch (error) {
            console.error("[StudyKora Profile] Invalid session data:", error);
            return null;
        }
    }

    function saveSession() {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
        session = null;
    }

    function hasSession() {
        return Boolean(
            session?.idToken &&
            session?.user?.email &&
            (session.user.uid || session.user.localId)
        );
    }

    /* ---------- Status messages ---------- */

    function showMessage(element, message, type = "") {
        if (!element) return;

        element.textContent = message;
        element.classList.remove("is-error", "is-success");

        if (type === "error") {
            element.classList.add("is-error");
        } else if (type === "success") {
            element.classList.add("is-success");
        }
    }

    function showLoading(message = "Loading profile...") {
        if (!profileLoading) return;

        profileLoading.textContent = message;
        profileLoading.hidden = false;
    }

    function hideLoading() {
        if (profileLoading) {
            profileLoading.hidden = true;
        }
    }

    function showLoggedOut() {
        hideLoading();

        if (authRequired) authRequired.hidden = false;
        if (profileContent) profileContent.hidden = true;
    }

    function showProfile() {
        hideLoading();

        if (authRequired) authRequired.hidden = true;
        if (profileContent) profileContent.hidden = false;
    }

    /* ---------- Cloudflare Worker API ---------- */

    async function apiRequest(path, method = "GET", payload) {
        if (!session?.idToken) {
            throw new Error("Please log in again to continue.");
        }

        let response;

        try {
            response = await fetch(`${API_BASE}${path}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.idToken}`
                },
                ...(payload !== undefined
                    ? { body: JSON.stringify(payload) }
                    : {})
            });
        } catch (error) {
            throw new Error(
                "Could not connect to StudyKora. Check your internet connection."
            );
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                `Request failed (HTTP ${response.status}).`
            );
        }

        return result;
    }

    function updateSessionFromResponse(data) {
        if (data.idToken) {
            session.idToken = data.idToken;
        }

        if (data.refreshToken) {
            session.refreshToken = data.refreshToken;
        }

        if (data.expiresIn) {
            session.expiresIn = data.expiresIn;
        }

        if (data.user) {
            session.user = {
                ...session.user,
                ...data.user,
                uid:
                    data.user.uid ||
                    data.user.localId ||
                    session.user.uid,
                localId:
                    data.user.localId ||
                    data.user.uid ||
                    session.user.localId
            };
        }

        session.savedAt = Date.now();
        saveSession();
    }

    /* ---------- Profile photo preview ---------- */

    function renderDefaultAvatar() {
        if (!avatarPreview) return;

        avatarPreview.replaceChildren();

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("aria-hidden", "true");

        const head = document.createElementNS(svgNS, "circle");
        head.setAttribute("cx", "12");
        head.setAttribute("cy", "8");
        head.setAttribute("r", "4");
        head.setAttribute("stroke", "currentColor");
        head.setAttribute("stroke-width", "1.7");

        const body = document.createElementNS(svgNS, "path");
        body.setAttribute("d", "M4.5 20a7.5 7.5 0 0 1 15 0");
        body.setAttribute("stroke", "currentColor");
        body.setAttribute("stroke-width", "1.7");
        body.setAttribute("stroke-linecap", "round");

        svg.append(head, body);
        avatarPreview.appendChild(svg);
    }

    function updateAvatarPreview(url) {
        if (!avatarPreview) return;

        if (!url) {
            renderDefaultAvatar();
            return;
        }

        let parsedURL;

        try {
            parsedURL = new URL(url);

            if (!["https:", "http:"].includes(parsedURL.protocol)) {
                renderDefaultAvatar();
                return;
            }
        } catch {
            renderDefaultAvatar();
            return;
        }

        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.src = parsedURL.href;

        image.addEventListener("error", () => {
            renderDefaultAvatar();
        }, { once: true });

        avatarPreview.replaceChildren(image);
    }

    profilePhoto?.addEventListener("input", () => {
        const value = profilePhoto.value.trim();
        if (!value) {
            renderDefaultAvatar();
            return;
        }

        updateAvatarPreview(value);
    });

    /* ---------- Load account profile ---------- */

    async function loadProfile() {
        session = readSession();

        if (!hasSession()) {
            showLoggedOut();
            return;
        }

        showLoading();

        try {
            const data = await apiRequest("/profile");
            profileData = data.profile || {};

            if (data.user) {
                session.user = {
                    ...session.user,
                    ...data.user,
                    uid:
                        data.user.uid ||
                        data.user.localId ||
                        session.user.uid,
                    localId:
                        data.user.localId ||
                        data.user.uid ||
                        session.user.localId
                };

                saveSession();
            }

            const accountName =
                profileData.displayName ||
                profileData.name ||
                session.user.displayName ||
                "Account";

            const accountEmail =
                data.user?.email ||
                session.user.email ||
                profileData.email ||
                "";

            const accountPhoto =
                profileData.photoURL ||
                session.user.photoURL ||
                "";

            profileName.value =
                accountName === "Account" ? "" : accountName;

            profileEmail.value = accountEmail;
            profilePhoto.value = accountPhoto;

            if (displayName) {
                displayName.textContent = accountName;
            }

            if (displayEmail) {
                displayEmail.textContent = accountEmail;
            }

            updateAvatarPreview(accountPhoto);
            showProfile();

        } catch (error) {
            console.error("[StudyKora Profile] Load failed:", error);

            if (
                /invalid id token|token expired|session.*expired|authentication required|please log in again/i
                    .test(error.message)
            ) {
                clearSession();
                showLoggedOut();
                return;
            }

            hideLoading();

            if (profileContent) profileContent.hidden = true;
            if (authRequired) authRequired.hidden = true;

            if (profileLoading) {
                profileLoading.textContent =
                    `${error.message} Refresh the page to try again.`;
                profileLoading.hidden = false;
            }
        }
    }

    /* ---------- Save name and photo ---------- */

    profileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!profileForm.checkValidity()) {
            profileForm.reportValidity();
            return;
        }

        const name = profileName.value.trim();
        const photoURL = profilePhoto.value.trim();
        const saveButton = $("profile-save");

        if (name.length < 2 || name.length > 80) {
            showMessage(
                profileMessage,
                "Name must contain between 2 and 80 characters.",
                "error"
            );
            profileName.focus();
            return;
        }

        if (photoURL) {
            try {
                const url = new URL(photoURL);

                if (!["https:", "http:"].includes(url.protocol)) {
                    throw new Error("Unsupported protocol");
                }
            } catch {
                showMessage(
                    profileMessage,
                    "Enter a valid HTTP or HTTPS photo URL.",
                    "error"
                );
                profilePhoto.focus();
                return;
            }
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const result = await apiRequest("/profile", "PATCH", {
                displayName: name,
                photoURL
            });

            updateSessionFromResponse(result);

            profileData = {
                ...profileData,
                displayName: name,
                photoURL
            };

            if (displayName) {
                displayName.textContent = name;
            }

            if (displayEmail) {
                displayEmail.textContent = profileEmail.value;
            }

            updateAvatarPreview(photoURL);

            showMessage(
                profileMessage,
                result.message || "Profile updated successfully.",
                "success"
            );

        } catch (error) {
            showMessage(profileMessage, error.message, "error");
            console.error("[StudyKora Profile] Save failed:", error);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });

    /* ---------- Request email verification ---------- */

    const emailForm = $("profile-email-form");
    const newEmailInput = $("profile-new-email");
    const emailMessage = $("profile-email-message");
    const emailSubmit = $("profile-email-submit");

    emailForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!emailForm.checkValidity()) {
            emailForm.reportValidity();
            return;
        }

        const newEmail = newEmailInput.value.trim().toLowerCase();
        const currentEmail = profileEmail.value.trim().toLowerCase();

        if (newEmail === currentEmail) {
            showMessage(
                emailMessage,
                "Enter an address different from your current email.",
                "error"
            );
            newEmailInput.focus();
            return;
        }

        emailSubmit.disabled = true;
        emailSubmit.textContent = "Requesting...";

        try {
            const result = await apiRequest(
                "/profile/email-change",
                "POST",
                { newEmail }
            );

            showMessage(
                emailMessage,
                result.message ||
                    "Verification instructions have been requested. Check your email.",
                "success"
            );

        } catch (error) {
            showMessage(emailMessage, error.message, "error");
            console.error("[StudyKora Profile] Email request failed:", error);
        } finally {
            emailSubmit.disabled = false;
            emailSubmit.textContent = "Request Verification";
        }
    });

    /* ---------- Account deletion request ---------- */

    const deleteForm = $("profile-delete-form");
    const deleteOpen = $("profile-delete-open");
    const deleteCancel = $("profile-delete-cancel");
    const deletePassword = $("profile-delete-password");
    const deleteConfirm = $("profile-delete-confirm");
    const deleteMessage = $("profile-delete-message");
    const deleteSubmit = $("profile-delete-submit");

    deleteOpen?.addEventListener("click", () => {
        deleteForm.hidden = false;
        deleteOpen.hidden = true;
        deletePassword.focus();
    });

    deleteCancel?.addEventListener("click", () => {
        deleteForm.reset();
        deleteForm.hidden = true;
        deleteOpen.hidden = false;
        showMessage(deleteMessage, "");
    });

    deleteForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!deleteForm.checkValidity()) {
            deleteForm.reportValidity();
            return;
        }

        if (deleteConfirm.value.trim() !== "DELETE") {
            showMessage(
                deleteMessage,
                'Type "DELETE" exactly to confirm.',
                "error"
            );
            deleteConfirm.focus();
            return;
        }

        const confirmed = window.confirm(
            "Submit your account deletion request for review?"
        );

        if (!confirmed) return;

        deleteSubmit.disabled = true;
        deleteSubmit.textContent = "Submitting...";

        try {
            const result = await apiRequest(
                "/profile/deletion-request",
                "POST",
                {
                    password: deletePassword.value,
                    confirmation: deleteConfirm.value.trim()
                }
            );

            showMessage(
                deleteMessage,
                result.message ||
                    "Your deletion request has been recorded for review.",
                "success"
            );

            deleteForm.reset();

        } catch (error) {
            showMessage(deleteMessage, error.message, "error");
            console.error("[StudyKora Profile] Deletion request failed:", error);
        } finally {
            deleteSubmit.disabled = false;
            deleteSubmit.textContent = "Submit Request";
        }
    });

    /* ---------- Logout ---------- */

    const logoutButton = $("profile-logout");
    const logoutConfirmation = $("profile-logout-confirmation");
    const logoutCancel = $("profile-logout-cancel");
    const logoutConfirm = $("profile-logout-confirm");

    logoutButton?.addEventListener("click", () => {
        logoutConfirmation.hidden = false;
        logoutButton.hidden = true;
    });

    logoutCancel?.addEventListener("click", () => {
        logoutConfirmation.hidden = true;
        logoutButton.hidden = false;
    });

    logoutConfirm?.addEventListener("click", () => {
        clearSession();
        window.location.replace("index.html");
    });

    /* ---------- Initialize ---------- */

    loadProfile();
});
