/* ==========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

/* ==========================================
   1. MOBILE NAVIGATION
========================================== */

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

function closeNavigation() {
    if (!menuToggle || !mainNav) return;

    mainNav.classList.remove("is-open");
    menuToggle.classList.remove("is-active");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function toggleNavigation() {
    if (!menuToggle || !mainNav) return;

    const isOpen = mainNav.classList.toggle("is-open");

    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));

    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
    );
}

if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", toggleNavigation);

    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("click", (event) => {
        const clickedInsideNavigation =
            mainNav.contains(event.target) ||
            menuToggle.contains(event.target);

        if (!clickedInsideNavigation) {
            closeNavigation();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeNavigation();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 800) {
            closeNavigation();
        }
    });
}


/* ==========================================
   2. AUTHENTICATION PAGE LINKS

   Login, signup and password recovery are
   handled by auth.html and its own JavaScript.
   No authentication UI is generated here.
========================================== */

document.querySelectorAll('[data-action="login"]').forEach((element) => {
    element.addEventListener("click", () => {
        window.location.href = "auth.html?mode=login";
    });
});

document.querySelectorAll('[data-action="signup"]').forEach((element) => {
    element.addEventListener("click", () => {
        window.location.href = "auth.html?mode=signup";
    });
});


/* ==========================================
   3. CARD NAVIGATION

   Cards use real HTML links.
   No placeholder modals or generated cards.
========================================== */

document.querySelectorAll("[data-subject]").forEach((card) => {
    if (card.matches("a[href]")) return;

    card.addEventListener("click", () => {
        const subjectId = card.dataset.subject;

        if (!subjectId) return;

        window.location.href =
            `test.html?subject=${encodeURIComponent(subjectId)}`;
    });
});

document.querySelectorAll("[data-current-affairs]").forEach((card) => {
    if (card.matches("a[href]")) return;

    card.addEventListener("click", () => {
        const categoryId = card.dataset.currentAffairs;

        if (!categoryId) return;

        window.location.href =
            `current-affairs.html?category=${encodeURIComponent(categoryId)}`;
    });
});

document.querySelectorAll("[data-org]").forEach((card) => {
    if (card.matches("a[href]")) return;

    card.addEventListener("click", () => {
        const organizationId = card.dataset.org;

        if (!organizationId) return;

        window.location.href =
            `organization.html?org=${encodeURIComponent(organizationId)}`;
    });
});

document.querySelectorAll("[data-test]").forEach((card) => {
    if (card.matches("a[href]")) return;

    card.addEventListener("click", () => {
        const testId = card.dataset.test;

        if (!testId) return;

        window.location.href =
            `test.html?test=${encodeURIComponent(testId)}`;
    });
});


/* ==========================================
   4. CURRENT PAGE INITIALIZATION
========================================== */

function initializeStudyNow() {
    closeNavigation();

    document.documentElement.classList.add("js-enabled");
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudyNow,
        { once: true }
    );
} else {
    initializeStudyNow();
}
