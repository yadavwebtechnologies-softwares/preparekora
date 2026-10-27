// ============================================================
// PrepareKora Worker — Shared utilities
// JSON responses, CORS, id generation, safe compare, body parsing.
// Auth is handled via Firebase ID tokens (see firebase.js).
// ============================================================

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
 * Used for the small number of hard-coded comparisons in the worker.
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

/* ---------- Safe body parse ---------- */

export async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
