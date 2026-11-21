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

  const caCount = document.getElementById("caCount");
  const caFilter = document.getElementById("caFilter");
  const caLoading = document.getElementById("caLoading");
  const caEmpty = document.getElementById("caEmpty");
  const caList = document.getElementById("caList");
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const menuIcon = document.getElementById("menuIcon");

  const state = {
    items: [],
    loaded: false,
    filter: ""
  };

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
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

  function formatDateHeading(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "—";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "—";
    const locale = (window.PK && window.PK.locale) ? window.PK.locale() : "en-IN";
    try {
      return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return d.toDateString();
    }
  }

  function currentContent(item) {
    const lang = (window.PK && window.PK.lang) ? window.PK.lang : "en";
    if (lang === "as") {
      const as = (item.contentAs || "").trim();
      if (as) return as;
    }
    return item.contentEn || "";
  }

  function renderGrouped() {
    if (!caList) return;
    caList.innerHTML = "";

    const filtered = state.filter
      ? state.items.filter(function (it) { return it.category === state.filter; })
      : state.items.slice();

    if (caCount) {
      caCount.textContent = filtered.length + " update" + (filtered.length === 1 ? "" : "s");
    }

    if (filtered.length === 0) {
      if (caEmpty) caEmpty.hidden = false;
      return;
    }
    if (caEmpty) caEmpty.hidden = true;

    const groups = {};
    const order = [];
    filtered.forEach(function (it) {
      const key = it.date || "unknown";
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(it);
    });

    order.sort(function (a, b) { return b.localeCompare(a); });

    let counter = 0;
    order.forEach(function (dateKey) {
      const section = document.createElement("div");
      section.className = "ca-date-section";

      const heading = document.createElement("h2");
      heading.className = "ca-date-heading";
      heading.textContent = formatDateHeading(dateKey);
      section.appendChild(heading);

      const list = document.createElement("div");
      list.className = "ca-items-list";

      groups[dateKey].forEach(function (it) {
        counter++;
        const article = document.createElement("article");
        article.className = "ca-item";

        const num = document.createElement("span");
        num.className = "ca-item-num";
        num.textContent = String(counter);

        const body = document.createElement("div");
        body.className = "ca-item-body";

        const meta = document.createElement("div");
        meta.className = "ca-item-meta";
        if (it.category) meta.textContent = it.category;
        if (meta.textContent) body.appendChild(meta);

        const text = document.createElement("p");
        text.className = "ca-item-text";
        text.textContent = currentContent(it);
        body.appendChild(text);

        article.appendChild(num);
        article.appendChild(body);
        list.appendChild(article);
      });

      section.appendChild(list);
      caList.appendChild(section);
    });
  }

  async function loadItems() {
    showOverlay(caLoading);
    if (caEmpty) caEmpty.hidden = true;
    try {
      const res = await fetch(API_BASE + "/current-affairs", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.items = Array.isArray(data.items) ? data.items : [];
      state.loaded = true;
    } catch (err) {
      state.items = [];
      state.loaded = true;
      if (caEmpty) {
        caEmpty.hidden = false;
        caEmpty.textContent = t("loadFailed");
      }
    }
    hideOverlay(caLoading);
    renderGrouped();
  }

  if (caFilter) {
    caFilter.addEventListener("change", function () {
      state.filter = caFilter.value;
      renderGrouped();
    });
  }

  document.addEventListener("pk:langchange", function () {
    renderGrouped();
  });

  /* mobile menu (self-contained, same pattern as other static pages) */
  const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';
  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }
  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else { menuPanel.classList.add("open"); menuToggle.setAttribute("aria-expanded", "true"); menuIcon.innerHTML = closeSVG; }
    });
    document.addEventListener("click", function (e) {
      if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    menuPanel.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  loadItems();

})();
