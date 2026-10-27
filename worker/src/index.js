// ============================================================
// PrepareKora Worker — Main router
// Routes only. All logic lives in sibling modules.
// ============================================================

import { json, error, preflight, CORS_HEADERS } from "./utils.js";

import {
  handleLogin,
  handleMe,
  handleUpdateMe
} from "./auth.js";

import {
  handleListPublic,
  handleGetPublic,
  handleListOwn,
  handleGetOwn,
  handleCreate,
  handleUpdate,
  handleDelete,
  handlePublish,
  handleUnpublish
} from "./tests.js";

import { handleTranslate } from "./translate.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    /* CORS preflight */
    if (method === "OPTIONS") {
      return preflight();
    }

    try {
      /* ---------- Health ---------- */

      if (path === "/api/health" && method === "GET") {
        return json({ ok: true, ts: Date.now() });
      }

      /* ---------- Public: translate ---------- */

      if (path === "/api/translate" && method === "POST") {
        return await handleTranslate(request, env);
      }

      /* ---------- Auth ---------- */

      if (path === "/api/login" && method === "POST") {
        return await handleLogin(request, env);
      }

      if (path === "/api/me" && method === "GET") {
        return await handleMe(request, env);
      }

      if (path === "/api/me" && method === "PUT") {
        return await handleUpdateMe(request, env);
      }

      /* ---------- Public: tests ---------- */

      if (path === "/api/tests" && method === "GET") {
        return await handleListPublic(env);
      }

      let match = path.match(/^\/api\/tests\/([^/]+)$/);
      if (match && method === "GET") {
        return await handleGetPublic(env, decodeURIComponent(match[1]));
      }

      /* ---------- Admin: own tests ---------- */

      if (path === "/api/admin/tests" && method === "GET") {
        return await handleListOwn(request, env);
      }

      if (path === "/api/admin/tests" && method === "POST") {
        return await handleCreate(request, env);
      }

      match = path.match(/^\/api\/admin\/tests\/([^/]+)$/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        if (method === "GET") return await handleGetOwn(request, env, id);
        if (method === "PUT") return await handleUpdate(request, env, id);
        if (method === "DELETE") return await handleDelete(request, env, id);
      }

      match = path.match(/^\/api\/admin\/tests\/([^/]+)\/publish$/);
      if (match && method === "POST") {
        return await handlePublish(request, env, decodeURIComponent(match[1]));
      }

      match = path.match(/^\/api\/admin\/tests\/([^/]+)\/unpublish$/);
      if (match && method === "POST") {
        return await handleUnpublish(request, env, decodeURIComponent(match[1]));
      }

      /* ---------- Not found ---------- */

      return json(
        { error: "Not found", path, method },
        404
      );
    } catch (err) {
      /* Never leak internals */
      return json(
        { error: "Internal server error" },
        500
      );
    }
  }
};
