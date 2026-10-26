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


/* 2. Shared website branding */

function initializeBranding() {
    const brands = StudyKora.selectAll(
        ".brand, [data-site-brand]"
    );

    if (brands.length > 0) {
        brands.forEach((brand) => {
            const main = document.createElement("span");
            main.className = "brand-main";
            main.textContent = "preparekora";

            const domain = document.createElement("span");
            domain.className = "brand-domain";
            domain.textContent = ".in";

            const brandName = document.createElement("span");
            brandName.className = "brand-name";
            brandName.append(main, domain);

            brand.replaceChildren(brandName);
            brand.setAttribute("aria-label", "preparekora.in");
        });

        return;
    }

    StudyKora.selectAll(
        ".brand-name, [data-brand-name]"
    ).forEach((brandName) => {
        const main = document.createElement("span");
        main.className = "brand-main";
        main.textContent = "preparekora";

        const domain = document.createElement("span");
        domain.className = "brand-domain";
        domain.textContent = ".in";

        brandName.replaceChildren(main, domain);
        brandName.setAttribute("aria-label", "preparekora.in");
    });
}


/* 3. Current-year placeholders */

function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();

    StudyKora.selectAll("[data-current-year]").forEach((element) => {
        element.textContent = String(currentYear);
    });
}


/* 4. Password visibility controls */

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
                "[PrepareKora] Password input not found:",
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


/* 5. Back-to-top controls */

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


/* 6. External-link safety */

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


/* 7. Profile data helpers */

function normalizeProfileData(source) {
    if (!source || typeof source !== "object") {
        return {
            name: "",
            email: "",
            photoURL: ""
        };
    }

    const profile = source.profile &&
        typeof source.profile === "object"
        ? source.profile
        : {};

    const data = {
        ...source,
        ...profile
    };

    return {
        name:
            data.displayName ||
            data.fullName ||
            data.full_name ||
            data.name ||
            data.username ||
            data.userName ||
            "",

        email: data.email || "",

        photoURL:
            data.photoURL ||
            data.photoUrl ||
            data.profileImageUrl ||
            data.profilePicture ||
            data.avatarURL ||
            data.picture ||
            ""
    };
}


function getProfileInitials(name, email) {
    const cleanName = String(name || "").trim();

    if (cleanName) {
        const words = cleanName
            .split(/\s+/)
            .filter(Boolean);

        if (words.length >= 2) {
            return (
                words[0].charAt(0) +
                words[words.length - 1].charAt(0)
            ).toUpperCase();
        }

        return cleanName
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 2)
            .toUpperCase() || "U";
    }

    const emailName = String(email || "").split("@")[0];

    const parts = emailName
        .split(/[._-]+/)
        .filter(Boolean);

    if (parts.length >= 2) {
        return (
            parts[0].charAt(0) +
            parts[1].charAt(0)
        ).toUpperCase();
    }

    return emailName
        .replace(/[0-9]/g, "")
        .slice(0, 2)
        .toUpperCase() || "U";
}


/* 8. Responsive account placement */

function initializeAccountPlacement() {
    const nav = document.getElementById("main-nav");
    const account = document.getElementById("account-authenticated");

    if (!nav || !account || !account.parentNode) {
        return;
    }

    const originalParent = account.parentNode;
    const originalNextSibling = account.nextSibling;

    const mobileQuery = window.matchMedia("(max-width: 800px)");

    function updatePlacement() {
        if (mobileQuery.matches) {
            /*
             * Move the existing account section to the very end
             * of navigation. No extra profile row is created.
             */
            if (account.parentNode !== nav) {
                nav.appendChild(account);
            }
        } else if (account.parentNode !== originalParent) {
            /*
             * Restore the original desktop location.
             */
            const referenceNode =
                originalNextSibling &&
                originalNextSibling.parentNode === originalParent
                    ? originalNextSibling
                    : null;

            originalParent.insertBefore(account, referenceNode);
        }
    }

    updatePlacement();

    if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", updatePlacement);
    } else {
        mobileQuery.addListener(updatePlacement);
    }
}


/* 9. Existing profile avatar and name */

