// ============================================================
// PrepareKora Worker — Test CRUD + publish + submit
// Backend storage: Firebase Realtime Database
// Ownership enforced server-side.
// Correct answers never leave the server until submit.
// ============================================================

import { json, error, uid, now, readJSON } from "./utils.js";
import { verifyFirebaseIdToken, dbGet, dbPut, dbPatch, dbDelete } from "./firebase.js";
import { getPublisherName } from "./auth.js";

/* ---------- Local auth guard (Firebase ID token) ---------- */

async function requireAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const payload = await verifyFirebaseIdToken(token, projectId);
  if (!payload || !payload.uid) return null;

  return { sub: payload.uid, email: payload.email };
}

/* ---------- Constants ---------- */

const MAX_TITLE_LENGTH = 200;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MAX_QUESTIONS = 200;
const OPTIONS_PER_QUESTION = 4;
const MAX_SUBMISSIONS_PER_TEST = 500;

/* ---------- Validation ---------- */

function validateQuestion(q, index) {
  const n = index + 1;

  if (!q || typeof q !== "object") return `Question ${n}: invalid entry`;
  if (typeof q.q !== "string" || !q.q.trim()) return `Question ${n}: text required`;

  if (!Array.isArray(q.options) || q.options.length !== OPTIONS_PER_QUESTION) {
    return `Question ${n}: exactly ${OPTIONS_PER_QUESTION} options required`;
  }
  for (let i = 0; i < q.options.length; i++) {
    const opt = q.options[i];
    if (typeof opt !== "string" || !opt.trim()) return `Question ${n}: option ${i + 1} empty`;
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
  if (!body || typeof body !== "object") return "Invalid request body";

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
    questionCount: Array.isArray(test.questions) ? test.questions.length : 0,
    status: test.status,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt
  };
}

function normalizeQuestions(rawList) {
  return rawList.map(function (q) {
    return {
      q: q.q.trim(),
      options: q.options.map(function (o) { return o.trim(); }),
      answer: q.answer
    };
  });
}

/* ============================================================
   PUBLIC
   ============================================================ */

/* GET /api/tests — list all published tests */

export async function handleListPublic(env) {
  const all = await dbGet(env, "tests");
  if (!all || typeof all !== "object") return json({ tests: [] });

  const published = [];

  Object.keys(all).forEach(function (key) {
    const test = all[key];
    if (!test || typeof test !== "object") return;
    if (test.status !== "published") return;

    published.push(buildTestMeta(test));
  });

  published.sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return json({ tests: published });
}

/* GET /api/tests/:id — single published test (no answers) */

export async function handleGetPublic(env, id) {
  const test = await dbGet(env, "tests/" + id);

  if (!test || typeof test !== "object" || test.status !== "published") {
    return error("Test not found", 404);
  }

  const safeQuestions = (test.questions || []).map(function (q) {
    return {
      q: q.q,
      options: Array.isArray(q.options) ? q.options.slice() : []
    };
  });

  return json({
    id: test.id,
    title: test.title,
    publisherName: test.publisherName,
    minutes: test.minutes,
    questions: safeQuestions
  });
}

/* ============================================================
   PUBLIC — SUBMIT (server-side scoring)
   ============================================================ */

