"use strict";

/*
  PrepareKora — Control Room (read-only Firebase browser)
  Independent module. Zero dependency on admin.js.
*/

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

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch (e) { return ""; }
  }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function toast(msg, kind) {
    const c = document.getElementById("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  async function dbFetch(path) {
    const token = getToken();
    const res = await fetch(API_BASE + path, {
      headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || ("HTTP " + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- State ---------- */

  const dbState = {
    rootKeys: null,
    expanded: new Set(),
    children: {},
    selected: ""
  };

  /* ---------- DOM ---------- */

  let tabDatabase, tabTests, tabSettings;
  let panelDatabase, panelTests, panelSettings;
  let dbTree, dbTreeRefresh, dbViewerPath, dbViewerBody;

  function cacheDom() {
    tabDatabase = document.getElementById("tabDatabase");
    tabTests = document.getElementById("tabTests");
    tabSettings = document.getElementById("tabSettings");
    panelDatabase = document.getElementById("panelDatabase");
    panelTests = document.getElementById("panelTests");
    panelSettings = document.getElementById("panelSettings");
    dbTree = document.getElementById("dbTree");
    dbTreeRefresh = document.getElementById("dbTreeRefresh");
    dbViewerPath = document.getElementById("dbViewerPath");
    dbViewerBody = document.getElementById("dbViewerBody");
  }

  /* ---------- Tab activation ---------- */

  function activateTab(id) {
    document.querySelectorAll(".admin-tab").forEach(function (t) {
      const active = t.id === id;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
  }

  function showControlRoom() {
    if (panelTests) panelTests.hidden = true;
    if (panelSettings) panelSettings.hidden = true;
    if (panelDatabase) panelDatabase.hidden = false;
    activateTab("tabDatabase");
    if (!dbState.rootKeys) loadRoot();
  }

  function hideControlRoom() {
    if (panelDatabase) panelDatabase.hidden = true;
  }

  /* ---------- Load root ---------- */

  async function loadRoot() {
    if (!dbTree) return;
    dbTree.innerHTML = '<div class="db-loading"><div class="spinner"></div></div>';
    try {
      const res = await dbFetch("/admin/db/list?path=");
      dbState.rootKeys = (res && Array.isArray(res.children)) ? res.children : [];
      dbState.expanded.clear();
      dbState.children = {};
      renderTree();
    } catch (err) {
      if (err.status === 401) {
        dbTree.innerHTML = '<div class="db-error">Session expired. Please refresh.</div>';
        return;
      }
      dbTree.innerHTML = '<div class="db-error">' + esc(err.message || "Failed") + '</div>';
    }
  }

  /* ---------- Render tree ---------- */

  function renderTree() {
    if (!dbTree) return;
    if (!dbState.rootKeys || dbState.rootKeys.length === 0) {
      dbTree.innerHTML = '<div class="db-empty-small">No data</div>';
      return;
    }
    const html = dbState.rootKeys.map(function (k) { return renderNode(k, 0); }).join("");
    dbTree.innerHTML = html;
    dbTree.querySelectorAll("[data-db-path]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        const p = el.getAttribute("data-db-path");
        if (el.classList.contains("db-node-toggle")) toggleNode(p);
        else selectNode(p);
      });
    });
  }

  function renderNode(path, depth) {
    const name = path.split("/").pop();
    const expanded = dbState.expanded.has(path);
    const children = dbState.children[path];
    const hasKids = children === undefined ? true : children.length > 0;
    const padLeft = depth * 14 + 8;

    let html = '<div class="db-node">';
    html += '<div class="db-node-row" style="padding-left:' + padLeft + 'px">';

    if (hasKids) {
      html += '<button class="db-node-toggle' + (expanded ? " is-open" : "") + '" type="button" data-db-path="' + esc(path) + '" aria-label="Toggle">▶</button>';
    } else {
      html += '<span class="db-node-toggle-spacer"></span>';
    }

    html += '<button class="db-node-label" type="button" data-db-path="' + esc(path) + '">' + esc(name) + '</button>';
    html += '</div>';

    if (expanded && children) {
      html += '<div class="db-children">';
      children.forEach(function (ck) {
        const childPath = path ? path + "/" + ck : ck;
        html += renderNode(childPath, depth + 1);
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /* ---------- Toggle / Select ---------- */

  async function toggleNode(path) {
    if (dbState.expanded.has(path)) {
      dbState.expanded.delete(path);
      renderTree();
      return;
    }
    dbState.expanded.add(path);
    if (!dbState.children[path]) {
      try {
        const res = await dbFetch("/admin/db/list?path=" + encodeURIComponent(path));
        dbState.children[path] = (res && Array.isArray(res.children)) ? res.children : [];
      } catch (err) {
        dbState.children[path] = [];
        if (err.status === 401) {
          toast("Session expired. Please refresh.", "error");
          return;
        }
        toast(err.message || "Failed to load", "error");
      }
    }
    renderTree();
  }

  async function selectNode(path) {
    dbState.selected = path;
    if (dbViewerPath) dbViewerPath.textContent = path || "(root)";
    if (!dbViewerBody) return;
    dbViewerBody.innerHTML = '<div class="db-loading"><div class="spinner"></div></div>';
    try {
      const res = await dbFetch("/admin/db/node?path=" + encodeURIComponent(path));
      const val = res ? res.value : null;
      const jsonStr = JSON.stringify(val, null, 2);

      if (jsonStr.length > 100000) {
        dbViewerBody.innerHTML =
          '<div class="db-warn">Large node (' + Math.round(jsonStr.length / 1024) + ' KB). Showing first 100 KB.</div>' +
          '<pre class="db-json">' + esc(jsonStr.slice(0, 100000)) + '...</pre>';
      } else {
        dbViewerBody.innerHTML = '<pre class="db-json">' + esc(jsonStr) + '</pre>';
      }
    } catch (err) {
      if (err.status === 401) {
        dbViewerBody.innerHTML = '<div class="db-error">Session expired. Please refresh.</div>';
        return;
      }
      dbViewerBody.innerHTML = '<div class="db-error">' + esc(err.message || "Failed") + '</div>';
    }
  }

  /* ---------- Init ---------- */

  function init() {
    cacheDom();

    if (!tabDatabase || !panelDatabase) return;

    tabDatabase.addEventListener("click", function (e) {
      e.stopPropagation();
      showControlRoom();
    });

    if (tabTests) tabTests.addEventListener("click", hideControlRoom);
    if (tabSettings) tabSettings.addEventListener("click", hideControlRoom);

    if (dbTreeRefresh) {
      dbTreeRefresh.addEventListener("click", function () {
        dbState.rootKeys = null;
        dbState.expanded.clear();
        dbState.children = {};
        dbState.selected = "";
        if (dbViewerPath) dbViewerPath.textContent = "Select a node";
        if (dbViewerBody) {
          dbViewerBody.innerHTML = '<div class="db-empty">Select a node from the tree to view its contents</div>';
        }
        loadRoot();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