function initializeHeaderProfile() {
    const trigger = document.querySelector(
        "#account-authenticated .account-profile-trigger, " +
        ".account-authenticated .account-profile-trigger"
    );

    if (!trigger) {
        console.warn(
            "[PrepareKora] Existing .account-profile-trigger not found."
        );
        return;
    }

    /*
     * Use the existing HTML elements.
     * Do not create a second profile link or a duplicate grey row.
     */

    let initials = trigger.querySelector(".account-profile-initial");
    let label = trigger.querySelector(".account-profile-label");
    let photo = trigger.querySelector("img");

    if (!initials) {
        initials = document.createElement("span");
        initials.className = "account-profile-initial";
        trigger.prepend(initials);
    }

    if (!label) {
        label = document.createElement("span");
        label.className = "account-profile-label";
        trigger.appendChild(label);
    }

    /*
     * Remove stray direct text nodes so the full name cannot
     * accidentally appear inside the circular desktop avatar.
     */
    Array.from(trigger.childNodes).forEach((node) => {
        if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.trim()
        ) {
            node.remove();
        }
    });

    if (!photo) {
        photo = document.createElement("img");
        photo.className = "account-profile-photo";
        photo.alt = "";
        photo.hidden = true;
        trigger.insertBefore(photo, initials);
    }

    photo.classList.add("account-profile-photo");
    photo.alt = "";
    photo.hidden = true;

    let currentProfile = {
        name: "",
        email: "",
        photoURL: ""
    };

    function renderProfile(source) {
        const incoming = normalizeProfileData(source);

        currentProfile = {
            name: incoming.name || currentProfile.name,
            email: incoming.email || currentProfile.email,
            photoURL: incoming.photoURL || currentProfile.photoURL
        };

        const name = currentProfile.name.trim();
        const email = currentProfile.email.trim();
        const photoURL = currentProfile.photoURL.trim();

        const visibleName =
            name ||
            email.split("@")[0] ||
            "My Profile";

        initials.textContent = getProfileInitials(name, email);
        label.textContent = visibleName;

        trigger.setAttribute(
            "aria-label",
            `Open profile: ${visibleName}`
        );

        if (!photoURL) {
            photo.hidden = true;
            photo.removeAttribute("src");
            initials.hidden = false;
            return;
        }

        photo.onload = () => {
            photo.hidden = false;
            initials.hidden = true;
        };

        photo.onerror = () => {
            photo.hidden = true;
            photo.removeAttribute("src");
            initials.hidden = false;
        };

        if (photo.src !== photoURL) {
            photo.src = photoURL;
        }

        if (photo.complete && photo.naturalWidth > 0) {
            photo.hidden = false;
            initials.hidden = true;
        }
    }

    /*
     * If another existing script updates the user profile,
     * it can dispatch this event with the latest profile data.
     */
    window.addEventListener("preparekora:profile-updated", (event) => {
        if (event.detail) {
            renderProfile(event.detail);
        }
    });

    /*
     * Firebase Authentication compatibility SDK.
     */
    function connectFirebase() {
        if (
            !window.firebase ||
            typeof window.firebase.auth !== "function"
        ) {
            return;
        }

        try {
            const auth = window.firebase.auth();

            function handleUser(user) {
                if (!user) {
                    trigger.hidden = true;
                    return;
                }

                trigger.hidden = false;

                renderProfile({
                    name: user.displayName || "",
                    email: user.email || "",
                    photoURL: user.photoURL || ""
                });

                /*
                 * Read optional profile information from Realtime
                 * Database. Auth information remains the fallback.
                 */
                if (
                    typeof window.firebase.database !== "function"
                ) {
                    return;
                }

                window.firebase.database()
                    .ref(`users/${user.uid}`)
                    .once("value")
                    .then((snapshot) => {
                        if (!snapshot.exists()) {
                            return;
                        }

                        const databaseProfile = normalizeProfileData(
                            snapshot.val()
                        );

                        renderProfile({
                            name:
                                databaseProfile.name ||
                                user.displayName ||
                                "",
                            email:
                                databaseProfile.email ||
                                user.email ||
                                "",
                            photoURL:
                                databaseProfile.photoURL ||
                                user.photoURL ||
                                ""
                        });
                    })
                    .catch((error) => {
                        console.warn(
                            "[PrepareKora] Profile data unavailable:",
                            error
                        );
                    });
            }

            if (auth.currentUser) {
                handleUser(auth.currentUser);
            }

            if (typeof auth.onAuthStateChanged === "function") {
                auth.onAuthStateChanged(handleUser);
            }
        } catch (error) {
            console.warn(
                "[PrepareKora] Firebase profile initialization failed:",
                error
            );
        }
    }

    connectFirebase();

    window.addEventListener("preparekora:auth-ready", connectFirebase);
}


/* 10. Shared header diagnostics */

function initializeSharedDiagnostics() {
    const header = document.querySelector(".site-header");

    if (!header) {
        console.warn(
            "[PrepareKora] Shared header not found on:",
            window.location.pathname
        );
        return;
    }

    [
        "account-guest",
        "account-authenticated",
        "main-nav",
        "menu-toggle"
    ].forEach((id) => {
        if (!header.querySelector(`#${id}`)) {
            console.warn(
                `[PrepareKora] Header element #${id} is missing on:`,
                window.location.pathname
            );
        }
    });
}


/* 11. Initialize shared behavior */

StudyKora.onReady(() => {
    document.documentElement.classList.add("js-enabled");

    initializeBranding();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeBackToTop();
    initializeExternalLinks();
    initializeAccountPlacement();
    initializeHeaderProfile();
    initializeSharedDiagnostics();
});
