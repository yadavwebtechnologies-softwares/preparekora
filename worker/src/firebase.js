// ============================================================
// PrepareKora Worker — Firebase integration
//
// 1. verifyFirebaseIdToken()
//    Verifies a Firebase ID token (JWT signed by Google) using
//    Google's public certificates. No SDK needed.
//
// 2. dbGet / dbPut / dbPatch / dbDelete
//    Firebase Realtime Database REST client using a service
//    account. Access token is cached for ~1 hour.
//
// All credentials come from Cloudflare env secrets.
// Nothing sensitive lives in code.
// ============================================================

/* ---------- Base64 / Base64URL helpers ---------- */

function base64ToBytes(b64) {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToBytes(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlEncodeString(str) {
  return bytesToBase64url(new TextEncoder().encode(str));
}

/* ============================================================
   PART 1 — Firebase Auth: verify ID token
   ============================================================ */

let cachedPublicKeys = null;
let publicKeysExpiry = 0;

async function fetchFirebasePublicKeys(force) {
  if (!force && cachedPublicKeys && Date.now() < publicKeysExpiry) {
    return cachedPublicKeys;
  }

  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { cf: { cacheTtl: 3600 } }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Firebase public keys");
  }

  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  cachedPublicKeys = await res.json();
  publicKeysExpiry = Date.now() + maxAgeSec * 1000 - 60000;
  return cachedPublicKeys;
}

/* ---------- Minimal DER walker (extract SPKI from X.509 cert) ---------- */

function derHeader(buf, offset) {
  if (offset >= buf.length) throw new Error("DER: out of bounds");
  const tag = buf[offset++];
  let len = buf[offset++];
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | buf[offset++];
  }
  return { tag: tag, length: len, headerEnd: offset, end: offset + len };
}

function extractSpkiFromCert(certBytes) {
  const cert = derHeader(certBytes, 0);
  if (cert.tag !== 0x30) throw new Error("Not a certificate");

  const tbs = derHeader(certBytes, cert.headerEnd);
  if (tbs.tag !== 0x30) throw new Error("Not a tbsCertificate");

  let off = tbs.headerEnd;

  /* Optional [0] version */
  if (certBytes[off] === 0xa0) {
    const v = derHeader(certBytes, off);
    off = v.end;
  }

  /* serialNumber */
  let f = derHeader(certBytes, off); off = f.end;
  /* signature */
  f = derHeader(certBytes, off); off = f.end;
  /* issuer */
  f = derHeader(certBytes, off); off = f.end;
  /* validity */
  f = derHeader(certBytes, off); off = f.end;
  /* subject */
  f = derHeader(certBytes, off); off = f.end;

  /* subjectPublicKeyInfo */
  const spki = derHeader(certBytes, off);
  if (spki.tag !== 0x30) throw new Error("Not an SPKI");

  return certBytes.slice(off, spki.end);
}

async function importPublicKeyFromCert(pemCert) {
  const pemBody = pemCert
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "");

  const certBytes = base64ToBytes(pemBody);
  const spkiBytes = extractSpkiFromCert(certBytes);

  return crypto.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify a Firebase ID token.
 * Returns { uid, email, emailVerified, authTime } or null.
 */
