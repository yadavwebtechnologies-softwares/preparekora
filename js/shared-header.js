/* ==========================================
   preparekora.in — Shared Header
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const SESSION_KEY = "studyKoraSession";
    const MOBILE_QUERY = "(max-width: 800px)";

    const mainNav = document.getElementById("main-nav");
    const headerActions = document.querySelector(".header-actions");
    const menuToggle = document.getElementById("menu-toggle");

    const guest = document.getElementById("account-guest");
    const authenticated = document.getElementById("account-authenticated");
    const profileLink = document.getElementById("account-profile-trigger");
    const avatar = document.getElementById("account-profile-avatar");

    const mobileQuery = window.matchMedia(MOBILE_QUERY);

    /* ---------- Read current session ---------- */

    function readSession() {
        try {
            const rawSession = sessionStorage.getItem(SESSION_KEY);

            if (!rawSession) return null;

            const session = JSON.parse(rawSession);

            if (!session || typeof session !== "object") {
                return null;
            }

            const user = session.user || {};

            // Match the session format used by the existing auth flow.
            if (!session.idToken || !(user.uid || session.uid)) {
                return null;
            }

            return session;
        } catch (error) {
            console.warn(
                "[preparekora.in] Could not read account session.",
                error
            );

            return null;
        }
    }

    /* ---------- Resolve account name ---------- */

    function getDisplayName(session) {
        const user = session?.user || {};
        const profile = session?.profile || {};

        const nameCandidates = [
            profile.displayName,
            profile.fullName,
            profile.full_name,
            profile.name,
            user.displayName,
            user.fullName,
            user.full_name,
            user.name,
            session?.displayName,
            session?.name
        ];

        const name = nameCandidates.find(
            value => typeof value === "string" && value.trim()
        );

        if (name) {
            return name.trim();
        }

        const email = String(user.email || session?.email || "").trim();

        if (email.includes("@")) {
            return email.split("@")[0];
        }

        return "User";
    }

    /* ---------- Toggle guest/profile UI ---------- */

    function updateAccountUI() {
        if (!guest || !authenticated || !profileLink || !avatar) {
            return;
        }

        const session = readSession();
        const isLoggedIn = Boolean(session);

        guest.hidden = isLoggedIn;
        authenticated.hidden = !isLoggedIn;

        if (!isLoggedIn) {
            avatar.textContent = "U";
            profileLink.setAttribute("aria-label", "Open your profile");
            profileLink.removeAttribute("title");
            return;
        }

        const displayName = getDisplayName(session);
        const firstCharacter = Array.from(displayName.trim())[0] || "U";

        avatar.textContent = firstCharacter.toLocaleUpperCase();

        profileLink.setAttribute(
            "aria-label",
            `Open profile for ${displayName}`
        );

        profileLink.title = `Open profile — ${displayName}`;
    }

    /* ---------- Responsive profile placement ---------- */

    function positionProfile() {
        if (!authenticated || !mainNav || !headerActions) {
            return;
        }

        if (mobileQuery.matches) {
            // Place the profile after every navigation link.
            mainNav.appendChild(authenticated);
        } else {
            // Restore the profile to the desktop header.
            if (menuToggle && menuToggle.parentElement === headerActions) {
                headerActions.insertBefore(authenticated, menuToggle);
            } else {
                headerActions.appendChild(authenticated);
            }
        }
    }

    /* ---------- Active navigation link ---------- */

    function updateActiveNavigation() {
        if (!mainNav) return;

        const currentPage =
            window.location.pathname.split("/").filter(Boolean).pop()
            || "index.html";

        mainNav.querySelectorAll("a[data-page]").forEach(link => {
            const targetPage = (
                link.getAttribute("data-page") ||
                link.getAttribute("href") ||
                ""
            ).split("?")[0].split("#")[0].split("/").pop();

            const isActive = targetPage === currentPage;

            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    /* ---------- Mobile menu ---------- */

    function setMenuOpen(isOpen) {
        if (!mainNav || !menuToggle) return;

        mainNav.classList.toggle("is-open", isOpen);
        menuToggle.classList.toggle("is-active", isOpen);

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    }

    if (menuToggle && mainNav) {
        menuToggle.addEventListener("click", () => {
            const isOpen = mainNav.classList.contains("is-open");
            setMenuOpen(!isOpen);
        });

        mainNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                if (mobileQuery.matches) {
                    setMenuOpen(false);
                }
            });
        });

        // Also handle the profile link after it moves into the nav.
        profileLink?.addEventListener("click", () => {
            if (mobileQuery.matches) {
                setMenuOpen(false);
            }
        });

        mobileQuery.addEventListener?.("change", () => {
            setMenuOpen(false);
            positionProfile();
        });
    }

    /* ---------- Footer year ---------- */

    document.querySelectorAll("[data-current-year]").forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    /* ---------- Initialisation ---------- */

    updateAccountUI();
    positionProfile();
    updateActiveNavigation();
});
