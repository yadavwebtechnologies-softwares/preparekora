"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const DB_BASE = "https://studykora-fc91d-default-rtdb.firebaseio.com";

    const el = {
        directoryHero: document.getElementById("organization-directory-hero"),
        detailHero: document.getElementById("organization-detail-hero"),
        directory: document.getElementById("organization-directory"),
        detailContent: document.getElementById("organization-detail-content"),

        search: document.getElementById("organization-search"),
        filters: document.getElementById("organization-filters"),
        grid: document.getElementById("organization-grid"),
        resultCount: document.getElementById("organization-result-count"),
        emptyState: document.getElementById("organization-empty-state"),

        category: document.getElementById("organization-detail-category"),
        title: document.getElementById("organization-detail-title"),
        description: document.getElementById("organization-detail-description"),
        resourceCount: document.getElementById("organization-detail-exam-count"),

        about: document.getElementById("organization-detail-about"),
        resourceList: document.getElementById("organization-exam-list"),
        resourcesEmpty: document.getElementById("organization-exams-empty")
    };

    const rtdbOrganizations = {};

    function createElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function deriveFilter(category) {
        const c = String(category || "").toLowerCase();
        if (c.includes("police")) return "police";
        if (c.includes("health") || c.includes("nursing")) return "health";
        if (c.includes("teacher") || c.includes("tet")) return "education";
        if (c.includes("recruitment")) return "recruitment";
        if (c.includes("public service") || c.includes("commission") || c.includes("administration")) return "administration";
        return "other";
    }

    function updateDirectory() {
        if (!el.grid) return;

        const searchTerm = el.search
            ? el.search.value.trim().toLowerCase()
            : "";

        const activeButton = el.filters
            ? el.filters.querySelector('[data-org-filter][aria-pressed="true"]')
            : null;

        const activeFilter = activeButton
            ? activeButton.dataset.orgFilter
            : "all";

        const cards = Array.from(
            el.grid.querySelectorAll("[data-org-card]")
        );

        let visibleCount = 0;

        cards.forEach((card) => {
            const name = card.dataset.orgName || "";
            const id = card.dataset.orgId || "";
            const category = card.dataset.orgCategory || "";
            const description =
                card.querySelector(".card-description")?.textContent || "";

            const searchText =
                `${name} ${id} ${category} ${description}`.toLowerCase();

            const matchesSearch = searchText.includes(searchTerm);
            const matchesCategory =
                activeFilter === "all" || category === activeFilter;
            const visible = matchesSearch && matchesCategory;

            card.hidden = !visible;
            if (visible) visibleCount++;
        });

        if (el.resultCount) {
            el.resultCount.textContent =
                `Showing ${visibleCount} of ${cards.length} organizations.`;
        }

        if (el.emptyState) {
            el.emptyState.hidden = visibleCount > 0;
        }
    }

    if (el.search) {
        el.search.addEventListener("input", updateDirectory);
    }

    if (el.filters) {
        el.filters.addEventListener("click", (event) => {
            const button = event.target.closest("[data-org-filter]");
            if (!button || !el.filters.contains(button)) return;

            el.filters
                .querySelectorAll("[data-org-filter]")
                .forEach((filterButton) => {
                    const selected = filterButton === button;
                    filterButton.classList.toggle("is-active", selected);
                    filterButton.setAttribute("aria-pressed", String(selected));
                });

            updateDirectory();
        });
    }

    function renderOrganization(orgId) {
        const organization = rtdbOrganizations[orgId];
        if (!organization) return false;

        if (el.directoryHero) el.directoryHero.hidden = true;
        if (el.directory) el.directory.hidden = true;
        if (el.detailHero) el.detailHero.hidden = false;
        if (el.detailContent) el.detailContent.hidden = false;
        if (el.category) el.category.textContent = organization.category;
        if (el.title) el.title.textContent = organization.name;
        if (el.description) el.description.textContent = organization.description;
        if (el.about) el.about.textContent = organization.about || organization.description;

        const resources = Array.isArray(organization.resources) ? organization.resources : [];

        if (el.resourceCount) {
            el.resourceCount.textContent =
                `${resources.length} official reference${resources.length === 1 ? "" : "s"}`;
        }

        document.title = `${organization.name} | preparekora.in`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = organization.description;
        }

        if (el.resourceList) {
            el.resourceList.replaceChildren();
            resources.forEach((resource) => {
                const link = createElement("a", "test-card");
                link.href = resource.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.setAttribute("aria-label", `${resource.title} — opens in a new tab`);

                const icon = createElement("span", "card-icon", "↗");
                icon.setAttribute("aria-hidden", "true");

                const content = createElement("span", "test-card-content");
                const title = createElement("span", "test-card-title", resource.title);
                const description = createElement("span", "test-card-meta", resource.description);
                const label = createElement("span", "card-description", resource.label);
                content.append(title, description, label);

                const arrow = createElement("span", "card-arrow", "›");
                arrow.setAttribute("aria-hidden", "true");

                link.append(icon, content, arrow);
                el.resourceList.appendChild(link);
            });
        }

        if (el.resourcesEmpty) {
            el.resourcesEmpty.hidden = resources.length > 0;
        }

        return true;
    }

    function createRemoteOrgCard(id, org) {
        const link = createElement("a", "listing-card");
        link.href = `organization.html?org=${encodeURIComponent(id)}`;
        link.setAttribute("data-org-card", "");
        link.dataset.orgId = id;
        link.dataset.orgName = org.name;
        link.dataset.orgCategory = org.filter;

        const icon = createElement("span", "card-icon");
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none">' +
            '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
            '</svg>';

        const content = createElement("span", "card-content");
        const title = createElement("span", "card-title", org.name);
        const desc = createElement(
            "span",
            "card-description",
            org.description || org.category || ""
        );
        content.append(title, desc);

        const arrow = createElement("span", "card-arrow", "›");
        arrow.setAttribute("aria-hidden", "true");

        link.append(icon, content, arrow);
        return link;
    }

    async function loadRemoteOrganizations() {
        if (!el.grid) return;
        try {
            const response = await fetch(`${DB_BASE}/organizations.json`, {
                cache: "no-store"
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orgs = await response.json();
            if (!orgs || typeof orgs !== "object") {
                updateDirectory();
                return;
            }

            Object.entries(orgs).forEach(([id, org]) => {
                if (!org || typeof org !== "object") return;
                if (org.published === false) return;

                rtdbOrganizations[id] = {
                    name: org.name || id,
                    category: org.category || "Exam Organization",
                    filter: deriveFilter(org.category),
                    description: org.description || "",
                    about: org.about || org.description || "",
                    resources: Array.isArray(org.resources) ? org.resources : []
                };

                el.grid.appendChild(createRemoteOrgCard(id, rtdbOrganizations[id]));
            });

            updateDirectory();
        } catch (error) {
            console.warn("[PrepareKora Organization] Could not load organizations.", error);
            updateDirectory();
        }
    }

    const params = new URLSearchParams(window.location.search);
    const requestedOrg = (params.get("org") || "").trim().toLowerCase();

    await loadRemoteOrganizations();

    if (requestedOrg && rtdbOrganizations[requestedOrg]) {
        renderOrganization(requestedOrg);
    } else {
        updateDirectory();
    }
});
