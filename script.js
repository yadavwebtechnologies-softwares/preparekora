/* =====================================================
   preparekora.in — Shared JavaScript
   Design and Develop by Yadav Web Technologies
===================================================== */

"use strict";

/* =====================================================
   1. SHARED DOM HELPERS
===================================================== */

const StudyKora = (() => {
    const select = (selector, parent = document) =>
        parent.querySelector(selector);

    const selectAll = (selector, parent = document) =>
        Array.from(parent.querySelectorAll(selector));

    function onReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, {
                once: true
            });
        } else {
            callback();
        }
    }

    return {
        select,
        selectAll,
        onReady
    };
})();


/* =====================================================
   2. BRANDING — preparekora.in
   Text-only wordmark. No icon or tagline.
===================================================== */

function initializeBranding() {
    StudyKora.selectAll(".brand").forEach((brand) => {
        // Remove the previous icon/container and tagline.
        brand.querySelectorAll(".brand-mark, .brand-caption").forEach(
            (element) => element.remove()
        );

        let brandName = brand.querySelector(".brand-name");

        if (!brandName) {
            brandName = document.createElement("span");
            brandName.className = "brand-name";

            const textContainer =
                brand.querySelector(".brand-text") || brand;

            textContainer.appendChild(brandName);
        }

        // Create the brand safely without HTML string injection.
        const mainName = document.createElement("span");
        mainName.className = "brand-main";
        mainName.textContent = "preparekora";

        const domain = document.createElement("span");
        domain.className = "brand-domain";
        domain.textContent = ".in";

        brandName.replaceChildren(mainName, domain);

        brand.setAttribute(
            "aria-label",
            "preparekora.in home"
        );
    });
}


/* =====================================================
   3. CURRENT YEAR
===================================================== */

function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();

    StudyKora.selectAll("[data-current-year]").forEach((element) => {
        element.textContent = String(currentYear);
    });
}


/* =====================================================
   4. PASSWORD VISIBILITY CONTROLS
===================================================== */

function initializePasswordToggles() {
    StudyKora.selectAll("[data-toggle-password]").forEach((button) => {
        if (button.dataset.passwordToggleReady === "true") return;

        const inputId = button.dataset.togglePassword;
        const input = inputId ? document.getElementById(inputId) : null;

        if (!input) {
            console.warn(
                "[preparekora.in] Password toggle input not found:",
                inputId
            );
            return;
        }

        button.dataset.passwordToggleReady = "true";

        button.addEventListener("click", () => {
            const shouldShow = input.type === "password";

            input.type = shouldShow ? "text" : "password";

            button.setAttribute("aria-pressed", String(shouldShow));
            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );

            button.textContent = shouldShow ? "Hide" : "Show";
        });
    });
}


/* =====================================================
   5. BACK-TO-TOP CONTROLS
===================================================== */

function initializeBackToTop() {
    StudyKora.selectAll("[data-back-to-top]").forEach((button) => {
        if (button.dataset.backToTopReady === "true") return;

        button.dataset.backToTopReady = "true";

        button.addEventListener("click", () => {
            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            window.scrollTo({
                top: 0,
                behavior: reduceMotion ? "auto" : "smooth"
            });
        });
    });
}


/* =====================================================
   6. EXTERNAL-LINK SAFETY
===================================================== */

function initializeExternalLinks() {
    StudyKora.selectAll('a[target="_blank"]').forEach((link) => {
        const relTokens = new Set(
            (link.getAttribute("rel") || "")
                .split(/\s+/)
                .filter(Boolean)
        );

        relTokens.add("noopener");
        relTokens.add("noreferrer");

        link.setAttribute("rel", Array.from(relTokens).join(" "));
    });
}


/* =====================================================
   7. SESSION HELPERS
===================================================== */

const PREPAREKORA_SESSION_KEY = "studyKoraSession";

function readStoredObject(storage, key) {
    try {
        const rawValue = storage.getItem(key);

        if (!rawValue) return null;

        const value = JSON.parse(rawValue);

        return value && typeof value === "object"
            ? value
            : null;
    } catch {
        return null;
    }
}


function readCurrentSession() {
    try {
        const session = readStoredObject(
            window.sessionStorage,
            PREPAREKORA_SESSION_KEY
        );

        if (!session) return null;

        const user = session.user || {};

        const uid =
            user.uid ||
            user.localId ||
            session.uid ||
            session.localId;

        const token =
            session.idToken ||
            session.accessToken ||
            session.token;

        if (!uid || !token) {
            return null;
        }

        return {
            ...session,
            user,
            uid
        };
    } catch {
        return null;
    }
}


