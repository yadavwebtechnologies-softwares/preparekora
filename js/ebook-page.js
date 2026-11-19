"use strict";

(function () {
  const API_BASE = "https://preparekora-api.yadavsubba2003.workers.dev/api";
  const WHATSAPP_NUMBER = "916003729522";

  const $id = function (id) {
    return document.getElementById(id);
  };

  let currentEbook = null;
  let selectedPackage = null;
  let authWasLoggedIn = false;

  /* ---------- Helpers ---------- */

  function showNotFound(message) {
    const loading = $id("ebookPageLoading");
    const content = $id("ebookPageContent");
    const notFound = $id("ebookPageNotFound");

    if (loading) loading.hidden = true;
    if (content) content.hidden = true;

    if (notFound) {
      const heading = notFound.querySelector("h2");
      const paragraph = notFound.querySelector("p");

      if (heading) heading.textContent = "Ebook Unavailable";
      if (paragraph) {
        paragraph.textContent = message || "This ebook may have been removed or is currently unavailable.";
      }

      notFound.hidden = false;
    }
  }

  function showEbook() {
    const loading = $id("ebookPageLoading");
    const content = $id("ebookPageContent");
    const notFound = $id("ebookPageNotFound");

    if (loading) loading.hidden = true;
    if (notFound) notFound.hidden = true;
    if (content) content.hidden = false;
  }

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  /* ---------- Load Ebook ---------- */

  async function loadEbook() {
    const params = new URLSearchParams(window.location.search);
    const ebookId = (params.get("id") || "").trim();

    if (!ebookId) {
      showNotFound("No ebook ID was provided.");
      return;
    }

    try {
      const response = await fetch(
        API_BASE + "/ebooks/" + encodeURIComponent(ebookId),
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

      const data = await response.json().catch(function () {
        return null;
      });

      if (!response.ok || !data || !data.ebook) {
        throw new Error(
          (data && data.error) ||
          "This ebook may have been removed or is currently unavailable."
        );
      }

      currentEbook = data.ebook;

      if (!Array.isArray(currentEbook.packages) || currentEbook.packages.length === 0) {
        throw new Error("Ebook package information is unavailable.");
      }

      renderEbook();

      showEbook();

    } catch (err) {
      showNotFound(
        err.message || "Unable to load this ebook. Please try again later."
      );
    }
  }

  /* ---------- Render Ebook ---------- */

  function renderEbook() {
    const ebook = currentEbook;

    document.title = (ebook.title || "Ebook") + " — PrepareKora.in";

    const title = $id("ebookTitle");
    const subtitle = $id("ebookSubtitle");

    if (title) title.textContent = ebook.title || "Ebook";

    if (subtitle) {
      subtitle.textContent = ebook.subtitle || "";
      subtitle.hidden = !ebook.subtitle;
    }

    renderPackages(ebook.packages);
    renderDescription(ebook.sections);
    renderSamplePdf(ebook.samplePdfUrl);
  }

  /* ---------- Package Selection ---------- */

  function renderPackages(packages) {
    const container = $id("ebookPackages");
    if (!container) return;

    container.innerHTML = "";
    selectedPackage = packages[0] || null;

    packages.forEach(function (pkg, index) {
      const label = document.createElement("label");
      label.className = "ebook-package-option";

      const main = document.createElement("div");
      main.className = "ebook-package-option-main";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "ebookPackage";
      radio.value = pkg.key || String(index);
      radio.checked = index === 0;

      const name = document.createElement("span");
      name.className = "ebook-package-option-name";
      name.textContent = pkg.label || "Package";

      main.appendChild(radio);
      main.appendChild(name);

      const prices = document.createElement("div");
      prices.className = "ebook-package-option-prices";

      const price = document.createElement("strong");
      price.textContent = formatPrice(pkg.price);

      prices.appendChild(price);

      if (Number(pkg.mrp) > Number(pkg.price)) {
        const mrp = document.createElement("del");
        mrp.textContent = formatPrice(pkg.mrp);
        prices.appendChild(mrp);

        const saving = document.createElement("span");
        saving.className = "ebook-package-save";
        saving.textContent = "Save " + formatPrice(
          Number(pkg.mrp) - Number(pkg.price)
        );

        prices.appendChild(saving);
      }

      label.appendChild(main);
      label.appendChild(prices);

      radio.addEventListener("change", function () {
        if (!radio.checked) return;

        selectedPackage = pkg;

        updateSelectedPackage();
      });

      container.appendChild(label);
    });

    updateSelectedPackage();
  }

  function updateSelectedPackage() {
    if (!selectedPackage) return;

    const container = $id("ebookPackages");

    if (container) {
      container.querySelectorAll(".ebook-package-option").forEach(function (row) {
        const radio = row.querySelector('input[type="radio"]');
        row.classList.toggle("is-selected", !!(radio && radio.checked));
      });
    }

    const name = $id("ebookSelectedPackage");
    const price = $id("ebookSelectedPrice");
    const mrp = $id("ebookSelectedMrp");
    const saving = $id("ebookSelectedSave");

    if (name) {
      name.textContent = selectedPackage.label || "Package";
    }

    if (price) {
      price.textContent = formatPrice(selectedPackage.price);
    }

    const originalPrice = Number(selectedPackage.mrp) || 0;
    const selectedPrice = Number(selectedPackage.price) || 0;

    if (mrp) {
      if (originalPrice > selectedPrice) {
        mrp.textContent = formatPrice(originalPrice);
        mrp.hidden = false;
      } else {
        mrp.textContent = "";
        mrp.hidden = true;
      }
    }

    if (saving) {
      if (originalPrice > selectedPrice) {
        saving.textContent = "You save " + formatPrice(originalPrice - selectedPrice);
        saving.hidden = false;
      } else {
        saving.textContent = "";
        saving.hidden = true;
      }
    }
  }

  /* ---------- Description Sections ---------- */

  function renderDescription(sections) {
    const container = $id("ebookSections");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(sections) || sections.length === 0) {
      const message = document.createElement("p");
      message.className = "muted-text";
      message.textContent = "Description will be available soon.";

      container.appendChild(message);
      return;
    }

    sections.forEach(function (section) {
      const wrapper = document.createElement("section");
      wrapper.className = "ebook-description-section";

      const heading = document.createElement("h3");
      heading.textContent = section.heading || "";

      const body = document.createElement("p");
      body.textContent = section.body || "";

      wrapper.appendChild(heading);
      wrapper.appendChild(body);

      container.appendChild(wrapper);
    });
  }

  /* ---------- Sample PDF ---------- */

  function renderSamplePdf(url) {
    const wrapper = $id("ebookSampleWrap");
    const button = $id("ebookSampleBtn");

    if (!wrapper || !button) return;

    if (!url) {
      wrapper.hidden = true;
      return;
    }

    try {
      const parsed = new URL(url);

      if (parsed.protocol !== "https:") {
        wrapper.hidden = true;
        return;
      }

      button.href = parsed.href;
      wrapper.hidden = false;

    } catch (err) {
      wrapper.hidden = true;
    }
  }

  /* ---------- Student Authentication ---------- */

  function syncBuyerDetails() {
    const student = window.PK_STUDENT;
    if (!student) return;

    const loggedIn = student.isLoggedIn();

    const nameInput = $id("ebookBuyerName");
    const emailInput = $id("ebookBuyerEmail");
    const whatsappInput = $id("ebookBuyerWhatsApp");
    const hint = $id("ebookBuyerHint");

    if (!nameInput || !emailInput || !whatsappInput) return;

    if (loggedIn) {
      const user = student.getUser() || {};
      const profile = student.getProfile() || {};

      const name = profile.name || user.displayName || "";
      const email = user.email || "";
      const whatsapp = profile.whatsapp || "";

      nameInput.value = name;
      emailInput.value = email;
      whatsappInput.value = whatsapp;

      nameInput.readOnly = !!name;
      emailInput.readOnly = !!email;
      whatsappInput.readOnly = !!whatsapp;

      if (hint) {
        hint.textContent = whatsapp
          ? "Your registered WhatsApp number is being used."
          : "Add your WhatsApp number to receive the payment link.";
      }

      authWasLoggedIn = true;

    } else {
      if (authWasLoggedIn) {
        nameInput.value = "";
        emailInput.value = "";
        whatsappInput.value = "";
      }

      nameInput.readOnly = false;
      emailInput.readOnly = false;
      whatsappInput.readOnly = false;

      if (hint) {
        hint.textContent = "Enter your WhatsApp number to receive the payment link.";
      }

      authWasLoggedIn = false;
    }
  }

  function initStudentAuth() {
    const student = window.PK_STUDENT;

    if (!student) return;

    syncBuyerDetails();

    document.addEventListener("pk:student-auth-changed", function () {
      syncBuyerDetails();
    });

    if (student.ready && typeof student.ready.then === "function") {
      student.ready.then(function () {
        syncBuyerDetails();
      }).catch(function () {});
    }
  }

  /* ---------- Order Form ---------- */

  function submitOrder(event) {
    event.preventDefault();

    const error = $id("ebookBuyerError");
    const button = $id("ebookPayBtn");

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    if (!currentEbook || !selectedPackage) {
      showOrderError("Ebook information is unavailable.");
      return;
    }

    const name = $id("ebookBuyerName").value.trim();
    const email = $id("ebookBuyerEmail").value.trim();
    const whatsapp = $id("ebookBuyerWhatsApp").value.trim();

    if (name.length < 2 || name.length > 60) {
      showOrderError("Please enter a valid full name.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email) || email.length > 254) {
      showOrderError("Please enter a valid email address.");
      return;
    }

    const whatsappDigits = whatsapp.replace(/\D/g, "");

    if (whatsappDigits.length < 10 || whatsappDigits.length > 15) {
      showOrderError("Please enter a valid WhatsApp number.");
      return;
    }

    const message = [
      "New Ebook Order",
      "Book ID: " + currentEbook.id,
      "Book: " + currentEbook.title,
      "Package: " + selectedPackage.label + " — " + formatPrice(selectedPackage.price),
      "",
      "Name: " + name,
      "Email: " + email,
      "WhatsApp: " + whatsapp,
      "",
      "Please share the payment link."
    ].join("\n");

    const whatsappUrl =
      "https://wa.me/" + WHATSAPP_NUMBER +
      "?text=" + encodeURIComponent(message);

    if (button) button.disabled = true;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (button) {
      button.disabled = false;
    }
  }

  function showOrderError(message) {
    const error = $id("ebookBuyerError");

    if (!error) return;

    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- Initialization ---------- */

  function init() {
    const year = $id("ebookCurrentYear");

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    const form = $id("ebookBuyerForm");

    if (form) {
      form.addEventListener("submit", submitOrder);
    }

    initStudentAuth();
    loadEbook();
  }

  init();

})();
