/* =====================================================
   StudyKora Profile Dashboard
   Live profile + attempts + purchases, no demo records.
   Existing profile settings DOM is retained under Settings.
===================================================== */
(() => {
  'use strict';

  const API_BASE = 'https://studykora-api.yadavsubba2003.workers.dev';
  const DB_BASE = 'https://studykora-fc91d-default-rtdb.firebaseio.com';
  const CACHE_PREFIX = 'studyKoraProfileDashboard:';
  const $ = (selector, root = document) => root.querySelector(selector);

  function readObject(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function findSession() {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      const canonical = readObject(storage, 'studyKoraSession');
      if (canonical) {
        const user = canonical.user && typeof canonical.user === 'object'
          ? canonical.user
          : {};

        const uid = user.uid || user.localId || canonical.uid || canonical.localId;
        const idToken = canonical.idToken || canonical.accessToken || canonical.token;

        if (uid && (idToken || canonical.refreshToken)) {
          return {
            storage,
            key: 'studyKoraSession',
            data: canonical,
            user,
            uid
          };
        }
      }
    }

    // Compatibility for older StudyKora session keys.
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key || key === 'studyKoraSession') continue;

        const data = readObject(storage, key);
        if (!data) continue;

        const user = data.user && typeof data.user === 'object'
          ? data.user
          : data;

        const uid = user.uid || user.localId || data.uid || data.localId;
        const idToken = data.idToken || data.accessToken || data.token;

        if (uid && (idToken || data.refreshToken)) {
          return { storage, key, data, user, uid };
        }
      }
    }

    return null;
  }

  function persistSession(session) {
    try {
      session.storage.setItem(session.key, JSON.stringify(session.data));
    } catch (_) {
      // Storage can be unavailable.
    }
  }

  async function getSession() {
    const session = findSession();
    if (!session) return null;

    let token = session.data.idToken ||
      session.data.accessToken ||
      session.data.token;

    const expiresAt = Number(session.data.expiresAt || 0) ||
      (
        Number(session.data.savedAt || 0) &&
        Number(session.data.expiresIn || 0)
          ? Number(session.data.savedAt) +
            Number(session.data.expiresIn) * 1000
          : 0
      );

    if (
      (!token || (expiresAt && expiresAt < Date.now() + 60000)) &&
      session.data.refreshToken
    ) {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: session.data.refreshToken
          })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.idToken) {
          throw new Error(payload.error || 'Session refresh failed');
        }

        session.data = {
          ...session.data,
          ...payload,
          idToken: payload.idToken,
          refreshToken: payload.refreshToken || session.data.refreshToken,
          savedAt: Date.now(),
          expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000,
          user: {
            ...(session.data.user || {}),
            ...(payload.user || {})
          }
        };

        session.user = session.data.user;
        session.uid = session.user.uid || session.user.localId || session.uid;
        token = session.data.idToken;
        persistSession(session);
      } catch (error) {
        console.warn(
          '[StudyKora] Session refresh did not complete:',
          error.message
        );
      }
    }

    if (!token || !session.uid) return null;
    session.idToken = token;

    return session;
  }

  function titleCase(value) {
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

  function nameFor(user, profile) {
    let name =
      profile.displayName ||
      profile.name ||
      profile.fullName ||
      user.displayName ||
      user.name ||
      '';

    if (!String(name).trim()) {
      name = String(profile.email || user.email || '')
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\d+/g, ' ')
        .trim();
    }

    return titleCase(name) || 'Student';
  }

  function initialsFor(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return 'S';

    return (
      parts.length === 1
        ? parts[0].slice(0, 2)
        : parts[0][0] + parts[parts.length - 1][0]
    ).toLocaleUpperCase();
  }

  function findRoot() {
    return (
      $('#profile-content') ||
      $('[data-profile-content]') ||
      $('.profile-content') ||
      $('.profile-container') ||
      $('main.page-content') ||
      $('main')
    );
  }

  function mountDashboard(root) {
    let dashboard = $('#studyKoraDashboard', root);
    if (dashboard) return dashboard;

    // Preserve the original profile forms and their event handlers.
    const legacy = document.createElement('div');
    legacy.className = 'sk-profile-legacy-settings';

    while (root.firstChild) {
      legacy.appendChild(root.firstChild);
    }

    dashboard = document.createElement('div');
    dashboard.id = 'studyKoraDashboard';
    dashboard.className = 'sk-dashboard';

    dashboard.innerHTML = `
      <section class="sk-dashboard-hero" aria-labelledby="sk-profile-title">
        <div class="sk-profile-identity">
          <div class="sk-profile-avatar sk-avatar-initials"
               data-sk-avatar aria-label="Profile initials">S</div>

          <div class="sk-profile-identity-copy">
            <h1 id="sk-profile-title"
                class="sk-profile-name" data-sk-name>Student</h1>
            <p class="sk-profile-email" data-sk-contact></p>
            <p class="sk-profile-meta" data-sk-meta></p>
          </div>
        </div>

        <button type="button"
                class="sk-secondary-button"
                data-sk-open-settings>
          Edit details
        </button>
      </section>

      <section class="sk-plan-card" aria-label="Account plan">
        <div class="sk-plan-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l2.2 5.6L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.4L12 3Z"/>
            <path d="M19 16v5M16.5 18.5h5"/>
          </svg>
        </div>

        <div class="sk-plan-copy">
          <p class="sk-plan-label" data-sk-plan-name>Free Account</p>
          <h2 data-sk-plan-status>No active plan</h2>
          <p data-sk-plan-description>
            Explore available test series and continue your preparation.
          </p>
        </div>

        <a class="sk-primary-button" href="mock-tests.html">
          Explore Test Series
        </a>
      </section>

      <section class="sk-stat-grid" aria-label="Your performance summary">
        <article class="sk-stat-card">
          <span class="sk-stat-label">Tests Taken</span>
          <strong data-sk-total-tests>—</strong>
          <span class="sk-stat-foot" data-sk-question-count>Test records</span>
        </article>

        <article class="sk-stat-card">
          <span class="sk-stat-label">Average Score</span>
          <strong data-sk-average>—</strong>
          <span class="sk-stat-foot">Across completed tests</span>
        </article>

        <article class="sk-stat-card">
          <span class="sk-stat-label">Best Score</span>
          <strong data-sk-best>—</strong>
          <span class="sk-stat-foot">Your highest attempt</span>
        </article>
      </section>

      <nav class="sk-profile-tabs" role="tablist" aria-label="Profile sections">
        <button type="button" role="tab"
                id="sk-tab-performance-button"
                aria-controls="sk-tab-performance"
                aria-selected="true" data-sk-tab="performance">
          Performance
        </button>

        <button type="button" role="tab"
                id="sk-tab-purchases-button"
                aria-controls="sk-tab-purchases"
                aria-selected="false" data-sk-tab="purchases">
          Purchases
        </button>

        <button type="button" role="tab"
                id="sk-tab-settings-button"
                aria-controls="sk-tab-settings"
                aria-selected="false" data-sk-tab="settings">
          Settings
        </button>
      </nav>

      <section id="sk-tab-performance"
               class="sk-tab-panel"
               role="tabpanel"
               aria-labelledby="sk-tab-performance-button"
               data-sk-panel="performance">

        <section class="sk-panel-card sk-score-trend-panel">
          <div class="sk-section-heading">
            <div>
              <h2>Score Trend</h2>
              <p data-sk-trend-summary>Based on your completed test records</p>
            </div>
            <span class="sk-section-kicker">PERFORMANCE</span>
          </div>
          <div data-sk-score-trend class="sk-score-chart">
            <div class="sk-data-state">Loading your performance…</div>
          </div>
        </section>

        <section class="sk-quick-stats-grid" aria-label="Study consistency">
          <article class="sk-mini-stat">
            <span class="sk-mini-label">Current study streak</span>
            <strong data-sk-streak>—</strong>
            <span class="sk-mini-hint">Consecutive days with completed tests</span>
          </article>

          <article class="sk-mini-stat">
            <span class="sk-mini-label">Tests this week</span>
            <strong data-sk-week-count>—</strong>
            <span class="sk-mini-hint">Last seven days</span>
          </article>

          <article class="sk-mini-stat">
            <span class="sk-mini-label">Review queue</span>
            <strong data-sk-review-count>—</strong>
            <span class="sk-mini-hint">Wrong or unanswered saved questions</span>
          </article>
        </section>

        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Study Activity</h2>
              <p>Completed tests by day, based on your records</p>
            </div>
          </div>
          <div class="sk-activity-grid" data-sk-week-activity>
            <div class="sk-data-state">Loading activity…</div>
          </div>
        </section>

        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Strengths &amp; Areas to Improve</h2>
              <p>Calculated from saved test results, not estimates</p>
            </div>
          </div>
          <div class="sk-performance-groups" data-sk-categories>
            <div class="sk-data-state">Loading test performance…</div>
          </div>
        </section>

        <section class="sk-panel-card sk-recommendation-card">
          <div class="sk-section-heading">
            <div>
              <h2>Recommended Practice</h2>
              <p>Suggestions based on your recorded performance</p>
            </div>
          </div>
          <div data-sk-recommendation>
            <div class="sk-data-state">Loading recommendations…</div>
          </div>
        </section>

        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Mistake Review</h2>
              <p>Revisit incorrect or unanswered questions</p>
            </div>
            <span class="sk-count-chip" data-sk-mistake-badge>—</span>
          </div>
          <div data-sk-mistakes>
            <div class="sk-data-state">Loading review queue…</div>
          </div>
        </section>

        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Recent Tests</h2>
              <p>Your latest saved attempts</p>
            </div>
            <a href="mock-tests.html" class="sk-inline-link">More tests</a>
          </div>
          <div class="sk-recent-list" data-sk-recent-tests>
            <div class="sk-data-state">Loading test history…</div>
          </div>
        </section>
      </section>

      <section id="sk-tab-purchases"
               class="sk-tab-panel"
               role="tabpanel"
               aria-labelledby="sk-tab-purchases-button"
               data-sk-panel="purchases" hidden>
        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Purchases &amp; Enrolments</h2>
              <p>Test series and plans linked to your account</p>
            </div>
          </div>
          <div data-sk-purchases>
            <div class="sk-data-state">Loading purchases…</div>
          </div>
        </section>
      </section>

      <section id="sk-tab-settings"
               class="sk-tab-panel"
               role="tabpanel"
               aria-labelledby="sk-tab-settings-button"
               data-sk-panel="settings" hidden>
        <section class="sk-panel-card">
          <div class="sk-section-heading">
            <div>
              <h2>Account Settings</h2>
              <p>Existing profile and account controls are kept here.</p>
            </div>
          </div>
          <div id="sk-legacy-settings-mount"></div>
        </section>

        <section class="sk-panel-card sk-future-settings">
          <h2>More account controls</h2>
          <p>
            Notification preferences, linked providers, security activity
            and data export can be integrated when their backend flows are ready.
          </p>
        </section>
      </section>

      <p class="sk-profile-status"
         role="status" aria-live="polite" data-sk-status></p>
    `;

    root.appendChild(dashboard);

    const settingsMount = $('#sk-legacy-settings-mount', dashboard);
    if (settingsMount) settingsMount.appendChild(legacy);

    dashboard.querySelectorAll('[data-sk-tab]').forEach(button => {
      button.addEventListener('click', () => activateTab(button.dataset.skTab));
    });

    dashboard.querySelector('[data-sk-open-settings]')
      ?.addEventListener('click', () => activateTab('settings'));

    return dashboard;
  }

  function activateTab(name) {
    const dashboard = $('#studyKoraDashboard');
    if (!dashboard) return;

    dashboard.querySelectorAll('[data-sk-tab]').forEach(button => {
      const active = button.dataset.skTab === name;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    dashboard.querySelectorAll('[data-sk-panel]').forEach(panel => {
      panel.hidden = panel.dataset.skPanel !== name;
    });
  }

  function showLoader(root) {
    root.classList.add('sk-profile-loading');

    let layer = $('.sk-profile-loader', root);

    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'sk-profile-loader';
      layer.setAttribute('role', 'status');
      layer.setAttribute('aria-live', 'polite');
      layer.innerHTML = `
        <span class="sk-profile-spinner" aria-hidden="true"></span>
        <span>Loading your profile…</span>
      `;
      root.appendChild(layer);
    }

    return () => {
      root.classList.remove('sk-profile-loading');
      layer.remove();
    };
  }

  async function getDatabaseValue(path, token) {
    const response = await fetch(
      `${DB_BASE}/${path}.json?auth=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data && data.error
          ? data.error
          : `Database request failed (${response.status})`
      );
    }

    return data;
  }

  function toRecords(value) {
    if (!value) return [];

    const source = Array.isArray(value)
      ? value.map((record, index) => [String(index), record])
      : Object.entries(value);

    return source
      .filter(([, record]) => record && typeof record === 'object')
      .map(([id, record]) => ({ id, ...record }));
  }

  function getDate(record) {
    const value =
      record.completedAt ||
      record.attemptedAt ||
      record.createdAt ||
      record.date ||
      null;

    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function totalQuestions(record) {
    return Math.max(
      0,
      Number(
        record.totalQuestions ||
        record.total ||
        record.questionCount ||
        0
      )
    );
  }

  function correctAnswers(record) {
    return Math.max(0, Number(record.correctAnswers ?? record.correct ?? 0));
  }

  function incorrectAnswers(record) {
    return Math.max(0, Number(record.incorrectAnswers ?? record.incorrect ?? 0));
  }

  function unansweredAnswers(record) {
    return Math.max(0, Number(record.unanswered ?? record.unansweredCount ?? 0));
  }

  function scorePercent(record) {
    const totalMarks = Number(
      record.totalMarks ||
      record.totalQuestions ||
      record.total ||
      record.questionCount ||
      0
    );

    if (totalMarks > 0 && Number.isFinite(Number(record.score))) {
      return clamp(Number(record.score) / totalMarks * 100, 0, 100);
    }

    const total = totalQuestions(record);

    if (total > 0) {
      return clamp(correctAnswers(record) / total * 100, 0, 100);
    }

    const accuracy = Number(record.accuracy ?? record.percentage);

    return Number.isFinite(accuracy)
      ? clamp(accuracy, 0, 100)
      : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fmtPercent(value) {
    return value === null || !Number.isFinite(value)
      ? '—'
      : `${Math.round(value)}%`;
  }

  function fmtDate(
    date,
    options = { day: '2-digit', month: 'short', year: 'numeric' }
  ) {
    return date
      ? date.toLocaleDateString(undefined, options)
      : 'Date unavailable';
  }

  function fmtDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;

    return mins ? `${mins}m ${secs}s` : `${secs}s`;
  }

  function recordTitle(record) {
    return String(
      record.testTitle ||
      record.title ||
      record.testName ||
      record.testId ||
      'Practice test'
    );
  }

  function planFor(user, profile) {
    const subscription = profile.subscription || user.subscription || {};
    const plan = profile.plan || user.plan || subscription.plan || '';
    const planName = typeof plan === 'string'
      ? plan
      : (plan.name || plan.title || '');

    const status = String(
      subscription.status ||
      profile.planStatus ||
      user.planStatus ||
      ''
    ).toLowerCase();

    const active =
      profile.isPremium === true ||
      user.isPremium === true ||
      subscription.active === true ||
      (
        status === 'active' &&
        planName &&
        !/free|basic/i.test(planName)
      );

    return active
      ? {
          label: `${titleCase(planName || 'Premium')} Account`,
          status: 'Active plan',
          description: 'Your account has an active plan.'
        }
      : {
          label: 'Free Account',
          status: 'No active plan',
          description: 'Explore available test series and continue your preparation.'
        };
  }

  function setAvatar(target, name, photoURL) {
    if (!target) return;

    const initials = initialsFor(name);
    target.replaceChildren();
    target.classList.add('sk-profile-avatar');
    target.setAttribute('aria-label', `${name} profile picture`);

    if (photoURL && /^https:\/\//i.test(String(photoURL))) {
      const image = document.createElement('img');
      image.src = photoURL;
      image.alt = '';
      image.loading = 'eager';
      image.referrerPolicy = 'no-referrer';

      image.addEventListener('error', () => {
        target.textContent = initials;
        target.classList.add('sk-avatar-initials');
      }, { once: true });

      target.appendChild(image);
      target.classList.remove('sk-avatar-initials');
    } else {
      target.textContent = initials;
      target.classList.add('sk-avatar-initials');
    }
  }

  function renderIdentity(dashboard, user, profile) {
    const name = nameFor(user, profile);
    const email = String(profile.email || user.email || '').trim();

    const phone = String(
      profile.phone ||
      profile.whatsapp ||
      profile.mobile ||
      user.phone ||
      user.whatsapp ||
      ''
    ).trim();

    const dobRaw =
      profile.dateOfBirth ||
      profile.dob ||
      profile.birthDate ||
      user.dateOfBirth ||
      user.dob ||
      '';

    const dob = dobRaw ? new Date(dobRaw) : null;
    const dobText = dob && !Number.isNaN(dob.getTime())
      ? fmtDate(dob)
      : '';

    const contactParts = [email, phone].filter(Boolean);
    const contact = $('[data-sk-contact]', dashboard);
    const meta = $('[data-sk-meta]', dashboard);

    $('[data-sk-name]', dashboard).textContent = name;

    if (contact) contact.textContent = contactParts.join(' · ');
    if (meta) meta.textContent = dobText ? `Date of birth · ${dobText}` : '';

    setAvatar(
      $('[data-sk-avatar]', dashboard),
      name,
      profile.photoURL ||
      profile.photoUrl ||
      user.photoURL ||
      user.photoUrl ||
      ''
    );

    const plan = planFor(user, profile);

    $('[data-sk-plan-name]', dashboard).textContent = plan.label;
    $('[data-sk-plan-status]', dashboard).textContent = plan.status;
    $('[data-sk-plan-description]', dashboard).textContent = plan.description;

    // Keep legacy profile fields populated for existing settings integrations.
    const nameTargets = [
      '#profileName',
      '#profile-name',
      '[data-profile-name]',
      '.profile-name'
    ];

    const emailTargets = [
      '#profileEmail',
      '#profile-email',
      '[data-profile-email]',
      '.profile-email'
    ];

    const phoneTargets = [
      '#profilePhone',
      '#profile-phone',
      '[data-profile-phone]'
    ];

    nameTargets.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el !== $('[data-sk-name]', dashboard)) {
          el.textContent = name;
        }
      });
    });

    emailTargets.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el !== contact) el.textContent = email;
      });
    });

    phoneTargets.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.textContent = phone;
      });
    });
  }

  function renderStats(dashboard, records, recordsError) {
    const totalEl = $('[data-sk-total-tests]', dashboard);
    const questionsEl = $('[data-sk-question-count]', dashboard);
    const averageEl = $('[data-sk-average]', dashboard);
    const bestEl = $('[data-sk-best]', dashboard);

    if (recordsError) {
      totalEl.textContent = '—';
      questionsEl.textContent = 'Could not load records';
      averageEl.textContent = '—';
      bestEl.textContent = '—';
      return;
    }

    totalEl.textContent = String(records.length);

    const questions = records.reduce(
      (sum, record) => sum + totalQuestions(record),
      0
    );

    questionsEl.textContent = `${questions} questions attempted`;

    const percentages = records
      .map(scorePercent)
      .filter(value => value !== null);

    averageEl.textContent = percentages.length
      ? fmtPercent(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : '—';

    bestEl.textContent = percentages.length
      ? fmtPercent(Math.max(...percentages))
      : '—';
  }

  function stateMessage(message, kind = '') {
    const box = document.createElement('div');
    box.className = `sk-data-state${kind ? ` is-${kind}` : ''}`;
    box.textContent = message;
    return box;
  }

  function renderScoreTrend(dashboard, records, error) {
    const target = $('[data-sk-score-trend]', dashboard);
    const summary = $('[data-sk-trend-summary]', dashboard);

    target.replaceChildren();

    if (error) {
      target.appendChild(
        stateMessage('Test history could not be loaded. Refresh to try again.', 'error')
      );
      summary.textContent = 'Data unavailable';
      return;
    }

    if (!records.length) {
      target.appendChild(
        stateMessage('Complete a test to start your score trend. No example results are shown.')
      );
      summary.textContent = 'No completed tests yet';
      return;
    }

    const ordered = [...records]
      .sort((a, b) =>
        (getDate(a)?.getTime() || 0) - (getDate(b)?.getTime() || 0)
      )
      .slice(-8);

    const questions = records.reduce(
      (sum, record) => sum + totalQuestions(record),
      0
    );

    summary.textContent =
      `${records.length} ${records.length === 1 ? 'test' : 'tests'} · ${questions} questions`;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    svg.setAttribute('viewBox', '0 0 640 230');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Score percentage by completed test');
    svg.classList.add('sk-score-svg');

    [30, 75, 120, 165].forEach(y => {
      const line = document.createElementNS(svgNS, 'line');

      line.setAttribute('x1', '50');
      line.setAttribute('x2', '610');
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('class', 'sk-chart-gridline');

      svg.appendChild(line);
    });

    const points = ordered.map((record, index) => {
      const percent = scorePercent(record);

      return {
        record,
        percent: percent === null ? 0 : percent,
        x: ordered.length === 1
          ? 330
          : 60 + index * (540 / (ordered.length - 1))
      };
    });

    points.forEach(point => {
      point.y = 165 - (point.percent / 100) * 135;
    });

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('class', 'sk-chart-line');
    path.setAttribute(
      'd',
      points.map((point, index) =>
        `${index ? 'L' : 'M'} ${point.x} ${point.y}`
      ).join(' ')
    );

    svg.appendChild(path);

    points.forEach((point, index) => {
      const circle = document.createElementNS(svgNS, 'circle');

      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '4.5');
      circle.setAttribute('class', 'sk-chart-point');

      const title = document.createElementNS(svgNS, 'title');
      title.textContent =
        `${recordTitle(point.record)}: ${fmtPercent(scorePercent(point.record))}`;

      circle.appendChild(title);
      svg.appendChild(circle);

      if (index === 0 || index === points.length - 1 || points.length <= 4) {
        const label = document.createElementNS(svgNS, 'text');

        label.setAttribute('x', String(point.x));
        label.setAttribute('y', '198');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'sk-chart-label');

        label.textContent = getDate(point.record)
          ? fmtDate(getDate(point.record), { day: '2-digit', month: 'short' })
          : `Test ${index + 1}`;

        svg.appendChild(label);

        const value = document.createElementNS(svgNS, 'text');

        value.setAttribute('x', String(point.x));
        value.setAttribute('y', String(Math.max(16, point.y - 12)));
        value.setAttribute('text-anchor', 'middle');
        value.setAttribute('class', 'sk-chart-value');
        value.textContent = fmtPercent(scorePercent(point.record));

        svg.appendChild(value);
      }
    });

    target.appendChild(svg);
  }

  function renderActivity(dashboard, records, error) {
    const target = $('[data-sk-week-activity]', dashboard);
    target.replaceChildren();

    if (error) {
      target.appendChild(stateMessage('Activity data is unavailable.', 'error'));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date);
    }

    const counts = days.map(day =>
      records.filter(record => {
        const date = getDate(record);
        return date && dateKey(date) === dateKey(day);
      }).length
    );

    const max = Math.max(1, ...counts);

    days.forEach((date, index) => {
      const cell = document.createElement('div');
      cell.className = 'sk-activity-day';

      const count = document.createElement('strong');
      count.textContent = String(counts[index]);

      const track = document.createElement('div');
      track.className = 'sk-activity-track';

      const bar = document.createElement('span');
      bar.className = 'sk-activity-bar';
      bar.style.height = `${Math.max(4, counts[index] / max * 100)}%`;

      track.appendChild(bar);

      const label = document.createElement('span');
      label.className = 'sk-activity-label';
      label.textContent = date.toLocaleDateString(undefined, { weekday: 'short' });

      cell.append(count, track, label);
      target.appendChild(cell);
    });
  }

  function currentStreak(records) {
    const daySet = new Set(
      records
        .map(record => getDate(record))
        .filter(Boolean)
        .map(dateKey)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let cursor = daySet.has(dateKey(today)) ? today : yesterday;

    if (!daySet.has(dateKey(cursor))) return 0;

    let streak = 0;

    while (daySet.has(dateKey(cursor))) {
      streak += 1;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  function renderConsistency(dashboard, records, error) {
    const streak = $('[data-sk-streak]', dashboard);
    const weekCount = $('[data-sk-week-count]', dashboard);

    if (error) {
      streak.textContent = '—';
      weekCount.textContent = '—';
      return;
    }

    streak.textContent = String(currentStreak(records));

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);

    const count = records.filter(record => {
      const date = getDate(record);
      return date && date >= since;
    }).length;

    weekCount.textContent = String(count);
  }

  function aggregateCategories(records) {
    const groups = new Map();

    records.forEach(record => {
      const key = String(
        record.subject ||
        record.topic ||
        record.testTitle ||
        record.title ||
        'Other practice'
      );

      const score = scorePercent(record);
      if (score === null) return;

      const group = groups.get(key) || {
        name: key,
        total: 0,
        count: 0
      };

      group.total += score;
      group.count += 1;
      groups.set(key, group);
    });

    return [...groups.values()]
      .map(group => ({
        name: group.name,
        attempts: group.count,
        accuracy: group.total / group.count
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }

  function renderCategories(dashboard, records, error) {
    const target = $('[data-sk-categories]', dashboard);
    target.replaceChildren();

    if (error) {
      target.appendChild(
        stateMessage('Performance categories are unavailable.', 'error')
      );
      return;
    }

    const groups = aggregateCategories(records);

    if (!groups.length) {
      target.appendChild(
        stateMessage('Category insights will appear after your first completed test.')
      );
      return;
    }

    groups.slice(0, 6).forEach(group => {
      const row = document.createElement('div');
      row.className = 'sk-category-row';

      const details = document.createElement('div');
      details.className = 'sk-category-details';

      const title = document.createElement('strong');
      title.textContent = group.name;

      const meta = document.createElement('span');
      meta.textContent =
        `${group.attempts} ${group.attempts === 1 ? 'test' : 'tests'}`;

      details.append(title, meta);

      const meter = document.createElement('div');
      meter.className = 'sk-category-meter';

      const fill = document.createElement('span');
      fill.style.width = `${clamp(group.accuracy, 0, 100)}%`;

      meter.appendChild(fill);

      const value = document.createElement('strong');
      value.className = 'sk-category-percent';
      value.textContent = fmtPercent(group.accuracy);

      row.append(details, meter, value);
      target.appendChild(row);
    });
  }

  function renderRecommendation(dashboard, records, error) {
    const target = $('[data-sk-recommendation]', dashboard);
    target.replaceChildren();

    if (error) {
      target.appendChild(
        stateMessage('Recommendations are unavailable until test history loads.', 'error')
      );
      return;
    }

    const groups = aggregateCategories(records);

    if (!groups.length) {
      target.appendChild(
        stateMessage('Complete a test to receive practice recommendations based on your performance.')
      );
      return;
    }

    const weakest = groups[0];
    const box = document.createElement('div');
    box.className = 'sk-recommendation-item';

    const copy = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = `Focus next: ${weakest.name}`;

    const desc = document.createElement('p');
    desc.textContent =
      `Your recorded average for this area is ${fmtPercent(weakest.accuracy)} across ${weakest.attempts} ${weakest.attempts === 1 ? 'test' : 'tests'}. Practice more questions and review explanations to improve.`;

    copy.append(title, desc);

    const link = document.createElement('a');
    link.className = 'sk-primary-button';
    link.href = 'mock-tests.html';
    link.textContent = 'Find practice tests';

    box.append(copy, link);
    target.appendChild(box);
  }

  function collectMistakes(records) {
    const list = [];

    records.forEach(record => {
      if (!Array.isArray(record.answers)) return;

      record.answers.forEach(answer => {
        if (
          answer &&
          (answer.isCorrect === false || answer.unanswered === true)
        ) {
          list.push({
            ...answer,
            testTitle: recordTitle(record),
            date: getDate(record)
          });
        }
      });
    });

    return list.sort(
      (a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
    );
  }

  function renderMistakes(dashboard, records, error) {
    const target = $('[data-sk-mistakes]', dashboard);
    target.replaceChildren();

    const badge = $('[data-sk-mistake-badge]', dashboard);

    if (error) {
      badge.textContent = '—';
      target.appendChild(
        stateMessage('Review queue is unavailable because test records could not be loaded.', 'error')
      );
      return;
    }

    const mistakes = collectMistakes(records);
    badge.textContent = String(mistakes.length);
    $('[data-sk-review-count]', dashboard).textContent = String(mistakes.length);

    if (!mistakes.length) {
      target.appendChild(
        stateMessage(
          records.length
            ? 'No saved mistakes or unanswered questions found in your recorded attempts.'
            : 'Your review queue will populate after a completed test.'
        )
      );
      return;
    }

    mistakes.slice(0, 5).forEach(item => {
      const article = document.createElement('article');
      article.className = 'sk-mistake-item';

      const heading = document.createElement('div');
      heading.className = 'sk-mistake-heading';

      const title = document.createElement('strong');
      title.textContent = item.question || 'Question to review';

      const status = document.createElement('span');
      status.className = 'sk-count-chip';
      status.textContent = item.unanswered ? 'Unanswered' : 'Incorrect';

      heading.append(title, status);

      const context = document.createElement('p');
      context.textContent = item.testTitle;

      article.append(heading, context);

      if (item.explanation) {
        const explanation = document.createElement('p');
        explanation.className = 'sk-mistake-explanation';
        explanation.textContent = item.explanation;
        article.appendChild(explanation);
      }

      target.appendChild(article);
    });

    if (mistakes.length > 5) {
      target.appendChild(
        stateMessage(`${mistakes.length - 5} more questions are available in your saved attempt history.`)
      );
    }
  }

  function renderRecent(dashboard, records, error) {
    const target = $('[data-sk-recent-tests]', dashboard);
    target.replaceChildren();

    if (error) {
      target.appendChild(
        stateMessage('Test history could not be loaded. Refresh the page to try again.', 'error')
      );
      return;
    }

    if (!records.length) {
      target.appendChild(
        stateMessage('No completed tests yet. Your real test attempts will appear here after you submit a test.')
      );
      return;
    }

    [...records]
      .sort((a, b) =>
        (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)
      )
      .slice(0, 8)
      .forEach(record => {
        const row = document.createElement('article');
        row.className = 'sk-recent-test';

        const icon = document.createElement('span');
        icon.className = 'sk-recent-test-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M7 3.5h7l4 4V21H7z"/>
            <path d="M14 3.5V8h4M9.5 12h6M9.5 15.5h6"/>
          </svg>
        `;

        const copy = document.createElement('div');
        copy.className = 'sk-recent-test-copy';

        const title = document.createElement('strong');
        title.textContent = recordTitle(record);

        const total = totalQuestions(record);
        const correct = correctAnswers(record);

        const sub = document.createElement('p');
        sub.textContent =
          `${fmtDate(getDate(record))} · ${correct}/${total || '—'} correct`;

        copy.append(title, sub);

        const score = document.createElement('strong');
        score.className = 'sk-recent-score';
        score.textContent = fmtPercent(scorePercent(record));

        row.append(icon, copy, score);
        target.appendChild(row);
      });
  }

  function purchasesToList(value) {
    if (!value) return [];

    const raw = Array.isArray(value)
      ? value.map((item, i) => [String(i), item])
      : Object.entries(value);

    return raw
      .filter(([, item]) => item && typeof item === 'object')
      .map(([id, item]) => ({ id, ...item }));
  }

  function renderPurchases(dashboard, purchases, error) {
    const target = $('[data-sk-purchases]', dashboard);
    target.replaceChildren();

    if (error) {
      target.appendChild(
        stateMessage('Purchase history could not be loaded. Check database access and try again.', 'error')
      );
      return;
    }

    if (!purchases.length) {
      target.appendChild(
        stateMessage('No purchases or enrolments are recorded for this account yet.')
      );
      return;
    }

    purchases.forEach(item => {
      const row = document.createElement('article');
      row.className = 'sk-purchase-item';

      const title = document.createElement('strong');
      title.textContent = String(
        item.title ||
        item.productName ||
        item.planName ||
        item.testSeriesName ||
        item.name ||
        'Purchased item'
      );

      const sub = document.createElement('p');
      const status = String(item.status || item.paymentStatus || 'Recorded');
      const date = item.purchasedAt || item.createdAt || item.date;

      sub.textContent =
        `${status}${date ? ` · ${fmtDate(new Date(date))}` : ''}`;

      row.append(title, sub);
      target.appendChild(row);
    });
  }

  function renderAll(dashboard, user, profile, data) {
    renderIdentity(dashboard, user, profile);

    const records = data.records || [];
    const recordsError = Boolean(data.recordsError);

    renderStats(dashboard, records, recordsError);
    renderScoreTrend(dashboard, records, recordsError);
    renderConsistency(dashboard, records, recordsError);
    renderActivity(dashboard, records, recordsError);
    renderCategories(dashboard, records, recordsError);
    renderRecommendation(dashboard, records, recordsError);
    renderMistakes(dashboard, records, recordsError);
    renderRecent(dashboard, records, recordsError);
    renderPurchases(
      dashboard,
      data.purchases || [],
      Boolean(data.purchasesError)
    );
  }

  async function fetchProfile(session) {
    const response = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${session.idToken}` },
      cache: 'no-store'
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload.error || `Profile request failed (${response.status})`
      );
    }

    return {
      user: payload.user || {},
      profile: payload.profile || {}
    };
  }

  async function fetchRecords(session) {
    const base = `users/${encodeURIComponent(session.uid)}`;

    const results = await Promise.all([
      getDatabaseValue(`${base}/testAttempts`, session.idToken)
        .then(value => ({ ok: true, value }))
        .catch(error => ({ ok: false, error })),

      getDatabaseValue(`${base}/attempts`, session.idToken)
        .then(value => ({ ok: true, value }))
        .catch(error => ({ ok: false, error }))
    ]);

    if (results.every(result => !result.ok)) {
      throw results[0].error || new Error('Test records unavailable');
    }

    const map = new Map();

    results.filter(result => result.ok).forEach(result => {
      toRecords(result.value).forEach(record => {
        const id = String(
          record.attemptId ||
          record.id ||
          `${recordTitle(record)}-${record.completedAt || record.attemptedAt || record.createdAt || ''}`
        );

        if (!map.has(id)) map.set(id, record);
      });
    });

    return [...map.values()].sort(
      (a, b) => (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)
    );
  }

  async function fetchPurchases(session) {
    const base = `users/${encodeURIComponent(session.uid)}`;

    return purchasesToList(
      await getDatabaseValue(`${base}/purchases`, session.idToken)
    );
  }

  async function start() {
    const root = findRoot();
    if (!root) return;

    const dashboard = mountDashboard(root);
    const session = await getSession();

    if (!session) {
      const empty = {
        profile: {},
        records: [],
        purchases: [],
        recordsError: true,
        purchasesError: true
      };

      renderAll(dashboard, {}, {}, empty);

      $('[data-sk-name]', dashboard).textContent = 'Sign in required';
      $('[data-sk-contact]', dashboard).textContent =
        'Sign in to view your profile and saved results.';

      $('[data-sk-total-tests]', dashboard).textContent = '—';
      $('[data-sk-average]', dashboard).textContent = '—';
      $('[data-sk-best]', dashboard).textContent = '—';
      $('[data-sk-status]', dashboard).textContent =
        'No authenticated StudyKora session was found.';

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

    const cachedData = cached || {
      profile: {},
      records: [],
      purchases: [],
      recordsError: false,
      purchasesError: false
    };

    renderAll(dashboard, initialUser, cachedData.profile || {}, {
      records: cachedData.records || [],
      purchases: cachedData.purchases || [],
      recordsError: cached ? Boolean(cached.recordsError) : false,
      purchasesError: cached ? Boolean(cached.purchasesError) : false
    });

    const removeLoader = cached ? null : showLoader(root);

    $('[data-sk-status]', dashboard).textContent =
      cached ? '' : 'Loading live account data…';

    const [profileResult, recordsResult, purchasesResult] =
      await Promise.allSettled([
        fetchProfile(session),
        fetchRecords(session),
        fetchPurchases(session)
      ]);

    const profilePayload = profileResult.status === 'fulfilled'
      ? profileResult.value
      : { user: {}, profile: cachedData.profile || {} };

    if (profileResult.status === 'rejected') {
      console.warn(
        '[StudyKora] Profile data could not refresh:',
        profileResult.reason
      );
    }

    const mergedUser = {
      ...initialUser,
      ...(profilePayload.user || {})
    };

    const profile = {
      ...(profilePayload.profile || {}),
      email: profilePayload.profile?.email || mergedUser.email
    };

    const recordsError = recordsResult.status === 'rejected';
    const purchasesError = purchasesResult.status === 'rejected';

    const data = {
      profile,

      records: recordsError
        ? (cached?.records || [])
        : recordsResult.value,

      purchases: purchasesError
        ? (cached?.purchases || [])
        : purchasesResult.value,

      recordsError: recordsError && !cached?.records,
      purchasesError: purchasesError && !cached?.purchases
    };

    if (recordsError) {
      console.warn(
        '[StudyKora] Test history could not load:',
        recordsResult.reason
      );
    }

    if (purchasesError) {
      console.info(
        '[StudyKora] Purchase history unavailable:',
        purchasesResult.reason?.message || purchasesResult.reason
      );
    }

    renderAll(dashboard, mergedUser, profile, data);

    if (
      profileResult.status === 'rejected' &&
      recordsError &&
      purchasesError
    ) {
      $('[data-sk-status]', dashboard).textContent =
        'Could not refresh account data. Cached information, if available, remains visible.';
    } else {
      $('[data-sk-status]', dashboard).textContent = '';
    }

    try {
      window.sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ ...data, savedAt: Date.now() })
      );
    } catch (_) {
      // Cache is optional.
    }

    if (removeLoader) removeLoader();
  }

  function boot() {
    start().catch(error => {
      console.error('[StudyKora] Profile dashboard failed:', error);

      const status = $('[data-sk-status]', $('#studyKoraDashboard') || document);
      if (status) {
        status.textContent =
          'Profile could not be loaded. Refresh the page to try again.';
      }

      const loader = $('.sk-profile-loader');
      if (loader) loader.remove();

      document.querySelectorAll('.sk-profile-loading').forEach(element => {
        element.classList.remove('sk-profile-loading');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('studyKora:auth-state', boot);
})();
