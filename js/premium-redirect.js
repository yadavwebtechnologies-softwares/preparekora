
"use strict";

(function () {
  const params = new URLSearchParams(window.location.search);

  const isPremiumPage = /\/premium\.html$/i.test(location.pathname);

  const isDashboardPremium =
    /\/dashboard\.html$/i.test(location.pathname) &&
    params.get("tab") === "premium";

  if (!isPremiumPage && !isDashboardPremium) return;

  let loginPrompted = false;
  let redirected = false;

  function openExistingLogin() {
    if (loginPrompted) return;

    loginPrompted = true;

    document.dispatchEvent(
      new CustomEvent("pk:open-login-modal")
    );
  }

  function redirectToPremiumDashboard() {
    if (redirected) return;

    redirected = true;

    const url = new URL("dashboard.html", location.href);
    url.searchParams.set("tab", "premium");

    location.replace(url.href);
  }

  function activatePremiumTab() {
    let attempts = 0;

    function findTab() {
      const tab =
        document.querySelector('.dash-tab[data-tab="premium"]') ||
        Array.from(document.querySelectorAll(".dash-tab")).find(
          function (item) {
            return item.textContent
              .trim()
              .toLowerCase()
              .includes("premium");
          }
        );

      if (tab) {
        tab.click();

        const cleanURL = new URL(location.href);
        cleanURL.searchParams.delete("tab");

        history.replaceState(
          {},
          document.title,
          cleanURL.pathname + cleanURL.search + cleanURL.hash
        );

        return;
      }

      attempts++;

      if (attempts < 80) {
        setTimeout(findTab, 100);
      } else {
        console.warn("PrepareKora: Premium tab was not found.");
      }
    }

    findTab();
  }

  function handleAuthState(user) {
    if (!user) {
      openExistingLogin();
      return;
    }

    if (isPremiumPage) {
      redirectToPremiumDashboard();
    } else {
      activatePremiumTab();
    }
  }

  function connectAuth(attempt) {
    const firebase = window.PK_FIREBASE;
    const auth = firebase && firebase.auth;

    if (
      auth &&
      typeof auth.onAuthStateChanged === "function"
    ) {
      auth.onAuthStateChanged(
        handleAuthState,
        function (error) {
          console.error("Premium auth check failed:", error);
          openExistingLogin();
        }
      );

      return;
    }

    if (attempt < 100) {
      setTimeout(function () {
        connectAuth(attempt + 1);
      }, 100);

      return;
    }

    const student = window.PK_STUDENT;

    const loggedIn =
      student &&
      typeof student.isLoggedIn === "function" &&
      student.isLoggedIn();

    handleAuthState(loggedIn ? { uid: "current" } : null);
  }

  connectAuth(0);
})();
