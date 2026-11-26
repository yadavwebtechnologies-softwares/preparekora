"use strict";

(function () {

  if (document.getElementById("loginScreen")) return;

  let modalMounted = false;
  let modalReady = false;

  /* ---------- mount modal HTML ---------- */

  function mountModal() {
    if (modalMounted) return;
    modalMounted = true;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "studentLoginOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "studentLoginTitle");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="auth-modal-wrap">' +
        '<div class="modal auth-modal">' +
          '<button class="auth-modal-close" id="studentLoginClose" type="button" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>' +
          '</button>' +
          '<h2 id="studentLoginTitle">Welcome back</h2>' +
          '<p class="auth-modal-sub" id="studentLoginSub">Sign in to take tests and track your progress.</p>' +

          '<button class="btn-google" id="studentGoogleBtn" type="button">' +
            '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
              '<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>' +
              '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>' +
              '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>' +
              '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.3-.4-3.5z"/>' +
            '</svg>' +
            'Continue with Google' +
          '</button>' +

          '<div class="auth-divider">or</div>' +

          '<div class="auth-tabs" role="tablist">' +
            '<button class="auth-tab is-active" data-mode="signin" type="button" role="tab" aria-selected="true">Sign in</button>' +
            '<button class="auth-tab" data-mode="signup" type="button" role="tab" aria-selected="false">Create account</button>' +
          '</div>' +

          '<div class="auth-form-area">' +

            '<form id="studentSigninForm" class="auth-form" novalidate>' +
              '<div class="form-field">' +
                '<label class="form-label" for="studentSigninEmail">Email</label>' +
                '<input class="form-input" id="studentSigninEmail" type="email" autocomplete="email" placeholder="you@example.com">' +
              '</div>' +
              '<div class="form-field">' +
                '<label class="form-label" for="studentSigninPassword">Password</label>' +
                '<input class="form-input" id="studentSigninPassword" type="password" autocomplete="current-password" placeholder="••••••••">' +
              '</div>' +
              '<p class="auth-form-error" id="studentSigninError" hidden></p>' +
              '<button class="btn btn-primary btn-block" type="submit">Sign in</button>' +
              '<p class="auth-form-hint"><button type="button" id="studentForgotPassword">Forgot password?</button></p>' +
            '</form>' +

            '<form id="studentSignupForm" class="auth-form is-hidden" novalidate>' +
              '<div class="form-field">' +
                '<label class="form-label" for="studentSignupName">Full name</label>' +
                '<input class="form-input" id="studentSignupName" type="text" autocomplete="name" placeholder="Your name" maxlength="60">' +
              '</div>' +
              '<div class="form-field">' +
                '<label class="form-label" for="studentSignupEmail">Email</label>' +
                '<input class="form-input" id="studentSignupEmail" type="email" autocomplete="email" placeholder="you@example.com">' +
              '</div>' +
              '<div class="form-field">' +
                '<label class="form-label" for="studentSignupPassword">Password</label>' +
                '<input class="form-input" id="studentSignupPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters">' +
              '</div>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentSignupWhatsApp">WhatsApp number (optional)</label>' +
            '<input class="form-input" id="studentSignupWhatsApp" type="tel" autocomplete="tel" placeholder="10-digit number" maxlength="15" inputmode="numeric">' +
            '<p class="form-hint">Only used if we need to contact you about test issues.</p>' +
          '</div>' +
          '<div class="form-field">' +
            '<label class="form-label" for="studentSignupDob">Date of birth</label>' +
            '<input class="form-input" id="studentSignupDob" type="date">' +
            '<p class="form-hint">You must be 18 or older to create an account.</p>' +
          '</div>' +
          '<label style="display: flex; align-items: flex-start; gap: 10px; margin: 8px 0 14px; cursor: pointer;">' +
            '<input type="checkbox" id="studentSignupAgeConsent" style="width: 18px; height: 18px; margin-top: 2px; accent-color: var(--accent); cursor: pointer; flex-shrink: 0;">' +
            '<span style="font-size: 12px; line-height: 1.5;">I confirm I am 18 years or older and accept the Terms of Service.</span>' +
          '</label>' +
              '<p class="auth-form-error" id="studentSignupError" hidden></p>' +
              '<button class="btn btn-primary btn-block" type="submit">Create account</button>' +
              '<p class="auth-form-hint">By creating an account you agree to our <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy</a>.</p>' +
            '</form>' +

          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    try {
      const dobEl = document.getElementById("studentSignupDob");
      if (dobEl) dobEl.max = new Date().toISOString().slice(0, 10);
    } catch (e) {}
  }

  /* ---------- open / close ---------- */

  let currentMode = "signin";
  let modeTimeoutId = null;

  function openModal(mode) {
    mountModal();
    wire();
    const overlay = document.getElementById("studentLoginOverlay");
    if (!overlay) return;
    applyModeSync(mode || "signin");
    clearErrors();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      const el = mode === "signup" ? document.getElementById("studentSignupName") : document.getElementById("studentSigninEmail");
      if (el) el.focus();
    }, 60);
  }

  function closeModal() {
    const overlay = document.getElementById("studentLoginOverlay");
    if (!overlay) return;
    const focused = document.activeElement;
    if (focused && overlay.contains(focused) && typeof focused.blur === "function") {
      focused.blur();
    }
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    clearErrors();
    setLoading(false);
  }
  /* ---------- mode switching ---------- */
  function applyModeSync(mode) {
    currentMode = mode;
    const signinForm = document.getElementById("studentSigninForm");
    const signupForm = document.getElementById("studentSignupForm");
    const title = document.getElementById("studentLoginTitle");
    const sub = document.getElementById("studentLoginSub");
    if (!signinForm || !signupForm) return;

    document.querySelectorAll("#studentLoginOverlay .auth-tab").forEach(function (t) {
      const active = t.dataset.mode === mode;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });

    if (mode === "signup") {
      signinForm.classList.add("is-hidden");
      signupForm.classList.remove("is-hidden");
      if (title) title.textContent = "Create your account";
      if (sub) sub.textContent = "Free forever. No credit card required.";
    } else {
      signupForm.classList.add("is-hidden");
      signinForm.classList.remove("is-hidden");
      if (title) title.textContent = "Welcome back";
      if (sub) sub.textContent = "Sign in to take tests and track your progress.";
    }
    if (title) title.style.opacity = "1";
    if (sub) sub.style.opacity = "1";
  }

  function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    const signinForm = document.getElementById("studentSigninForm");
    const signupForm = document.getElementById("studentSignupForm");
    const title = document.getElementById("studentLoginTitle");
    const sub = document.getElementById("studentLoginSub");
    if (!signinForm || !signupForm) return;

    document.querySelectorAll("#studentLoginOverlay .auth-tab").forEach(function (t) {
      const active = t.dataset.mode === mode;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });

    if (modeTimeoutId) { clearTimeout(modeTimeoutId); modeTimeoutId = null; }

    if (title) title.style.opacity = "0";
    if (sub) sub.style.opacity = "0";

    if (mode === "signup") {
      signinForm.classList.add("is-hidden");
      signupForm.classList.remove("is-hidden");
    } else {
      signupForm.classList.add("is-hidden");
      signinForm.classList.remove("is-hidden");
    }
    clearErrors();

    modeTimeoutId = setTimeout(function () {
      modeTimeoutId = null;
      if (title) title.textContent = mode === "signup" ? "Create your account" : "Welcome back";
      if (sub) sub.textContent = mode === "signup" ? "Free forever. No credit card required." : "Sign in to take tests and track your progress.";
      if (title) title.style.opacity = "1";
      if (sub) sub.style.opacity = "1";
    }, 150);
  }

  function clearErrors() {
    ["studentSigninError", "studentSignupError"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) { el.textContent = ""; el.hidden = true; }
    });
  }

  function setLoading(loading) {
    const buttons = document.querySelectorAll("#studentLoginOverlay button[type='submit'], #studentGoogleBtn");
    buttons.forEach(function (b) { b.disabled = !!loading; });
  }

  function showError(which, msg) {
    const id = which === "signup" ? "studentSignupError" : "studentSigninError";
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  /* ---------- handlers ---------- */

  function handleGoogle() {
    clearErrors();
    setLoading(true);
    window.PK_STUDENT.loginWithGoogle()
      .then(function () { closeModal(); })
      .catch(function (err) {
        const code = (err && err.code) || "";
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          // silent — user closed popup
        } else if (code === "auth/popup-blocked") {
          showError("signin", "Popup blocked. Please allow popups and try again.");
        } else {
          showError("signin", (err && err.message) || "Google sign-in failed");
        }
      })
      .finally(function () { setLoading(false); });
  }

  function handleSignin(e) {
    e.preventDefault();
    clearErrors();
    const emailEl = document.getElementById("studentSigninEmail");
    const passEl = document.getElementById("studentSigninPassword");
    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email) { showError("signin", "Enter your email"); emailEl.focus(); return; }
    if (!password) { showError("signin", "Enter your password"); passEl.focus(); return; }

    setLoading(true);
    window.PK_STUDENT.login(email, password)
      .then(function () { closeModal(); })
      .catch(function (err) {
        const code = (err && err.code) || "";
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
          showError("signin", "Invalid email or password");
        } else if (code === "auth/too-many-requests") {
          showError("signin", "Too many attempts. Try again later.");
        } else {
          showError("signin", (err && err.message) || "Sign-in failed");
        }
      })
      .finally(function () { setLoading(false); });
  }

  function handleSignup(e) {
    e.preventDefault();
    clearErrors();
    const nameEl = document.getElementById("studentSignupName");
    const emailEl = document.getElementById("studentSignupEmail");
    const passEl = document.getElementById("studentSignupPassword");
    const waEl = document.getElementById("studentSignupWhatsApp");
    const dobEl = document.getElementById("studentSignupDob");
    const consEl = document.getElementById("studentSignupAgeConsent");

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passEl.value;
    const wa = waEl.value.replace(/[\s-]/g, "");
    const dob = dobEl ? dobEl.value : "";
    const consent = consEl ? consEl.checked : false;

    if (name.length < 2) { showError("signup", "Please enter your name"); nameEl.focus(); return; }
    if (!email) { showError("signup", "Enter your email"); emailEl.focus(); return; }
    if (password.length < 6) { showError("signup", "Password must be at least 6 characters"); passEl.focus(); return; }
    if (wa.length > 0 && !/^[0-9]{10,15}$/.test(wa)) { showError("signup", "Enter a valid WhatsApp number"); waEl.focus(); return; }
    if (!dob) { showError("signup", "Enter your date of birth"); if (dobEl) dobEl.focus(); return; }
    if (!consent) { showError("signup", "You must confirm the 18+ declaration"); if (consEl) consEl.focus(); return; }

    // Client-side 18+ pre-check (server re-validates)
    const dobMs = Date.parse(dob + "T00:00:00Z");
    const now = new Date();
    let age = now.getUTCFullYear() - new Date(dobMs).getUTCFullYear();
    const md = now.getUTCMonth() - new Date(dobMs).getUTCMonth();
    if (md < 0 || (md === 0 && now.getUTCDate() < new Date(dobMs).getUTCDate())) age--;
    if (age < 18) { showError("signup", "You must be 18 or older to create an account"); if (dobEl) dobEl.focus(); return; }
    if (age > 100) { showError("signup", "Invalid date of birth"); if (dobEl) dobEl.focus(); return; }

    setLoading(true);
    window.PK_STUDENT.signup(email, password, name, wa)
      .then(function (cred) {
        // Submit age verification to backend after Firebase account created
        return cred.user.getIdToken().then(function (token) {
          return fetch("https://preparekora-api.yadavsubba2003.workers.dev/api/age/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ dateOfBirth: dob, ageConsent: true, method: "self_declared" })
          }).then(function (res) {
            if (!res.ok) {
              return res.json().catch(function () { return null; }).then(function (data) {
                throw new Error((data && data.error) || ("Age verification failed: HTTP " + res.status));
              });
            }
            return res.json();
          });
        }).then(function () {
          closeModal();
          document.dispatchEvent(new CustomEvent("pk:age-verified"));
        });
      })
      .catch(function (err) {
        const code = (err && err.code) || "";
        if (code === "auth/email-already-in-use") {
          showError("signup", "An account with this email already exists. Try signing in.");
        } else if (code === "auth/invalid-email") {
          showError("signup", "Invalid email address");
        } else if (code === "auth/weak-password") {
          showError("signup", "Password is too weak");
        } else {
          showError("signup", (err && err.message) || "Sign-up failed");
        }
      })
      .finally(function () { setLoading(false); });
  }

  function handleForgotPassword() {
    clearErrors();
    const emailEl = document.getElementById("studentSigninEmail");
    const email = (emailEl && emailEl.value.trim()) || "";
    if (!email) {
      showError("signin", "Enter your email above, then click Forgot password.");
      if (emailEl) emailEl.focus();
      return;
    }
    window.PK_FIREBASE.ready.then(function () {
      return window.PK_FIREBASE.auth.sendPasswordResetEmail(email);
    }).then(function () {
      const errEl = document.getElementById("studentSigninError");
      if (errEl) {
        errEl.style.color = "var(--muted)";
        errEl.textContent = "Password reset link sent to " + email + ". Check your inbox.";
        errEl.hidden = false;
        setTimeout(function () { errEl.style.color = ""; }, 6000);
      }
    }).catch(function (err) {
      showError("signin", (err && err.message) || "Could not send reset email");
    });
  }

  /* ---------- wiring ---------- */
  function wire() {
    if (modalReady) return;

    const overlay = document.getElementById("studentLoginOverlay");
    if (!overlay) return;

    modalReady = true;

    const closeBtn = document.getElementById("studentLoginClose");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    overlay.querySelectorAll(".auth-tab").forEach(function (tab) {
      tab.addEventListener("click", function () { setMode(tab.dataset.mode); });
    });

    const googleBtn = document.getElementById("studentGoogleBtn");
    if (googleBtn) googleBtn.addEventListener("click", handleGoogle);

    const signinForm = document.getElementById("studentSigninForm");
    if (signinForm) signinForm.addEventListener("submit", handleSignin);

    const signupForm = document.getElementById("studentSignupForm");
    if (signupForm) signupForm.addEventListener("submit", handleSignup);

    const forgot = document.getElementById("studentForgotPassword");
    if (forgot) forgot.addEventListener("click", handleForgotPassword);
  }

  /* ---------- global open event ---------- */

  document.addEventListener("pk:open-login-modal", function (e) {
    const mode = (e && e.detail && e.detail.mode) ? e.detail.mode : "signin";
    openModal(mode);
  });

  /* ---------- public API ---------- */

  window.PK_LOGIN_MODAL = {
    open: openModal,
    close: closeModal
  };

  /* ---------- init ---------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

})();
