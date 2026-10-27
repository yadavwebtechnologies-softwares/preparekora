/* PrepareKora — Admin Panel (Phase A+B: read-only) */
"use strict";

(() => {
    const API = "https://studykora-api.yadavsubba2003.workers.dev";
    const SESSION_KEY = "studyKoraSession";
    const LOG = "[PrepareKora Admin]";

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    const state = {
        session: null,
        view: "overview",
        users: { offset: 0, limit: 50, search: "", total: 0, page: [] }
    };

    /* ---------- Session ---------- */

    function readSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || !s.idToken || !s.user || !s.user.uid) return null;
            return s;
        } catch { return null; }
    }

    function clearSession() {
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    }

    /* ---------- API ---------- */

    async function api(endpoint, options = {}) {
        const { method = "GET" } = options;
        const headers = { "Accept": "application/json" };
        if (state.session?.idToken) {
            headers.Authorization = `Bearer ${state.session.idToken}`;
        }
        const response = await fetch(`${API}${endpoint}`, {
            method, headers, cache: "no-store"
        });
        const text = await response.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}

        if (!response.ok) {
            const err = new Error(
                data.error || data.message || `HTTP ${response.status}`
            );
            err.status = response.status;
            throw err;
        }
        return data;
    }

    /* ---------- View switching ---------- */

    function setView(name) {
        state.view = name;
        ["gate", "loading", "unauthorized", "overview", "users", "user-detail", "requests"]
            .forEach((v) => {
                const el = $(`#view-${v}`);
                if (el) el.hidden = v !== name;
            });
        $$(".admin-nav-link").forEach((b) => {
            b.classList.toggle("is-active", b.dataset.view === name);
        });
        const titles = {
            overview: "Overview",
            users: "Users",
            "user-detail": "User Detail",
            requests: "Account Requests"
        };
        const t = $("#admin-page-title");
        if (t) t.textContent = titles[name] || "Admin";
    }

    /* ---------- Gate ---------- */

    async function gate() {
        setView("loading");
        const session = readSession();
        if (!session) {
            setView("gate");
            return;
        }
        state.session = session;

        try {
            const res = await api("/admin/session");
            if (!res.admin) throw Object.assign(new Error("Not authorized"), { status: 403 });

            const emailEl = $("#admin-email");
            if (emailEl) emailEl.textContent = res.email || "";
            setView("overview");
            await loadOverview();
        } catch (error) {
            if (error.status === 403) {
                setView("unauthorized");
                const msg = $("#unauth-message");
                if (msg) msg.textContent = "This account is not an administrator.";
                return;
            }
            if (error.status === 401) {
                clearSession();
                setView("gate");
                return;
            }
            console.error(`${LOG} Gate error:`, error);
            setView("gate");
            const msg = $("#gate-message");
            if (msg) msg.textContent = error.message || "Could not verify access.";
        }
    }

    /* ---------- Overview ---------- */

    async function loadOverview() {
        try {
            const data = await api("/admin/overview");
            $("#stat-users").textContent = data.totals.users;
            $("#stat-attempts").textContent = data.totals.attempts;
            $("#stat-deletions").textContent = data.totals.pendingDeletionRequests;
            $("#stat-emails").textContent = data.totals.emailChangeRequests;

            const body = $("#overview-recent-body");
            body.replaceChildren();

            if (!data.recentUsers.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 4;
                td.className = "admin-muted";
                td.textContent = "No users yet.";
                tr.appendChild(td);
                body.appendChild(tr);
                return;
            }

            data.recentUsers.forEach((u) => {
                const tr = document.createElement("tr");
                [
                    u.displayName || "—",
                    u.email || "—",
                    u.createdAt ? new Date(u.createdAt).toLocaleString() : "—",
                    String(u.attempts)
                ].forEach((text, i) => {
                    const td = document.createElement("td");
                    td.textContent = text;
                    if (i === 3) td.style.textAlign = "right";
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        } catch (error) {
            console.error(`${LOG} Overview failed:`, error);
        }
    }

    /* ---------- Users list ---------- */

    async function loadUsers(reset = false) {
        if (reset) { state.users.offset = 0; }
        const params = new URLSearchParams({
            limit: String(state.users.limit),
            offset: String(state.users.offset)
        });
        if (state.users.search) params.set("search", state.users.search);

        try {
            const data = await api(`/admin/users?${params}`);
            state.users.total = data.total;
            state.users.page = data.users;

            const body = $("#users-body");
            body.replaceChildren();

            if (!data.users.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 6;
                td.className = "admin-muted";
                td.textContent = "No users found.";
                tr.appendChild(td);
                body.appendChild(tr);
            } else {
                data.users.forEach((u) => {
                    const tr = document.createElement("tr");
                    const cells = [
                        u.displayName || "—",
                        u.email || "—",
                        u.whatsapp || "—",
                        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
                        String(u.attempts)
                    ];
                    cells.forEach((text) => {
                        const td = document.createElement("td");
                        td.textContent = text;
                        tr.appendChild(td);
                    });
                    const actionTd = document.createElement("td");
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "admin-row-btn";
                    btn.textContent = "View";
                    btn.addEventListener("click", () => openUser(u.uid));
                    actionTd.appendChild(btn);
                    tr.appendChild(actionTd);
                    body.appendChild(tr);
                });
            }

            const pageNum = Math.floor(state.users.offset / state.users.limit) + 1;
            $("#users-page-info").textContent =
                `Page ${pageNum} — ${data.total} total`;
            $("#users-prev").disabled = state.users.offset === 0;
            $("#users-next").disabled =
                state.users.offset + state.users.limit >= data.total;
        } catch (error) {
            console.error(`${LOG} Users failed:`, error);
        }
    }

    /* ---------- User detail ---------- */

    async function openUser(uid) {
        setView("user-detail");
        try {
            const data = await api(`/admin/users/${encodeURIComponent(uid)}`);
            const p = data.profile || {};
            $("#user-detail-name").textContent = p.displayName || p.name || "—";
            $("#user-detail-email").textContent = p.email || "—";

            const meta = $("#user-detail-meta");
            meta.replaceChildren();
            const pairs = [
                ["UID", p.uid || "—"],
                ["WhatsApp", p.whatsapp || "—"],
                ["Photo URL", p.photoURL || "—"],
                ["Created", p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"]
            ];
            pairs.forEach(([k, v]) => {
                const dt = document.createElement("dt");
                dt.textContent = k;
                const dd = document.createElement("dd");
                dd.textContent = v;
                meta.append(dt, dd);
            });

            const body = $("#user-detail-attempts");
            body.replaceChildren();
            const empty = $("#user-detail-attempts-empty");

            if (!data.attempts.length) {
                empty.hidden = false;
                return;
            }
            empty.hidden = true;

            data.attempts.forEach((a) => {
                const tr = document.createElement("tr");
                const cells = [
                    a.completedAt ? new Date(a.completedAt).toLocaleString() : "—",
                    a.testTitle || a.testId || "—",
                    `${a.correctAnswers || 0} / ${a.totalMarks || a.totalQuestions || 0}`,
                    typeof a.accuracy === "number" ? `${a.accuracy}%` : "—",
                    formatDuration(a.timeTakenSeconds)
                ];
                cells.forEach((t) => {
                    const td = document.createElement("td");
                    td.textContent = t;
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        } catch (error) {
            console.error(`${LOG} User detail failed:`, error);
        }
    }

    function formatDuration(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}m ${String(s).padStart(2, "0")}s`;
    }

    /* ---------- Requests ---------- */

    async function loadRequests() {
        try {
            const data = await api("/admin/requests");

            const delBody = $("#requests-deletion-body");
            const delEmpty = $("#requests-deletion-empty");
            delBody.replaceChildren();

            if (!data.deletion.length) {
                delEmpty.hidden = false;
            } else {
                delEmpty.hidden = true;
                data.deletion.forEach((r) => {
                    const tr = document.createElement("tr");
                    [r.displayName, r.email, r.status,
                     r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"]
                    .forEach((t) => {
                        const td = document.createElement("td");
                        td.textContent = t || "—";
                        tr.appendChild(td);
                    });
                    delBody.appendChild(tr);
                });
            }

            const emailBody = $("#requests-email-body");
            const emailEmpty = $("#requests-email-empty");
            emailBody.replaceChildren();

            if (!data.emailChange.length) {
                emailEmpty.hidden = false;
            } else {
                emailEmpty.hidden = true;
                data.emailChange.forEach((r) => {
                    const tr = document.createElement("tr");
                    [r.displayName, r.email, r.newEmail, r.status,
                     r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"]
                    .forEach((t) => {
                        const td = document.createElement("td");
                        td.textContent = t || "—";
                        tr.appendChild(td);
                    });
                    emailBody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error(`${LOG} Requests failed:`, error);
        }
    }

    /* ---------- Wiring ---------- */

    function wire() {
        $$(".admin-nav-link").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const v = btn.dataset.view;
                setView(v);
                if (v === "overview") await loadOverview();
                if (v === "users") await loadUsers(true);
                if (v === "requests") await loadRequests();
                document.body.classList.remove("sidebar-open");
            });
        });

        const logout = $("#admin-logout");
        if (logout) logout.addEventListener("click", () => {
            clearSession();
            window.location.assign("../index.html");
        });

        const unauthLogout = $("#unauth-logout");
        if (unauthLogout) unauthLogout.addEventListener("click", () => {
            clearSession();
            window.location.assign("../auth.html?mode=login");
        });

        const search = $("#users-search");
        if (search) search.addEventListener("input", (e) => {
            state.users.search = e.target.value.trim();
        });
        const refresh = $("#users-refresh");
        if (refresh) refresh.addEventListener("click", () => loadUsers(true));
        const prev = $("#users-prev");
        if (prev) prev.addEventListener("click", () => {
            state.users.offset = Math.max(0, state.users.offset - state.users.limit);
            loadUsers();
        });
        const next = $("#users-next");
        if (next) next.addEventListener("click", () => {
            state.users.offset += state.users.limit;
            loadUsers();
        });

        const back = $("#user-detail-back");
        if (back) back.addEventListener("click", () => {
            setView("users");
            loadUsers();
        });

        const menuBtn = $("#admin-menu-btn");
        if (menuBtn) menuBtn.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-open");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            wire();
            gate();
        }, { once: true });
    } else {
        wire();
        gate();
    }
})();
