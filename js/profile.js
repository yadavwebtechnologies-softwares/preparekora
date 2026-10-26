/* =====================================================
   StudyKora — Profile and Account Settings
   File: js/profile.js

   Uses:
   - Canonical StudyKora session
   - Cloudflare Worker API
   - Firebase ID-token refresh
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const SESSION_KEY = "studyKoraSession";
    const DEFAULT_EXPIRES_IN = 3600;
    const REFRESH_BUFFER_MS = 120000;

    const $ = (id) => document.getElementById(id);

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

    let session = null;
    let profileData = {};
    let refreshPromise = null;

    /* -----------------------------------------------------
       Session management
    ----------------------------------------------------- */

    function readSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;

            const stored = JSON.parse(raw);

            if (!stored || typeof stored !== "object") {
                return null;
            }

            /*
             * Migrate old sessions created by the previous auth.js.
             * Its accessToken/token fields actually received the
             * Worker login response's idToken.
             */
            const idToken =
                stored.idToken ||
                stored.accessToken ||
                stored.token ||
                "";

            const rawUser =
                stored.user && typeof stored.user === "object"
                    ? stored.user
                    : {};

            const uid = String(
                rawUser.uid ||
                rawUser.localId ||
                rawUser.userId ||
                stored.uid ||
                ""
            );

            const email = String(
                rawUser.email ||
                stored.email ||
                ""
            ).trim().toLowerCase();

            const parsedExpiresIn = Number(stored.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiresIn) && parsedExpiresIn > 0
                    ? parsedExpiresIn
                    : DEFAULT_EXPIRES_IN;

            const parsedExpiresAt = Number(stored.expiresAt);
            const parsedSavedAt = Number(stored.savedAt);

            let savedAt =
                Number.isFinite(parsedSavedAt) && parsedSavedAt > 0
                    ? parsedSavedAt
                    : 0;

            let expiresAt =
                Number.isFinite(parsedExpiresAt) && parsedExpiresAt > 0
                    ? parsedExpiresAt
                    : 0;

            /*
             * Old auth.js saved expiresAt but did not save expiresIn
             * or savedAt. Derive an approximate savedAt so the
             * refresh logic can correctly decide what to do.
             */
            if (!savedAt && expiresAt) {
                savedAt = expiresAt - expiresIn * 1000;
            }

            const normalized = {
                schemaVersion: 1,
                idToken: String(idToken),
                refreshToken: String(stored.refreshToken || ""),
                expiresIn,
                savedAt,
                expiresAt,
                user: {
                    ...rawUser,
                    uid,
                    localId: String(rawUser.localId || uid),
                    email,
                    displayName: String(
                        rawUser.displayName ||
                        rawUser.name ||
                        stored.name ||
                        ""
                    ),
                    photoURL: String(
                        rawUser.photoURL ||
                        rawUser.photoUrl ||
                        ""
                    ),
                    whatsapp: String(
                        rawUser.whatsapp ||
                        rawUser.phone ||
                        ""
                    )
                }
            };

            return normalized;
        } catch (error) {
            console.error(
                "[StudyKora Profile] Could not read session:",
                error.message
            );

            return null;
        }
    }

    function saveSession() {
        if (!session) {
            throw new Error("No session is available to save.");
        }

        const savedAt = Number(session.savedAt) || Date.now();
        const expiresIn = Number(session.expiresIn) || DEFAULT_EXPIRES_IN;

        session.schemaVersion = 1;
        session.savedAt = savedAt;
        session.expiresIn = expiresIn;
        session.expiresAt = savedAt + expiresIn * 1000;

        try {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(session)
            );
        } catch {
            throw new Error(
                "Could not save the session. Check your browser storage settings."
            );
        }

        try {
            const saved = JSON.parse(
                sessionStorage.getItem(SESSION_KEY) || "null"
            );

            if (
                !saved ||
                saved.idToken !== session.idToken ||
                saved.user?.uid !== session.user?.uid
            ) {
                throw new Error("Session verification failed.");
            }
        } catch {
            throw new Error(
                "The saved session could not be verified."
            );
        }

        /*
         * Same-tab custom event: shared-header.js can listen for
         * this after it is updated to support this event.
         */
        window.dispatchEvent(
            new CustomEvent("studyKora:auth-state", {
                detail: { authenticated: true }
            })
        );
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // Continue logging out even if storage is unavailable.
        }

        session = null;

        window.dispatchEvent(
            new CustomEvent("studyKora:auth-state", {
                detail: { authenticated: false }
            })
        );
    }

    function hasIdentity() {
        return Boolean(
            session &&
            session.user?.uid &&
            session.user?.email &&
            (session.idToken || session.refreshToken)
        );
    }

    function getSessionError() {
        return new Error(
            "Your session has expired or is incomplete. Please log in again."
        );
    }

    /* -----------------------------------------------------
       Status messages and page states
    ----------------------------------------------------- */

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
        if (profileLoading) {
            profileLoading.textContent = message;
            profileLoading.hidden = false;
        }

        if (authRequired) authRequired.hidden = true;
        if (profileContent) profileContent.hidden = true;
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

    /* -----------------------------------------------------
       Worker API helpers
    ----------------------------------------------------- */

    function isTokenError(status, message) {
        if (status === 401) return true;

        if (status !== 400) return false;

        return /invalid id token|token expired|session is invalid|session has expired|authentication required/i
            .test(message || "");
    }

    async function refreshSessionIfNeeded(force = false) {
        if (!session?.refreshToken) {
            if (session?.idToken && !force) {
                // Let the Worker validate the available ID token.
                return;
            }

            throw getSessionError();
        }

        if (refreshPromise) {
            await refreshPromise;
            return;
        }

        const expiresAt = Number(session.expiresAt) || 0;

        const needsRefresh =
            force ||
            !session.idToken ||
            !expiresAt ||
            Date.now() >= expiresAt - REFRESH_BUFFER_MS;

        if (!needsRefresh) return;

        const oldSession = session;

        refreshPromise = (async () => {
            let response;

            try {
                response = await fetch(`${API_BASE}/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    cache: "no-store",
                    body: JSON.stringify({
                        refreshToken: oldSession.refreshToken
                    })
                });
            } catch {
                throw new Error(
                    "Could not connect to StudyKora to refresh your session."
                );
            }

            const data = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                typeof data.idToken !== "string" ||
                !data.idToken ||
                typeof data.refreshToken !== "string" ||
                !data.refreshToken
            ) {
                throw getSessionError();
            }

            const returnedUid = String(
                data.user?.uid ||
                data.user?.localId ||
                ""
            );

            if (
                returnedUid &&
                oldSession.user?.uid &&
                returnedUid !== oldSession.user.uid
            ) {
                throw new Error(
                    "The refreshed account does not match your current session."
                );
            }

            const parsedExpiry = Number(data.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiry) && parsedExpiry > 0
                    ? parsedExpiry
                    : DEFAULT_EXPIRES_IN;

            const savedAt = Date.now();

            /*
             * The Worker refresh response returns user identifiers,
             * not a complete user object. Preserve existing details.
             */
            session = {
                ...oldSession,
                schemaVersion: 1,
                idToken: data.idToken,
                refreshToken: data.refreshToken,
                expiresIn,
                savedAt,
                expiresAt: savedAt + expiresIn * 1000,
                user: {
                    ...oldSession.user,
                    ...(data.user || {}),
                    uid: returnedUid || oldSession.user.uid,
                    localId:
                        data.user?.localId ||
                        data.user?.uid ||
                        oldSession.user.localId ||
                        oldSession.user.uid
                }
            };

            saveSession();
        })();

        try {
            await refreshPromise;
        } finally {
            refreshPromise = null;
        }
    }

    async function performRequest(path, method, payload) {
        if (!session?.idToken) {
            throw getSessionError();
        }

        let response;

        try {
            response = await fetch(`${API_BASE}${path}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${session.idToken}`
                },
                cache: "no-store",
                ...(payload !== undefined
                    ? { body: JSON.stringify(payload) }
                    : {})
            });
        } catch {
            throw new Error(
                "Could not connect to StudyKora. Check your internet connection."
            );
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                typeof result.error === "string"
                    ? result.error
                    : typeof result.message === "string"
                        ? result.message
                        : `Request failed (HTTP ${response.status}).`;

            const error = new Error(message);
            error.status = response.status;

            throw error;
        }

        return result;
    }

    async function apiRequest(path, method = "GET", payload) {
        if (!hasIdentity()) {
            throw getSessionError();
        }

        await refreshSessionIfNeeded();

        try {
            return await performRequest(path, method, payload);
        } catch (error) {
            /*
             * Retry once only when the Worker reports an ID-token
             * error. Do not refresh on ordinary database-rule errors.
             */
            if (!isTokenError(error.status, error.message)) {
                throw error;
            }

            await refreshSessionIfNeeded(true);

            return performRequest(path, method, payload);
        }
    }

    /* -----------------------------------------------------
       Update session from Worker responses
    ----------------------------------------------------- */

    function updateSessionFromResponse(data) {
        if (!session) {
            throw getSessionError();
        }

        const parsedExpiry = Number(data.expiresIn);
        const expiresIn =
            Number.isFinite(parsedExpiry) && parsedExpiry > 0
                ? parsedExpiry
                : session.expiresIn || DEFAULT_EXPIRES_IN;

        const savedAt = Date.now();

        session = {
            ...session,
            idToken: data.idToken || session.idToken,
            refreshToken: data.refreshToken || session.refreshToken,
            expiresIn,
            savedAt,
            expiresAt: savedAt + expiresIn * 1000,
            user: {
                ...session.user,
                ...(data.user || {})
            }
        };

        if (data.user) {
            session.user.uid =
                data.user.uid ||
                data.user.localId ||
                session.user.uid;

            session.user.localId =
                data.user.localId ||
                data.user.uid ||
                session.user.localId;
        }

        saveSession();
    }

    /* -----------------------------------------------------
       Profile photo preview
    ----------------------------------------------------- */

    function renderDefaultAvatar() {
        if (!avatarPreview) return;

        avatarPreview.replaceChildren();

        const imagePlaceholder = document.createElement("span");
        imagePlaceholder.textContent = "SK";
        imagePlaceholder.setAttribute("aria-hidden", "true");

        imagePlaceholder.style.display = "grid";
        imagePlaceholder.style.width = "100%";
        imagePlaceholder.style.height = "100%";
        imagePlaceholder.style.placeItems = "center";
        imagePlaceholder.style.background = "#eceeef";
        imagePlaceholder.style.color = "#777";
        imagePlaceholder.style.fontSize = "12px";
        imagePlaceholder.style.fontWeight = "700";

        avatarPreview.appendChild(imagePlaceholder);
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
        updateAvatarPreview(profilePhoto.value.trim());
    });

    /* -----------------------------------------------------
       Render profile data
    ----------------------------------------------------- */

    function renderProfile(data) {
        profileData = data.profile || {};

        const accountName =
            profileData.displayName ||
            profileData.name ||
            session.user.displayName ||
            session.user.name ||
            session.user.email.split("@")[0] ||
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

        // Keep the canonical session user fields updated.
        session.user = {
            ...session.user,
            uid:
                data.user?.uid ||
                data.user?.localId ||
                session.user.uid,
            localId:
                data.user?.localId ||
                data.user?.uid ||
                session.user.localId,
            email: accountEmail,
            displayName: accountName,
            photoURL: accountPhoto,
            whatsapp:
                profileData.whatsapp ||
                session.user.whatsapp ||
                ""
        };

        saveSession();
        updateAvatarPreview(accountPhoto);
        showProfile();
    }

    /* -----------------------------------------------------
       Load account profile
    ----------------------------------------------------- */

    async function loadProfile() {
        session = readSession();

        if (!hasIdentity()) {
            showLoggedOut();
            return;
        }

        showLoading();

        try {
            const data = await apiRequest("/profile");

            renderProfile(data);
        } catch (error) {
            console.error(
                "[StudyKora Profile] Load failed:",
                error.message
            );

            if (
                /session has expired|session is incomplete|session does not match/i
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

    /* -----------------------------------------------------
       Save profile name and photo
    ----------------------------------------------------- */

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
                    throw new Error("Unsupported URL protocol");
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

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const result = await apiRequest(
                "/profile",
                "PATCH",
                {
                    displayName: name,
                    photoURL
                }
            );

            updateSessionFromResponse(result);

            profileData = {
                ...profileData,
                displayName: name,
                photoURL
            };

            session.user.displayName = name;
            session.user.photoURL = photoURL;
            saveSession();

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
            showMessage(
                profileMessage,
                error.message || "Could not save your profile.",
                "error"
            );

            console.error(
                "[StudyKora Profile] Save failed:",
                error.message
            );
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        }
    });

    /* -----------------------------------------------------
       Request email change
    ----------------------------------------------------- */

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

        const newEmail =
            newEmailInput.value.trim().toLowerCase();

        const currentEmail =
            profileEmail.value.trim().toLowerCase();

        if (newEmail === currentEmail) {
            showMessage(
                emailMessage,
                "Enter an address different from your current email.",
                "error"
            );
            newEmailInput.focus();
            return;
        }

        if (emailSubmit) {
            emailSubmit.disabled = true;
            emailSubmit.textContent = "Requesting...";
        }

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

            console.error(
                "[StudyKora Profile] Email request failed:",
                error.message
            );
        } finally {
            if (emailSubmit) {
                emailSubmit.disabled = false;
                emailSubmit.textContent = "Request Verification";
            }
        }
    });

    /* -----------------------------------------------------
       Account deletion request
    ----------------------------------------------------- */

    const deleteForm = $("profile-delete-form");
    const deleteOpen = $("profile-delete-open");
    const deleteCancel = $("profile-delete-cancel");
    const deletePassword = $("profile-delete-password");
    const deleteConfirm = $("profile-delete-confirm");
    const deleteMessage = $("profile-delete-message");
    const deleteSubmit = $("profile-delete-submit");

    deleteOpen?.addEventListener("click", () => {
        if (!deleteForm) return;

        deleteForm.hidden = false;
        deleteOpen.hidden = true;
        deletePassword?.focus();
    });

    deleteCancel?.addEventListener("click", () => {
        deleteForm?.reset();

        if (deleteForm) deleteForm.hidden = true;
        if (deleteOpen) deleteOpen.hidden = false;

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

        if (deleteSubmit) {
            deleteSubmit.disabled = true;
            deleteSubmit.textContent = "Submitting...";
        }

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

            console.error(
                "[StudyKora Profile] Deletion request failed:",
                error.message
            );
        } finally {
            if (deleteSubmit) {
                deleteSubmit.disabled = false;
                deleteSubmit.textContent = "Submit Request";
            }
        }
    });

    /* -----------------------------------------------------
       Logout
    ----------------------------------------------------- */

    const logoutButton = $("profile-logout");
    const logoutConfirmation = $("profile-logout-confirmation");
    const logoutCancel = $("profile-logout-cancel");
    const logoutConfirm = $("profile-logout-confirm");

    logoutButton?.addEventListener("click", () => {
        if (logoutConfirmation) logoutConfirmation.hidden = false;
        logoutButton.hidden = true;
    });

    logoutCancel?.addEventListener("click", () => {
        if (logoutConfirmation) logoutConfirmation.hidden = true;
        if (logoutButton) logoutButton.hidden = false;
    });

    logoutConfirm?.addEventListener("click", () => {
        clearSession();
        window.location.replace("index.html");
    });

    /* -----------------------------------------------------
       Initialise
    ----------------------------------------------------- */

    loadProfile();
});
