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


/* 2. Website branding */

function initializeBranding() {
    const brandElements = StudyKora.selectAll(
        ".brand, [data-site-brand]"
    );

    brandElements.forEach((brand) => {
        const brandMain = document.createElement("span");
        brandMain.className = "brand-main";
        brandMain.textContent = "preparekora";

        const brandDomain = document.createElement("span");
        brandDomain.className = "brand-domain";
        brandDomain.textContent = ".in";

        const brandName = document.createElement("span");
        brandName.className = "brand-name";

        brandName.append(brandMain, brandDomain);

        brand.replaceChildren(brandName);
        brand.setAttribute("aria-label", "preparekora.in");
    });

    if (brandElements.length === 0) {
        StudyKora.selectAll(
            ".brand-name, [data-brand-name]"
        ).forEach((brandName) => {
            const brandMain = document.createElement("span");
            brandMain.className = "brand-main";
            brandMain.textContent = "preparekora";

            const brandDomain = document.createElement("span");
            brandDomain.className = "brand-domain";
            brandDomain.textContent = ".in";

            brandName.replaceChildren(brandMain, brandDomain);
            brandName.setAttribute("aria-label", "preparekora.in");
        });
    }
}


/* 3. Current year */

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


/* 7. User profile helpers */

function getProfileInitials(name, email) {
    const cleanName = String(name || "").trim();

    if (cleanName) {
        const parts = cleanName.split(/\s+/).filter(Boolean);

        if (parts.length >= 2) {
            return (
                parts[0].charAt(0) +
                parts[parts.length - 1].charAt(0)
            ).toUpperCase();
        }

        return cleanName
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 2)
            .toUpperCase() || "U";
    }

    /*
     * Email fallback.
     * A real profile name should be used when available.
     */
    const emailName = String(email || "").split("@")[0];

    return emailName
        .replace(/[0-9._-]/g, "")
        .slice(0, 2)
        .toUpperCase() || "U";
}


function normalizeProfile(source) {
    if (!source || typeof source !== "object") {
        return {};
    }

    const nestedUser = source.user &&
        typeof source.user === "object"
        ? source.user
        : {};

    const nestedProfile = source.profile &&
        typeof source.profile === "object"
        ? source.profile
        : {};

    const data = {
        ...source,
        ...nestedProfile,
        ...nestedUser
    };

    return {
        uid: data.uid || data.localId || data.id || "",

        name:
            data.displayName ||
            data.fullName ||
            data.name ||
            data.username ||
            data.userName ||
            "",

        email: data.email || "",

        photoURL:
            data.photoURL ||
            data.photoUrl ||
            data.photoURL ||
            data.profileImageUrl ||
            data.profilePicture ||
            data.avatarURL ||
            data.picture ||
            ""
    };
}


function readStoredProfile() {
    const storageKeys = [
        "prepareKoraSession",
        "preparekoraSession",
        "studyKoraSession",
        "currentUser",
        "currentUserProfile",
        "user",
        "authUser",
        "userData"
    ];

    let combinedProfile = {};

    [localStorage, sessionStorage].forEach((storage) => {
        storageKeys.forEach((key) => {
            try {
                const rawValue = storage.getItem(key);

                if (!rawValue) {
                    return;
                }

                const parsedValue = JSON.parse(rawValue);
                const profile = normalizeProfile(parsedValue);

                Object.keys(profile).forEach((field) => {
                    if (profile[field]) {
                        combinedProfile[field] = profile[field];
                    }
                });
            } catch (error) {
                // Ignore unrelated or non-JSON storage values.
            }
        });
    });

    if (combinedProfile.uid) {
        [
            `prepareKoraProfileCache:${combinedProfile.uid}`,
            `studyKoraProfileCache:${combinedProfile.uid}`
        ].forEach((key) => {
            [localStorage, sessionStorage].forEach((storage) => {
                try {
                    const rawValue = storage.getItem(key);

                    if (!rawValue) {
                        return;
                    }

                    const cachedProfile = normalizeProfile(
                        JSON.parse(rawValue)
                    );

                    Object.keys(cachedProfile).forEach((field) => {
                        if (cachedProfile[field]) {
                            combinedProfile[field] =
                                cachedProfile[field];
                        }
                    });
                } catch (error) {
                    // Ignore invalid cache data.
                }
            });
        });
    }

    return combinedProfile;
}


/* 8. Header profile UI */

