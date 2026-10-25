/* ==========================================
   StudyNow — Main JavaScript
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
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
        menuToggle.setAttribute(
            "aria-label",
            "Open navigation menu"
        );
    }

    function toggleNavigation() {
        if (!menuToggle || !mainNav) return;

        const isOpen = !mainNav.classList.contains("is-open");

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

    if (menuToggle && mainNav) {
        menuToggle.addEventListener("click", toggleNavigation);

        mainNav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeNavigation);
        });
    }


    /* ==========================================
       2. SUBJECT NAVIGATION

       Homepage subject cards should use:
       data-subject="economics"
       data-subject="geography"
       data-subject="english"
       data-subject="polity"

       The selected subject is passed to test.html.
    ========================================== */

    function handleSubjectNavigation(card) {
        const subjectId = card.dataset.subject?.trim();

        if (!subjectId) return;

        window.location.href =
            `test.html?subject=${encodeURIComponent(subjectId)}`;
    }


    /* ==========================================
       3. CURRENT AFFAIRS NAVIGATION

       Current Affairs cards should use:
       data-current-affairs="category-id"
    ========================================== */

    function handleCurrentAffairsNavigation(card) {
        const categoryId = card.dataset.currentAffairs?.trim();

        if (!categoryId) return;

        window.location.href =
            `current-affairs.html?category=${encodeURIComponent(categoryId)}`;
    }


    /* ==========================================
       4. CENTRAL CLICK HANDLER

       No HTML generation.
       No authentication modals.
       No notice modals.
       No placeholder quiz popups.

       Other cards should use normal HTML links.
    ========================================== */

    document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) return;

        const subjectCard = event.target.closest("[data-subject]");

        if (subjectCard) {
            event.preventDefault();
            handleSubjectNavigation(subjectCard);
            return;
        }

        const affairsCard = event.target.closest(
            "[data-current-affairs]"
        );

        if (affairsCard) {
            event.preventDefault();
            handleCurrentAffairsNavigation(affairsCard);
        }
    });


    /* ==========================================
       5. INITIAL STATE
    ========================================== */

    closeNavigation();
});
