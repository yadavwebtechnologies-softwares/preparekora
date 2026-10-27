// ============================================================
// PrepareKora Worker — Authentication
// Two pre-authorized admins, no public registration.
// Credentials live in Cloudflare env secrets only.
// ============================================================

import {
  json,
  error,
  safeEqual,
  signJWT,
  requireAuth,
  readJSON
} from "./utils.js";

/* ---------- Fixed admin registry ---------- */

// Maps internal admin ids to the env-var names that hold their credentials.
// Real values never appear in code — they live in Cloudflare env secrets.
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

const DISPLAY_NAME_KEY = (adminId) => `admin:${adminId}:displayName`;
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
  for (const [adminId, meta] of Object.entries(ADMIN_REGISTRY)) {
    const envUser = env[meta.userEnv];
    const envPass = env[meta.passEnv];

    if (!envUser || !envPass) continue;

    const userMatch = safeEqual(username, envUser);
    const passMatch = safeEqual(password, envPass);

    if (userMatch && passMatch) return adminId;
  }
  return null;
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
    // Delay to slow brute-force attempts
    await new Promise((resolve) => setTimeout(resolve, 300));
    return error("Invalid username or password", 401);
  }

  if (!env.JWT_SECRET) {
    return error("Server configuration error", 500);
  }

  const token = await signJWT({ sub: adminId }, env.JWT_SECRET, 86400);
  const displayName = await getDisplayName(env, adminId);

  return json({
    token,
    admin: {
      id: adminId,
      displayName
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
    displayName
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

  return json({
    id: session.sub,
    displayName: rawName
  });
}

/* ---------- Publisher name for tests ---------- */

/**
 * Returns "Sir <DisplayName>" for storing on test records.
 * Stored once at publish time — immutable afterward for that test.
 */
export async function getPublisherName(env, adminId) {
  const name = await getDisplayName(env, adminId);
  return `Sir ${name}`;
}

/* ---------- Exports for router ---------- */

export { ADMIN_REGISTRY };
