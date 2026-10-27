// ============================================================
// PrepareKora Worker — Admin authentication
//
// Frontend authenticates via Firebase Web SDK (email + password).
// Frontend sends the Firebase ID token in "Authorization: Bearer <token>".
//
// Worker verifies the token (see firebase.js) and matches the UID
// against ADMIN1_UID / ADMIN2_UID env secrets.
//
// No passwords, no custom JWT. All credentials live in Firebase
// and Cloudflare env secrets. Nothing here is secret.
// ============================================================

import { json, error, requireAuth } from "./utils.js";
import { readJSON } from "./utils.js";
import { dbGet, dbPut, dbPatch } from "./firebase.js";

/* ---------- Admin UID whitelist ---------- */

function getAdminUids(env) {
  const list = [];
  if (env.ADMIN1_UID) list.push(env.ADMIN1_UID.trim());
  if (env.ADMIN2_UID) list.push(env.ADMIN2_UID.trim());
  return list.filter(Boolean);
}

function isWhitelistedAdmin(env, uid) {
  return getAdminUids(env).indexOf(uid) !== -1;
}

/* ---------- Display name ---------- */

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;

function namePath(uid) {
  return "adminDisplayNames/" + uid;
}

async function getDisplayName(env, uid) {
  try {
    const val = await dbGet(env, namePath(uid));
    if (typeof val === "string" && val.trim()) return val.trim();
  } catch (err) { /* ignore */ }

  /* Fallback: derive from email prefix (removed domain, capitalized) */
  return "Admin";
}

/* ============================================================
   GET /api/me
   ============================================================ */

export async function handleMe(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  if (!isWhitelistedAdmin(env, session.sub)) {
    return error("Forbidden", 403);
  }

  const displayName = await getDisplayName(env, session.sub);

  return json({
    id: session.sub,
    displayName: displayName
  });
}

/* ============================================================
   PUT /api/me
   Body: { displayName: "Rohit Biswas" }
   ============================================================ */

export async function handleUpdateMe(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  if (!isWhitelistedAdmin(env, session.sub)) {
    return error("Forbidden", 403);
  }

  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const rawName = String(body.displayName || "").trim();

  if (!rawName) return error("Display name is required", 400);
  if (rawName.length < MIN_NAME_LENGTH) {
    return error("Display name is too short", 400);
  }
  if (rawName.length > MAX_NAME_LENGTH) {
    return error("Display name is too long", 400);
  }

  /* Save display name */
  await dbPut(env, namePath(session.sub), rawName);

  /* Propagate publisherName to all owned tests */
  const newPublisherName = "Sir " + rawName;
  await propagatePublisherName(env, session.sub, newPublisherName);

  return json({
    id: session.sub,
    displayName: rawName
  });
}

/* ---------- Publisher name helper (used by tests.js) ---------- */

export async function getPublisherName(env, uid) {
  const name = await getDisplayName(env, uid);
  return "Sir " + name;
}

/* ---------- Propagate name to owned tests ---------- */

async function propagatePublisherName(env, uid, newPublisherName) {
  try {
    /* Fetch all test metadata (only id + publisherId needed) */
    const all = await dbGet(env, "tests");

    if (!all || typeof all !== "object") return;

    const updates = {};

    Object.keys(all).forEach(function (testId) {
      const test = all[testId];
      if (!test || typeof test !== "object") return;
      if (test.publisherId !== uid) return;

      const currentName = test.publisherName || "";
      if (currentName === newPublisherName) return;

      updates[testId + "/publisherName"] = newPublisherName;
      updates[testId + "/updatedAt"] = Date.now();
    });

    if (Object.keys(updates).length === 0) return;

    await dbPatch(env, "tests", updates);
  } catch (err) {
    /* Non-fatal — the next publish will re-sync */
  }
}
