// ============================================================
// PrepareKora Worker — Authentication
// Two pre-authorized admins, no public registration.
// Credentials live in Cloudflare env secrets only.
// Display name change propagates to all owned tests.
// ============================================================

import {
  json,
  error,
  safeEqual,
  signJWT,
  requireAuth,
  readJSON,
  now
} from "./utils.js";

/* ---------- Fixed admin registry ---------- */

const ADMIN_REGISTRY = {
  admin1: {
    userEnv: "ADMIN1_USER",
    passEnv: "ADMIN1_PASS",
    defaultName: "Rohit Biswas"
  },
  admin2: {
    userEnv: "ADMIN2_USER",
    passEnv: "ADMIN2_PASS",
    defaultName: "Yadav Subba"
  }
};

const DISPLAY_NAME_KEY = function (adminId) {
  return "admin:" + adminId + ":displayName";
};
const MAX_NAME_LENGTH = 60;
const MIN_NAME_LENGTH = 2;

/* ---------- Helpers ---------- */

async function getDisplayName(env, adminId) {
  const override = await env.KV.get(DISPLAY_NAME_KEY(adminId));
  if (override && override.trim()) return override.trim();

  const meta = ADMIN_REGISTRY[adminId];
  return meta ? meta.defaultName : adminId;
}

async function findAdminByCredentials(env, username, password) {
  for (const entry of Object.entries(ADMIN_REGISTRY)) {
    const adminId = entry[0];
    const meta = entry[1];

    const envUser = env[meta.userEnv];
    const envPass = env[meta.passEnv];

    if (!envUser || !envPass) continue;

    const userMatch = safeEqual(username, envUser);
    const passMatch = safeEqual(password, envPass);

    if (userMatch && passMatch) return adminId;
  }
  return null;
}

/* Update publisherName on every test owned by this admin */
async function propagateNameToTests(env, adminId, newPublisherName) {
  try {
    const list = await env.KV.list({ prefix: "test:" });

    for (const key of list.keys) {
      const meta = key.metadata;
      if (!meta || meta.publisherId !== adminId) continue;

      const test = await env.KV.get(key.name, { type: "json" });
      if (!test || test.publisherId !== adminId) continue;

      if (test.publisherName === newPublisherName) continue;

      const updated = Object.assign({}, test, {
        publisherName: newPublisherName,
        updatedAt: now()
      });

      await env.KV.put(key.name, JSON.stringify(updated), {
        metadata: {
          id: updated.id,
          title: updated.title,
          publisherId: updated.publisherId,
          publisherName: updated.publisherName,
          minutes: updated.minutes,
          questionCount: updated.questions.length,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      });
    }
  } catch (err) {
    /* Name change on the admin account must succeed even if
       test propagation fails — next publish will correct it. */
  }
}

/* ---------- POST /api/login ---------- */

export async function handleLogin(request, env) {
  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return error("Username and password are required", 400);
  }
  if (username.length > 100 || password.length > 200) {
    return error("Invalid credentials", 401);
  }

  const adminId = await findAdminByCredentials(env, username, password);

  if (!adminId) {
    await new Promise(function (resolve) { setTimeout(resolve, 300); });
    return error("Invalid username or password", 401);
  }

  if (!env.JWT_SECRET) {
    return error("Server configuration error", 500);
  }

  const token = await signJWT({ sub: adminId }, env.JWT_SECRET, 86400);
  const displayName = await getDisplayName(env, adminId);

  return json({
    token: token,
    admin: {
      id: adminId,
      displayName: displayName
    }
  });
}

/* ---------- GET /api/me ---------- */

export async function handleMe(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const displayName = await getDisplayName(env, session.sub);

  return json({
    id: session.sub,
    displayName: displayName
  });
}

/* ---------- PUT /api/me ---------- */

export async function handleUpdateMe(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

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

  await env.KV.put(DISPLAY_NAME_KEY(session.sub), rawName);

  /* Propagate new publisher name to all owned tests */
  const newPublisherName = "Sir " + rawName;
  await propagateNameToTests(env, session.sub, newPublisherName);

  return json({
    id: session.sub,
    displayName: rawName
  });
}

/* ---------- Publisher name for tests ---------- */

export async function getPublisherName(env, adminId) {
  const name = await getDisplayName(env, adminId);
  return "Sir " + name;
}

/* ---------- Exports ---------- */

export { ADMIN_REGISTRY };
