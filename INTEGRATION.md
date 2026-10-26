# Merge admin routes into the existing Cloudflare Worker

**Do not replace your existing Worker.** The new module only handles URLs whose path starts with `/api/admin`. All other requests return `null` so your existing login/signup and other routes continue running as before.

## 1. Copy the module

Copy `worker-extension/admin-api.js` into the existing Worker source folder, for example `src/admin-api.js`.

## 2. Add one import and one early route check

At the top of the existing Worker entry file:

```js
import { handlePrepareKoraAdminApi } from "./admin-api.js";
```

Inside the existing `fetch(request, env, ctx)` handler, before the existing route logic, add:

```js
const adminResponse = await handlePrepareKoraAdminApi(request, env);
if (adminResponse) return adminResponse;
```

Leave every existing route and its auth/login/signup logic intact below this check. If your Worker is written as a single file, paste the module functions into that file and keep the same early route check.

## 3. Bindings required in Cloudflare Worker settings

This module expects these environment binding names, which may point to values you already saved:

- `FIREBASE_WEB_API_KEY` or `FIREBASE_API_KEY` — Firebase Web API key used by Firebase Authentication REST endpoints. This is not a service-account private key. Keep it configured in Cloudflare, not in GitHub, following your preference.
- `FIREBASE_DATABASE_URL` or `FIREBASE_DB_URL` — existing Realtime Database URL. It can be a Worker variable; do not put it in the source file if you do not want it in GitHub.
- Optional `ADMIN_ALLOWED_ORIGINS` — comma-separated allowed origins if your UI and Worker use separate hostnames. Example format: `https://preparekora.in,https://www.preparekora.in`. This is configuration, not a secret.

If the existing Worker uses different variable names, edit only `firebaseApiKey(env)` and `databaseUrl(env)` in the module to reuse the existing bindings. Do not add duplicate values unless necessary.

No service-account key is needed here. Database reads/writes pass the verified admin Firebase ID token to Realtime Database REST, and Firebase Rules remain enforced.

## 4. Worker routing

Recommended: route `preparekora.in/api/*` to the existing Worker. Then the frontend's `API_BASE_URL: "/api/admin"` works without a Worker hostname in the frontend. If your route is different, update the public (non-secret) `API_BASE_URL` in `administration/admin-config.js` and make sure the Worker CORS allowlist includes `https://preparekora.in` and, if used, `https://www.preparekora.in`.

## 5. Data permissions

The module's server-side allowlist is hard-coded to the sole admin UID. In Firebase Realtime Database Security Rules, permit that UID on intended admin-managed nodes while preserving student/public access requirements. Do not paste a new root rule over the existing rules unless you have reconciled every current branch. Audit history requires the admin token to write new children under `adminLogs`.

## Routes provided

- `POST /api/admin/login` — Firebase Auth sign-in; rejects every UID other than the sole administrator.
- `POST /api/admin/refresh` — refreshes an expired ID token and rechecks the UID.
- `GET /api/admin/session` — verifies the bearer ID token and admin UID.
- `POST /api/admin/logout` — stateless acknowledgement; frontend clears the current-tab tokens.
- `GET /api/admin/database?path=...` — read JSON; supports `shallow=true`.
- `PUT /api/admin/database?path=...` — replace a non-root node.
- `PATCH /api/admin/database?path=...` — merge object fields into a non-root node.
- `POST /api/admin/database?path=...` — create a child under a node.
- `DELETE /api/admin/database?path=...` — delete a non-root node.
- `GET /api/admin/health` — non-sensitive route health check.

## Safety notes

- Root writes, root replacements and root deletes are blocked. Root reads/exports are allowed.
- Admin mutation requests to `/adminLogs` are denied; the API appends its own log entries separately.
- Apply Cloudflare rate limits/WAF protections to login if available. The API returns generic sign-in errors and does not log passwords or tokens.
- The API uses Firebase Authentication's `accounts:lookup` to validate ID tokens. Requests are still constrained by Firebase Database Rules.