function initializeHeaderProfile() {
    const header = document.querySelector(".site-header");
    const mainNav = document.getElementById("main-nav");
    const authenticatedAccount = document.getElementById(
        "account-authenticated"
    );

    if (!header || !mainNav || !authenticatedAccount) {
        console.warn(
            "[PrepareKora] Profile UI requires .site-header, " +
            "#main-nav and #account-authenticated."
        );
        return;
    }

    let profileLink = header.querySelector(
        ".preparekora-profile-link"
    );

    if (!profileLink) {
        profileLink = document.createElement("a");

        profileLink.className = "preparekora-profile-link";
        profileLink.href = "profile.html";
        profileLink.hidden = true;

        profileLink.setAttribute(
            "aria-label",
            "Open profile"
        );

        const avatar = document.createElement("span");
        avatar.className = "preparekora-profile-avatar";

        const avatarImage = document.createElement("img");
        avatarImage.className = "preparekora-profile-image";
        avatarImage.alt = "";
        avatarImage.hidden = true;

        const initials = document.createElement("span");
        initials.className = "preparekora-profile-initials";
        initials.textContent = "U";

        avatar.append(avatarImage, initials);

        const userName = document.createElement("span");
        userName.className = "preparekora-profile-name";

        profileLink.append(avatar, userName);
    }

    const avatarImage = profileLink.querySelector(
        ".preparekora-profile-image"
    );

    const initials = profileLink.querySelector(
        ".preparekora-profile-initials"
    );

    const userName = profileLink.querySelector(
        ".preparekora-profile-name"
    );

    let currentProfile = {};
    let databaseRequestStarted = false;

    function renderProfile(profile) {
        currentProfile = {
            ...currentProfile,
            ...normalizeProfile(profile)
        };

        const name = currentProfile.name.trim();
        const email = currentProfile.email.trim();
        const photoURL = currentProfile.photoURL.trim();

        const visibleName =
            name ||
            email.split("@")[0] ||
            "My Profile";

        const avatarText = getProfileInitials(name, email);

        userName.textContent = visibleName;
        initials.textContent = avatarText;

        profileLink.setAttribute(
            "aria-label",
            `Open profile: ${visibleName}`
        );

        if (photoURL) {
            avatarImage.onerror = () => {
                avatarImage.hidden = true;
                avatarImage.removeAttribute("src");
                initials.hidden = false;
            };

            avatarImage.onload = () => {
                avatarImage.hidden = false;
                initials.hidden = true;
            };

            avatarImage.src = photoURL;
        } else {
            avatarImage.hidden = true;
            avatarImage.removeAttribute("src");
            initials.hidden = false;
        }

        const hasUser =
            Boolean(currentProfile.uid) ||
            Boolean(currentProfile.email);

        profileLink.hidden = !hasUser;
    }


    function placeProfileLink() {
        const isMobile = window.matchMedia(
            "(max-width: 768px)"
        ).matches;

        if (isMobile) {
            /*
             * The profile link is appended after all navigation links.
             */
            if (profileLink.parentElement !== mainNav) {
                mainNav.appendChild(profileLink);
            }
        } else {
            /*
             * Desktop: display the avatar in the authenticated
             * account section of the header.
             */
            if (profileLink.parentElement !== authenticatedAccount) {
                authenticatedAccount.appendChild(profileLink);
            }
        }
    }


    function loadDatabaseProfile(user) {
        if (
            databaseRequestStarted ||
            !user ||
            !user.uid ||
            !window.firebase ||
            typeof window.firebase.database !== "function"
        ) {
            return;
        }

        databaseRequestStarted = true;

        try {
            const database = window.firebase.database();

            database
                .ref(`users/${user.uid}`)
                .once("value")
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        return;
                    }

                    const databaseProfile = normalizeProfile(
                        snapshot.val()
                    );

                    renderProfile({
                        ...databaseProfile,
                        uid: user.uid,
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
                        "[PrepareKora] Could not load profile data:",
                        error
                    );
                });
        } catch (error) {
            console.warn(
                "[PrepareKora] Profile database unavailable:",
                error
            );
        }
    }


    function handleAuthenticatedUser(user) {
        if (!user) {
            return;
        }

        const normalizedUser = normalizeProfile(user);

        renderProfile(normalizedUser);
        loadDatabaseProfile(user);
    }


    /* First, restore any available cached profile. */

    renderProfile(readStoredProfile());

    /* Place the profile at the correct responsive location. */

    placeProfileLink();

    window.addEventListener("resize", placeProfileLink);


    /*
     * Firebase Authentication compatibility.
     * Supports Firebase's compat SDK when it is already initialized.
     */

    try {
        if (
            window.firebase &&
            typeof window.firebase.auth === "function"
        ) {
            const firebaseAuth = window.firebase.auth();

            if (firebaseAuth.currentUser) {
                handleAuthenticatedUser(firebaseAuth.currentUser);
            }

            if (
                typeof firebaseAuth.onAuthStateChanged === "function"
            ) {
                firebaseAuth.onAuthStateChanged((user) => {
                    if (user) {
                        databaseRequestStarted = false;
                        handleAuthenticatedUser(user);
                    } else {
                        profileLink.hidden = true;
                    }
                });
            }
        }
    } catch (error) {
        console.warn(
            "[PrepareKora] Firebase Auth is not available:",
            error
        );
    }


    /*
     * Support an auth object exposed by another shared script.
     */

    const externalAuth =
        window.firebaseAuth ||
        window.auth;

    if (externalAuth && externalAuth.currentUser) {
        handleAuthenticatedUser(externalAuth.currentUser);
    }


    /*
     * Other scripts can notify this script when a user logs in
     * or their profile data changes.
     */

    window.addEventListener("preparekora:profile-updated", (event) => {
        if (event.detail) {
            renderProfile(event.detail);
        }
    });
}


/* 9. Shared header diagnostics */

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


/* 10. Initialize shared behavior */

StudyKora.onReady(() => {
    document.documentElement.classList.add("js-enabled");

    initializeBranding();
    initializeCurrentYear();
    initializePasswordToggles();
    initializeBackToTop();
    initializeExternalLinks();
    initializeHeaderProfile();
    initializeSharedDiagnostics();
});
