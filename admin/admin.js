/* PrepareKora — Admin Panel */
"use strict";

(() => {
    const API = "https://studykora-api.yadavsubba2003.workers.dev";
    const SESSION_KEY = "preparekoraAdminSession";
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
        editingOrg: null,
        activeRequest: null,
        dbPath: "users",
        dbEditingPath: null
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
            err.details = data.details || null;
            err.conflicts = data.conflicts || null;
            throw err;
        }
        return data;
    }

    function setView(name) {
        state.view = name;
        ["gate","loading","unauthorized","overview","tests","subjects","organizations","users","user-detail","requests","notifications","import","db"]
            .forEach((v) => {
                const el = $(`#view-${v}`);
                if (el) el.hidden = v !== name;
            });
        $$(".admin-nav-link").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
        const titles = {
            overview: "Overview", tests: "Tests", subjects: "Subjects", organizations: "Organizations",
            users: "Users", "user-detail": "User Detail", requests: "Account Requests", notifications: "Notifications",
            import: "Bulk Import", db: "Database Manager"
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
            if (error.status === 401) { clearSession(); window.location.assign("login.html"); return; }
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

    async function handleBackfill() {
        const btn = $("#admin-backfill");
        const msg = $("#admin-backfill-message");
        if (!btn || !msg) return;
        btn.disabled = true;
        btn.textContent = "Backfilling…";
        msg.textContent = "";
        try {
            const res = await api("/admin/backfill-tests", { method: "POST" });
            msg.textContent = res.message || "Done.";
        } catch (error) {
            msg.textContent = error.message || "Backfill failed.";
        } finally {
            btn.disabled = false;
            btn.textContent = "Backfill Tests → Subjects";
        }
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

    function renderStatusBadge(status) {
        const span = document.createElement("span");
        span.className = "admin-row-btn";
        span.style.cursor = "default";
        span.style.fontWeight = "600";
        span.textContent = status || "pending";
        if (status === "approved" || status === "completed") {
            span.style.color = "#067647"; span.style.borderColor = "#c9e3d0";
        } else if (status === "rejected") {
            span.style.color = "#b42318"; span.style.borderColor = "#f5d5d2";
        } else if (status === "under_review") {
            span.style.color = "#b54708"; span.style.borderColor = "#fce6c9";
        }
        return span;
    }

    function renderResponseCell(text) {
        const td = document.createElement("td");
        if (text) {
            td.textContent = text;
            td.style.maxWidth = "220px";
            td.style.overflow = "hidden";
            td.style.textOverflow = "ellipsis";
            td.title = text;
        } else { td.textContent = "—"; td.className = "admin-muted"; }
        return td;
    }

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
                    const nameTd = document.createElement("td"); nameTd.textContent = r.displayName || "—"; tr.appendChild(nameTd);
                    const emailTd = document.createElement("td"); emailTd.textContent = r.email || "—"; tr.appendChild(emailTd);
                    const statusTd = document.createElement("td"); statusTd.appendChild(renderStatusBadge(r.status)); tr.appendChild(statusTd);
                    const dateTd = document.createElement("td"); dateTd.textContent = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"; tr.appendChild(dateTd);
                    tr.appendChild(renderResponseCell(r.response));
                    const actionTd = document.createElement("td");
                    const btn = document.createElement("button");
                    btn.type = "button"; btn.className = "admin-row-btn"; btn.textContent = "Review";
                    btn.addEventListener("click", () => openRequestReview(r, "deletion"));
                    actionTd.appendChild(btn); tr.appendChild(actionTd);
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
                    const nameTd = document.createElement("td"); nameTd.textContent = r.displayName || "—"; tr.appendChild(nameTd);
                    const emailTd = document.createElement("td"); emailTd.textContent = r.email || "—"; tr.appendChild(emailTd);
                    const newEmailTd = document.createElement("td"); newEmailTd.textContent = r.newEmail || "—"; tr.appendChild(newEmailTd);
                    const statusTd = document.createElement("td"); statusTd.appendChild(renderStatusBadge(r.status)); tr.appendChild(statusTd);
                    const dateTd = document.createElement("td"); dateTd.textContent = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"; tr.appendChild(dateTd);
                    tr.appendChild(renderResponseCell(r.response));
                    const actionTd = document.createElement("td");
                    const btn = document.createElement("button");
                    btn.type = "button"; btn.className = "admin-row-btn"; btn.textContent = "Review";
                    btn.addEventListener("click", () => openRequestReview(r, "email"));
                    actionTd.appendChild(btn); tr.appendChild(actionTd);
                    emBody.appendChild(tr);
                });
            }
        } catch (error) { console.error(`${LOG} Requests:`, error); }
    }

    function openRequestReview(req, type) {
        state.activeRequest = { uid: req.uid, type };
        const card = $("#request-review-card");
        if (!card) return;
        $("#request-review-title").textContent = type === "deletion" ? "Review Deletion Request" : "Review Email Change Request";
        $("#request-review-subtitle").textContent = `${req.displayName || "User"} — ${req.email || ""}`;
        $("#request-status").value = req.status || "pending";
        $("#request-response").value = req.response || "";
        $("#request-review-message").textContent = "";
        card.hidden = false;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveRequestReview(e) {
        e.preventDefault();
        if (!state.activeRequest) return;
        const msg = $("#request-review-message");
        msg.textContent = "";
        const payload = {
            status: $("#request-status").value,
            response: $("#request-response").value.trim()
        };
        try {
            const res = await api(
                `/admin/requests/${encodeURIComponent(state.activeRequest.uid)}/${state.activeRequest.type}`,
                { method: "PATCH", body: payload }
            );
            msg.textContent = res.notificationCreated
                ? "Saved. Notification sent to user."
                : "Saved (no response text, so no notification sent).";
            $("#request-review-card").hidden = true;
            state.activeRequest = null;
            await loadRequests();
        } catch (error) { msg.textContent = error.message || "Could not save."; }
    }

    /* ---------- Tests ---------- */

    async function populateSubjectDropdown(selectedId = "") {
        const select = $("#test-subject");
        if (!select) return;
        select.innerHTML = '<option value="">-- Select a subject --</option>';
        try {
            const data = await api("/admin/subjects");
            if (!data.items.length) {
                select.innerHTML = '<option value="">No subjects yet — create a subject first</option>';
                return;
            }
            data.items.forEach((s) => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = `${s.name} (${s.id})`;
                if (s.id === selectedId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error(`${LOG} Populate subjects:`, error);
            select.innerHTML = '<option value="">Error loading subjects</option>';
        }
    }

    async function loadTests() {
        try {
            const data = await api("/admin/tests");
            state.tests = data.items;
            const body = $("#tests-body");
            body.replaceChildren();
            if (!data.items.length) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 7; td.className = "admin-muted"; td.textContent = "No tests yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.items.forEach((t) => {
                const tr = document.createElement("tr");
                [t.id, t.title, t.subjectId || "—", t.category || "—",
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

    async function openTestForm(test) {
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
        await populateSubjectDropdown(test?.subjectId || "");
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
        const subjectId = $("#test-subject").value;
        if (!subjectId) {
            msg.textContent = "Select a subject first. Create one under Subjects if none exist.";
            return;
        }
        const payload = {
            id: $("#test-id").value.trim().toLowerCase(),
            title: $("#test-title").value.trim(),
            subjectId,
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
                td.colSpan = 6; td.className = "admin-muted"; td.textContent = "No subjects yet.";
                tr.appendChild(td); body.appendChild(tr);
                return;
            }
            data.items.forEach((s) => {
                const tr = document.createElement("tr");
                const topicCount = Array.isArray(s.topics) ? s.topics.length : 0;
                [s.id, s.name, s.category || "—", String(topicCount),
                 s.published === false ? "No" : "Yes"].forEach((t) => {
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
        $("#subject-category").value = s?.category || "";
        $("#subject-published").value = s?.published === false ? "false" : "true";
        $("#subject-description").value = s?.description || "";
        $("#subject-about").value = s?.about || "";
        $("#subject-tags").value = Array.isArray(s?.tags) ? s.tags.join(", ") : "";
        $("#subject-topics").value = Array.isArray(s?.topics) ? s.topics.join(", ") : "";
        $("#subject-form-message").textContent = "";
        $("#subjects-form-card").hidden = false;
        $("#subjects-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveSubject(e) {
        e.preventDefault();
        const msg = $("#subject-form-message");
        const splitCsv = (val) => (val || "").split(",").map((x) => x.trim()).filter(Boolean);
        const payload = {
            id: $("#subject-id").value.trim().toLowerCase(),
            name: $("#subject-name").value.trim(),
            category: $("#subject-category").value.trim(),
            published: $("#subject-published").value === "true",
            description: $("#subject-description").value.trim(),
            about: $("#subject-about").value.trim(),
            tags: splitCsv($("#subject-tags").value),
            topics: splitCsv($("#subject-topics").value)
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

    /* ---------- Import ---------- */

    function formatImportReport(out, data) {
        out.replaceChildren();
        const lines = [];
        if (data.created && data.created.length) {
            lines.push(`Created: ${data.created.length}` + (data.created.length <= 10 ? ` (${data.created.join(", ")})` : ""));
        }
        if (data.updated && data.updated.length) {
            lines.push(`Updated: ${data.updated.length}` + (data.updated.length <= 10 ? ` (${data.updated.join(", ")})` : ""));
        }
        if (data.added) lines.push(`Questions added: ${data.added}`);
        if (data.totalQuestions) lines.push(`Total questions now: ${data.totalQuestions}`);
        if (data.failed && data.failed.length) lines.push(`Failed: ${data.failed.length}`);
        lines.forEach((line) => {
            const div = document.createElement("div");
            div.textContent = line;
            if (line.startsWith("Failed")) div.style.color = "#b42318";
            out.appendChild(div);
        });
        if (data.failed && data.failed.length) {
            const details = document.createElement("ul");
            data.failed.forEach((f) => {
                const li = document.createElement("li");
                li.textContent = `${f.id}: ${f.error}`;
                li.style.color = "#b42318";
                li.style.fontSize = "12px";
                details.appendChild(li);
            });
            out.appendChild(details);
        }
    }

    function showImportError(out, error) {
        out.replaceChildren();
        const head = document.createElement("div");
        head.style.color = "#b42318";
        head.style.fontWeight = "600";
        head.textContent = error.message || "Import failed.";
        out.appendChild(head);
        if (Array.isArray(error.details) && error.details.length) {
            const list = document.createElement("ul");
            error.details.slice(0, 20).forEach((d) => {
                const li = document.createElement("li");
                li.textContent = `Item ${typeof d.index === "number" ? d.index + 1 : "?"}${d.id ? ` (${d.id})` : ""}: ${d.error}`;
                li.style.color = "#b42318";
                li.style.fontSize = "12px";
                list.appendChild(li);
            });
            if (error.details.length > 20) {
                const li = document.createElement("li");
                li.textContent = `…and ${error.details.length - 20} more`;
                li.style.fontSize = "12px";
                list.appendChild(li);
            }
            out.appendChild(list);
        }
        if (Array.isArray(error.conflicts) && error.conflicts.length) {
            const p = document.createElement("p");
            p.style.fontSize = "12px";
            p.textContent = `Existing IDs: ${error.conflicts.join(", ")}`;
            out.appendChild(p);
        }
    }

    async function importSubjects() {
        const out = $("#import-subjects-result");
        const json = ($("#import-subjects-json").value || "").trim();
        const overwrite = $("#import-subjects-overwrite").checked;
        if (!json) { out.textContent = "Paste JSON first."; return; }
        let items;
        try {
            items = JSON.parse(json);
            if (!Array.isArray(items)) throw new Error("JSON must be an array.");
        } catch (e) { out.textContent = `Invalid JSON: ${e.message}`; return; }
        if (!items.length) { out.textContent = "Array is empty."; return; }
        if (!confirm(`Import ${items.length} subject(s)${overwrite ? " (overwrite existing)" : ""}?`)) return;
        out.textContent = "Importing…";
        try {
            const res = await api("/admin/import/subjects", { method: "POST", body: { items, overwrite } });
            formatImportReport(out, res);
            await loadSubjects();
        } catch (error) { showImportError(out, error); }
    }

    async function importTests() {
        const out = $("#import-tests-result");
        const json = ($("#import-tests-json").value || "").trim();
        const overwrite = $("#import-tests-overwrite").checked;
        if (!json) { out.textContent = "Paste JSON first."; return; }
        let items;
        try {
            items = JSON.parse(json);
            if (!Array.isArray(items)) throw new Error("JSON must be an array.");
        } catch (e) { out.textContent = `Invalid JSON: ${e.message}`; return; }
        if (!items.length) { out.textContent = "Array is empty."; return; }
        if (!confirm(`Import ${items.length} test(s)${overwrite ? " (overwrite existing)" : ""}?`)) return;
        out.textContent = "Importing…";
        try {
            const res = await api("/admin/import/tests", { method: "POST", body: { items, overwrite } });
            formatImportReport(out, res);
            await loadTests();
        } catch (error) { showImportError(out, error); }
    }

    async function importMcqs() {
        const out = $("#import-mcqs-result");
        const testId = $("#import-mcqs-test").value;
        const json = ($("#import-mcqs-json").value || "").trim();
        if (!testId) { out.textContent = "Select a target test."; return; }
        if (!json) { out.textContent = "Paste JSON first."; return; }
        let questions;
        try {
            questions = JSON.parse(json);
            if (!Array.isArray(questions)) throw new Error("JSON must be an array.");
        } catch (e) { out.textContent = `Invalid JSON: ${e.message}`; return; }
        if (!questions.length) { out.textContent = "Array is empty."; return; }
        if (!confirm(`Append ${questions.length} question(s) to "${testId}"?`)) return;
        out.textContent = "Importing…";
        try {
            const res = await api("/admin/import/mcqs", { method: "POST", body: { testId, questions } });
            formatImportReport(out, res);
            await populateImportTestDropdown();
        } catch (error) { showImportError(out, error); }
    }

    async function populateImportTestDropdown() {
        const select = $("#import-mcqs-test");
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">-- Select a test --</option>';
        try {
            const data = await api("/admin/tests");
            if (!data.items.length) {
                select.innerHTML = '<option value="">No tests yet — import or create a test first</option>';
                return;
            }
            data.items.forEach((t) => {
                const opt = document.createElement("option");
                opt.value = t.id;
                opt.textContent = `${t.title || t.id} (${t.id})`;
                if (t.id === current) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error(`${LOG} Populate import tests:`, error);
            select.innerHTML = '<option value="">Error loading tests</option>';
        }
    }

    /* ---------- Database Manager ---------- */

    function describeValue(val) {
        if (val === null) return "null";
        if (Array.isArray(val)) return `[${val.length} items]`;
        if (typeof val === "object") {
            const keys = Object.keys(val);
            return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", …" : ""}}`;
        }
        if (typeof val === "string") return val.length > 80 ? val.slice(0, 80) + "…" : val;
        return String(val);
    }

    function updateDbBreadcrumb(path) {
        const crumb = $("#db-breadcrumb");
        if (crumb) crumb.textContent = `Path: /${path}`;
        const segments = path.split("/");

        const up = $("#db-up");
        if (up) {
            up.hidden = segments.length <= 1;
        }
        const editRoot = $("#db-edit-root");
        if (editRoot) {
            editRoot.hidden = false;
        }
        const delRoot = $("#db-delete-root");
        if (delRoot) {
            delRoot.hidden = segments.length <= 1;
        }
    }

    function renderDbObject(container, path, obj) {
        const keys = Object.keys(obj).sort();
        if (!keys.length) {
            const p = document.createElement("p");
            p.className = "admin-muted";
            p.textContent = "(Empty object)";
            container.appendChild(p);
            return;
        }
        const table = document.createElement("table");
        table.className = "admin-table";
        table.innerHTML = "<thead><tr><th>Key</th><th>Type</th><th>Preview</th><th>Actions</th></tr></thead>";
        const tbody = document.createElement("tbody");
        keys.forEach((key) => {
            const val = obj[key];
            const type = Array.isArray(val) ? "array" : val === null ? "null" : typeof val;
            const preview = describeValue(val);
            const tr = document.createElement("tr");

            const keyTd = document.createElement("td");
            const keyBtn = document.createElement("button");
            keyBtn.type = "button";
            keyBtn.className = "admin-row-btn";
            keyBtn.textContent = key;
            keyBtn.addEventListener("click", () => loadDbPath(`${path}/${key}`));
            keyTd.appendChild(keyBtn);

            const typeTd = document.createElement("td");
            typeTd.textContent = type;

            const previewTd = document.createElement("td");
            previewTd.textContent = preview;
            previewTd.style.maxWidth = "300px";
            previewTd.style.overflow = "hidden";
            previewTd.style.textOverflow = "ellipsis";
            previewTd.style.whiteSpace = "nowrap";

            const actionsTd = document.createElement("td");
            actionsTd.className = "admin-row-actions";

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "admin-row-btn";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => openDbEdit(`${path}/${key}`, val));

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "admin-row-btn admin-row-btn-danger";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", () => deleteDbNode(`${path}/${key}`));

            actionsTd.append(editBtn, delBtn);
            tr.append(keyTd, typeTd, previewTd, actionsTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    function renderDbScalar(container, path, value) {
        const wrap = document.createElement("div");
        wrap.style.padding = "14px";
        wrap.style.background = "var(--bg-soft)";
        wrap.style.borderRadius = "6px";

        const typeP = document.createElement("p");
        typeP.className = "admin-muted";
        typeP.style.margin = "0 0 8px";
        typeP.textContent = `Type: ${value === null ? "null" : typeof value}`;

        const valP = document.createElement("p");
        valP.style.fontFamily = "monospace";
        valP.style.fontSize = "13px";
        valP.style.whiteSpace = "pre-wrap";
        valP.style.margin = "0 0 10px";
        valP.textContent = String(value);

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "admin-row-btn";
        editBtn.textContent = "Edit value";
        editBtn.addEventListener("click", () => openDbEdit(path, value));

        wrap.append(typeP, valP, editBtn);
        container.appendChild(wrap);
    }

    function renderDbNode(path, response) {
        const result = $("#db-result");
        result.replaceChildren();

        if (!response.exists || response.data === null) {
            const empty = document.createElement("p");
            empty.className = "admin-muted";
            empty.textContent = "(Node does not exist — you can write a value by clicking 'Edit this node')";
            result.appendChild(empty);
            updateDbBreadcrumb(path);
            return;
        }

        const data = response.data;
        if (Array.isArray(data)) {
            const obj = {};
            data.forEach((v, i) => { obj[i] = v; });
            renderDbObject(result, path, obj);
        } else if (data && typeof data === "object") {
            renderDbObject(result, path, data);
        } else {
            renderDbScalar(result, path, data);
        }
        updateDbBreadcrumb(path);
    }

    async function loadDbPath(path) {
        const result = $("#db-result");
        if (!result) return;
        state.dbPath = path;
        $("#db-path").value = path;
        result.innerHTML = '<p class="admin-muted">Loading…</p>';
        try {
            const data = await api(`/admin/db?path=${encodeURIComponent(path)}`);
            renderDbNode(path, data);
        } catch (error) {
            result.innerHTML = `<p style="color:#b42318">${error.message}</p>`;
        }
    }

    function openDbEdit(path, currentValue) {
        const card = $("#db-edit-card");
        if (!card) return;
        $("#db-edit-title").textContent = "Edit Node";
        $("#db-edit-path").textContent = `Path: /${path}`;
        $("#db-edit-value").value = JSON.stringify(currentValue, null, 2);
        $("#db-edit-message").textContent = "";
        $("#db-edit-message").style.color = "";
        state.dbEditingPath = path;
        card.hidden = false;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveDbEdit() {
        const valueEl = $("#db-edit-value");
        const msgEl = $("#db-edit-message");
        if (!state.dbEditingPath || !valueEl || !msgEl) return;

        let parsed;
        try {
            parsed = JSON.parse(valueEl.value);
        } catch (e) {
            msgEl.textContent = `Invalid JSON: ${e.message}`;
            msgEl.style.color = "#b42318";
            return;
        }

        if (!confirm(`Overwrite node "/${state.dbEditingPath}"? This replaces the current value completely.`)) return;

        msgEl.textContent = "Saving…";
        msgEl.style.color = "";
        try {
            await api("/admin/db", {
                method: "PUT",
                body: { path: state.dbEditingPath, value: parsed }
            });
            msgEl.textContent = "Saved.";
            msgEl.style.color = "#067647";
            $("#db-edit-card").hidden = true;
            await loadDbPath(state.dbPath);
        } catch (error) {
            msgEl.textContent = error.message;
            msgEl.style.color = "#b42318";
        }
    }

    async function deleteDbNode(path) {
        if (!confirm(`Delete node "/${path}"? This cannot be undone.`)) return;
        try {
            await api(`/admin/db?path=${encodeURIComponent(path)}`, { method: "DELETE" });
            const segments = path.split("/");
            if (state.dbPath && (state.dbPath === path || state.dbPath.startsWith(path + "/"))) {
                const parent = segments.length > 1 ? segments.slice(0, -1).join("/") : segments[0];
                await loadDbPath(parent);
            } else {
                await loadDbPath(state.dbPath);
            }
        } catch (error) {
            alert(error.message);
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
                if (v === "tests") await loadTests();
                if (v === "subjects") await loadSubjects();
                if (v === "organizations") await loadOrganizations();
                if (v === "import") await populateImportTestDropdown();
                if (v === "db") await loadDbPath(state.dbPath || "users");
                document.body.classList.remove("sidebar-open");
            });
        });

        $("#admin-logout").addEventListener("click", () => {
            clearSession(); window.location.assign("login.html");
        });
        $("#unauth-logout").addEventListener("click", () => {
            clearSession(); window.location.assign("login.html");
        });

        const backfillBtn = $("#admin-backfill");
        if (backfillBtn) backfillBtn.addEventListener("click", handleBackfill);

        $("#users-search").addEventListener("input", (e) => { state.users.search = e.target.value.trim(); });
        $("#users-refresh").addEventListener("click", () => loadUsers(true));
        $("#users-prev").addEventListener("click", () => { state.users.offset = Math.max(0, state.users.offset - state.users.limit); loadUsers(); });
        $("#users-next").addEventListener("click", () => { state.users.offset += state.users.limit; loadUsers(); });
        $("#user-detail-back").addEventListener("click", () => { setView("users"); loadUsers(); });

        $("#tests-new").addEventListener("click", () => openTestForm(null));
        $("#tests-refresh").addEventListener("click", () => loadTests());
        $("#test-add-question").addEventListener("click", () => addQuestionBlock());
        $("#test-cancel").addEventListener("click", () => { $("#tests-form-card").hidden = true; });
        $("#tests-form").addEventListener("submit", saveTest);

        $("#subjects-new").addEventListener("click", () => openSubjectForm(null));
        $("#subject-cancel").addEventListener("click", () => { $("#subjects-form-card").hidden = true; });
        $("#subjects-form").addEventListener("submit", saveSubject);

        $("#orgs-new").addEventListener("click", () => openOrgForm(null));
        $("#org-cancel").addEventListener("click", () => { $("#orgs-form-card").hidden = true; });
        $("#orgs-form").addEventListener("submit", saveOrg);

        $("#notif-form").addEventListener("submit", sendNotification);

        const cancelBtn = $("#request-cancel");
        if (cancelBtn) cancelBtn.addEventListener("click", () => {
            $("#request-review-card").hidden = true;
            state.activeRequest = null;
        });
        const reviewForm = $("#request-review-form");
        if (reviewForm) reviewForm.addEventListener("submit", saveRequestReview);

        const impSub = $("#import-subjects-submit");
        if (impSub) impSub.addEventListener("click", importSubjects);
        const impTest = $("#import-tests-submit");
        if (impTest) impTest.addEventListener("click", importTests);
        const impMcq = $("#import-mcqs-submit");
        if (impMcq) impMcq.addEventListener("click", importMcqs);

        const dbLoad = $("#db-load");
        if (dbLoad) dbLoad.addEventListener("click", () => {
            const path = $("#db-path").value.trim();
            if (path) loadDbPath(path.replace(/^\/+|\/+$/g, ""));
        });
        const dbPathInput = $("#db-path");
        if (dbPathInput) dbPathInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const path = $("#db-path").value.trim();
                if (path) loadDbPath(path.replace(/^\/+|\/+$/g, ""));
            }
        });

        const dbUp = $("#db-up");
        if (dbUp) dbUp.addEventListener("click", () => {
            const segments = state.dbPath.split("/");
            if (segments.length > 1) {
                loadDbPath(segments.slice(0, -1).join("/"));
            }
        });
        const dbRefresh = $("#db-refresh");
        if (dbRefresh) dbRefresh.addEventListener("click", () => loadDbPath(state.dbPath));
        const dbEditRoot = $("#db-edit-root");
        if (dbEditRoot) dbEditRoot.addEventListener("click", async () => {
            try {
                const data = await api(`/admin/db?path=${encodeURIComponent(state.dbPath)}`);
                openDbEdit(state.dbPath, data.data);
            } catch (error) { alert(error.message); }
        });
        const dbDeleteRoot = $("#db-delete-root");
        if (dbDeleteRoot) dbDeleteRoot.addEventListener("click", () => deleteDbNode(state.dbPath));

        const dbEditCancel = $("#db-edit-cancel");
        if (dbEditCancel) dbEditCancel.addEventListener("click", () => {
            $("#db-edit-card").hidden = true;
        });
        const dbEditSave = $("#db-edit-save");
        if (dbEditSave) dbEditSave.addEventListener("click", saveDbEdit);

        $("#admin-menu-btn").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { wire(); gate(); }, { once: true });
    } else { wire(); gate(); }
})();
