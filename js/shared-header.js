/* =====================================================
   StudyKora — Shared Header Logic
   Design and Develop by Yadav Web Technologies
===================================================== */

"use strict";

(function () {
    function initializeSharedHeader() {
        const guest = document.getElementById("account-guest");
        const authenticated = document.getElementById("account-authenticated");
        const nav = document.getElementById("main-nav");
        const menuToggle = document.getElementById("menu-toggle");

        /* 1. Account visibility */

        function getSession() {
            try {
                return JSON.parse(
                    sessionStorage.getItem("studyKoraSession") || "null"
                );
            } catch (error) {
                console.warn(
                    "[StudyKora Header] Could not read login session:",
                    error.message
                );
                return null;
            }
        }

        function updateAccountState() {
            const session = getSession();

            const loggedIn = Boolean(
                session &&
                typeof session.idToken === "string" &&
                session.idToken.length > 0 &&
                session.user &&
                typeof session.user.email === "string" &&
                session.user.email.length > 0
            );

            if (guest) {
                guest.hidden = loggedIn;
            }

            if (authenticated) {
                authenticated.hidden = !loggedIn;
            }

            console.info(
                "[StudyKora Header] Account state:",
                loggedIn ? "Logged in" : "Logged out"
            );
        }

        /* 2. Active navigation link */

        function updateActiveNavigation() {
            if (!nav) return;

            let currentPath = window.location.pathname;

            if (
                currentPath.endsWith("/") ||
                currentPath === ""
            ) {
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

                const isCurrent = targetPath === currentPath;

                if (isCurrent) {
                    link.setAttribute("aria-current", "page");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }

        /* 3. Mobile navigation */

        function setMenuState(isOpen) {
            if (!nav || !menuToggle) return;

            const shouldOpen =
                Boolean(isOpen) &&
                window.matchMedia("(max-width: 780px)").matches;

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

        if (nav && menuToggle) {
            menuToggle.addEventListener("click", (event) => {
                event.stopPropagation();

                const isOpen = nav.classList.contains("is-open");
                setMenuState(!isOpen);
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

            const mobileQuery = window.matchMedia(
                "(max-width: 780px)"
            );

            const handleViewportChange = () => {
                setMenuState(false);
            };

            if (typeof mobileQuery.addEventListener === "function") {
                mobileQuery.addEventListener(
                    "change",
                    handleViewportChange
                );
            } else {
                mobileQuery.addListener(handleViewportChange);
            }
        }

        /* 4. Refresh when the page or session changes */

        updateAccountState();
        updateActiveNavigation();

        window.addEventListener("pageshow", updateAccountState);

        window.addEventListener("storage", (event) => {
            if (event.key === "studyKoraSession") {
                updateAccountState();
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
