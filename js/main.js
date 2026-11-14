"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "" ||
      host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TESTS_CACHE_KEY = "pk_tests_cache_v1";

  function readTestsCache() {
    try {
      const raw = sessionStorage.getItem(TESTS_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeTestsCache(data) {
    try { sessionStorage.setItem(TESTS_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  async function apiFetch(path) {
    const res = await fetch(API_BASE + path, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const state = {
    tests: [],
    loaded: false,
    earlierPage: 1,
    earlierTotalPages: 1,
    gatingEnabled: false
  };

  const EARLIER_PAGE_SIZE = 5;

  const todayList = document.getElementById("todayTests");
  const yesterdayList = document.getElementById("yesterdayTests");
  const earlierList = document.getElementById("earlierTests");
  const emptyState = document.getElementById("archiveEmpty");

  const freeTestsList = document.getElementById("freeTests");
  const freeTestsSection = freeTestsList ? freeTestsList.closest(".archive-section") : null;

  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const menuIcon = document.getElementById("menuIcon");

  const searchOpenBtn = document.getElementById("searchOpen");
  const searchCloseBtn = document.getElementById("searchClose");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  const earlierPagination = document.getElementById("earlierPagination");
  const earlierPrev = document.getElementById("earlierPrev");
  const earlierNext = document.getElementById("earlierNext");
  const earlierPageInfo = document.getElementById("earlierPageInfo");
  const homeLoading = document.getElementById("homeLoading");

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function showOverlay(el) {
    if (!el) return;
    el.classList.remove("is-hidden");
    el.setAttribute("aria-hidden", "false");
  }

  function hideOverlay(el) {
    if (!el) return;
    el.classList.add("is-hidden");
    el.setAttribute("aria-hidden", "true");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      const map = {
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
      };
      return map[ch];
    });
  }

  function formatBadgeDate(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return { day: "—", month: "—" };
    const locale = (window.PK && window.PK.locale) ? window.PK.locale() : "en-IN";
    return {
      day: d.getDate(),
      month: d.toLocaleDateString(locale, { month: "short" })
    };
  }

  function groupFor(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "earlier";
    const now = new Date();
    const midnight = function (x) {
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    };
    const diff = Math.round((midnight(now) - midnight(d)) / 86400000);
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    return "earlier";
  }

  function isTestFree(test) {
    return state.gatingEnabled && test && test.isFree === true;
  }

  function isTestGated(test) {
    if (!state.gatingEnabled) return false;
    if (!test) return false;
    if (test.isFree === true) return false;
    try {
      return !(window.PK_STUDENT && typeof window.PK_STUDENT.isLoggedIn === "function" && window.PK_STUDENT.isLoggedIn());
    } catch (e) { return true; }
  }

  function openLoginModal() {
    try {
      document.dispatchEvent(new CustomEvent("pk:open-login-modal"));
    } catch (e) {}
  }

  function buildCard(test) {
    const dateParts = formatBadgeDate(test.createdAt);
    const card = document.createElement("article");
    card.className = "test-card";

    const examBadge = (test && typeof test.exam === "string" && test.exam.trim())
      ? '<span class="exam-badge">' + escapeHTML(test.exam.trim()) + '</span>'
      : "";

    const freeChip = isTestFree(test)
      ? '<span class="free-chip">' + escapeHTML(t("freeTest")) + '</span>'
      : "";

    const startLabel = t("start");
    const startHref = "mock-test.html?test=" + encodeURIComponent(test.id);

    card.innerHTML = `
      <div class="date-badge" aria-hidden="true">
        <span class="date-day">${dateParts.day}</span>
        <span class="date-month">${escapeHTML(dateParts.month)}</span>
      </div>

      <div class="test-info">
        <h3 class="test-title">${escapeHTML(test.title)}</h3>
        <p class="test-publisher">${escapeHTML(
          t("byLine", { name: test.publisherName || "—" })
        )}</p>
        <div class="test-meta">
          ${examBadge}
          ${freeChip}
          <span>${Number(test.questionCount) || 0} ${escapeHTML(t("questionsUnit"))}</span>
          <span>${Number(test.minutes) || 0} ${escapeHTML(t("minutesUnit"))}</span>
        </div>
      </div>

      <a class="start-button"
         href="${startHref}"
         aria-label="${escapeHTML(startLabel)} ${escapeHTML(test.title)}">
        ${escapeHTML(startLabel)}
      </a>
    `;

    if (isTestGated(test)) {
      const startBtn = card.querySelector(".start-button");
      if (startBtn) {
        startBtn.addEventListener("click", function (e) {
          e.preventDefault();
          openLoginModal();
        });
      }
    }

    return card;
  }

  function renderEarlierPagination(totalItems) {
    if (!earlierPagination) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / EARLIER_PAGE_SIZE));
    state.earlierTotalPages = totalPages;
    if (state.earlierPage > totalPages) state.earlierPage = totalPages;
    if (state.earlierPage < 1) state.earlierPage = 1;

    if (totalPages <= 1) {
      earlierPagination.hidden = true;
      return;
    }
    earlierPagination.hidden = false;
    if (earlierPageInfo) {
      earlierPageInfo.textContent = t("pageOf", { a: state.earlierPage, b: totalPages });
    }
    if (earlierPrev) earlierPrev.disabled = state.earlierPage <= 1;
    if (earlierNext) earlierNext.disabled = state.earlierPage >= totalPages;
  }

  function render() {
    if (!state.loaded) {
      showOverlay(homeLoading);
      if (emptyState) emptyState.hidden = true;
      if (earlierPagination) earlierPagination.hidden = true;
      if (freeTestsSection) freeTestsSection.hidden = true;
      return;
    }
    hideOverlay(homeLoading);

    const freeArr = [];
    const nonFreeTests = [];
    state.tests.forEach(function (test) {
      if (state.gatingEnabled && test.isFree === true) freeArr.push(test);
      else nonFreeTests.push(test);
    });

    if (freeTestsList) {
      freeTestsList.replaceChildren();
      freeArr
        .sort(function (a, b) { return b.createdAt - a.createdAt; })
        .forEach(function (test) {
          freeTestsList.appendChild(buildCard(test));
        });
    }
    if (freeTestsSection) freeTestsSection.hidden = freeArr.length === 0;

    const groups = { today: [], yesterday: [], earlier: [] };
    nonFreeTests.forEach(function (test) {
      groups[groupFor(test.createdAt)].push(test);
    });

    let total = freeArr.length;

    const allMapping = { today: todayList, yesterday: yesterdayList };
    Object.keys(allMapping).forEach(function (key) {
      const container = allMapping[key];
      if (!container) return;
      container.replaceChildren();
      groups[key]
        .sort(function (a, b) { return b.createdAt - a.createdAt; })
        .forEach(function (test) {
          container.appendChild(buildCard(test));
          total++;
        });
    });

    groups.earlier.sort(function (a, b) { return b.createdAt - a.createdAt; });
    const totalPages = Math.max(1, Math.ceil(groups.earlier.length / EARLIER_PAGE_SIZE));
    if (state.earlierPage > totalPages) state.earlierPage = totalPages;
    if (state.earlierPage < 1) state.earlierPage = 1;

    const start = (state.earlierPage - 1) * EARLIER_PAGE_SIZE;
    const pageItems = groups.earlier.slice(start, start + EARLIER_PAGE_SIZE);

    if (earlierList) {
      earlierList.replaceChildren();
      pageItems.forEach(function (test) {
        earlierList.appendChild(buildCard(test));
        total++;
      });
    }

    document.querySelectorAll(".archive-section").forEach(function (section) {
      const list = section.querySelector(".test-list");
      section.hidden = !list || list.children.length === 0;
    });

    if (emptyState) emptyState.hidden = total !== 0;
    renderEarlierPagination(groups.earlier.length);
  }

  async function loadTests() {
    // Render from cache first — instant cards, no spinner
    const cached = readTestsCache();
    if (cached && Array.isArray(cached.tests)) {
      state.tests = cached.tests;
      state.gatingEnabled = cached.gatingEnabled === true;
      state.loaded = true;
      render();
    } else {
      showOverlay(homeLoading);
    }

    // Background refresh — update silently
    try {
      const res = await apiFetch("/tests");
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      state.gatingEnabled = res.gatingEnabled === true;
      state.loaded = true;
      writeTestsCache({ tests: state.tests, gatingEnabled: state.gatingEnabled });
      render();
    } catch (err) {
      if (!cached) {
        state.tests = [];
        state.loaded = true;
        render();
        if (emptyState) {
          emptyState.hidden = false;
          emptyState.textContent = t("loadFailed");
        }
      }
    }
  }

  const hamburgerSVG =
    '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG =
    '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  function openMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuIcon.innerHTML = closeSVG;
  }

  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else openMenu();
    });

    document.addEventListener("click", function (e) {
      if (
        menuPanel.classList.contains("open") &&
        !menuPanel.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        closeMenu();
      }
    });

    menuPanel.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
  }

  function openSearch() {
    if (!searchOverlay) return;
    closeMenu();
    searchOverlay.classList.add("open");
    searchOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 50);
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("open");
    searchOverlay.setAttribute("aria-hidden", "true");
    if (searchInput) searchInput.value = "";
    renderSearchResults("");
  }

  function renderSearchResults(query) {
    if (!searchResults) return;

    const q = query.trim().toLowerCase();
    searchResults.replaceChildren();

    if (!state.loaded) {
      const div = document.createElement("div");
      div.className = "search-empty";
      div.textContent = t("loading");
      searchResults.appendChild(div);
      return;
    }

    const matches = state.tests.filter(function (test) {
      const haystack = [
        test.title || "",
        test.publisherName || "",
        String(test.questionCount || ""),
        String(test.minutes || "")
      ].join(" ").toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    if (matches.length === 0) {
      const div = document.createElement("div");
      div.className = "search-empty";
      div.textContent = q ? t("noMatches") : t("searchHint");
      searchResults.appendChild(div);
      return;
    }

    matches.forEach(function (test) {
      const a = document.createElement("a");
      a.className = "search-result";
      a.href = "mock-test.html?test=" + encodeURIComponent(test.id);
      a.innerHTML = `
        <div class="search-result-title">${escapeHTML(test.title)}</div>
        <div class="search-result-meta">
          ${escapeHTML(t("byLine", { name: test.publisherName || "—" }))}
          &nbsp;·&nbsp;
          ${Number(test.questionCount) || 0} ${escapeHTML(t("questionsUnit"))}
          &nbsp;·&nbsp;
          ${Number(test.minutes) || 0} ${escapeHTML(t("minutesUnit"))}
        </div>
      `;
      if (isTestGated(test)) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          openLoginModal();
        });
      }
      searchResults.appendChild(a);
    });
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener("click", openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener("click", closeSearch);

  if (searchOverlay) {
    searchOverlay.addEventListener("click", function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMenu();
      if (searchOverlay && searchOverlay.classList.contains("open")) {
        closeSearch();
      }
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderSearchResults(searchInput.value);
    });
  }

  document.addEventListener("pk:langchange", function () {
    render();
    if (searchOverlay && searchOverlay.classList.contains("open")) {
      renderSearchResults(searchInput ? searchInput.value : "");
    }
  });

  document.addEventListener("pk:student-auth-changed", function () {
    render();
    if (searchOverlay && searchOverlay.classList.contains("open")) {
      renderSearchResults(searchInput ? searchInput.value : "");
    }
  });

  if (earlierPrev) {
    earlierPrev.addEventListener("click", function () {
      if (state.earlierPage > 1) {
        state.earlierPage--;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (earlierNext) {
    earlierNext.addEventListener("click", function () {
      if (state.earlierPage < state.earlierTotalPages) {
        state.earlierPage++;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  render();
  loadTests();

})();
