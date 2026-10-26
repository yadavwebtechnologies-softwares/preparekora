/* Public, non-secret administration settings. No SDK, API key, or private credential is stored here. */
window.PREPAREKORA_ADMIN_CONFIG = Object.freeze({
  // Prefer a same-origin Cloudflare Worker route: https://preparekora.in/api/admin/*
  // If the existing Worker uses a workers.dev/custom API hostname, set that public base URL here.
  API_BASE_URL: "/api/admin",
  ADMIN_UID: "uG8gJRil9wSwl0xanyyCbhqBhJm2",
  REQUEST_TIMEOUT_MS: 20000,
  LIVE_POLL_INTERVAL_MS: 10000,
  MAX_IMPORT_BYTES: 2 * 1024 * 1024,
  PATHS: {
    pages: "sitePages",
    content: "siteContent",
    navigation: "siteNavigation",
    announcements: "announcements",
    exams: "exams",
    questions: "questions",
    tests: "tests",
    users: "users",
    seo: "seo",
    design: "designSettings",
    features: "featureFlags",
    settings: "siteSettings",
    logs: "adminLogs"
  }
});
