"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" ||
      host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_admin_id_token";
  const REFRESH_KEY = "pk_admin_refresh_token";

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function getRefreshToken() { try { return localStorage.getItem(REFRESH_KEY) || ""; } catch (e) { return ""; } }

  let refreshing = null;
  async function refreshAccess() {
    if (refreshing) return refreshing;
    refreshing = (async function () {
      const rt = getRefreshToken();
      if (!rt) throw new Error("No refresh token");
      const res = await fetch(API_BASE + "/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      try {
        if (data.idToken) localStorage.setItem(TOKEN_KEY, data.idToken);
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      } catch (e) {}
      return data.idToken;
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }

  async function apiRequest(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json", "Accept": "application/json" }, opts.headers || {});
    let token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    let res = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body
    });

    if (res.status === 401) {
      try {
        token = await refreshAccess();
        headers["Authorization"] = "Bearer " + token;
        res = await fetch(API_BASE + path, {
          method: opts.method || "GET",
          headers: headers,
          body: opts.body
        });
      } catch (e) {
        throw { status: 401, message: "Session expired" };
      }
    }

    const data = await res.json().catch(function () { return null; });
    if (!res.ok) throw { status: res.status, message: (data && data.error) || ("HTTP " + res.status) };
    return data;
  }

  const sections = {
    loading: document.getElementById("psLoading"),
    auth: document.getElementById("psAuthRequired"),
    main: document.getElementById("psMain")
  };

  function showSection(name) {
    Object.keys(sections).forEach(function (k) {
      if (sections[k]) sections[k].hidden = (k !== name);
    });
  }

  function toast(msg, kind) {
    const c = document.getElementById("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }
  const state = {
    plans: [],
    config: {},
    constraints: { maxPlans: 1, minPrice: 1, maxPrice: 49, minDays: 1, maxDays: 365, whatsappMax: 15, textMax: 500, benefitsMax: 300 }
  };

  async function loadSettings() {
    showSection("loading");
    const token = getToken();
    const rt = getRefreshToken();
    if (!token && !rt) {
      showSection("auth");
      return;
    }
    try {
      const data = await apiRequest("/admin/premium/settings");
      state.plans = Array.isArray(data.plans) ? data.plans : [];
      state.config = data.config || {};
      state.constraints = data.constraints || state.constraints;
      renderPlans();
      renderConfig();
      showSection("main");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        showSection("auth");
      } else {
        toast(err.message || "Failed to load settings", "error");
        showSection("main");
      }
    }
  }

  function renderConfig() {
    const wa = document.getElementById("psWhatsapp");
    const ins = document.getElementById("psInstructions");
    const ben = document.getElementById("psBenefits");
    if (wa) wa.value = state.config.whatsapp || "";
    if (ins) ins.value = state.config.paymentInstructions || "";
    if (ben) ben.value = state.config.benefits || "";
  }

  function renderPlans() {
    const list = document.getElementById("psPlansList");
    if (!list) return;
    list.innerHTML = "";
    state.plans.forEach(function (plan, i) {
      const row = document.createElement("div");
      row.className = "editor-question";
      row.style.marginBottom = "12px";
      row.innerHTML =
        '<div class="editor-question-head">' +
          '<div class="editor-question-num-wrap">' +
            '<span class="editor-question-number">' + (i + 1) + '</span>' +
            '<span class="editor-question-label">' + esc(plan.label || "Plan") + '</span>' +
          '</div>' +
          '<button type="button" class="editor-remove-btn" data-remove="' + i + '">Remove</button>' +
        '</div>' +
        '<div class="editor-grid-2" style="grid-template-columns: 1fr 1fr; gap: 12px;">' +
          '<div class="form-field">' +
            '<label class="form-label">Name</label>' +
            '<input type="text" class="form-input" data-field="label" data-idx="' + i + '" maxlength="40" value="' + esc(plan.label || "") + '">' +
          '</div>' +
          '<div class="form-field">' +
            '<label class="form-label">Key (unique ID)</label>' +
            '<input type="text" class="form-input" data-field="key" data-idx="' + i + '" maxlength="30" pattern="[a-z0-9_-]+" value="' + esc(plan.key || "") + '">' +
            '<p class="form-hint" style="margin: 4px 0 0;">Lowercase letters, digits, _ or -</p>' +
          '</div>' +
        '</div>' +
        '<div class="editor-grid-2" style="grid-template-columns: 1fr 1fr; gap: 12px;">' +
          '<div class="form-field">' +
            '<label class="form-label">Price (₹' + state.constraints.minPrice + '–₹' + state.constraints.maxPrice + ')</label>' +
            '<input type="number" class="form-input" data-field="price" data-idx="' + i + '" min="' + state.constraints.minPrice + '" max="' + state.constraints.maxPrice + '" step="1" value="' + Number(plan.price || 0) + '">' +
          '</div>' +
          '<div class="form-field">' +
            '<label class="form-label">Days (' + state.constraints.minDays + '–' + state.constraints.maxDays + ')</label>' +
            '<input type="number" class="form-input" data-field="days" data-idx="' + i + '" min="' + state.constraints.minDays + '" max="' + state.constraints.maxDays + '" step="1" value="' + Number(plan.days || 0) + '">' +
          '</div>' +
        '</div>' +
        '<label style="display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: pointer;">' +
          '<input type="checkbox" data-field="active" data-idx="' + i + '"' + (plan.active !== false ? " checked" : "") + ' style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">' +
          '<span style="font-size: 13px; font-weight: 500;">Active — visible to students</span>' +
        '</label>';
      list.appendChild(row);
    });

    list.querySelectorAll("[data-field]").forEach(function (el) {
      el.addEventListener("input", function () {
        const idx = Number(el.getAttribute("data-idx"));
        const field = el.getAttribute("data-field");
        if (!state.plans[idx]) return;
        if (field === "active") state.plans[idx].active = el.checked;
        else if (field === "price") state.plans[idx].price = Number(el.value) || 0;
        else if (field === "days") state.plans[idx].days = Number(el.value) || 0;
        else state.plans[idx][field] = el.value;
      });
    });

    list.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = Number(btn.getAttribute("data-remove"));
        if (state.plans.length <= 1) {
          toast("At least one plan required", "error");
          return;
        }
        state.plans.splice(idx, 1);
        renderPlans();
      });
    });
    const addBtn = document.getElementById("psAddPlanBtn");
    if (addBtn) { addBtn.disabled = true; addBtn.style.display = "none"; }
  }

  document.getElementById("psAddPlanBtn").addEventListener("click", function () {
    if (state.plans.length >= state.constraints.maxPlans) {
      toast("Maximum " + state.constraints.maxPlans + " plans", "error");
      return;
    }
    const n = state.plans.length + 1;
    state.plans.push({
      key: "plan" + n + "-" + Math.random().toString(36).slice(2, 6),
      label: "Plan " + n,
      price: 19,
      days: 7,
      active: true
    });
    renderPlans();
  });

  async function saveAll() {
    const errEl = document.getElementById("psError");
    if (errEl) errEl.hidden = true;
    const btn = document.getElementById("psSaveBtn");
    if (btn) btn.disabled = true;

    const payload = {
      plans: state.plans.map(function (p) {
        return {
          key: String(p.key || "").trim(),
          label: String(p.label || "").trim(),
          price: Number(p.price) || 0,
          days: Number(p.days) || 0,
          active: p.active !== false
        };
      }),
      config: {
        whatsapp: (document.getElementById("psWhatsapp") || {}).value || "",
        paymentInstructions: (document.getElementById("psInstructions") || {}).value || "",
        benefits: (document.getElementById("psBenefits") || {}).value || ""
      }
    };

    try {
      const data = await apiRequest("/admin/premium/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      state.plans = data.plans || [];
      state.config = data.config || {};
      renderPlans();
      renderConfig();
      toast("Premium settings saved", "success");
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || "Save failed"; errEl.hidden = false; }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.getElementById("psSaveBtn").addEventListener("click", saveAll);

  document.getElementById("currentYear").textContent = new Date().getFullYear();

  loadSettings();

})();
