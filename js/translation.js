"use strict";

/*
  PrepareKora translation layer.
  UI strings hardcoded (EN + AS). Dynamic content via Worker /api/translate.
*/

(function () {

  const STRINGS = {
    en: {
      navAbout: "About", navFindUs: "Find Us",
      mockTestsHeading: "Mock Tests",
      mockTestsSub: "Explore mock tests and prepare for your next exam.",
      today: "Today", yesterday: "Yesterday", earlier: "Earlier",
      noMockTests: "No mock tests available.",
      searchPlaceholder: "Search tests or teachers...",
      searchHint: "Search for a mock test or teacher.",
      noMatches: "No matching mock tests found.",
      start: "Start", questionsUnit: "Questions", minutesUnit: "Minutes",
      byLine: "By {name}", loading: "Loading…", loadFailed: "Could not load. Please refresh.",
      mockTestEyebrow: "Mock Test", questions: "Questions", minutes: "Minutes", marks: "Marks",
      rule1: "Each question carries 1 mark.",
      rule2: "There is no negative marking.",
      rule3: "The test is submitted automatically when the timer ends.",
      startTest: "Start Test",
      almostThere: "Almost there", enterDetails: "Enter your details",
      testLabel: "Test", yourName: "Your name",
      yourWhatsApp: "WhatsApp number (optional)",
      whatsAppHint: "Only used by the publisher if needed.",
      requiredField: "This field is required.",
      nameTooShort: "Name must be at least 2 characters.",
      nameTooLong: "Name is too long.",
      invalidWhatsApp: "Enter a valid WhatsApp number.",
      beginTest: "Begin test", back: "Back",
      questionOf: "Question {n} of {total}",
      markForReview: "Mark for review", unmarkReview: "Unmark review",
      clearResponse: "Clear response", previous: "Previous", next: "Next",
      submitTest: "Submit test", paletteBtn: "Questions", paletteTitle: "Questions",
      legendAnswered: "Answered", legendNotAnswered: "Not answered",
      legendMarked: "Marked", legendCurrent: "Current",
      statusAnswered: "Answered", statusNotAnswered: "Not answered",
      statusMarked: "Marked for review", statusNotVisited: "Not visited",
      confirmTitle: "Submit test?",
      confirmAnswered: "Answered", confirmUnanswered: "Unanswered", confirmMarked: "Marked",
      cancel: "Cancel", confirmYes: "Submit",
      timeUp: "Time is up. Your test has been submitted.",
      oneMinuteLeft: "One minute remaining.",
      resultEyebrow: "Result", correct: "Correct", wrong: "Wrong",
      unattempted: "Unattempted", timeTaken: "Time taken",
      download: "Download result", retake: "Retake", home: "Home",
      optionsLegend: "Answer options",
      scoreOf: "{a} of {b} correct",
      testNotFound: "Test not found",
      testNotFoundSub: "The test you are looking for does not exist or was removed.",
      backToHome: "Back to home", closeSearch: "Close search",
      resultPngTitle: "MOCK TEST RESULT", resultPngDate: "Date", resultPngName: "Name",
      adminLogin: "Admin login", adminLoginSub: "Sign in to manage your tests.",
      username: "Username", password: "Password", signIn: "Sign in", signOut: "Sign out",
      invalidLogin: "Invalid username or password.",
      dashboard: "Dashboard", myTests: "My tests", newTest: "New test", settings: "Settings",
      displayName: "Display name", save: "Save", saved: "Saved", delete: "Delete", edit: "Edit",
      copyUrl: "Copy URL", urlCopied: "Link copied",
      publish: "Publish", unpublish: "Unpublish", draft: "Draft", published: "Published",
      noTests: "No tests yet. Create your first test.",
      confirmDelete: "Delete this test permanently?",
      confirmPublish: "Publish this test? Students will see it on the homepage.",
      confirmUnpublish: "Unpublish this test? It will be hidden from the homepage.",
      testTitle: "Test title", durationMinutes: "Duration (minutes)",
      addQuestion: "Add question", removeQuestion: "Remove",
      questionText: "Question", optionText: "Option", correctAnswer: "Correct answer",
      saveDraft: "Save draft", publishNow: "Publish now",
      backToDashboard: "Back to dashboard", backToTests: "Back to tests",
      deleteQuestion: "Delete question",
      testCreated: "Test created", testUpdated: "Test updated", testDeleted: "Test deleted",
      testPublished: "Test published", testUnpublished: "Test unpublished",
      fillAllFields: "Please fill all required fields.",
      atLeastOneQuestion: "Add at least one question.",
      needAnswer: "Mark the correct answer for every question.",
      nameUpdated: "Display name updated", saving: "Saving…", required: "Required",

      interruptTitle: "Test Interrupted",
      interruptBody: "You left the test screen. Please stay on the test page.",
      resumeTest: "Resume test",
      terminatedTitle: "Test Terminated",
      terminatedBody: "You have exceeded the allowed limit for leaving the test screen. You cannot restart this test in this session.",
      interruptWarn: "Warning {n} of {total}",

      adminInterruption: "Interruption warnings",
      adminInterruptionEnable: "Enable interruption warnings",
      adminInterruptionEnableHint: "When enabled, switching tabs during a test counts as a violation.",
      adminInterruptionDuration: "Termination cooldown (minutes)",
      adminInterruptionDurationHint: "After 5 violations, the student is blocked from retaking for this many minutes."
    },

    as: {
      navAbout: "আমাৰ বিষয়ে", navFindUs: "আমাক বিচাৰক",
      mockTestsHeading: "মক টেষ্ট",
      mockTestsSub: "মক টেষ্ট চাওক আৰু পৰীক্ষাৰ বাবে প্ৰস্তুতি চলাওক।",
      today: "আজি", yesterday: "যোৱাকালি", earlier: "পূৰ্বে",
      noMockTests: "কোনো মক টেষ্ট উপলব্ধ নাই।",
      searchPlaceholder: "পৰীক্ষা বা শিক্ষক বিচাৰক...",
      searchHint: "মক টেষ্ট বা শিক্ষক বিচাৰক।",
      noMatches: "কোনো মিল থকা মক টেষ্ট পোৱা নগ'ল।",
      start: "আৰম্ভ", questionsUnit: "প্ৰশ্ন", minutesUnit: "মিনিট",
      byLine: "{name}ৰ দ্বাৰা", loading: "লোড হৈ আছে…",
      loadFailed: "লোড কৰিব পৰা নগ'ল। পুনৰ লোড কৰক।",
      mockTestEyebrow: "মক টেষ্ট", questions: "প্ৰশ্ন", minutes: "মিনিট", marks: "নম্বৰ",
      rule1: "প্ৰতিটো প্ৰশ্নৰ বাবে ১ নম্বৰ।",
      rule2: "ঋণাত্মক নম্বৰ কটা নহয়।",
      rule3: "সময় শেষ হ'লে পৰীক্ষা স্বয়ংক্ৰিয়ভাৱে জমা হ'ব।",
      startTest: "পৰীক্ষা আৰম্ভ কৰক",
      almostThere: "প্ৰায় সম্পূৰ্ণ", enterDetails: "আপোনাৰ তথ্য দিয়ক",
      testLabel: "পৰীক্ষা", yourName: "আপোনাৰ নাম",
      yourWhatsApp: "হোৱাটছএপ নম্বৰ (ঐচ্ছিক)",
      whatsAppHint: "প্ৰয়োজন হ'লে প্ৰকাশকে ব্যৱহাৰ কৰিব পাৰে।",
      requiredField: "এই ক্ষেত্ৰখন পূৰণ কৰাটো আৱশ্যক।",
      nameTooShort: "নাম কমেও ২ আখৰৰ হ'ব লাগিব।",
      nameTooLong: "নাম অতি দীঘল।",
      invalidWhatsApp: "বৈধ হোৱাটছএপ নম্বৰ দিয়ক।",
      beginTest: "পৰীক্ষা আৰম্ভ কৰক", back: "পিছলৈ",
      questionOf: "প্ৰশ্ন {n} / {total}",
      markForReview: "পৰ্যালোচনাৰ বাবে চিহ্নিত কৰক", unmarkReview: "চিহ্ন আঁতৰাওক",
      clearResponse: "উত্তৰ মচক", previous: "পূৰ্বৱৰ্তী", next: "পৰৱৰ্তী",
      submitTest: "পৰীক্ষা জমা দিয়ক", paletteBtn: "প্ৰশ্ন", paletteTitle: "প্ৰশ্নসমূহ",
      legendAnswered: "উত্তৰ দিয়া", legendNotAnswered: "উত্তৰ নিদিয়া",
      legendMarked: "চিহ্নিত", legendCurrent: "বৰ্তমান",
      statusAnswered: "উত্তৰ দিয়া হৈছে", statusNotAnswered: "উত্তৰ দিয়া নাই",
      statusMarked: "পৰ্যালোচনাৰ বাবে চিহ্নিত", statusNotVisited: "পৰিদৰ্শন কৰা নাই",
      confirmTitle: "পৰীক্ষা জমা দিবনে?",
      confirmAnswered: "উত্তৰ দিয়া", confirmUnanswered: "উত্তৰ নিদিয়া", confirmMarked: "চিহ্নিত",
      cancel: "বাতিল", confirmYes: "জমা দিয়ক",
      timeUp: "সময় শেষ। আপোনাৰ পৰীক্ষা জমা কৰা হৈছে।",
      oneMinuteLeft: "এক মিনিট বাকী আছে।",
      resultEyebrow: "ফলাফল", correct: "শুদ্ধ", wrong: "ভুল",
      unattempted: "উত্তৰ নিদিয়া", timeTaken: "লগা সময়",
      download: "ফলাফল ডাউনলোড কৰক", retake: "পুনৰ চেষ্টা", home: "মুখ্য পৃষ্ঠা",
      optionsLegend: "উত্তৰৰ বিকল্পসমূহ",
      scoreOf: "{a} / {b} শুদ্ধ",
      testNotFound: "পৰীক্ষা পোৱা নগ'ল",
      testNotFoundSub: "আপুনি বিচৰা পৰীক্ষাটো নাই বা আঁতৰোৱা হৈছে।",
      backToHome: "মুখ্য পৃষ্ঠালৈ ঘূৰি যাওক", closeSearch: "সন্ধান বন্ধ কৰক",
      resultPngTitle: "মক টেষ্টৰ ফলাফল", resultPngDate: "তাৰিখ", resultPngName: "নাম",
      adminLogin: "প্ৰশাসক লগইন",
      adminLoginSub: "আপোনাৰ পৰীক্ষা পৰিচালনা কৰিবলৈ ছাইন ইন কৰক।",
      username: "ব্যৱহাৰকাৰী নাম", password: "পাছৱৰ্ড",
      signIn: "ছাইন ইন", signOut: "ছাইন আউট",
      invalidLogin: "অবৈধ ব্যৱহাৰকাৰী নাম বা পাছৱৰ্ড।",
      dashboard: "ডেশব'ৰ্ড", myTests: "মোৰ পৰীক্ষা", newTest: "নতুন পৰীক্ষা",
      settings: "ছেটিংছ", displayName: "প্ৰদৰ্শন নাম",
      save: "চেছ কৰক", saved: "চেছ হ'ল", delete: "মচক", edit: "সম্পাদনা",
      copyUrl: "URL কপি কৰক", urlCopied: "লিংক কপি হ'ল",
      publish: "প্ৰকাশ", unpublish: "অপ্ৰকাশ", draft: "খচৰা", published: "প্ৰকাশিত",
      noTests: "এতিয়ালৈকে কোনো পৰীক্ষা নাই। প্ৰথম পৰীক্ষা সৃষ্টি কৰক।",
      confirmDelete: "এই পৰীক্ষাটো স্থায়ীভাৱে মচিবনে?",
      confirmPublish: "এই পৰীক্ষাটো প্ৰকাশ কৰিবনে? ছাত্ৰ-ছাত্ৰীয়ে ইয়াক দেখিব।",
      confirmUnpublish: "এই পৰীক্ষাটো অপ্ৰকাশ কৰিবনে? ই গোপন হ'ব।",
      testTitle: "পৰীক্ষাৰ শিৰোনাম", durationMinutes: "সময় (মিনিট)",
      addQuestion: "প্ৰশ্ন যোগ কৰক", removeQuestion: "আঁতৰাওক",
      questionText: "প্ৰশ্ন", optionText: "বিকল্প", correctAnswer: "শুদ্ধ উত্তৰ",
      saveDraft: "খচৰা চেছ কৰক", publishNow: "এতিয়া প্ৰকাশ কৰক",
      backToDashboard: "ডেশব'ৰ্ডলৈ ঘূৰি যাওক", backToTests: "পৰীক্ষাসমূহলৈ ঘূৰি যাওক",
      deleteQuestion: "প্ৰশ্ন মচক",
      testCreated: "পৰীক্ষা সৃষ্টি হ'ল", testUpdated: "পৰীক্ষা আপডেট হ'ল",
      testDeleted: "পৰীক্ষা মচা হ'ল", testPublished: "পৰীক্ষা প্ৰকাশ হ'ল",
      testUnpublished: "পৰীক্ষা অপ্ৰকাশ হ'ল",
      fillAllFields: "সকলো প্ৰয়োজনীয় ক্ষেত্ৰ পূৰণ কৰক।",
      atLeastOneQuestion: "কমেও এটা প্ৰশ্ন যোগ কৰক।",
      needAnswer: "প্ৰতিটো প্ৰশ্নৰ বাবে শুদ্ধ উত্তৰ চিহ্নিত কৰক।",
      nameUpdated: "প্ৰদৰ্শন নাম আপডেট হ'ল", saving: "চেছ হৈ আছে…", required: "আৱশ্যক",

      interruptTitle: "পৰীক্ষা বাধাগ্ৰস্ত",
      interruptBody: "আপুনি পৰীক্ষাৰ পৃষ্ঠা এৰি গৈছে। অনুগ্ৰহ কৰি পৰীক্ষাৰ পৃষ্ঠাত থাকক।",
      resumeTest: "পৰীক্ষা পুনৰ আৰম্ভ কৰক",
      terminatedTitle: "পৰীক্ষা বন্ধ কৰা হ'ল",
      terminatedBody: "আপুনি পৰীক্ষাৰ পৃষ্ঠা এৰি যোৱাৰ অনুমোদিত সীমা অতিক্ৰম কৰিছে। এই ছেছনত আপুনি এই পৰীক্ষা পুনৰ আৰম্ভ কৰিব নোৱাৰিব।",
      interruptWarn: "সতৰ্কবাণী {n} / {total}",

      adminInterruption: "পৰীক্ষা বাধাৰ সতৰ্কবাণী",
      adminInterruptionEnable: "বাধাৰ সতৰ্কবাণী সক্ৰিয় কৰক",
      adminInterruptionEnableHint: "সক্ৰিয় থাকিলে, পৰীক্ষাৰ সময়ত টেব সলনি কৰিলে বাধা হিচাপে গণনা কৰা হ'ব।",
      adminInterruptionDuration: "বন্ধৰ সময় (মিনিট)",
      adminInterruptionDurationHint: "৫ বাৰ বাধাৰ পিছত, ছাত্ৰ-ছাত্ৰীক ইমান মিনিটলৈ পুনৰ পৰীক্ষা দিবলৈ অনুমতি নাথাকিব।"
    }
  };

  const CACHE_KEY = "pk_translate_cache_v1";
  const MAX_CACHE = 1000;
  let cache = {};

  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) cache = JSON.parse(saved) || {};
  } catch (e) { cache = {}; }

  function saveCache() {
    try {
      const keys = Object.keys(cache);
      if (keys.length > MAX_CACHE) {
        const trimmed = {};
        keys.slice(-MAX_CACHE).forEach(function (k) { trimmed[k] = cache[k]; });
        cache = trimmed;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* quota */ }
  }

  function readSaved() {
    try {
      const saved = localStorage.getItem("pk_lang");
      if (saved === "as" || saved === "en") return saved;
    } catch (e) { /* ignore */ }
    return "en";
  }

  const PK = {
    lang: readSaved(),

    t: function (key, vars) {
      const pack = STRINGS[this.lang] || STRINGS.en;
      let text = pack[key] !== undefined ? pack[key] : (STRINGS.en[key] || key);
      if (vars) {
        Object.keys(vars).forEach(function (name) {
          text = text.split("{" + name + "}").join(vars[name]);
        });
      }
      return text;
    },

    locale: function () {
      return this.lang === "as" ? "as-IN" : "en-IN";
    },

    translate: async function (text, target) {
      target = target || this.lang;
      if (!text || typeof text !== "string") return text;
      if (target === "en") return text;

      const key = target + ":" + text.trim();
      if (cache[key]) return cache[key];

      try {
        const result = await window.PK_API.translate(text, target, "en");
        const translated =
          (result && result.translated && String(result.translated).trim()) || text;
        cache[key] = translated;
        saveCache();
        return translated;
      } catch (err) { return text; }
    },

    translateMany: async function (items, target) {
      target = target || this.lang;
      if (!Array.isArray(items)) return [];
      if (target === "en") return items;

      const results = new Array(items.length);
      const pending = [];

      items.forEach(function (item, i) {
        if (!item || typeof item !== "string") { results[i] = item; return; }
        const key = target + ":" + item.trim();
        if (cache[key]) results[i] = cache[key];
        else pending.push({ index: i, text: item });
      });

      if (!pending.length) return results;

      const BATCH = 5;
      for (let i = 0; i < pending.length; i += BATCH) {
        const slice = pending.slice(i, i + BATCH);
        const translated = await Promise.all(
          slice.map(function (entry) { return PK.translate(entry.text, target); })
        );
        slice.forEach(function (entry, j) { results[entry.index] = translated[j]; });
      }
      return results;
    },

    setLang: function (newLang) {
      if (newLang !== "en" && newLang !== "as") return;
      if (newLang === this.lang) return;

      this.lang = newLang;
      try { localStorage.setItem("pk_lang", newLang); } catch (e) { /* ignore */ }

      applyAll();

      document.dispatchEvent(new CustomEvent("pk:langchange", {
        detail: { lang: newLang }
      }));
    },

    clearCache: function () {
      cache = {};
      try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ }
    }
  };

  window.PK = PK;

  function applyAll() {
    document.documentElement.lang = PK.lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = PK.t(el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", PK.t(el.dataset.i18nPlaceholder));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", PK.t(el.dataset.i18nAriaLabel));
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      const active = btn.dataset.lang === PK.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  document.addEventListener("click", function (event) {
    const btn = event.target.closest(".lang-btn");
    if (!btn) return;
    const next = btn.dataset.lang;
    if (next) PK.setLang(next);
  });

  document.addEventListener("DOMContentLoaded", applyAll);
  if (document.readyState !== "loading") applyAll();
})();
