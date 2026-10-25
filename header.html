// StudyKora Shared Header
document.addEventListener("DOMContentLoaded", async () => {
    const mount = document.getElementById("site-header");
    if (!mount) return;

    try {
        const response = await fetch("./header.html");

        if (!response.ok) {
            throw new Error(`Header loading failed: ${response.status}`);
        }

        mount.innerHTML = await response.text();

        const guest = document.getElementById("account-guest");
        const authenticated = document.getElementById("account-authenticated");
        const nav = document.getElementById("main-nav");
        const menuToggle = document.getElementById("menu-toggle");

        function updateAccountState() {
            let session = null;

            try {
                session = JSON.parse(
                    sessionStorage.getItem("studyKoraSession") || "null"
                );
            } catch {
                session = null;
            }

            const loggedIn = Boolean(
                session?.idToken &&
                session?.user?.email
            );

            if (guest) guest.hidden = loggedIn;
            if (authenticated) authenticated.hidden = !loggedIn;
        }

        // Highlight the current page
        const currentPage = window.location.pathname.split("/").pop() || "index.html";

        nav?.querySelectorAll("a[data-page]").forEach((link) => {
            if (link.dataset.page === currentPage) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        // Mobile navigation
        menuToggle?.addEventListener("click", () => {
            const isOpen = nav?.classList.toggle("is-open") || false;
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation menu" : "Open navigation menu"
            );
        });

        nav?.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                nav.classList.remove("is-open");
                menuToggle?.setAttribute("aria-expanded", "false");
            });
        });

        updateAccountState();

        // Refresh if the page is restored from browser history
        window.addEventListener("pageshow", updateAccountState);

    } catch (error) {
        console.error("StudyKora header error:", error);
    }
});
