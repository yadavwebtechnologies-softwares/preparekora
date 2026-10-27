"use strict";

/*
  PrepareKora API client.
  Wraps Worker endpoints with a consistent interface.
  Used by translation.js for /api/translate calls.
*/

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

  const TOKEN_KEY = "pk_admin_id_token";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch (e) { return ""; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  async function request(path, options) {
    options = options || {};

    const headers = Object.assign({}, options.headers || {});
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (!options.noAuth) {
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let response;
    try {
      response = await fetch(API_BASE + path, {
        method: options.method || "GET",
        headers: headers,
        body: options.body
      });
    } catch (networkErr) {
      const err = new Error("Network error. Check your connection.");
      err.status = 0;
      throw err;
    }

    let data = null;
    try { data = await response.json(); }
    catch (e) { /* non-JSON */ }

    if (!response.ok) {
      const message =
        (data && data.error) ||
        (response.status === 401 ? "Please log in again." :
         response.status === 403 ? "You do not have permission." :
         response.status === 404 ? "Not found." :
         response.status === 429 ? "Too many requests. Please wait." :
         response.status >= 500 ? "Server error. Try again later." :
         "Request failed (" + response.status + ")");

      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  window.PK_API = {
    health: function () {
      return request("/health", { noAuth: true });
    },

    translate: function (text, target, source) {
      return request("/translate", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({
          text: text,
          target: target || "as",
          source: source || "en"
        })
      });
    },

    listPublished: function () {
      return request("/tests", { noAuth: true });
    },

    getPublishedTest: function (id) {
      return request("/tests/" + encodeURIComponent(id), { noAuth: true });
    },

    getToken: getToken,
    setToken: setToken,
    clearToken: function () { setToken(""); }
  };
})();
