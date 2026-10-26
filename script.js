/* =====================================================
   PrepareKora — Shared JavaScript
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

/* 2. Update website branding */

function initializeBranding() {
    const brandElements = StudyKora.selectAll(
        ".brand, [data-site-brand]"
    );

    brandElements.forEach((brand) => {
        const mainText = document.createElement("span");
        mainText.className = "brand-main";
        mainText.textContent = "preparekora";
        mainText.style.color = "#111111";

        const domainText = document.createElement("span");
        domainText.className = "brand-domain";
        domainText.textContent = ".in";
        domainText.style.color = "#777777";

        const brandName = document.createElement("span");
        brandName.className = "brand-name";
        brandName.append(mainText, domainText);

        brand.replaceChildren(brandName);
        brand.setAttribute("aria-label", "preparekora.in");
    });

    /*
     * Fallback for pages using .brand-name directly
     * instead of a parent .brand element.
     */
    if (brandElements.length === 0) {
        StudyKora.selectAll(
            ".brand-name, [data-brand-name]"
        ).forEach((brandName) => {
            const mainText = document.createElement("span");
            mainText.className = "brand-main";
            mainText.textContent = "preparekora";
            mainText.style.color = "#111111";

            const domainText = document.createElement("span");
            domainText.className = "brand-domain";
            domainText.textContent = ".in";
            domainText.style.color = "#777777";

            brandName.replaceChildren(mainText, domainText);
            brandName.setAttribute("aria-label", "preparekora.in");
        });
    }
}

/* 3. Shared current-year placeholders */

function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();

    StudyKora.selectAll("[data-current-year]").forEach((element) => {
        element.textContent = String(currentYear);
    });
}

/* 4. Shared password visibility controls */

function initializePasswordToggles() {
    StudyKora.selectAll("[data-toggle-password]").forEach((button) => {
        if (button.dataset.passwordToggleReady === "true") {
            return;
        }

        const inputId = button.dataset.togglePassword;
        const input = inputId
            ? document.getElementById(inputId)
            : null;

        if (!input) {
            console.warn(
                "[PrepareKora] Password toggle input not found:",
                inputId
            );
            return;
        }

        button.dataset.passwordToggleReady = "true";

        button.addEventListener("click", () => {
            const shouldShow = input.type === "password";

            input.type = shouldShow ? "text" : "password";

            button.setAttribute(
                "aria-pressed",
                String(shouldShow)
            );

            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );

            button.textContent = shouldShow ? "Hide" : "Show";
        });
    });
}

/* 5. Shared back-to-top controls */

function initializeBackToTop() {
    StudyKora.selectAll("[data-back-to-top]").forEach((button) => {
        if (button.dataset.backToTopReady === "true") {
            return;
        }

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

/* 6. Shared external-link safety */

function initializeExternalLinks() {
    StudyKora.selectAll('a[target="_blank"]').forEach((link) => {
        const relTokens = new Set(
            (link.getAttribute("rel") || "")
                .split(/\s+/)
                .filter(Boolean)
        );

        relTokens.add("noopener");
        relTokens.add("noreferrer");

        link.setAttribute(
            "rel",
            Array.from(relTokens).join(" ")
        );
    });
}

/* 7. Shared header diagnostics */

function initializeSharedDiagnostics() {
    const requiredHeaderElements = [
        "account-guest",
        "account-authenticated",
        "main-nav",
        "menu-toggle"
    ];

    const header = document.querySelector(".site-header");

    if (!header) {
        console.warn(
            "[PrepareKora] Shared header not found on:",
            window.location.pathname
        );
        return;
    }

    requiredHeaderElements.forEach((id) => {
        if (!header.querySelector(`#${id}`)) {
            console.warn(
                `[PrepareKora] Header element #${id} is missing on:`,
                window.location.pathname
            );
        }
    });
}

/* 8. Initialize shared behavior */

StudyKora.onReady(() => {
    document.documentElement.classList.add("js-enabled");

    initializeBranding();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeBackToTop();
    initializeExternalLinks();
    initializeSharedDiagnostics();
});