/* =====================================================
   8. ACCOUNT DISPLAY NAME
===================================================== */

function getCachedProfile(uid) {
    if (!uid) return null;

    const cacheKey = `studyKoraProfileCache:${uid}`;

    const sessionCache = readStoredObject(
        window.sessionStorage,
        cacheKey
    );

    const localCache = readStoredObject(
        window.localStorage,
        cacheKey
    );

    return (
        sessionCache?.profile ||
        localCache?.profile ||
        null
    );
}


function getAccountDisplayName(session) {
    const user = session?.user || {};
    const profile = getCachedProfile(session?.uid);

    const candidates = [
        profile?.displayName,
        profile?.name,
        profile?.fullName,
        profile?.full_name,

        user.displayName,
        user.name,
        user.fullName,
        user.full_name,

        session?.displayName,
        session?.name
    ];

    const matchingName = candidates.find((value) => (
        typeof value === "string" &&
        value.trim().length > 0
    ));

    if (matchingName) {
        return matchingName.trim().replace(/\s+/g, " ");
    }

    const email = String(
        profile?.email ||
        user.email ||
        session?.email ||
        ""
    ).trim();

    if (email.includes("@")) {
        const emailName = email
            .split("@")[0]
            .replace(/[._-]+/g, " ")
            .replace(/\d+/g, " ")
            .trim();

        if (emailName) {
            return emailName.replace(/\s+/g, " ");
        }

        return email.split("@")[0];
    }

    return "User";
}


/* =====================================================
   9. PROFILE LINK NORMALIZATION
   The profile circle always opens profile.html.
===================================================== */

function initializeProfileLink(authenticated) {
    if (!authenticated) return null;

    let trigger = authenticated.querySelector(
        "#account-profile-trigger"
    );

    if (!trigger) return null;

    // Convert an old profile button into a normal profile link.
    if (trigger.tagName.toLowerCase() !== "a") {
        const link = document.createElement("a");

        Array.from(trigger.attributes).forEach((attribute) => {
            if (
                attribute.name !== "aria-controls" &&
                attribute.name !== "aria-expanded"
            ) {
                link.setAttribute(
                    attribute.name,
                    attribute.value
                );
            }
        });

        while (trigger.firstChild) {
            link.appendChild(trigger.firstChild);
        }

        trigger.replaceWith(link);
        trigger = link;
    }

    trigger.href = "profile.html";

    trigger.setAttribute(
        "aria-label",
        "Open your profile"
    );

    trigger.setAttribute("title", "Open your profile");

    trigger.removeAttribute("aria-controls");
    trigger.removeAttribute("aria-expanded");

    // Remove the old dropdown if it still exists.
    authenticated.querySelectorAll(
        ".account-profile-panel, #account-profile-panel"
    ).forEach((panel) => panel.remove());

    // Return the existing avatar if available.
    let avatar = trigger.querySelector(
        "#account-profile-avatar"
    );

    // Replace an old SVG avatar with a text-based initial.
    if (!avatar || avatar.tagName.toLowerCase() === "svg") {
        const initialElement = document.createElement("span");

        initialElement.id = "account-profile-avatar";
        initialElement.className = "account-profile-initial";
        initialElement.setAttribute("aria-hidden", "true");

        if (avatar) {
            avatar.replaceWith(initialElement);
        } else {
            trigger.appendChild(initialElement);
        }

        avatar = initialElement;
    }

    avatar.classList.add("account-profile-initial");
    avatar.setAttribute("aria-hidden", "true");

    return {
        trigger,
        avatar
    };
}


/* =====================================================
   10. SHARED HEADER — ACCOUNT STATE
===================================================== */

function initializeHeaderAccount() {
    const guest = document.getElementById("account-guest");
    const authenticated = document.getElementById(
        "account-authenticated"
    );

    if (!guest && !authenticated) return;

    const profileElements = initializeProfileLink(authenticated);

    const session = readCurrentSession();
    const isLoggedIn = Boolean(session);

    if (guest) {
        guest.hidden = isLoggedIn;
    }

    if (authenticated) {
        authenticated.hidden = !isLoggedIn;
    }

    if (!profileElements) return;

    const { trigger, avatar } = profileElements;

    if (!isLoggedIn) {
        avatar.textContent = "U";
        trigger.setAttribute(
            "aria-label",
            "Open your profile"
        );

        return;
    }

    const displayName = getAccountDisplayName(session);
    const firstCharacter = Array.from(displayName.trim())[0] || "U";

    avatar.textContent = firstCharacter.toLocaleUpperCase();

    trigger.setAttribute(
        "aria-label",
        `Open profile for ${displayName}`
    );

    trigger.title = `Open profile — ${displayName}`;
}


