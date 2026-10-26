/* =====================================================
   StudyKora — Shared Header Logic
   File: js/shared-header.js

   Responsibilities:
   - Guest/authenticated header visibility
   - Canonical session and legacy-session migration
   - Refresh expired or nearly expired Firebase ID tokens
   - Small profile control without a human-shaped icon
   - Active navigation and responsive mobile menu
===================================================== */

"use strict";

(() => {
    const SESSION_KEY = "studyKoraSession";
    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const DEFAULT_EXPIRES_IN = 3600;
    const REFRESH_BUFFER_MS = 120000;

    let refreshPromise = null;
    let stateRevision = 0;

    function getSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);

            if (!raw) {
                return { session: null, rawPresent: false };
            }

            const stored = JSON.parse(raw);

            if (!stored || typeof stored !== "object") {
                return { session: null, rawPresent: true };
            }

            const oldUser =
                stored.user && typeof stored.user === "object"
                    ? stored.user
                    : {};

            const uid = String(
                oldUser.uid ||
                oldUser.localId ||
                oldUser.userId ||
                stored.uid ||
                ""
            );

            const email = String(
                oldUser.email || stored.email || ""
            ).trim().toLowerCase();

            // Older auth.js versions stored Firebase idToken under
            // accessToken/token. Accept those fields only as migration.
            const idToken = String(
                stored.idToken ||
                stored.accessToken ||
                stored.token ||
                ""
            );

            const refreshToken = String(stored.refreshToken || "");

            const parsedExpiry = Number(stored.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiry) && parsedExpiry > 0
                    ? parsedExpiry
                    : DEFAULT_EXPIRES_IN;

            const parsedSavedAt = Number(stored.savedAt);
            let savedAt =
                Number.isFinite(parsedSavedAt) && parsedSavedAt > 0
                    ? parsedSavedAt
                    : 0;

            let expiresAt = Number(stored.expiresAt);

            if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
                expiresAt = stored.expiresAt
                    ? Date.parse(stored.expiresAt)
                    : 0;
            }

            if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
                expiresAt = 0;
            }

            // Migrate sessions that had expiresAt but no savedAt.
            if (!savedAt && expiresAt) {
                savedAt = expiresAt - expiresIn * 1000;
            }

            if (!expiresAt && savedAt) {
                expiresAt = savedAt + expiresIn * 1000;
            }

            const session = {
                schemaVersion: 1,
                idToken,
                refreshToken,
                expiresIn,
                savedAt,
                expiresAt,
                user: {
                    ...oldUser,
                    uid,
                    localId: String(oldUser.localId || uid),
                    email,
                    displayName: String(
                        oldUser.displayName ||
                        oldUser.name ||
                        stored.name ||
                        ""
                    ),
                    photoURL: String(
                        oldUser.photoURL ||
                        oldUser.photoUrl ||
                        ""
                    ),
                    whatsapp: String(
                        oldUser.whatsapp ||
                        oldUser.phone ||
                        ""
                    )
                }
            };

            return {
                session,
                rawPresent: true,
                needsMigration:
                    stored.schemaVersion !== 1 ||
                    stored.idToken !== idToken ||
                    !stored.savedAt ||
                    !stored.expiresAt ||
                    !oldUser.uid ||
                    !oldUser.email
            };
        } catch (error) {
            console.warn(
                "[StudyKora Header] Could not read the session:",
                error.message
            );

            return { session: null, rawPresent: true };
        }
    }

    function saveSession(session) {
        if (
            !session ||
            !session.refreshToken ||
            !session.user?.uid ||
            !session.user?.email
        ) {
            throw new Error("The session is incomplete.");
        }

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // Keep the header in logged-out state even if storage fails.
        }
    }

    function setAccountVisibility(loggedIn) {
        const guest = document.getElementById("account-guest");
        const authenticated =
            document.getElementById("account-authenticated");

        if (guest) {
            guest.hidden = loggedIn;
        }

        if (authenticated) {
            authenticated.hidden = !loggedIn;
        }
    }

    function prepareProfileControl() {
        const trigger =
            document.getElementById("account-profile-trigger");

        if (!trigger) return;

        // The new profile control is a simple soft-grey box.
        // Remove legacy human/avatar SVGs from existing page markup.
        trigger.replaceChildren();
        trigger.setAttribute("aria-label", "Open your profile");
        trigger.setAttribute("title", "Profile");
        trigger.setAttribute("href", "profile.html");
    }

    /* -----------------------------------------------------
       Refresh authentication session
    ----------------------------------------------------- */

    async function refreshSession(session) {
        if (refreshPromise) {
            return refreshPromise;
        }

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
                        refreshToken: session.refreshToken
                    })
                });
            } catch {
                const error = new Error(
                    "Unable to contact the authentication service."
                );
                error.status = 0;
                throw error;
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Session refresh failed."
                );

                error.status = response.status;
                throw error;
            }

            if (
                typeof data.idToken !== "string" ||
                !data.idToken ||
                typeof data.refreshToken !== "string" ||
                !data.refreshToken
            ) {
                throw new Error(
                    "The authentication service returned an incomplete refreshed session."
                );
            }

            const returnedUid = String(
                data.user?.uid ||
                data.user?.localId ||
                ""
            );

            if (
                returnedUid &&
                returnedUid !== session.user.uid
            ) {
                const error = new Error(
                    "The refreshed account does not match the current account."
                );

                error.status = 401;
                throw error;
            }

            const parsedExpiry = Number(data.expiresIn);
            const expiresIn =
                Number.isFinite(parsedExpiry) && parsedExpiry > 0
                    ? parsedExpiry
                    : DEFAULT_EXPIRES_IN;

            const savedAt = Date.now();

            const refreshed = {
                ...session,
                schemaVersion: 1,
                idToken: data.idToken,
                refreshToken: data.refreshToken,
                expiresIn,
                savedAt,
                expiresAt: savedAt + expiresIn * 1000,
                user: {
                    ...session.user,
                    ...(data.user || {}),
                    uid: returnedUid || session.user.uid,
                    localId:
                        data.user?.localId ||
                        data.user?.uid ||
                        session.user.localId ||
                        session.user.uid
                }
            };

            saveSession(refreshed);
            return refreshed;
        })();

        try {
            return await refreshPromise;
        } finally {
            refreshPromise = null;
        }
    }

    /* -----------------------------------------------------
       Account state
    ----------------------------------------------------- */

    async function updateAccountState() {
        const revision = ++stateRevision;
        const result = getSession();

        let session = result.session;

        if (!session) {
            if (result.rawPresent) {
                clearSession();
            }

            setAccountVisibility(false);

            console.info(
                "[StudyKora Header] Account state: Logged out"
            );

            return;
        }

        const hasIdentity = Boolean(
            session.user?.uid &&
            session.user?.email &&
            session.refreshToken
        );

        if (!hasIdentity) {
            clearSession();
            setAccountVisibility(false);

            console.info(
                "[StudyKora Header] Account state: Logged out"
            );

            return;
        }

        const now = Date.now();
        const tokenExpiry = Number(session.expiresAt) || 0;

        const tokenNeedsRefresh =
            !session.idToken ||
            !tokenExpiry ||
            now >= tokenExpiry - REFRESH_BUFFER_MS;

        // A non-expired canonical session does not need a refresh call.
        if (!tokenNeedsRefresh) {
            try {
                if (result.needsMigration) {
                    saveSession(session);
                }
            } catch (error) {
                console.error(
                    "[StudyKora Header] Could not normalize session:",
                    error.message
                );

                setAccountVisibility(false);
                return;
            }

            setAccountVisibility(true);

            console.info(
                "[StudyKora Header] Account state: Logged in"
            );

            return;
        }

        // Do not display the profile control while an expired session
        // is being restored or refreshed.
        setAccountVisibility(false);

        try {
            session = await refreshSession(session);

            // Ignore stale async results if a newer state check started.
            if (revision !== stateRevision) return;

            setAccountVisibility(true);

            console.info(
                "[StudyKora Header] Account state: Logged in"
            );
        } catch (error) {
            if (revision !== stateRevision) return;

            if (error.status === 401 || error.status === 403) {
                clearSession();
            } else {
                // A temporary network failure should not destroy a
                // session whose existing ID token has not expired yet.
                const stillUsable =
                    Boolean(session.idToken) &&
                    Number(session.expiresAt) > Date.now();

                if (stillUsable) {
                    setAccountVisibility(true);
                } else {
                    setAccountVisibility(false);
                }

                console.warn(
                    "[StudyKora Header] Session refresh could not complete:",
                    error.message
                );

                return;
            }

            setAccountVisibility(false);

            console.info(
                "[StudyKora Header] Account state: Logged out"
            );
        }
    }

    /* -----------------------------------------------------
       Active navigation
    ----------------------------------------------------- */

    function updateActiveNavigation() {
        const nav = document.getElementById("main-nav");
        if (!nav) return;

        let currentPath = window.location.pathname;

        if (currentPath.endsWith("/") || currentPath === "") {
            currentPath += "index.html";
        }

        nav.querySelectorAll("a[href]").forEach((link) => {
            let targetPath;

            try {
                targetPath = new URL(
                    link.href,
                    window.location.href
                ).pathname;
            } catch {
                return;
            }

            if (targetPath.endsWith("/")) {
                targetPath += "index.html";
            }

            if (targetPath === currentPath) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    /* -----------------------------------------------------
       Responsive navigation
    ----------------------------------------------------- */

    function initializeMobileNavigation() {
        const nav = document.getElementById("main-nav");
        const menuToggle = document.getElementById("menu-toggle");

        if (!nav || !menuToggle) return;
        if (menuToggle.dataset.headerMenuReady === "true") return;

        menuToggle.dataset.headerMenuReady = "true";

        function setMenuState(requestedOpen) {
            const isMobile = window.matchMedia(
                "(max-width: 780px)"
            ).matches;

            const shouldOpen = Boolean(requestedOpen && isMobile);

            nav.classList.toggle("is-open", shouldOpen);
            menuToggle.classList.toggle("is-active", shouldOpen);

            menuToggle.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );

            menuToggle.setAttribute(
                "aria-label",
                shouldOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );
        }

        menuToggle.addEventListener("click", (event) => {
            event.stopPropagation();

            setMenuState(
                !nav.classList.contains("is-open")
            );
        });

        nav.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                setMenuState(false);
            }
        });

        document.addEventListener("click", (event) => {
            if (
                nav.classList.contains("is-open") &&
                !nav.contains(event.target) &&
                !menuToggle.contains(event.target)
            ) {
                setMenuState(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setMenuState(false);
            }
        });

        window.addEventListener("resize", () => {
            setMenuState(false);
        });

        const mobileQuery = window.matchMedia(
            "(max-width: 780px)"
        );

        if (typeof mobileQuery.addEventListener === "function") {
            mobileQuery.addEventListener("change", () => {
                setMenuState(false);
            });
        } else {
            mobileQuery.addListener(() => {
                setMenuState(false);
            });
        }
    }

    /* -----------------------------------------------------
       Initialize
    ----------------------------------------------------- */

    function initializeSharedHeader() {
        const header = document.querySelector(".site-header");

        // The separate dashboard layout does not use the public header.
        if (!header) return;

        prepareProfileControl();
        initializeMobileNavigation();
        updateActiveNavigation();

        // Initial session check.
        void updateAccountState();

        // Same-tab events emitted by profile/dashboard auth code.
        window.addEventListener("studyKora:auth-state", () => {
            void updateAccountState();
        });

        window.addEventListener("pageshow", () => {
            void updateAccountState();
        });

        window.addEventListener("focus", () => {
            void updateAccountState();
        });

        window.addEventListener("storage", (event) => {
            if (
                event.key === SESSION_KEY ||
                event.key === null
            ) {
                void updateAccountState();
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                void updateAccountState();
            }
        });

        console.info(
            "[StudyKora Header] Initialized:",
            window.location.pathname
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeSharedHeader,
            { once: true }
        );
    } else {
        initializeSharedHeader();
    }
})();
```
