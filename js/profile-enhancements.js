/* StudyKora profile enhancement layer. No photo-upload UI is added. */
(() => {
  'use strict';

  const API_BASE = 'https://studykora-api.yadavsubba2003.workers.dev';
  const DB_BASE = 'https://studykora-fc91d-default-rtdb.firebaseio.com';
  const CACHE_PREFIX = 'studyKoraProfileCache:';

  const $ = (selector, root = document) => root.querySelector(selector);

  function readObject(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;

      const value = JSON.parse(raw);
      return value && typeof value === 'object' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function locateSession() {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;

        const value = readObject(storage, key);
        if (!value) continue;

        const user =
          value.user && typeof value.user === 'object'
            ? value.user
            : value;

        const uid =
          user.uid ||
          user.localId ||
          value.uid ||
          value.localId;

        const idToken =
          value.idToken ||
          value.accessToken ||
          value.token;

        const refreshToken = value.refreshToken;

        if (uid && (idToken || refreshToken)) {
          return { storage, key, data: value, user, uid };
        }
      }
    }

    return null;
  }

  function storeSession(session) {
    try {
      session.storage.setItem(
        session.key,
        JSON.stringify(session.data)
      );
    } catch (_) {
      // Storage might be unavailable.
    }
  }

  async function usableSession(session) {
    if (!session) return null;

    let token =
      session.data.idToken ||
      session.data.accessToken ||
      session.data.token;

    const expiresAt = Number(session.data.expiresAt || 0);
    const savedAt = Number(session.data.savedAt || 0);
    const expiresIn = Number(session.data.expiresIn || 0);

    const derivedExpiry =
      expiresAt ||
      (savedAt && expiresIn
        ? savedAt + expiresIn * 1000
        : 0);

    const needsRefresh =
      !token ||
      (derivedExpiry && derivedExpiry < Date.now() + 60000);

    if (needsRefresh && session.data.refreshToken) {
      try {
        const response = await fetch(
          `${API_BASE}/auth/refresh`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              refreshToken: session.data.refreshToken
            })
          }
        );

        const payload = await response.json();

        if (!response.ok || !payload.idToken) {
          throw new Error(
            payload.error || 'Token refresh failed'
          );
        }

        session.data = {
          ...session.data,
          ...payload,
          idToken: payload.idToken,
          refreshToken:
            payload.refreshToken ||
            session.data.refreshToken,
          savedAt: Date.now(),
          expiresAt:
            Date.now() +
            Number(payload.expiresIn || 3600) * 1000,
          user: {
            ...(session.data.user || {}),
            ...(payload.user || {})
          }
        };

        session.user = session.data.user;
        session.uid =
          session.user.uid ||
          session.user.localId ||
          session.uid;

        storeSession(session);
        token = session.data.idToken;
      } catch (error) {
        console.warn(
          '[StudyKora] Session refresh failed:',
          error.message
        );
      }
    }

    if (!token) return null;

    session.idToken = token;
    return session;
  }

  // Example: "ritika kumari" becomes "Ritika Kumari".
  function cleanName(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase()
      .replace(
        /(^|[\s'-])([a-z\u00c0-\u024f])/g,
        (_, separator, letter) =>
          separator + letter.toLocaleUpperCase()
      );
  }

  function displayNameFor(user, profile) {
    const profileName =
      profile.displayName ||
      profile.name ||
      profile.fullName ||
      '';

    const authName =
      user.displayName ||
      user.name ||
      '';

    let name = String(profileName || authName).trim();

    // If no saved name exists, derive a readable name from email.
    if (!name) {
      const emailName = String(
        profile.email || user.email || ''
      ).split('@')[0];

      name = emailName
        .replace(/[._-]+/g, ' ')
        .replace(/\d+/g, ' ')
        .trim();
    }

    return cleanName(name) || 'Student';
  }

  // "Yadav Subba" => YS, "Ritika Kumari" => RK.
  function initialsFor(name) {
    const words = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return 'S';

    if (words.length === 1) {
      return words[0].slice(0, 2).toLocaleUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toLocaleUpperCase();
  }

  function profileRoot() {
    return (
      $('#profile-content') ||
      $('[data-profile-content]') ||
      $('.profile-content') ||
      $('.profile-container') ||
      $('main') ||
      document.body
    );
  }

  function ensureIdentityBlock(root) {
    let block =
      $('[data-study-kora-identity]', root) ||
      $('#studyKoraIdentity');

    if (block) return block;

    block = document.createElement('section');
    block.id = 'studyKoraIdentity';
    block.dataset.studyKoraIdentity = 'true';
    block.className = 'sk-profile-identity';

    block.innerHTML = `
      <div
        class="sk-profile-avatar"
        data-sk-avatar
        aria-label="Profile initials"
      ></div>

      <div class="sk-profile-identity-copy">
        <h1 class="sk-profile-name" data-sk-name>
          Student
        </h1>

        <p class="sk-profile-email" data-sk-email></p>
      </div>
    `;

    root.prepend(block);
    return block;
  }

  function setAvatar(target, name, photoURL) {
    if (!target) return;

    const initials = initialsFor(name);

    target.classList.add('sk-profile-avatar');
    target.setAttribute(
      'aria-label',
      `${name} profile`
    );

    target.replaceChildren();

    // Show a saved profile image only when its URL is available.
    // No image-upload option is added.
    if (photoURL && /^https:\/\//i.test(photoURL)) {
      const image = document.createElement('img');

      image.src = photoURL;
      image.alt = `${name} profile photo`;
      image.loading = 'eager';
      image.referrerPolicy = 'no-referrer';

      image.addEventListener(
        'error',
        () => {
          target.replaceChildren(
            document.createTextNode(initials)
          );
          target.classList.add('sk-avatar-initials');
        },
        { once: true }
      );

      target.append(image);
      target.classList.remove('sk-avatar-initials');
    } else {
      target.textContent = initials;
      target.classList.add('sk-avatar-initials');
    }
  }

  function renderIdentity(user, profile) {
    const root = profileRoot();

    const name = displayNameFor(user, profile);
    const email = String(
      profile.email || user.email || ''
    ).trim();

    const photoURL =
      profile.photoURL ||
      profile.photoUrl ||
      user.photoURL ||
      user.photoUrl ||
      '';

    let nameTarget =
      $('[data-sk-name]', root) ||
      $('#profileName') ||
      $('#profile-name') ||
      $('[data-profile-name]') ||
      $('.profile-name');

    let emailTarget =
      $('[data-sk-email]', root) ||
      $('#profileEmail') ||
      $('#profile-email') ||
      $('[data-profile-email]') ||
      $('.profile-email');

    let avatarTarget =
      $('[data-sk-avatar]', root) ||
      $('#profileAvatar') ||
      $('#profile-avatar') ||
      $('[data-profile-avatar]') ||
      $('.profile-avatar') ||
      $('.user-avatar');

    if (!nameTarget || !avatarTarget) {
      ensureIdentityBlock(root);

      nameTarget =
        nameTarget || $('[data-sk-name]', root);

      emailTarget =
        emailTarget || $('[data-sk-email]', root);

      avatarTarget =
        avatarTarget || $('[data-sk-avatar]', root);
    }

    if (nameTarget) nameTarget.textContent = name;
    if (emailTarget) emailTarget.textContent = email;

    setAvatar(avatarTarget, name, photoURL);
  }

  function showLoading(root) {
    root.classList.add('sk-profile-loading');

    let layer = $('.sk-profile-loader', root);

    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'sk-profile-loader';
      layer.setAttribute('role', 'status');
      layer.setAttribute('aria-live', 'polite');

      layer.innerHTML = `
        <span
          class="sk-profile-spinner"
          aria-hidden="true"
        ></span>
        <span>Loading profile…</span>
      `;

      root.append(layer);
    }

    return () => {
      root.classList.remove('sk-profile-loading');
      layer.remove();
    };
  }

  function normaliseRecords(value) {
    if (!value || typeof value !== 'object') {
      return [];
    }

    return Object.entries(value)
      .map(([id, record]) => ({
        id,
        ...(record || {})
      }))
      .filter(record => record && typeof record === 'object')
      .sort((a, b) => {
        const dateA = new Date(
          a.completedAt ||
          a.attemptedAt ||
          a.createdAt ||
          0
        ).getTime();

        const dateB = new Date(
          b.completedAt ||
          b.attemptedAt ||
          b.createdAt ||
          0
        ).getTime();

        return dateB - dateA;
      });
  }

  function formatDuration(seconds) {
    const total = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    const minutes = Math.floor(total / 60);
    const remaining = total % 60;

    return minutes
      ? `${minutes}m ${remaining}s`
      : `${remaining}s`;
  }

  function ensureHistorySection(root) {
    let section =
      $('#studyKoraTestHistory', root) ||
      $('#studyKoraTestHistory');

    if (section) return section;

    section = document.createElement('section');
    section.id = 'studyKoraTestHistory';
    section.className = 'sk-test-history';

    section.innerHTML = `
      <div class="sk-history-heading">
        <div>
          <h2>Test History</h2>
          <p>Your completed tests and results</p>
        </div>
      </div>

      <div
        class="sk-history-body"
        data-sk-history-body
      >
        <div class="sk-history-loading">
          <span
            class="sk-profile-spinner"
            aria-hidden="true"
          ></span>
          <span>Loading test records…</span>
        </div>
      </div>
    `;

    root.append(section);
    return section;
  }

  function renderHistory(root, records) {
    const section = ensureHistorySection(root);
    const body = $('[data-sk-history-body]', section);

    if (!body) return;

    if (!records.length) {
      body.innerHTML = `
        <div class="sk-history-empty">
          <strong>No test records yet</strong>
          <p>
            Completed mock tests will appear here automatically.
          </p>
        </div>
      `;
      return;
    }

    body.replaceChildren();

    const tableWrap = document.createElement('div');
    tableWrap.className = 'sk-history-table-wrap';

    const table = document.createElement('table');
    table.className = 'sk-history-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th>Test</th>
          <th>Date</th>
          <th>Score</th>
          <th>Accuracy</th>
          <th>Time</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');

    records.slice(0, 30).forEach(record => {
      const total = Number(
        record.totalQuestions ||
        record.total ||
        record.questionCount ||
        0
      );

      const correct = Number(
        record.correctAnswers ??
        record.correct ??
        0
      );

      const score =
        record.score !== undefined
          ? record.score
          : `${correct}/${total}`;

      const percentage = Number(
        record.accuracy ??
        record.percentage ??
        (total ? (correct / total) * 100 : 0)
      );

      const dateValue =
        record.completedAt ||
        record.attemptedAt ||
        record.createdAt;

      const date = dateValue
        ? new Date(dateValue)
        : null;

      const values = [
        String(
          record.testTitle ||
          record.title ||
          record.testName ||
          'Mock Test'
        ),

        date && !Number.isNaN(date.getTime())
          ? date.toLocaleDateString()
          : '—',

        typeof score === 'number'
          ? `${score}${total ? ` / ${total}` : ''}`
          : String(score),

        Number.isFinite(percentage)
          ? `${Math.round(percentage)}%`
          : '—',

        formatDuration(
          record.timeTakenSeconds ||
          record.durationSeconds ||
          0
        )
      ];

      const tr = document.createElement('tr');

      values.forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      });

      tbody.append(tr);
    });

    table.append(tbody);
    tableWrap.append(table);
    body.append(tableWrap);
  }

  async function loadHistory(session) {
    const root = profileRoot();
    const section = ensureHistorySection(root);

    if (!session || !session.idToken || !session.uid) {
      renderHistory(root, []);
      return;
    }

    const body = $('[data-sk-history-body]', section);

    if (body) {
      body.innerHTML = `
        <div class="sk-history-loading">
          <span
            class="sk-profile-spinner"
            aria-hidden="true"
          ></span>
          <span>Loading test records…</span>
        </div>
      `;
    }

    try {
      const base =
        `${DB_BASE}/users/${encodeURIComponent(session.uid)}`;

      // Read existing supported record locations.
      const paths = [
        `${base}/testAttempts.json`,
        `${base}/attempts.json`
      ];

      const results = await Promise.all(
        paths.map(async path => {
          try {
            const response = await fetch(
              `${path}?auth=${encodeURIComponent(session.idToken)}`,
              { cache: 'no-store' }
            );

            if (!response.ok) {
              throw new Error(
                `Test history request failed (${response.status})`
              );
            }

            return {
              ok: true,
              value: await response.json()
            };
          } catch (error) {
            return { ok: false, error };
          }
        })
      );

      if (results.every(result => !result.ok)) {
        throw (
          results[0].error ||
          new Error('Test history unavailable')
        );
      }

      const map = new Map();

      results
        .filter(result => result.ok)
        .forEach(result => {
          normaliseRecords(result.value).forEach(record => {
            const id = String(
              record.id ||
              record.attemptId ||
              `${record.testTitle || record.title || ''}-${record.completedAt || record.attemptedAt || ''}`
            );

            if (!map.has(id)) {
              map.set(id, record);
            }
          });
        });

      const records = [...map.values()].sort((a, b) => {
        const dateA = new Date(
          a.completedAt ||
          a.attemptedAt ||
          a.createdAt ||
          0
        ).getTime();

        const dateB = new Date(
          b.completedAt ||
          b.attemptedAt ||
          b.createdAt ||
          0
        ).getTime();

        return dateB - dateA;
      });

      renderHistory(root, records);
    } catch (error) {
      console.error(
        '[StudyKora] Could not load test history:',
        error
      );

      if (body) {
        body.innerHTML = `
          <div class="sk-history-empty">
            <strong>Test history could not load</strong>
            <p>
              Check your connection and try refreshing this page.
            </p>
          </div>
        `;
      }
    }
  }

  async function start() {
    const root = profileRoot();
    const session = await usableSession(locateSession());

    if (!session) {
      const removeLoader = showLoading(root);
      const heading = ensureIdentityBlock(root);

      const nameTarget = $('[data-sk-name]', heading);
      if (nameTarget) {
        nameTarget.textContent = 'Sign in required';
      }

      const emailTarget = $('[data-sk-email]', heading);
      if (emailTarget) {
        emailTarget.textContent =
          'Please sign in to view your profile.';
      }

      renderHistory(root, []);
      removeLoader();
      return;
    }

    const cacheKey = `${CACHE_PREFIX}${session.uid}`;

    const cached =
      readObject(window.sessionStorage, cacheKey) ||
      readObject(window.localStorage, cacheKey);

    const initialUser = {
      ...(session.user || {}),
      uid: session.uid
    };

    // Cached or session details render immediately to reduce flashing.
    if (cached && cached.profile) {
      renderIdentity(initialUser, cached.profile);
    } else {
      renderIdentity(initialUser, {});
    }

    const removeLoader = cached ? null : showLoading(root);

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: {
          Authorization: `Bearer ${session.idToken}`
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(
          `Profile request failed (${response.status})`
        );
      }

      const payload = await response.json();

      const mergedUser = {
        ...initialUser,
        ...(payload.user || {})
      };

      const profile = {
        ...(payload.profile || {}),
        email:
          (payload.profile && payload.profile.email) ||
          mergedUser.email
      };

      renderIdentity(mergedUser, profile);

      const cacheValue = {
        profile,
        savedAt: Date.now()
      };

      try {
        window.sessionStorage.setItem(
          cacheKey,
          JSON.stringify(cacheValue)
        );
      } catch (_) {
        // Cache is optional.
      }
    } catch (error) {
      console.warn(
        '[StudyKora] Showing cached/session profile after refresh failure:',
        error.message
      );

      if (!cached) {
        renderIdentity(initialUser, {});
      }
    } finally {
      if (removeLoader) {
        removeLoader();
      }
    }

    await loadHistory({
      ...session,
      user: initialUser
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    start().catch(error => {
      console.error(
        '[StudyKora] Profile enhancement failed:',
        error
      );
    });
  });

  window.addEventListener('studyKora:auth-state', () => {
    start().catch(error => {
      console.error(
        '[StudyKora] Profile refresh failed:',
        error
      );
    });
  });
})();
