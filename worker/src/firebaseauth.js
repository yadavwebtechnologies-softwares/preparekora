// ============================================================
// PrepareKora Worker — Firebase Auth REST client
//
// Worker acts as auth proxy. Frontend sends email/password,
// Worker exchanges them with Firebase Auth REST API using
// FIREBASE_API_KEY (env secret). No key ever reaches frontend.
//
// Endpoints used:
//   POST /v1/accounts:signInWithPassword
//   POST /v1/token:refresh  (securetoken.googleapis.com)
//
// Secrets used (from Cloudflare env):
//   FIREBASE_API_KEY
// ============================================================

const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1/accounts";
const SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1/token";

/* ---------- Map Firebase error codes → safe messages ---------- */

function mapFirebaseAuthError(fbCode) {
  const code = String(fbCode || "").toUpperCase();

  switch (code) {
    case "EMAIL_NOT_FOUND":
    case "INVALID_PASSWORD":
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_EMAIL":
      return { message: "Invalid email or password", status: 401 };

    case "USER_DISABLED":
      return { message: "This account is disabled", status: 403 };

    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return { message: "Too many attempts. Try again later", status: 429 };

    case "MISSING_PASSWORD":
    case "MISSING_EMAIL":
      return { message: "Email and password are required", status: 400 };

    default:
      return { message: "Authentication failed", status: 401 };
  }
}

/* ============================================================
   Sign in with email + password
   Returns { idToken, refreshToken, localId, email, expiresIn }
   or throws { message, status }
   ============================================================ */

export async function firebaseSignIn(env, email, password) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw { message: "Server configuration error", status: 500 };
  }

  const url = IDENTITY_BASE + ":signInWithPassword?key=" + encodeURIComponent(apiKey);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });
  } catch (err) {
    throw { message: "Network error reaching auth service", status: 502 };
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const fbCode =
      data && data.error && data.error.message
        ? data.error.message
        : "AUTH_FAILED";
    throw mapFirebaseAuthError(fbCode);
  }

  if (!data || !data.idToken || !data.refreshToken || !data.localId) {
    throw { message: "Invalid auth response", status: 502 };
  }

  return {
    idToken: String(data.idToken),
    refreshToken: String(data.refreshToken),
    localId: String(data.localId),
    email: String(data.email || email),
    expiresIn: Number(data.expiresIn) || 3600
  };
}

/* ============================================================
   Refresh an idToken using a refreshToken
   Returns { idToken, refreshToken, localId, expiresIn }
   ============================================================ */

export async function firebaseRefresh(env, refreshToken) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw { message: "Server configuration error", status: 500 };
  }

  if (!refreshToken || typeof refreshToken !== "string") {
    throw { message: "refreshToken is required", status: 400 };
  }

  const url = SECURE_TOKEN_BASE + "?key=" + encodeURIComponent(apiKey);

  const body =
    "grant_type=refresh_token" +
    "&refresh_token=" + encodeURIComponent(refreshToken);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    });
  } catch (err) {
    throw { message: "Network error reaching auth service", status: 502 };
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const fbCode =
      data && data.error && data.error.message
        ? data.error.message
        : "REFRESH_FAILED";
    throw mapFirebaseAuthError(fbCode);
  }

  /* securetoken API returns snake_case keys */
  if (!data || !data.id_token || !data.refresh_token || !data.user_id) {
    throw { message: "Invalid refresh response", status: 502 };
  }

  return {
    idToken: String(data.id_token),
    refreshToken: String(data.refresh_token),
    localId: String(data.user_id),
    expiresIn: Number(data.expires_in) || 3600
  };
}