export async function verifyFirebaseIdToken(idToken, projectId) {
  try {
    if (typeof idToken !== "string") return null;

    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(
      new TextDecoder().decode(b64urlDecodeToBytes(parts[0]))
    );
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecodeToBytes(parts[1]))
    );

    if (!header || header.alg !== "RS256" || !header.kid) return null;
    if (!payload || typeof payload !== "object") return null;

    const expectedIssuer = "https://securetoken.google.com/" + projectId;
    if (payload.iss !== expectedIssuer) return null;
    if (payload.aud !== projectId) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    if (typeof payload.iat !== "number" || payload.iat > nowSec + 300) return null;
    if (!payload.sub || typeof payload.sub !== "string") return null;

    /* Fetch key */
    let keys = await fetchFirebasePublicKeys(false);
    let cert = keys[header.kid];

    if (!cert) {
      keys = await fetchFirebasePublicKeys(true);
      cert = keys[header.kid];
      if (!cert) return null;
    }

    let publicKey = await importPublicKeyFromCert(cert);
    const signature = b64urlDecodeToBytes(parts[2]);
    const signingInput = new TextEncoder().encode(parts[0] + "." + parts[1]);

    let valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      signingInput
    );

    /* Key might have rotated — retry once with fresh keys */
    if (!valid) {
      keys = await fetchFirebasePublicKeys(true);
      cert = keys[header.kid];
      if (cert) {
        publicKey = await importPublicKeyFromCert(cert);
        valid = await crypto.subtle.verify(
          "RSASSA-PKCS1-v1_5",
          publicKey,
          signature,
          signingInput
        );
      }
    }

    if (!valid) return null;

    return {
      uid: payload.sub,
      email: payload.email || null,
      emailVerified: !!payload.email_verified,
      authTime: payload.auth_time || null
    };
  } catch (err) {
    return null;
  }
}

/* ============================================================
   PART 2 — Realtime Database REST client (service account)
   ============================================================ */

let cachedAccessToken = null;
let accessTokenExpiry = 0;

async function importServiceAccountKey(pem) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "");

  const bytes = base64ToBytes(body);

  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(env) {
  if (cachedAccessToken && Date.now() < accessTokenExpiry - 60000) {
    return cachedAccessToken;
  }

  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret not set");

  let sa;
  try {
    sa = JSON.parse(raw);
  } catch (err) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account missing client_email or private_key");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  if (sa.private_key_id) header.kid = sa.private_key_id;

  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encHeader = b64urlEncodeString(JSON.stringify(header));
  const encPayload = b64urlEncodeString(JSON.stringify(payload));
  const signingInput = encHeader + "." + encPayload;

  const key = await importServiceAccountKey(sa.private_key);
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const sig = bytesToBase64url(new Uint8Array(sigBuf));
  const jwt = signingInput + "." + sig;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" +
      encodeURIComponent(jwt)
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    throw new Error("OAuth exchange failed: " + tokenRes.status + " " + txt);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Missing access_token");

  cachedAccessToken = tokenData.access_token;
  accessTokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;

  return cachedAccessToken;
}

async function rtdb(env, path, options) {
  const dbUrl = env.FIREBASE_DB_URL;
  if (!dbUrl) throw new Error("FIREBASE_DB_URL not set");

  const method = (options && options.method) || "GET";
  const body = options && options.body;
  const cleanPath = String(path || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const suffix = cleanPath ? "/" + cleanPath + ".json" : "/.json";

  async function doFetch(token) {
    const url =
      dbUrl + suffix + "?access_token=" + encodeURIComponent(token);

    const opts = {
      method: method,
      headers: { "Content-Type": "application/json" }
    };
    if (body !== undefined && method !== "GET" && method !== "DELETE") {
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts);
  }

  let token = await getAccessToken(env);
  let res = await doFetch(token);

  /* Retry once on 401 (stale token) */
  if (res.status === 401) {
    cachedAccessToken = null;
    accessTokenExpiry = 0;
    token = await getAccessToken(env);
    res = await doFetch(token);
  }

  if (!res.ok) {
    throw new Error("RTDB " + method + " " + cleanPath + " failed: " + res.status);
  }

  if (method === "DELETE") return null;
  if (res.status === 204) return null;

  return res.json().catch(function () { return null; });
}

/* ---------- Public API ---------- */

export function dbGet(env, path) {
  return rtdb(env, path, { method: "GET" });
}

export function dbPut(env, path, value) {
  return rtdb(env, path, { method: "PUT", body: value });
}

export function dbPatch(env, path, value) {
  return rtdb(env, path, { method: "PATCH", body: value });
}

export function dbDelete(env, path) {
  return rtdb(env, path, { method: "DELETE" });
}