/* =====================================================
   11. PROFILE POSITIONING
   Desktop: header actions.
   Mobile: after every navigation link.
===================================================== */

function initializeProfilePositioning() {
    const mainNav = document.getElementById("main-nav");
    const headerActions = document.querySelector(
        ".site-header .header-actions"
    );

    const authenticated = document.getElementById(
        "account-authenticated"
    );

    const menuToggle = document.getElementById("menu-toggle");

    if (!mainNav || !headerActions || !authenticated) {
        return;
    }

    const mobileQuery = window.matchMedia(
        "(max-width: 800px)"
    );

    function positionProfile() {
        if (mobileQuery.matches) {
            // The profile becomes the final item inside the mobile menu.
            mainNav.appendChild(authenticated);
        } else {
            // Return it to the desktop header.
            if (
                menuToggle &&
                menuToggle.parentElement === headerActions
            ) {
                headerActions.insertBefore(
                    authenticated,
                    menuToggle
                );
            } else {
                headerActions.appendChild(authenticated);
            }
        }
    }

    positionProfile();

    // Reposition when the viewport crosses the mobile breakpoint.
    if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", positionProfile);
    } else if (typeof mobileQuery.addListener === "function") {
        // Compatibility with older browsers.
        mobileQuery.addListener(positionProfile);
    }
}


/* =====================================================
   12. ACTIVE NAVIGATION LINK
===================================================== */

function initializeActiveNavigation() {
    const mainNav = document.getElementById("main-nav");

    if (!mainNav) return;

    const currentPage =
        window.location.pathname
            .split("/")
            .filter(Boolean)
            .pop() || "index.html";

    mainNav.querySelectorAll("a[data-page]").forEach((link) => {
        const target = (
            link.getAttribute("data-page") ||
            link.getAttribute("href") ||
            ""
        )
            .split("?")[0]
            .split("#")[0]
            .split("/")
            .pop();

        if (target === currentPage) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}


/* =====================================================
   13. RESPONSIVE NAVIGATION MENU
===================================================== */

function initializeNavigation() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");

    if (!menuToggle || !mainNav) return;

    if (menuToggle.dataset.navigationReady === "true") {
        return;
    }

    menuToggle.dataset.navigationReady = "true";

    function setMenuOpen(isOpen) {
        mainNav.classList.toggle("is-open", isOpen);
        menuToggle.classList.toggle("is-active", isOpen);

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuToggle.setAttribute(
            "aria-label",
            isOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = mainNav.classList.contains("is-open");

        setMenuOpen(!isOpen);
    });

    // Event delegation also works for the profile link moved into the menu.
    mainNav.addEventListener("click", (event) => {
        const link = event.target.closest("a");

        if (!link || !mainNav.contains(link)) return;

        if (window.matchMedia("(max-width: 800px)").matches) {
            setMenuOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuOpen(false);
        }
    });

    const mobileQuery = window.matchMedia(
        "(max-width: 800px)"
    );

    const closeOnResize = () => setMenuOpen(false);

    if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", closeOnResize);
    } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(closeOnResize);
    }
}


/* =====================================================
   14. SHARED HEADER DIAGNOSTICS
===================================================== */

function initializeSharedDiagnostics() {
    const header = document.querySelector(".site-header");

    if (!header) {
        console.warn(
            "[preparekora.in] Shared header not found on:",
            window.location.pathname
        );

        return;
    }

    const requiredElements = [
        "main-nav",
        "menu-toggle"
    ];

    requiredElements.forEach((id) => {
        if (!header.querySelector(`#${id}`)) {
            console.warn(
                `[preparekora.in] Header element #${id} is missing on:`,
                window.location.pathname
            );
        }
    });

    const guest = document.getElementById("account-guest");
    const authenticated = document.getElementById(
        "account-authenticated"
    );

    if (!guest && !authenticated) {
        console.warn(
            "[preparekora.in] Account containers are missing on:",
            window.location.pathname
        );
    }

    if (authenticated && !authenticated.querySelector(
        "#account-profile-trigger"
    )) {
        console.warn(
            "[preparekora.in] Profile link is missing on:",
            window.location.pathname
        );
    }
}


/* =====================================================
   15. SHARED INITIALIZATION
===================================================== */

StudyKora.onReady(() => {
    document.documentElement.classList.add("js-enabled");

    initializeBranding();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeBackToTop();
    initializeExternalLinks();

    initializeHeaderAccount();
    initializeProfilePositioning();
    initializeActiveNavigation();
    initializeNavigation();

    initializeSharedDiagnostics();
});
