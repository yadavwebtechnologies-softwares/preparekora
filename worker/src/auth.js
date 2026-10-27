// ============================================================
// PrepareKora Worker — Admin authentication
//
// Frontend has NO Firebase SDK and NO API key.
// Worker proxies Firebase Auth REST calls using FIREBASE_API_KEY
// (stored as Cloudflare env secret).
//
// Flow:
//   Frontend → POST /api/login {email, password}
//            ← { idToken, refreshToken, admin }
//   Frontend → GET /api/me  (Bearer idToken)
//   Frontend → POST /api/refresh {refreshToken} → new idToken
//
// Only whitelisted UIDs (ADMIN1_UID, ADMIN2_UID) can act as admin.
// ============================================================

import { json, error, readJSON } from "./utils.js";
import { verifyFirebaseIdToken, dbGet, dbPut, dbPatch } from "./firebase.js";
import { firebaseSignIn, firebaseRefresh } from "./firebaseauth.js";

/* ---------- Local auth guard (Firebase ID token) ---------- */

async function requireAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const payload = await verifyFirebaseIdToken(token, projectId);
  if (!payload || !payload.uid) return null;

  return { sub: payload.uid, email: payload.email };
}

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

/* ---------- Display name (Firebase RTDB) ---------- */

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
  return "Admin";
}

/* ============================================================
   POST /api/login
   Body: { email, password }
   ============================================================ */

export async function handleLogin(request, env) {
  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return error("Email and password are required", 400);
  }
  if (email.length > 200 || password.length > 200) {
    return error("Invalid credentials", 401);
  }

  let authResult;
  try {
    authResult = await firebaseSignIn(env, email, password);
  } catch (err) {
    const msg = (err && err.message) || "Authentication failed";
    const status = (err && err.status) || 401;
    return error(msg, status);
  }

  /* Whitelist check */
  if (!isWhitelistedAdmin(env, authResult.localId)) {
    return error("This account is not authorized for admin access", 403);
  }

  const displayName = await getDisplayName(env, authResult.localId);

  return json({
    idToken: authResult.idToken,
    refreshToken: authResult.refreshToken,
    expiresIn: authResult.expiresIn,
    admin: {
      id: authResult.localId,
      email: authResult.email,
      displayName: displayName
    }
  });
}

/* ============================================================
   POST /api/refresh
   Body: { refreshToken }
   ============================================================ */

export async function handleRefresh(request, env) {
  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const refreshToken = String(body.refreshToken || "");
  if (!refreshToken) return error("refreshToken is required", 400);

  let result;
  try {
    result = await firebaseRefresh(env, refreshToken);
  } catch (err) {
    const msg = (err && err.message) || "Refresh failed";
    const status = (err && err.status) || 401;
    return error(msg, status);
  }

  /* Whitelist check again — account may have been removed */
  if (!isWhitelistedAdmin(env, result.localId)) {
    return error("This account is not authorized for admin access", 403);
  }

  return json({
    idToken: result.idToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn
  });
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
    email: session.email,
    displayName: displayName
  });
}

/* ============================================================
   PUT /api/me
   Body: { displayName }
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

  await dbPut(env, namePath(session.sub), rawName);

  /* Propagate publisher name to all owned tests */
  const newPublisherName = "Sir " + rawName;
  await propagatePublisherName(env, session.sub, newPublisherName);

  return json({
    id: session.sub,
    displayName: rawName
  });
}

/* ---------- Publisher name helper ---------- */

export async function getPublisherName(env, uid) {
  const name = await getDisplayName(env, uid);
  return "Sir " + name;
}

/* ---------- Propagate name change to owned tests ---------- */

async function propagatePublisherName(env, uid, newPublisherName) {
  try {
    const all = await dbGet(env, "tests");
    if (!all || typeof all !== "object") return;

    const updates = {};

    Object.keys(all).forEach(function (testId) {
      const test = all[testId];
      if (!test || typeof test !== "object") return;
      if (test.publisherId !== uid) return;

      if (test.publisherName === newPublisherName) return;

      updates[testId + "/publisherName"] = newPublisherName;
      updates[testId + "/updatedAt"] = Date.now();
    });

    if (Object.keys(updates).length === 0) return;

    await dbPatch(env, "tests", updates);
  } catch (err) {
    /* Non-fatal — next publish will re-sync */
  }
}
