/* PrepareKora — Admin Panel (Phase A+B+C) */
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
        users: { offset: 0, limit: 50, search: "", total: 0, page: [] },
        tests: [],
        subjects: [],
        organizations: [],
        editingTest: null,
        editingSubject: null,
        editingOrg: null
    };

    function readSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || !s.idToken || !s.user || !s.user.uid) return null;
            return s;
        } catch { return null; }
    }
    function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }

    async function api(endpoint, options = {}) {
        const { method = "GET", body } = options;
        const headers = { "Accept": "application/json" };
        if (body !== undefined) headers["Content-Type"] = "application/json";
        if (state.session?.idToken) headers.Authorization = `Bearer ${state.session.idToken}`;

        const response = await fetch(`${API}${endpoint}`, {
            method, headers, cache: "no-store",
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });
        const text = await response.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}

        if (!response.ok) {
            const err = new Error(data.error || data.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return data;
    }

    function setView(name) {
        state.view = name;
        ["gate","loading","unauthorized","overview","tests","subjects","organizations","users","user-detail","requests","notifications"]
            .forEach((v) => {
                const el = $(`#view-${v}`);
                if (el) el.hidden = v !== name;
            });
        $$(".admin-nav-link").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
        const titles = {
            overview: "Overview", tests: "Tests", subjects: "Subjects", organizations: "Organizations",
            users: "Users", "user-detail": "User Detail", requests: "Account Requests", notifications: "Notifications"
        };
        $("#admin-page-title").textContent = titles[name] || "Admin";
    }

    async function gate() {
        setView("loading");
        const session = readSession();
        if (!session) { setView("gate"); return; }
        state.session = session;
        try {
            const res = await api("/admin/session");
            if (!res.admin) throw Object.assign(new Error("Not authorized"), { status: 403 });
            $("#admin-email").textContent = res.email || "";
            setView("overview");
            await loadOverview();
        } catch (error) {
            if (error.status === 403) { setView("unauthorized"); return; }
            if (error.status === 401) { clearSession(); setView("gate"); return; }
            console.error(`${LOG} Gate error:`, error);
            setView("gate");
            $("#gate-message").textContent = error.message || "Could not verify access.";
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
                td.colSpan = 4; td.className = "admin-muted"; td.textContent = "No users yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.recentUsers.forEach((u) => {
                const tr = document.createElement("tr");
                [u.displayName || "—", u.email || "—",
                 u.createdAt ? new Date(u.createdAt).toLocaleString() : "—",
                 String(u.attempts)].forEach((t, i) => {
                    const td = document.createElement("td");
                    td.textContent = t;
                    if (i === 3) td.style.textAlign = "right";
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        } catch (error) { console.error(`${LOG} Overview:`, error); }
    }

    /* ---------- Users ---------- */

    async function loadUsers(reset = false) {
        if (reset) state.users.offset = 0;
        const params = new URLSearchParams({ limit: String(state.users.limit), offset: String(state.users.offset) });
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
                td.colSpan = 6; td.className = "admin-muted"; td.textContent = "No users found.";
                tr.appendChild(td); body.appendChild(tr);
            } else {
                data.users.forEach((u) => {
                    const tr = document.createElement("tr");
                    [u.displayName || "—", u.email || "—", u.whatsapp || "—",
                     u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
                     String(u.attempts)].forEach((t) => {
                        const td = document.createElement("td");
                        td.textContent = t; tr.appendChild(td);
                    });
                    const actionTd = document.createElement("td");
                    const btn = document.createElement("button");
                    btn.type = "button"; btn.className = "admin-row-btn"; btn.textContent = "View";
                    btn.addEventListener("click", () => openUser(u.uid));
                    actionTd.appendChild(btn);
                    tr.appendChild(actionTd);
                    body.appendChild(tr);
                });
            }
            const pageNum = Math.floor(state.users.offset / state.users.limit) + 1;
            $("#users-page-info").textContent = `Page ${pageNum} — ${data.total} total`;
            $("#users-prev").disabled = state.users.offset === 0;
            $("#users-next").disabled = state.users.offset + state.users.limit >= data.total;
        } catch (error) { console.error(`${LOG} Users:`, error); }
    }

    async function openUser(uid) {
        setView("user-detail");
        try {
            const data = await api(`/admin/users/${encodeURIComponent(uid)}`);
            const p = data.profile || {};
            $("#user-detail-name").textContent = p.displayName || p.name || "—";
            $("#user-detail-email").textContent = p.email || "—";
            const meta = $("#user-detail-meta");
            meta.replaceChildren();
            [["UID", p.uid || "—"], ["WhatsApp", p.whatsapp || "—"],
             ["Photo URL", p.photoURL || "—"],
             ["Created", p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"]]
                .forEach(([k, v]) => {
                    const dt = document.createElement("dt"); dt.textContent = k;
                    const dd = document.createElement("dd"); dd.textContent = v;
                    meta.append(dt, dd);
                });
            const body = $("#user-detail-attempts");
            body.replaceChildren();
            const empty = $("#user-detail-attempts-empty");
            if (!data.attempts.length) { empty.hidden = false; return; }
            empty.hidden = true;
            data.attempts.forEach((a) => {
                const tr = document.createElement("tr");
                [a.completedAt ? new Date(a.completedAt).toLocaleString() : "—",
                 a.testTitle || a.testId || "—",
                 `${a.correctAnswers || 0} / ${a.totalMarks || a.totalQuestions || 0}`,
                 typeof a.accuracy === "number" ? `${a.accuracy}%` : "—",
                 formatDuration(a.timeTakenSeconds)].forEach((t) => {
                    const td = document.createElement("td");
                    td.textContent = t; tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        } catch (error) { console.error(`${LOG} User detail:`, error); }
    }
    function formatDuration(s) { s = Math.max(0, Math.floor(Number(s) || 0)); return `${Math.floor(s/60)}m ${String(s%60).padStart(2,"0")}s`; }

    /* ---------- Requests ---------- */

    async function loadRequests() {
        try {
            const data = await api("/admin/requests");
            const delBody = $("#requests-deletion-body");
            const delEmpty = $("#requests-deletion-empty");
            delBody.replaceChildren();
            if (!data.deletion.length) delEmpty.hidden = false;
            else {
                delEmpty.hidden = true;
                data.deletion.forEach((r) => {
                    const tr = document.createElement("tr");
                    [r.displayName, r.email, r.status,
                     r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"]
                        .forEach((t) => {
                            const td = document.createElement("td");
                            td.textContent = t || "—"; tr.appendChild(td);
                        });
                    delBody.appendChild(tr);
                });
            }
            const emBody = $("#requests-email-body");
            const emEmpty = $("#requests-email-empty");
            emBody.replaceChildren();
            if (!data.emailChange.length) emEmpty.hidden = false;
            else {
                emEmpty.hidden = true;
                data.emailChange.forEach((r) => {
                    const tr = document.createElement("tr");
                    [r.displayName, r.email, r.newEmail, r.status,
                     r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"]
                        .forEach((t) => {
                            const td = document.createElement("td");
                            td.textContent = t || "—"; tr.appendChild(td);
                        });
                    emBody.appendChild(tr);
                });
            }
        } catch (error) { console.error(`${LOG} Requests:`, error); }
    }

    /* ---------- Tests ---------- */

    async function loadTests() {
        try {
            const data = await api("/admin/tests");
            state.tests = data.items;
            const body = $("#tests-body");
            body.replaceChildren();
            if (!data.items.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 6; td.className = "admin-muted"; td.textContent = "No tests yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.items.forEach((t) => {
                const tr = document.createElement("tr");
                [t.id, t.title, t.category || "—",
                 String(t.questions?.length || 0),
                 t.published === false ? "No" : "Yes"].forEach((txt) => {
                    const td = document.createElement("td");
                    td.textContent = txt; tr.appendChild(td);
                });
                const actions = document.createElement("td");
                actions.className = "admin-row-actions";
                const editBtn = document.createElement("button");
                editBtn.type = "button"; editBtn.className = "admin-row-btn"; editBtn.textContent = "Edit";
                editBtn.addEventListener("click", () => openTestForm(t));
                const delBtn = document.createElement("button");
                delBtn.type = "button"; delBtn.className = "admin-row-btn admin-row-btn-danger"; delBtn.textContent = "Delete";
                delBtn.addEventListener("click", () => deleteTest(t.id));
                actions.append(editBtn, delBtn);
                tr.appendChild(actions);
                body.appendChild(tr);
            });
        } catch (error) { console.error(`${LOG} Tests:`, error); }
    }

    function openTestForm(test) {
        state.editingTest = test || null;
        $("#tests-form-title").textContent = test ? "Edit Test" : "New Test";
        $("#test-id").value = test?.id || "";
        $("#test-id").disabled = !!test;
        $("#test-title").value = test?.title || "";
        $("#test-category").value = test?.category || "general";
        $("#test-duration").value = test?.duration || 600;
        $("#test-marks").value = test?.marksPerQuestion || 1;
        $("#test-published").value = test?.published === false ? "false" : "true";
        $("#test-description").value = test?.description || "";
        $("#test-questions").replaceChildren();
        (test?.questions || []).forEach(addQuestionBlock);
        $("#test-form-message").textContent = "";
        $("#tests-form-card").hidden = false;
        $("#tests-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function addQuestionBlock(q = {}) {
        const idx = $("#test-questions").children.length + 1;
        const wrap = document.createElement("div");
        wrap.className = "admin-q-block";
        wrap.innerHTML = `
            <div class="admin-q-head">
                <span>Question ${idx}</span>
                <button type="button" class="admin-row-btn admin-row-btn-danger admin-q-remove">Remove</button>
            </div>
            <label class="admin-label">Question text
                <input class="admin-input admin-q-text" value="" maxlength="500" required>
            </label>
            <div class="admin-q-options">
                ${[0,1,2,3].map((i)=>`
                    <label>${String.fromCharCode(65+i)}</label>
                    <input class="admin-input admin-q-opt" data-opt="${i}" value="" maxlength="200" required>
                `).join("")}
            </div>
            <div class="admin-q-row">
                <label class="admin-label">Correct answer (A–D)
                    <select class="admin-input admin-q-answer">
                        <option value="0">A</option><option value="1">B</option>
                        <option value="2">C</option><option value="3">D</option>
                    </select>
                </label>
                <label class="admin-label">Explanation (optional)
                    <input class="admin-input admin-q-expl" maxlength="500">
                </label>
            </div>
        `;
        const opts = wrap.querySelectorAll(".admin-q-opt");
        if (Array.isArray(q.options)) {
            opts.forEach((el, i) => { el.value = q.options[i] || ""; });
        }
        if (q.question) wrap.querySelector(".admin-q-text").value = q.question;
        if (Number.isInteger(q.answer)) wrap.querySelector(".admin-q-answer").value = String(q.answer);
        if (q.explanation) wrap.querySelector(".admin-q-expl").value = q.explanation;
        wrap.querySelector(".admin-q-remove").addEventListener("click", () => {
            wrap.remove();
            renumberQuestions();
        });
        $("#test-questions").appendChild(wrap);
    }

    function renumberQuestions() {
        $$("#test-questions .admin-q-block").forEach((b, i) => {
            b.querySelector(".admin-q-head span").textContent = `Question ${i + 1}`;
        });
    }

    function collectQuestions() {
        return $$("#test-questions .admin-q-block").map((b) => ({
            question: b.querySelector(".admin-q-text").value.trim(),
            options: Array.from(b.querySelectorAll(".admin-q-opt")).map((el) => el.value.trim()),
            answer: Number(b.querySelector(".admin-q-answer").value),
            explanation: b.querySelector(".admin-q-expl").value.trim()
        }));
    }

    async function saveTest(e) {
        e.preventDefault();
        const msg = $("#test-form-message");
        msg.textContent = "";
        const payload = {
            id: $("#test-id").value.trim().toLowerCase(),
            title: $("#test-title").value.trim(),
            category: $("#test-category").value.trim(),
            duration: Number($("#test-duration").value),
            marksPerQuestion: Number($("#test-marks").value),
            published: $("#test-published").value === "true",
            description: $("#test-description").value.trim(),
            questions: collectQuestions()
        };
        try {
            if (state.editingTest) {
                await api(`/admin/tests/${encodeURIComponent(state.editingTest.id)}`, { method: "PATCH", body: payload });
            } else {
                await api("/admin/tests", { method: "POST", body: payload });
            }
            $("#tests-form-card").hidden = true;
            await loadTests();
        } catch (error) { msg.textContent = error.message; }
    }

    async function deleteTest(id) {
        if (!confirm(`Delete test "${id}"? This cannot be undone.`)) return;
        try {
            await api(`/admin/tests/${encodeURIComponent(id)}`, { method: "DELETE" });
            await loadTests();
        } catch (error) { alert(error.message); }
    }

    /* ---------- Subjects ---------- */

    async function loadSubjects() {
        try {
            const data = await api("/admin/subjects");
            state.subjects = data.items;
            const body = $("#subjects-body");
            body.replaceChildren();
            if (!data.items.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 4; td.className = "admin-muted"; td.textContent = "No subjects yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.items.forEach((s) => {
                const tr = document.createElement("tr");
                [s.id, s.name, s.published === false ? "No" : "Yes"].forEach((t) => {
                    const td = document.createElement("td");
                    td.textContent = t || "—"; tr.appendChild(td);
                });
                const actions = document.createElement("td");
                actions.className = "admin-row-actions";
                const editBtn = document.createElement("button");
                editBtn.type = "button"; editBtn.className = "admin-row-btn"; editBtn.textContent = "Edit";
                editBtn.addEventListener("click", () => openSubjectForm(s));
                const delBtn = document.createElement("button");
                delBtn.type = "button"; delBtn.className = "admin-row-btn admin-row-btn-danger"; delBtn.textContent = "Delete";
                delBtn.addEventListener("click", () => deleteSubject(s.id));
                actions.append(editBtn, delBtn);
                tr.appendChild(actions);
                body.appendChild(tr);
            });
        } catch (error) { console.error(`${LOG} Subjects:`, error); }
    }

    function openSubjectForm(s) {
        state.editingSubject = s || null;
        $("#subjects-form-title").textContent = s ? "Edit Subject" : "New Subject";
        $("#subject-id").value = s?.id || "";
        $("#subject-id").disabled = !!s;
        $("#subject-name").value = s?.name || "";
        $("#subject-published").value = s?.published === false ? "false" : "true";
        $("#subject-description").value = s?.description || "";
        $("#subject-form-message").textContent = "";
        $("#subjects-form-card").hidden = false;
        $("#subjects-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveSubject(e) {
        e.preventDefault();
        const msg = $("#subject-form-message");
        const payload = {
            id: $("#subject-id").value.trim().toLowerCase(),
            name: $("#subject-name").value.trim(),
            published: $("#subject-published").value === "true",
            description: $("#subject-description").value.trim()
        };
        try {
            if (state.editingSubject) {
                await api(`/admin/subjects/${encodeURIComponent(state.editingSubject.id)}`, { method: "PATCH", body: payload });
            } else {
                await api("/admin/subjects", { method: "POST", body: payload });
            }
            $("#subjects-form-card").hidden = true;
            await loadSubjects();
        } catch (error) { msg.textContent = error.message; }
    }

    async function deleteSubject(id) {
        if (!confirm(`Delete subject "${id}"?`)) return;
        try { await api(`/admin/subjects/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadSubjects(); }
        catch (e) { alert(e.message); }
    }

    /* ---------- Organizations ---------- */

    async function loadOrganizations() {
        try {
            const data = await api("/admin/organizations");
            state.organizations = data.items;
            const body = $("#orgs-body");
            body.replaceChildren();
            if (!data.items.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 5; td.className = "admin-muted"; td.textContent = "No organizations yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.items.forEach((o) => {
                const tr = document.createElement("tr");
                [o.id, o.name, o.category || "—", o.published === false ? "No" : "Yes"].forEach((t) => {
                    const td = document.createElement("td");
                    td.textContent = t || "—"; tr.appendChild(td);
                });
                const actions = document.createElement("td");
                actions.className = "admin-row-actions";
                const editBtn = document.createElement("button");
                editBtn.type = "button"; editBtn.className = "admin-row-btn"; editBtn.textContent = "Edit";
                editBtn.addEventListener("click", () => openOrgForm(o));
                const delBtn = document.createElement("button");
                delBtn.type = "button"; delBtn.className = "admin-row-btn admin-row-btn-danger"; delBtn.textContent = "Delete";
                delBtn.addEventListener("click", () => deleteOrg(o.id));
                actions.append(editBtn, delBtn);
                tr.appendChild(actions);
                body.appendChild(tr);
            });
        } catch (error) { console.error(`${LOG} Organizations:`, error); }
    }

    function openOrgForm(o) {
        state.editingOrg = o || null;
        $("#orgs-form-title").textContent = o ? "Edit Organization" : "New Organization";
        $("#org-id").value = o?.id || "";
        $("#org-id").disabled = !!o;
        $("#org-name").value = o?.name || "";
        $("#org-category").value = o?.category || "";
        $("#org-published").value = o?.published === false ? "false" : "true";
        $("#org-description").value = o?.description || "";
        $("#org-form-message").textContent = "";
        $("#orgs-form-card").hidden = false;
        $("#orgs-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveOrg(e) {
        e.preventDefault();
        const msg = $("#org-form-message");
        const payload = {
            id: $("#org-id").value.trim().toLowerCase(),
            name: $("#org-name").value.trim(),
            category: $("#org-category").value.trim(),
            published: $("#org-published").value === "true",
            description: $("#org-description").value.trim()
        };
        try {
            if (state.editingOrg) {
                await api(`/admin/organizations/${encodeURIComponent(state.editingOrg.id)}`, { method: "PATCH", body: payload });
            } else {
                await api("/admin/organizations", { method: "POST", body: payload });
            }
            $("#orgs-form-card").hidden = true;
            await loadOrganizations();
        } catch (error) { msg.textContent = error.message; }
    }

    async function deleteOrg(id) {
        if (!confirm(`Delete organization "${id}"?`)) return;
        try { await api(`/admin/organizations/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadOrganizations(); }
        catch (e) { alert(e.message); }
    }

    /* ---------- Notifications ---------- */

    async function sendNotification(e) {
        e.preventDefault();
        const out = $("#notif-message-out");
        out.textContent = "";
        const payload = {
            uid: $("#notif-uid").value.trim(),
            title: $("#notif-title").value.trim(),
            message: $("#notif-message").value.trim(),
            type: $("#notif-type").value
        };
        try {
            await api("/admin/notifications", { method: "POST", body: payload });
            out.textContent = "Notification sent.";
            $("#notif-form").reset();
        } catch (error) { out.textContent = error.message; }
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
                if (v === "tests") await loadTests();
                if (v === "subjects") await loadSubjects();
                if (v === "organizations") await loadOrganizations();
                document.body.classList.remove("sidebar-open");
            });
        });

        $("#admin-logout").addEventListener("click", () => {
            clearSession(); window.location.assign("../index.html");
        });
        $("#unauth-logout").addEventListener("click", () => {
            clearSession(); window.location.assign("../auth.html?mode=login");
        });

        $("#users-search").addEventListener("input", (e) => { state.users.search = e.target.value.trim(); });
        $("#users-refresh").addEventListener("click", () => loadUsers(true));
        $("#users-prev").addEventListener("click", () => { state.users.offset = Math.max(0, state.users.offset - state.users.limit); loadUsers(); });
        $("#users-next").addEventListener("click", () => { state.users.offset += state.users.limit; loadUsers(); });
        $("#user-detail-back").addEventListener("click", () => { setView("users"); loadUsers(); });

        /* Tests */
        $("#tests-new").addEventListener("click", () => openTestForm(null));
        $("#tests-refresh").addEventListener("click", () => loadTests());
        $("#test-add-question").addEventListener("click", () => addQuestionBlock());
        $("#test-cancel").addEventListener("click", () => { $("#tests-form-card").hidden = true; });
        $("#tests-form").addEventListener("submit", saveTest);

        /* Subjects */
        $("#subjects-new").addEventListener("click", () => openSubjectForm(null));
        $("#subject-cancel").addEventListener("click", () => { $("#subjects-form-card").hidden = true; });
        $("#subjects-form").addEventListener("submit", saveSubject);

        /* Organizations */
        $("#orgs-new").addEventListener("click", () => openOrgForm(null));
        $("#org-cancel").addEventListener("click", () => { $("#orgs-form-card").hidden = true; });
        $("#orgs-form").addEventListener("submit", saveOrg);

        /* Notifications */
        $("#notif-form").addEventListener("submit", sendNotification);

        /* Mobile menu */
        $("#admin-menu-btn").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { wire(); gate(); }, { once: true });
    } else { wire(); gate(); }
})();
