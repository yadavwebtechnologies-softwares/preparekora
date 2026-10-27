// ============================================================
// PrepareKora Worker — Test CRUD + publish
// Ownership enforced server-side.
// Correct answers never leave the server on public endpoints.
// ============================================================

import { json, error, requireAuth, uid, now, readJSON } from "./utils.js";
import { getPublisherName } from "./auth.js";

/* ---------- Validation ---------- */

const MAX_TITLE_LENGTH = 200;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MAX_QUESTIONS = 200;
const OPTIONS_PER_QUESTION = 4;

function validateQuestion(q, index) {
  const n = index + 1;

  if (!q || typeof q !== "object") {
    return `Question ${n}: invalid entry`;
  }

  if (typeof q.q !== "string" || !q.q.trim()) {
    return `Question ${n}: text is required`;
  }

  if (!Array.isArray(q.options) || q.options.length !== OPTIONS_PER_QUESTION) {
    return `Question ${n}: exactly ${OPTIONS_PER_QUESTION} options required`;
  }

  for (let i = 0; i < q.options.length; i++) {
    const opt = q.options[i];
    if (typeof opt !== "string" || !opt.trim()) {
      return `Question ${n}: option ${i + 1} is empty`;
    }
  }

  if (typeof q.answer !== "number" || !Number.isInteger(q.answer)) {
    return `Question ${n}: answer index must be a number`;
  }

  if (q.answer < 0 || q.answer >= OPTIONS_PER_QUESTION) {
    return `Question ${n}: answer index must be 0-${OPTIONS_PER_QUESTION - 1}`;
  }

  return null;
}

function validateTestPayload(body) {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const title = String(body.title || "").trim();
  if (!title) return "Test title is required";
  if (title.length > MAX_TITLE_LENGTH) return "Test title is too long";

  const minutes = Number(body.minutes);
  if (!Number.isInteger(minutes)) return "Duration must be a whole number";
  if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
    return `Duration must be between ${MIN_MINUTES} and ${MAX_MINUTES} minutes`;
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return "At least one question is required";
  }
  if (body.questions.length > MAX_QUESTIONS) {
    return `Too many questions (maximum ${MAX_QUESTIONS})`;
  }

  for (let i = 0; i < body.questions.length; i++) {
    const qErr = validateQuestion(body.questions[i], i);
    if (qErr) return qErr;
  }

  return null;
}

/* ---------- Shape helpers ---------- */

function buildTestMeta(test) {
  return {
    id: test.id,
    title: test.title,
    publisherId: test.publisherId,
    publisherName: test.publisherName,
    minutes: test.minutes,
    questionCount: test.questions.length,
    status: test.status,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt
  };
}

function normalizeQuestions(rawList) {
  return rawList.map((q) => ({
    q: q.q.trim(),
    options: q.options.map((o) => o.trim()),
    answer: q.answer
  }));
}

/* ============================================================
   PUBLIC
   ============================================================ */

/* GET /api/tests — list all published tests */

export async function handleListPublic(env) {
  const list = await env.KV.list({ prefix: "test:" });
  const published = [];

  for (const key of list.keys) {
    const meta = key.metadata;
    if (meta && meta.status === "published") {
      published.push({
        id: meta.id,
        title: meta.title,
        publisherName: meta.publisherName,
        minutes: meta.minutes,
        questionCount: meta.questionCount,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      });
    }
  }

  published.sort((a, b) => b.createdAt - a.createdAt);

  return json({ tests: published });
}

/* GET /api/tests/:id — single published test (no answers) */

export async function handleGetPublic(env, id) {
  const test = await env.KV.get(`test:${id}`, { type: "json" });

  if (!test || test.status !== "published") {
    return error("Test not found", 404);
  }

  const safeQuestions = test.questions.map((q) => ({
    q: q.q,
    options: q.options.slice()
  }));

  return json({
    id: test.id,
    title: test.title,
    publisherName: test.publisherName,
    minutes: test.minutes,
    questions: safeQuestions
  });
}

/* ============================================================
   ADMIN — own tests only
   ============================================================ */

/* GET /api/admin/tests — list own tests */

export async function handleListOwn(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const list = await env.KV.list({ prefix: "test:" });
  const own = [];

  for (const key of list.keys) {
    const meta = key.metadata;
    if (meta && meta.publisherId === session.sub) {
      own.push(meta);
    }
  }

  own.sort((a, b) => b.updatedAt - a.updatedAt);

  return json({ tests: own });
}

/* GET /api/admin/tests/:id — own test (with answers) */

export async function handleGetOwn(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const test = await env.KV.get(`test:${id}`, { type: "json" });
  if (!test) return error("Test not found", 404);
  if (test.publisherId !== session.sub) return error("Forbidden", 403);

  return json({ test });
}

/* POST /api/admin/tests — create draft */

export async function handleCreate(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const validationError = validateTestPayload(body);
  if (validationError) return error(validationError, 400);

  const id = `${session.sub}-${uid(8)}`;
  const publisherName = await getPublisherName(env, session.sub);
  const ts = now();

  const test = {
    id,
    title: body.title.trim(),
    publisherId: session.sub,
    publisherName,
    minutes: Number(body.minutes),
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
    questions: normalizeQuestions(body.questions)
  };

  await env.KV.put(`test:${id}`, JSON.stringify(test), {
    metadata: buildTestMeta(test)
  });

  return json({ test });
}

/* PUT /api/admin/tests/:id — update own test */

export async function handleUpdate(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await env.KV.get(`test:${id}`, { type: "json" });
  if (!existing) return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const validationError = validateTestPayload(body);
  if (validationError) return error(validationError, 400);

  // Publisher name is re-resolved at edit time but publisherId stays immutable.
  const publisherName = await getPublisherName(env, existing.publisherId);

  const updated = {
    ...existing,
    title: body.title.trim(),
    minutes: Number(body.minutes),
    questions: normalizeQuestions(body.questions),
    publisherName,
    updatedAt: now()
  };

  await env.KV.put(`test:${id}`, JSON.stringify(updated), {
    metadata: buildTestMeta(updated)
  });

  return json({ test: updated });
}

/* DELETE /api/admin/tests/:id — delete own test */

export async function handleDelete(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await env.KV.get(`test:${id}`, { type: "json" });
  if (!existing) return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  await env.KV.delete(`test:${id}`);

  return json({ ok: true });
}

/* POST /api/admin/tests/:id/publish — publish own test */

export async function handlePublish(request, env, id) {
  return setPublishStatus(request, env, id, "published");
}

/* POST /api/admin/tests/:id/unpublish — revert to draft */

export async function handleUnpublish(request, env, id) {
  return setPublishStatus(request, env, id, "draft");
}

async function setPublishStatus(request, env, id, targetStatus) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await env.KV.get(`test:${id}`, { type: "json" });
  if (!existing) return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  // Snapshot publisher name at publish time. Immutable afterward.
  const publisherName = await getPublisherName(env, existing.publisherId);

  const updated = {
    ...existing,
    status: targetStatus,
    publisherName,
    updatedAt: now()
  };

  await env.KV.put(`test:${id}`, JSON.stringify(updated), {
    metadata: buildTestMeta(updated)
  });

  return json({ test: buildTestMeta(updated) });
}
