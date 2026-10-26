/* =====================================================
   StudyKora — Shared Header Logic
   File: js/shared-header.js
===================================================== */

"use strict";

(() => {
    const SESSION_KEY = "studyKoraSession";
    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const DEFAULT_EXPIRES_IN = 3600;
    const REFRESH_BUFFER_MS = 120000;

    let refreshPromise = null;
    let accountCheckRevision = 0;

    /* Read and normalize session */

    function readStoredSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);

            if (!raw) {
                return { session: null, exists: false };
            }

            const stored = JSON.parse(raw);

            if (!stored || typeof stored !== "object") {
                return { session: null, exists: true };
            }

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
                rawUser.email || stored.email || ""
            ).trim().toLowerCase();

            // Migrate sessions saved by older auth.js versions.
            const idToken = String(
                stored.idToken ||
                stored.accessToken ||
                stored.token ||
                ""
            );

            const refreshToken = String(stored.refreshToken || "");

            const expiryValue = Number(stored.expiresAt);
            let expiresAt =
                Number.isFinite(expiryValue) && expiryValue > 0
                    ? expiryValue
                    : 0;

            const expirySecondsValue = Number(stored.expiresIn);
            const expiresIn =
                Number.isFinite(expirySecondsValue) &&
                expirySecondsValue > 0
                    ? expirySecondsValue
                    : DEFAULT_EXPIRES_IN;

            const savedAtValue = Number(stored.savedAt);
            let savedAt =
                Number.isFinite(savedAtValue) && savedAtValue > 0
                    ? savedAtValue
                    : 0;

            if (!savedAt && expiresAt) {
                savedAt = expiresAt - expiresIn * 1000;
            }

            if (!expiresAt && savedAt) {
                expiresAt = savedAt + expiresIn * 1000;
            }

            return {
                exists: true,
                needsMigration:
                    stored.schemaVersion !== 1 ||
                    stored.idToken !== idToken ||
                    !stored.savedAt ||
                    !stored.expiresAt ||
                    !rawUser.uid ||
                    !rawUser.email,

                session: {
                    schemaVersion: 1,
                    idToken,
                    refreshToken,
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
                }
            };
        } catch (error) {
            console.warn(
                "[StudyKora Header] Could not read session:",
                error.message
            );

            return { session: null, exists: true };
        }
    }

    function saveSession(session) {
        if (
            !session ||
            !session.idToken ||
            !session.refreshToken ||
            !session.user?.uid ||
            !session.user?.email
        ) {
            throw new Error("Session is incomplete.");
        }

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch (error) {
            console.warn(
                "[StudyKora Header] Could not clear session:",
                error.message
            );
        }
    }

    /* Toggle guest and authenticated controls */

    function setAccountVisibility(isAuthenticated) {
        const guest = document.getElementById("account-guest");
        const authenticated =
            document.getElementById("account-authenticated");

        if (guest) {
            guest.hidden = isAuthenticated;
        }

        if (authenticated) {
            authenticated.hidden = !isAuthenticated;
        }
    }

    /* Remove the old human-shaped profile SVG */

    function prepareProfileControl() {
        const trigger =
            document.getElementById("account-profile-trigger");

        if (!trigger) return;

        trigger.replaceChildren();
        trigger.href = "profile.html";
        trigger.setAttribute("aria-label", "Open your profile");
        trigger.setAttribute("title", "Profile");
    }

    /* Refresh Firebase ID token */

    async function refreshSession(session) {
        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise = (async () => {
            let response;

            try {
                response = await fetch(
                    `${API_BASE}/auth/refresh`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        cache: "no-store",
                        body: JSON.stringify({
                            refreshToken: session.refreshToken
                        })
                    }
                );
            } catch {
                const error = new Error(
                    "Unable to contact the authentication service."
                );

                error.status = 0;
                throw error;
            }

            const data = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                typeof data.idToken !== "string" ||
                !data.idToken ||
                typeof data.refreshToken !== "string" ||
                !data.refreshToken
            ) {
                const error = new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Session refresh failed."
                );

                error.status = response.status;
                throw error;
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
                    "Refreshed account does not match this session."
                );

                error.status = 401;
                throw error;
            }

            const expiryValue = Number(data.expiresIn);
            const expiresIn =
                Number.isFinite(expiryValue) && expiryValue > 0
                    ? expiryValue
                    : DEFAULT_EXPIRES_IN;

            const savedAt = Date.now();

            const updated = {
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

            saveSession(updated);
            return updated;
        })();

        try {
            return await refreshPromise;
        } finally {
            refreshPromise = null;
        }
    }

    /* Determine current account state */

    async function updateAccountState() {
        const revision = ++accountCheckRevision;
        const result = readStoredSession();

        let session = result.session;

        if (!session) {
            if (result.exists) {
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

        const expiresAt = Number(session.expiresAt) || 0;

        const needsRefresh =
            !session.idToken ||
            !expiresAt ||
            Date.now() >= expiresAt - REFRESH_BUFFER_MS;

        if (!needsRefresh) {
            if (result.needsMigration) {
                try {
                    saveSession(session);
                } catch (error) {
                    console.error(
                        "[StudyKora Header] Session migration failed:",
                        error.message
                    );

                    setAccountVisibility(false);
                    return;
                }
            }

            setAccountVisibility(true);

            console.info(
                "[StudyKora Header] Account state: Logged in"
            );

            return;
        }

        // Keep guest buttons visible until refresh succeeds.
        setAccountVisibility(false);

        try {
            session = await refreshSession(session);

            if (revision !== accountCheckRevision) return;

            setAccountVisibility(true);

            console.info(
                "[StudyKora Header] Account state: Logged in"
            );
        } catch (error) {
            if (revision !== accountCheckRevision) return;

            if (error.status === 401 || error.status === 403) {
                clearSession();
                setAccountVisibility(false);

                console.info(
                    "[StudyKora Header] Account state: Logged out"
                );

                return;
            }

            // A temporary network failure should not erase a session
            // whose existing ID token has not expired.
            const tokenStillUnexpired = Boolean(
                session.idToken &&
                Number(session.expiresAt) > Date.now()
            );

            setAccountVisibility(tokenStillUnexpired);

            console.warn(
                "[StudyKora Header] Refresh unavailable:",
                error.message
            );
        }
    }

    /* Active navigation */

    function updateActiveNavigation() {
        const nav = document.getElementById("main-nav");
        if (!nav) return;

        let currentPath = window.location.pathname;

        if (currentPath.endsWith("/")) {
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

    /* Mobile navigation */

    function initializeMobileNavigation() {
        const nav = document.getElementById("main-nav");
        const menuToggle = document.getElementById("menu-toggle");

        if (!nav || !menuToggle) return;

        if (menuToggle.dataset.headerMenuReady === "true") {
            return;
        }

        menuToggle.dataset.headerMenuReady = "true";

        function setMenuState(open) {
            const isMobile = window.matchMedia(
                "(max-width: 780px)"
            ).matches;

            const shouldOpen = Boolean(open && isMobile);

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

            setMenuState(!nav.classList.contains("is-open"));
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

        const mediaQuery = window.matchMedia(
            "(max-width: 780px)"
        );

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", () => {
                setMenuState(false);
            });
        } else {
            mediaQuery.addListener(() => {
                setMenuState(false);
            });
        }
    }

    /* Initialize public header */

    function initializeSharedHeader() {
        const header = document.querySelector(".site-header");

        // Dashboard uses its own layout, not the public header.
        if (!header) return;

        prepareProfileControl();
        initializeMobileNavigation();
        updateActiveNavigation();

        void updateAccountState();

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