export async function handleSubmit(request, env, id) {
  const test = await dbGet(env, "tests/" + id);

  if (!test || typeof test !== "object" || test.status !== "published") {
    return error("Test not found", 404);
  }

  const body = await readJSON(request);
  if (!body || typeof body !== "object") return error("Invalid request body", 400);

  const answers = body.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return error("answers object is required", 400);
  }

  const userName = typeof body.userName === "string"
    ? body.userName.trim().slice(0, 60)
    : "";

  const total = Array.isArray(test.questions) ? test.questions.length : 0;
  let correct = 0, wrong = 0, unattempted = 0;
  const correctAnswers = {};

  for (let i = 0; i < total; i++) {
    const question = test.questions[i];
    correctAnswers[String(i)] = question.answer;

    const raw = answers[String(i)];

    if (raw === undefined || raw === null) {
      unattempted += 1;
      continue;
    }
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw >= OPTIONS_PER_QUESTION) {
      unattempted += 1;
      continue;
    }

    if (raw === question.answer) correct += 1;
    else wrong += 1;
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  /* Log submission (best-effort, capped) */
  try {
    const subId = now() + "-" + uid(4);
    const submission = {
      id: subId,
      testId: test.id,
      testTitle: test.title,
      userName: userName,
      correct: correct,
      wrong: wrong,
      unattempted: unattempted,
      total: total,
      percent: percent,
      submittedAt: now()
    };

    await dbPut(env, "submissions/" + test.id + "/" + subId, submission);

    /* Trim old submissions if above cap */
    const existing = await dbGet(env, "submissions/" + test.id);
    if (existing && typeof existing === "object") {
      const keys = Object.keys(existing).sort();
      if (keys.length > MAX_SUBMISSIONS_PER_TEST) {
        const toRemove = keys.slice(0, keys.length - MAX_SUBMISSIONS_PER_TEST);
        const patch = {};
        toRemove.forEach(function (k) { patch[k] = null; });
        await dbPatch(env, "submissions/" + test.id, patch);
      }
    }
  } catch (err) {
    /* Non-fatal */
  }

  return json({
    correct: correct,
    wrong: wrong,
    unattempted: unattempted,
    total: total,
    percent: percent,
    correctAnswers: correctAnswers
  });
}

/* ============================================================
   ADMIN — own tests only
   ============================================================ */

export async function handleListOwn(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const all = await dbGet(env, "tests");
  if (!all || typeof all !== "object") return json({ tests: [] });

  const own = [];

  Object.keys(all).forEach(function (key) {
    const test = all[key];
    if (!test || typeof test !== "object") return;
    if (test.publisherId !== session.sub) return;
    own.push(buildTestMeta(test));
  });

  own.sort(function (a, b) {
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return json({ tests: own });
}

export async function handleGetOwn(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const test = await dbGet(env, "tests/" + id);
  if (!test || typeof test !== "object") return error("Test not found", 404);
  if (test.publisherId !== session.sub) return error("Forbidden", 403);

  return json({ test: test });
}

export async function handleCreate(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const validationError = validateTestPayload(body);
  if (validationError) return error(validationError, 400);

  const id = session.sub.slice(0, 4) + "-" + uid(8);
  const publisherName = await getPublisherName(env, session.sub);
  const ts = now();

  const test = {
    id: id,
    title: body.title.trim(),
    publisherId: session.sub,
    publisherName: publisherName,
    minutes: Number(body.minutes),
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
    questions: normalizeQuestions(body.questions)
  };

  await dbPut(env, "tests/" + id, test);

  return json({ test: test });
}

export async function handleUpdate(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await dbGet(env, "tests/" + id);
  if (!existing || typeof existing !== "object") return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  const body = await readJSON(request);
  if (!body) return error("Invalid request body", 400);

  const validationError = validateTestPayload(body);
  if (validationError) return error(validationError, 400);

  const publisherName = await getPublisherName(env, existing.publisherId);

  const updated = Object.assign({}, existing, {
    title: body.title.trim(),
    minutes: Number(body.minutes),
    questions: normalizeQuestions(body.questions),
    publisherName: publisherName,
    updatedAt: now()
  });

  await dbPut(env, "tests/" + id, updated);

  return json({ test: updated });
}

export async function handleDelete(request, env, id) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await dbGet(env, "tests/" + id);
  if (!existing || typeof existing !== "object") return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  await dbDelete(env, "tests/" + id);

  return json({ ok: true });
}

export async function handlePublish(request, env, id) {
  return setPublishStatus(request, env, id, "published");
}

export async function handleUnpublish(request, env, id) {
  return setPublishStatus(request, env, id, "draft");
}

async function setPublishStatus(request, env, id, targetStatus) {
  const session = await requireAuth(request, env);
  if (!session) return error("Unauthorized", 401);

  const existing = await dbGet(env, "tests/" + id);
  if (!existing || typeof existing !== "object") return error("Test not found", 404);
  if (existing.publisherId !== session.sub) return error("Forbidden", 403);

  const publisherName = await getPublisherName(env, existing.publisherId);

  const updated = Object.assign({}, existing, {
    status: targetStatus,
    publisherName: publisherName,
    updatedAt: now()
  });

  await dbPut(env, "tests/" + id, updated);

  return json({ test: buildTestMeta(updated) });
}
