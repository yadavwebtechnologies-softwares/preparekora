# PrepareKora Administration — package v2

This package contains the complete administration frontend plus a Cloudflare Worker route module to merge into your existing Worker. The current login/signup routes are **not** replaced.

## Package layout

- `administration/` — all admin HTML pages, one shared `admin.css`, one shared `admin.js`, and non-secret `admin-config.js`.
- `worker-extension/admin-api.js` — additional `/api/admin/*` routes for admin sign-in/session and Realtime Database operations. Merge this file into the existing Worker; do not deploy it as a replacement for the current Worker.
- `worker-extension/INTEGRATION.md` — route integration steps and binding names.

## Security model

- No Firebase SDK is bundled or loaded by the frontend.
- No API key, Worker secret, service-account key, password, or database credential is embedded in the GitHub files.
- The frontend contains only the designated admin UID and the non-secret API route path.
- The Worker verifies Firebase ID tokens against Firebase Authentication and checks the same UID server-side for every protected database request.
- Realtime Database REST calls use the authenticated administrator's ID token, so database Security Rules still apply. No service-account key is needed for these routes.
- The browser keeps the short-lived ID token and refresh token in `sessionStorage` for the current tab only. Never paste runtime tokens into source files or logs.
- The database root can be exported, but root replace/delete is blocked; select a child node for import/restore.
- Admin API writes to `adminLogs` are denied; the API appends its own audit records after successful mutations.

## Before deploying

1. Confirm the existing Cloudflare Worker has the same Firebase web API key binding available to it. This module accepts `FIREBASE_WEB_API_KEY` or `FIREBASE_API_KEY`.
2. Confirm the existing Worker has the exact Realtime Database URL binding available. This module accepts `FIREBASE_DATABASE_URL` or `FIREBASE_DB_URL`.
3. If your current Worker uses different binding names, update the two small helper functions in `worker-extension/admin-api.js` to reference those existing names. Do not duplicate or reveal the values.
4. Merge the route integration exactly as described in `worker-extension/INTEGRATION.md`. Keep all existing login/signup and AI routes.
5. Ensure the account with UID `uG8gJRil9wSwl0xanyyCbhqBhJm2` exists in the relevant Firebase Authentication project.
6. Review Firebase Realtime Database Security Rules. Add the required admin UID permissions to relevant nodes without replacing existing student permissions wholesale. The admin UID check in Worker does not replace database rules.
7. Host the Worker route at the same origin under `/api/admin/*` (recommended) or set `API_BASE_URL` in `administration/admin-config.js` to the public Worker API base URL. If using a separate hostname, add the PrepareKora origin to `ADMIN_ALLOWED_ORIGINS` in Cloudflare Worker variables.
8. Upload the `administration/` folder to the repository root and test the admin login. First test with a non-admin account (must be rejected), then with the sole admin account.

## Admin pages included

`login.html`, `index.html`, `pages.html`, `content.html`, `navigation.html`, `announcements.html`, `exams.html`, `questions.html`, `tests.html`, `users.html`, `database.html`, `seo.html`, `design.html`, `features.html`, `analytics.html`, `settings.html`, `backups.html`, `logs.html`, `admin.css`, `admin.js`, `admin-config.js`.

## Functional boundaries to understand

- Collection pages manage JSON records at configurable database paths. Question/exam schemas need to match what PrepareKora's public test engine already expects.
- The database explorer provides table, tree, and JSON views, JSON import/export, child operations, and opt-in 10-second polling for near-live monitoring. It is polling, not an event stream.
- The Analytics page shows database record counts only; it is not Google Analytics or visitor traffic analytics.
- Page Manager stores CMS records. It cannot make current hardcoded public HTML pages update until those pages are connected to read `sitePages` or `siteContent` records. Creating a record does not create a new GitHub Pages HTML file automatically.
- The User Records module is read-only. Deleting a Realtime Database user record does not delete or disable that Firebase Authentication user.
- File import is limited to 2 MB by default.
- Audit writes are best-effort and depend on rules permitting the admin token to create `adminLogs` children.

## Configuring an alternate API URL

`administration/admin-config.js` currently uses `API_BASE_URL: "/api/admin"`, which assumes the Cloudflare Worker route is available on the same host. If your existing Worker is exposed at a separate public hostname, set this field to the non-secret base URL ending in `/api/admin`. Never put any API key or token in it.
