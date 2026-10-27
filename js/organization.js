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

    /*
     * Verified organization and examination-process information.
     * Official references are included to help users verify details.
     * These remain hardcoded during the transition to admin-managed data.
     */
    const organizationData = {
        "apsc": {
            name: "Assam Public Service Commission (APSC)",
            category: "State Public Service Commission",
            filter: "administration",
            description: "Assam's state public service commission responsible for recruitment and advisory functions within its prescribed scope.",
            about: "The Assam Public Service Commission (APSC) performs functions under Article 320 of the Constitution of India and applicable rules. Its responsibilities include advertising and selecting candidates for posts within the Commission's purview and advising the Government of Assam on matters such as service rules, appointment principles, promotions and disciplinary matters affecting state civil services. The exact scope depends on the applicable rules and the particular recruitment notice.",
            resources: [
                { title: "APSC Official Website", description: "Visit the Commission's official website for recruitment advertisements, examination notices, eligibility requirements, schedules and results.", url: "http://apsc.nic.in/", label: "Visit APSC" },
                { title: "APSC Functions — Government of Assam", description: "Read the Assam Government Personnel Department's explanation of the Commission's constitutional functions and responsibilities.", url: "https://personnel.assam.gov.in/about-us/our-divisions-field-offices", label: "Read Official Information" }
            ]
        },
        "adre": {
            name: "Assam Direct Recruitment Examination (ADRE)",
            category: "State Recruitment Process",
            filter: "recruitment",
            description: "A state-level recruitment examination process for specified Assam Government posts, including Grade III and Grade IV recruitment.",
            about: "ADRE means Assam Direct Recruitment Examination. It is a recruitment examination process, not a separate permanent regulatory authority. For state-wide Grade III and Grade IV recruitment, the relevant State Level Recruitment Commissions publish notices and examination-related information for their respective post categories. Candidates should follow the specific recruitment advertisement to confirm the responsible commission, eligibility, selection stages, deadlines and application portal.",
            resources: [
                { title: "State Level Recruitment Commission — Class III", description: "Official portal associated with Class III recruitment. Check the latest notices and confirm that a link applies to your recruitment cycle.", url: "https://slrcg3.sebaonline.org/", label: "Open Class III Portal" },
                { title: "State Level Recruitment Commission — Class IV", description: "Official portal associated with Class IV recruitment. Consult the relevant advertisement for current instructions and candidate updates.", url: "https://slrcg4.sebaonline.org/", label: "Open Class IV Portal" },
                { title: "Government of Assam — SLRC Recruitment Information", description: "Government department information concerning Grade III and Grade IV recruitment through the State Level Recruitment Commissions.", url: "https://directoradulteducation.assam.gov.in/latest/recruitment-of-grade-iii-and-grade-iv-through-slrc", label: "View Government Information" }
            ]
        },
        "assam-police": {
            name: "Assam Police",
            category: "State Police Force",
            filter: "police",
            description: "The state police force responsible for law enforcement, public order and crime prevention and detection in Assam.",
            about: "Assam Police works to maintain law and order, prevent and detect crime, enforce the law impartially and protect the rights of citizens. Recruitment is a separate process from these policing responsibilities. For posts advertised through the State Level Police Recruitment Board (SLPRB), candidates should consult the relevant recruitment notification and official application portal to confirm post-specific eligibility, selection stages and dates.",
            resources: [
                { title: "Assam Police — Mission Statement", description: "Official Government of Assam information explaining the police force's responsibilities, including maintaining order and preventing and detecting crime.", url: "https://police.assam.gov.in/about-us/detail/mission-statement", label: "Read Police Responsibilities" },
                { title: "State Level Police Recruitment Board (SLPRB)", description: "Recruitment portal referenced in Assam Government recruitment notices. Check the latest official advertisement before applying.", url: "http://slprbassam.in/", label: "Open Recruitment Portal" }
            ]
        },
        "ssuhs": {
            name: "Srimanta Sankaradeva University of Health Sciences (SSUHS)",
            category: "State Health Sciences University",
            filter: "health",
            description: "An Assam state university established for health sciences education and academic development.",
            about: "Srimanta Sankaradeva University of Health Sciences was established under the Srimanta Sankaradeva University of Health Sciences Act, 2007, and began in 2009. Its jurisdiction extends across Assam. The University aims to support health sciences education, promote academic development and collaboration, and help maintain uniform standards across health sciences faculties. It also publishes information concerning entrance examinations and admissions for programmes under its responsibility.",
            resources: [
                { title: "SSUHS Official Website", description: "Visit the University website for official announcements, academic information, admission notices and examination updates.", url: "https://ssuhs.ac.in/", label: "Visit SSUHS" },
                { title: "SSUHS — Government of Assam Information", description: "Government of Assam information about the University's establishment, jurisdiction, mission and academic objectives.", url: "https://gmch.assam.gov.in/about-us/affiliated-university-ssuhs", label: "Read University Information" }
            ]
        },
        "assam-tet": {
            name: "Assam Teacher Eligibility Test (TET)",
            category: "Teacher Eligibility Examination",
            filter: "education",
            description: "An eligibility test used in the teacher qualification process under applicable national and state rules.",
            about: "The Teacher Eligibility Test (TET) is an examination, not a government authority or recruiting organisation. It assesses eligibility for specified teaching levels under the applicable rules. Passing TET does not by itself guarantee a teaching appointment: candidates must also meet the required academic and professional qualifications and participate in the relevant recruitment process. The responsible department, examination arrangements and eligible language mediums depend on the specific TET notification.",
            resources: [
                { title: "SCERT Assam — TET Notification", description: "Official State Council of Educational Research and Training information and notifications concerning Assam TET examinations.", url: "https://scert.assam.gov.in/latest/notification-regarding-special-tet-2026-for-up-and-lp-level", label: "Read SCERT Notification" },
                { title: "Special Assam TET Examination Portal", description: "Official examination portal associated with the Special Assam TET 2026 notification. Check whether the notice applies to your category and medium.", url: "https://sebamis.sebaonline.org/spltet2026/", label: "Open Examination Portal" }
            ]
        },
        "ssc": {
            name: "Staff Selection Commission (SSC)",
            category: "Central Government Recruitment Commission",
            filter: "recruitment",
            description: "A central recruitment commission responsible for selecting candidates for specified posts in Government of India organisations.",
            about: "The Staff Selection Commission (SSC) conducts recruitment examinations for specified posts in ministries, departments and other organisations of the Government of India. Its responsibilities include recruitment to covered Group B (non-gazetted) and Group C (non-technical) posts, subject to the applicable rules and exemptions. Different examinations cover different qualifications and post categories, so applicants must check the relevant official notification for eligibility, examination scheme, vacancies and deadlines.",
            resources: [
                { title: "SSC Official Website", description: "Official portal for recruitment advertisements, examination calendars, syllabi, candidate instructions, answer keys and results.", url: "https://ssc.gov.in/", label: "Visit SSC" },
                { title: "SSC — Proactive Disclosures", description: "Official information about the Commission's organisation, functions, responsibilities and public disclosures.", url: "https://ssc.gov.in/rti/proactive-disclosure", label: "Read Official Disclosure" }
            ]
        }
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
        const organization =
            rtdbOrganizations[orgId] || organizationData[orgId];

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

    /* ---------- RTDB integration ---------- */

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

            const existingIds = new Set(
                Array.from(el.grid.querySelectorAll("[data-org-card]"))
                    .map((c) => c.dataset.orgId)
                    .filter(Boolean)
            );

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

                if (!existingIds.has(id)) {
                    el.grid.appendChild(createRemoteOrgCard(id, rtdbOrganizations[id]));
                }
            });

            updateDirectory();
        } catch (error) {
            console.warn("[PrepareKora Organization] Could not load remote organizations.", error);
            updateDirectory();
        }
    }

    const params = new URLSearchParams(window.location.search);
    const requestedOrg = (params.get("org") || "").trim().toLowerCase();

    await loadRemoteOrganizations();

    if (
        requestedOrg &&
        (rtdbOrganizations[requestedOrg] || organizationData[requestedOrg])
    ) {
        renderOrganization(requestedOrg);
    } else {
        updateDirectory();
    }
});
