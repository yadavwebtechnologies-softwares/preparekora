/* ==========================================
   PrepareKora — Profile Page
   File: js/profile.js
   ========================================== */

"use strict";

(() => {
    const API_BASE = "https://studykora-api.yadavsubba2003.workers.dev";
    const DB_BASE = "https://studykora-fc91d-default-rtdb.firebaseio.com";
    const SESSION_KEY = "studyKoraSession";
    const LOG = "[PrepareKora Profile]";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const state = {
        session: null,
        profile: null,
        activeTab: "edit",
        historyLoaded: false
    };

    /* ---------- Session ---------- */

    function readSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const value = JSON.parse(raw);
            if (!value || typeof value !== "object") return null;
            if (!value.idToken || !value.user || !value.user.uid) return null;
            return value;
        } catch {
            return null;
        }
    }

    function writeSession(session) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (error) {
            console.warn(`${LOG} Could not persist session.`, error);
        }
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            /* ignore */
        }
    }

    async function refreshIfNeeded(session) {
        if (!session) return null;

        const expiresAt = Number(session.expiresAt || 0);
        const needsRefresh = !expiresAt || expiresAt < Date.now() + 60_000;

        if (!needsRefresh || !session.refreshToken) {
            return session;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: session.refreshToken })
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload || !payload.idToken) {
                throw new Error((payload && payload.error) || "Refresh failed.");
            }

            const savedAt = Date.now();
            const expiresIn = Number(payload.expiresIn) || 3600;

            const next = {
                ...session,
                idToken: payload.idToken,
                refreshToken: payload.refreshToken || session.refreshToken,
                expiresIn,
                savedAt,
                expiresAt: savedAt + expiresIn * 1000,
                user: {
                    ...session.user,
                    ...(payload.user || {})
                }
            };

            writeSession(next);
            return next;
        } catch (error) {
            console.warn(`${LOG} Token refresh failed.`, error.message);
            return session;
        }
    }

    /* ---------- API ---------- */

    async function apiRequest(endpoint, options = {}) {
        const { method = "GET", body, token } = options;

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            cache: "no-store",
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });

        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = {};
            }
        }

        if (!response.ok) {
            const message =
                typeof data.error === "string"
                    ? data.error
                    : typeof data.message === "string"
                        ? data.message
                        : `Request failed (HTTP ${response.status}).`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    function fetchProfile(session) {
        return apiRequest("/profile", { token: session.idToken });
    }

    function patchProfile(session, payload) {
        return apiRequest("/profile", {
            method: "PATCH",
            body: payload,
            token: session.idToken
        });
    }

    async function writeWhatsApp(session, whatsapp) {
        const url =
            `${DB_BASE}/users/${encodeURIComponent(session.user.uid)}` +
            `/whatsapp.json?auth=${encodeURIComponent(session.idToken)}`;

        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(whatsapp)
        });

        if (!response.ok) {
            throw new Error("Could not update WhatsApp number.");
        }

        return response.json().catch(() => null);
    }

    async function fetchTestHistory(session) {
        const url =
            `${DB_BASE}/users/${encodeURIComponent(session.user.uid)}` +
            `/testAttempts.json?auth=${encodeURIComponent(session.idToken)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not load test history.");
        }

        const data = await response.json();
        return data && typeof data === "object" ? data : {};
    }

    /* ---------- State switching ---------- */

    function showState(name) {
        const loading = $("#profile-loading");
        const unauth = $("#profile-unauth");
        const error = $("#profile-error");
        const ready = $("#profile-content");

        if (loading) loading.hidden = name !== "loading";
        if (unauth) unauth.hidden = name !== "unauth";
        if (error) error.hidden = name !== "error";
        if (ready) ready.hidden = name !== "ready";
    }

    /* ---------- Renderers ---------- */

    function escapeText(text) {
        const div = document.createElement("div");
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return String(text).replace(/"/g, "&quot;");
    }

    function getInitials(name, email) {
        const clean = String(name || "").trim();
        if (clean) {
            const parts = clean.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return clean.slice(0, 2).toUpperCase();
        }
        const local = String(email || "").split("@")[0];
        return (local.slice(0, 2) || "U").toUpperCase();
    }

    function renderIdentity(profile) {
        const name = profile.displayName || profile.name || "User";
        const email = profile.email || "";

        const avatarEl = $("#profile-avatar");
        if (avatarEl) {
            if (profile.photoURL) {
                avatarEl.innerHTML = `<img src="${escapeAttr(profile.photoURL)}" alt="">`;
                const img = avatarEl.querySelector("img");
                if (img) {
                    img.addEventListener(
                        "error",
                        () => {
                            avatarEl.innerHTML = `<span class="sk-avatar-initials">${escapeText(getInitials(name, email))}</span>`;
                        },
                        { once: true }
                    );
                }
            } else {
                avatarEl.innerHTML = `<span class="sk-avatar-initials">${escapeText(getInitials(name, email))}</span>`;
            }
        }

        const nameEl = $("#profile-name");
        if (nameEl) nameEl.textContent = name;

        const emailEl = $("#profile-email");
        if (emailEl) emailEl.textContent = email;

        const nameInput = $("#profile-display-name");
        if (nameInput) nameInput.value = profile.displayName || profile.name || "";

        const photoInput = $("#profile-photo-url");
        if (photoInput) photoInput.value = profile.photoURL || "";

        const whatsappInput = $("#profile-whatsapp");
        if (whatsappInput) whatsappInput.value = profile.whatsapp || "";

        const emailDisplay = $("#profile-email-display");
        if (emailDisplay) emailDisplay.textContent = email;
    }

    function setTab(name) {
        state.activeTab = name;

        $$("[data-profile-tab]").forEach((button) => {
            const active = button.dataset.profileTab === name;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        ["edit", "settings", "history", "purchase"].forEach((tab) => {
            const panel = $(`#profile-panel-${tab}`);
            if (panel) panel.hidden = tab !== name;
        });

        if (name === "history" && !state.historyLoaded) {
            loadTestHistory();
        }
    }

    /* ---------- Test History ---------- */

    function formatDate(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function formatDuration(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const min = Math.floor(total / 60);
        const sec = total % 60;
        return `${min}m ${String(sec).padStart(2, "0")}s`;
    }

    async function loadTestHistory() {
        const loading = $("#profile-history-loading");
        const empty = $("#profile-history-empty");
        const wrap = $("#profile-history-table-wrap");
        const body = $("#profile-history-body");

        if (!loading || !empty || !wrap || !body) return;

        loading.hidden = false;
        empty.hidden = true;
        wrap.hidden = true;

        try {
            const data = await fetchTestHistory(state.session);
            const attempts = Object.values(data).filter(
                (item) => item && typeof item === "object" && item.completedAt
            );

            attempts.sort((a, b) =>
                String(b.completedAt).localeCompare(String(a.completedAt))
            );

            state.historyLoaded = true;

            if (!attempts.length) {
                loading.hidden = true;
                empty.hidden = false;
                return;
            }

            body.replaceChildren();

            attempts.forEach((attempt) => {
                const tr = document.createElement("tr");

                const dateCell = document.createElement("td");
                dateCell.textContent = formatDate(attempt.completedAt);
                tr.appendChild(dateCell);

                const testCell = document.createElement("td");
                testCell.textContent = attempt.testTitle || attempt.testId || "Test";
                tr.appendChild(testCell);

                const scoreCell = document.createElement("td");
                const correct = Number(attempt.correctAnswers || 0);
                const total = Number(attempt.totalMarks || attempt.totalQuestions || 0);
                scoreCell.textContent = total ? `${correct} / ${total}` : "—";
                tr.appendChild(scoreCell);

                const accCell = document.createElement("td");
                accCell.textContent =
                    typeof attempt.accuracy === "number" ? `${attempt.accuracy}%` : "—";
                tr.appendChild(accCell);

                const timeCell = document.createElement("td");
                timeCell.textContent = formatDuration(attempt.timeTakenSeconds);
                tr.appendChild(timeCell);

                body.appendChild(tr);
            });

            loading.hidden = true;
            wrap.hidden = false;
        } catch (error) {
            console.error(`${LOG} Could not load test history.`, error);
            loading.hidden = true;
            empty.hidden = false;

            const strong = empty.querySelector("strong");
            const paragraph = empty.querySelector("p");
            if (strong) strong.textContent = "Could not load test history";
            if (paragraph) paragraph.textContent = "Please try again in a moment.";
            const link = empty.querySelector("a");
            if (link) link.remove();
        }
    }

    /* ---------- Edit Profile ---------- */

    function setMessage(el, text, type = "") {
        if (!el) return;
        el.textContent = text;
        el.classList.toggle("is-error", type === "error");
        el.classList.toggle("is-success", type === "success");
    }

    async function handleEditSubmit(event) {
        event.preventDefault();

        const message = $("#profile-edit-message");
        const submit = $("#profile-edit-submit");

        const displayName = ($("#profile-display-name")?.value || "").trim();
        const photoURL = ($("#profile-photo-url")?.value || "").trim();
        const whatsapp = ($("#profile-whatsapp")?.value || "").trim();

        if (displayName.length < 2 || displayName.length > 80) {
            setMessage(message, "Name must be between 2 and 80 characters.", "error");
            return;
        }

        if (photoURL && !/^https?:\/\//i.test(photoURL)) {
            setMessage(message, "Photo URL must start with http:// or https://.", "error");
            return;
        }

        if (whatsapp) {
            const digits = whatsapp.replace(/\D/g, "");
            if (digits.length < 7 || digits.length > 15) {
                setMessage(message, "Enter a valid WhatsApp number with country code.", "error");
                return;
            }
        }

        const currentName = state.profile?.displayName || state.profile?.name || "";
        const currentPhoto = state.profile?.photoURL || "";
        const currentWhatsapp = state.profile?.whatsapp || "";

        const nameChanged = displayName !== currentName;
        const photoChanged = photoURL !== currentPhoto;
        const whatsappChanged = whatsapp !== currentWhatsapp;

        if (!nameChanged && !photoChanged && !whatsappChanged) {
            setMessage(message, "No changes to save.", "success");
            return;
        }

        setMessage(message, "");
        if (submit) {
            submit.disabled = true;
            submit.textContent = "Saving…";
        }

        try {
            if (nameChanged || photoChanged) {
                const payload = {};
                if (nameChanged) payload.displayName = displayName;
                if (photoChanged) payload.photoURL = photoURL;

                const response = await patchProfile(state.session, payload);

                if (response && response.idToken) {
                    const savedAt = Date.now();
                    const expiresIn = Number(response.expiresIn) || 3600;
                    state.session = {
                        ...state.session,
                        idToken: response.idToken,
                        refreshToken: response.refreshToken || state.session.refreshToken,
                        expiresIn,
                        savedAt,
                        expiresAt: savedAt + expiresIn * 1000,
                        user: {
                            ...state.session.user,
                            ...(response.user || {})
                        }
                    };
                    writeSession(state.session);
                }
            }

            if (whatsappChanged) {
                await writeWhatsApp(state.session, whatsapp);
            }

            const fresh = await fetchProfile(state.session);
            state.profile = {
                ...(fresh.profile || {}),
                ...(fresh.user || {})
            };

            state.session.user = {
                ...state.session.user,
                uid: state.profile.uid || state.session.user.uid,
                email: state.profile.email || state.session.user.email,
                displayName:
                    state.profile.displayName ||
                    state.profile.name ||
                    state.session.user.displayName,
                photoURL: state.profile.photoURL || state.session.user.photoURL,
                whatsapp: state.profile.whatsapp || state.session.user.whatsapp
            };
            writeSession(state.session);

            renderIdentity(state.profile);
            setMessage(message, "Profile saved.", "success");
        } catch (error) {
            console.error(`${LOG} Save failed.`, error);
            setMessage(
                message,
                error.message || "Could not save profile. Please try again.",
                "error"
            );
        } finally {
            if (submit) {
                submit.disabled = false;
                submit.textContent = "Save Changes";
            }
        }
    }

    /* ---------- Settings ---------- */

    async function handleEmailChange() {
        const message = $("#profile-email-message");
        const button = $("#profile-email-change-submit");
        const newEmail = ($("#profile-new-email")?.value || "").trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setMessage(message, "Enter a valid email address.", "error");
            return;
        }

        setMessage(message, "");
        if (button) {
            button.disabled = true;
            button.textContent = "Requesting…";
        }

        try {
            const response = await apiRequest("/profile/email-change", {
                method: "POST",
                body: { newEmail },
                token: state.session.idToken
            });
            setMessage(
                message,
                response.message || "Email change requested. Check your inbox.",
                "success"
            );
            const input = $("#profile-new-email");
            if (input) input.value = "";
        } catch (error) {
            setMessage(
                message,
                error.message || "Could not request email change.",
                "error"
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Request Email Change";
            }
        }
    }

    function openDeleteForm() {
        const form = $("#profile-delete-form");
        const open = $("#profile-delete-open");
        if (form) form.hidden = false;
        if (open) open.hidden = true;
    }

    function closeDeleteForm() {
        const form = $("#profile-delete-form");
        const open = $("#profile-delete-open");
        if (form) form.hidden = true;
        if (open) open.hidden = false;

        const confirm = $("#profile-delete-confirm");
        const password = $("#profile-delete-password");
        const message = $("#profile-delete-message");
        if (confirm) confirm.value = "";
        if (password) password.value = "";
        if (message) message.textContent = "";
    }

    async function handleDeleteSubmit() {
        const message = $("#profile-delete-message");
        const button = $("#profile-delete-submit");
        const confirmation = ($("#profile-delete-confirm")?.value || "");
        const password = ($("#profile-delete-password")?.value || "");

        if (confirmation !== "DELETE") {
            setMessage(message, 'Type "DELETE" to confirm.', "error");
            return;
        }

        if (!password) {
            setMessage(message, "Enter your password.", "error");
            return;
        }

        setMessage(message, "");
        if (button) {
            button.disabled = true;
            button.textContent = "Submitting…";
        }

        try {
            const response = await apiRequest("/profile/deletion-request", {
                method: "POST",
                body: { confirmation: "DELETE", password },
                token: state.session.idToken
            });
            setMessage(
                message,
                response.message || "Deletion request recorded.",
                "success"
            );
        } catch (error) {
            setMessage(
                message,
                error.message || "Could not submit request.",
                "error"
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Confirm Request";
            }
        }
    }

    /* ---------- Logout ---------- */

    function handleLogout() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch (error) {
            console.warn(`${LOG} Could not clear session.`, error);
        }
        window.location.assign("index.html");
    }

    /* ---------- Initialise ---------- */

    async function init() {
        showState("loading");

        const session = readSession();
        if (!session) {
            showState("unauth");
            return;
        }

        state.session = session;

        try {
            const refreshed = await refreshIfNeeded(session);
            if (refreshed) state.session = refreshed;

            const data = await fetchProfile(state.session);
            state.profile = {
                ...(data.profile || {}),
                ...(data.user || {})
            };

            state.session.user = {
                ...state.session.user,
                uid: state.profile.uid || state.session.user.uid,
                email: state.profile.email || state.session.user.email,
                displayName:
                    state.profile.displayName ||
                    state.profile.name ||
                    state.session.user.displayName,
                photoURL: state.profile.photoURL || state.session.user.photoURL,
                whatsapp: state.profile.whatsapp || state.session.user.whatsapp
            };
            writeSession(state.session);

            renderIdentity(state.profile);
            setTab("edit");
            showState("ready");
        } catch (error) {
            console.error(`${LOG} Init failed.`, error);

            if (error.status === 401) {
                clearSession();
                showState("unauth");
                return;
            }

            const errEl = $("#profile-error-message");
            if (errEl) errEl.textContent = error.message || "Could not load profile.";
            showState("error");
        }
    }

    /* ---------- Wire ---------- */

    function wire() {
        $$("[data-profile-tab]").forEach((button) => {
            button.addEventListener("click", () => setTab(button.dataset.profileTab));
        });

        const editForm = $("#profile-edit-form");
        if (editForm) editForm.addEventListener("submit", handleEditSubmit);

        const emailBtn = $("#profile-email-change-submit");
        if (emailBtn) emailBtn.addEventListener("click", handleEmailChange);

        const deleteOpen = $("#profile-delete-open");
        if (deleteOpen) deleteOpen.addEventListener("click", openDeleteForm);

        const deleteCancel = $("#profile-delete-cancel");
        if (deleteCancel) deleteCancel.addEventListener("click", closeDeleteForm);

        const deleteSubmit = $("#profile-delete-submit");
        if (deleteSubmit) deleteSubmit.addEventListener("click", handleDeleteSubmit);

        const logoutBtn = $("#profile-logout");
        if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

        const historyRefresh = $("#profile-history-refresh");
        if (historyRefresh) {
            historyRefresh.addEventListener("click", () => {
                state.historyLoaded = false;
                loadTestHistory();
            });
        }

        const retry = $("#profile-retry");
        if (retry) retry.addEventListener("click", init);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                wire();
                init();
            },
            { once: true }
        );
    } else {
        wire();
        init();
    }
})();
