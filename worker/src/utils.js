// ============================================================
// PrepareKora Worker — Shared utilities
// JSON responses, CORS, JWT (HS256), safe compare, id generation
// ============================================================

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/* ---------- CORS ---------- */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ---------- JSON responses ---------- */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS
    }
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

/* ---------- Misc helpers ---------- */

export function uid(len = 12) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function now() {
  return Date.now();
}

/**
 * Constant-time string compare.
 * Prevents timing attacks on password / token checks.
 */
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------- Base64URL ---------- */

function b64urlEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/* ---------- JWT (HS256) ---------- */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a JWT. Payload should include { sub: adminId }.
 * Default TTL: 24 hours.
 */
export async function signJWT(payload, secret, ttlSeconds = 86400) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat, exp: iat + ttlSeconds };

  const encodedHeader = b64urlEncode(encoder.encode(JSON.stringify(header)));
  const encodedBody = b64urlEncode(encoder.encode(JSON.stringify(body)));
  const data = `${encodedHeader}.${encodedBody}`;

  const key = await hmacKey(secret);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSig = b64urlEncode(new Uint8Array(sigBuffer));

  return `${data}.${encodedSig}`;
}

/**
 * Verify a JWT. Returns payload on success, null on any failure.
 */
export async function verifyJWT(token, secret) {
  try {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedBody, encodedSig] = parts;
    const data = `${encodedHeader}.${encodedBody}`;

    const key = await hmacKey(secret);
    const sig = b64urlDecode(encodedSig);

    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      encoder.encode(data)
    );
    if (!ok) return null;

    const payload = JSON.parse(decoder.decode(b64urlDecode(encodedBody)));
    if (!payload || typeof payload !== "object") return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/* ---------- Auth guard for protected routes ---------- */

/**
 * Extract Bearer token from request, verify it, return payload.
 * Returns null if not authenticated.
 */
export async function requireAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  if (!env.JWT_SECRET) return null;

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || !payload.sub) return null;

  return payload;
}

/* ---------- Safe body parse ---------- */

export async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
