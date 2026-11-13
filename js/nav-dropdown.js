"use strict";

(function () {

  function closeAll(exceptMenu) {
    document.querySelectorAll(".nav-dropdown-menu.open").forEach(function (m) {
      if (m === exceptMenu) return;
      m.classList.remove("open");
      m.setAttribute("aria-hidden", "true");
      const t = document.querySelector('.nav-dropdown-toggle[aria-controls="' + m.id + '"]');
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  document.querySelectorAll(".nav-dropdown-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const menuId = btn.getAttribute("aria-controls");
      const menu = menuId ? document.getElementById(menuId) : null;
      if (!menu) return;
      const willOpen = !menu.classList.contains("open");
      closeAll(null);
      if (willOpen) {
        menu.classList.add("open");
        menu.setAttribute("aria-hidden", "false");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest(".nav-dropdown")) return;
    closeAll(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll(null);
  });

  document.querySelectorAll(".nav-dropdown-menu a").forEach(function (a) {
    a.addEventListener("click", function () {
      const menu = a.closest(".nav-dropdown-menu");
      if (menu) {
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        const t = document.querySelector('.nav-dropdown-toggle[aria-controls="' + menu.id + '"]');
        if (t) t.setAttribute("aria-expanded", "false");
      }
    });
  });

})();
