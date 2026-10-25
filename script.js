
/* =====================================================
   StudyKora — Shared JavaScript
   Design and Develop by Yadav Web Technologies
===================================================== */

"use strict";

/* 1. Shared DOM helpers */

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

/* 2. Shared mobile navigation */

function initializeNavigation() {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");

    if (!menuToggle || !mainNav) return;

    const mobileQuery = window.matchMedia("(max-width: 780px)");

    function setMenuState(isOpen) {
        const shouldOpen = isOpen && mobileQuery.matches;

        mainNav.classList.toggle("is-open", shouldOpen);
        menuToggle.classList.toggle("is-active", shouldOpen);

        menuToggle.setAttribute("aria-expanded", String(shouldOpen));
        menuToggle.setAttribute(
            "aria-label",
            shouldOpen ? "Close navigation menu" : "Open navigation menu"
        );
    }

    function toggleMenu() {
        const isOpen = mainNav.classList.contains("is-open");
        setMenuState(!isOpen);
    }

    menuToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMenu();
    });

    mainNav.addEventListener("click", (event) => {
        const link = event.target.closest("a");

        if (link && mobileQuery.matches) {
            setMenuState(false);
        }
    });

    document.addEventListener("click", (event) => {
        if (!mobileQuery.matches) return;

        const clickedInsideMenu = mainNav.contains(event.target);
        const clickedToggle = menuToggle.contains(event.target);

        if (!clickedInsideMenu && !clickedToggle) {
            setMenuState(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuState(false);
        }
    });

    function handleViewportChange() {
        setMenuState(false);
    }

    if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", handleViewportChange);
    } else {
        /* Fallback for older browsers */
        mobileQuery.addListener(handleViewportChange);
    }

    setMenuState(false);
}

/* 3. Mark the current navigation link */

function initializeActiveNavigation() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split("/").pop() || "index.html";

    StudyKora.selectAll(".main-nav a[href]").forEach((link) => {
        let targetUrl;

        try {
            targetUrl = new URL(link.href, window.location.href);
        } catch {
            return;
        }

        const targetFile = targetUrl.pathname.split("/").pop() || "index.html";

        if (targetFile === currentFile) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

/* 4. Shared current-year placeholders */

function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();

    StudyKora.selectAll("[data-current-year]").forEach((element) => {
        element.textContent = String(currentYear);
    });
}

/* 5. Shared password visibility controls */

function initializePasswordToggles() {
    StudyKora.selectAll("[data-toggle-password]").forEach((button) => {
        if (button.dataset.passwordToggleReady === "true") return;

        const inputId = button.dataset.togglePassword;
        const input = inputId ? document.getElementById(inputId) : null;

        if (!input) return;

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

/* 6. Shared back-to-top controls */

function initializeBackToTop() {
    StudyKora.selectAll("[data-back-to-top]").forEach((button) => {
        button.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                    ? "auto"
                    : "smooth"
            });
        });
    });
}

/* 7. Shared external-link safety */

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

/* 8. Initialize common behavior */

StudyKora.onReady(() => {
    document.documentElement.classList.add("js-enabled");

    initializeNavigation();
    initializeActiveNavigation();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeBackToTop();
    initializeExternalLinks();
});
