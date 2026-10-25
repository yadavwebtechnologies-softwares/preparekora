
/* =====================================================
   studyKora — Organization Page
   Search, category filters, organization details,
   exam listings and navigation
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("organization-search");

    const organizationCards = Array.from(
        document.querySelectorAll("[data-org-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-org-filter]")
    );

    const resultCount = document.getElementById(
        "organization-result-count"
    );

    const emptyState = document.getElementById(
        "organization-empty-state"
    );

    const directoryHero = document.getElementById(
        "organization-directory-hero"
    );

    const detailHero = document.getElementById(
        "organization-detail-hero"
    );

    const directorySection = document.getElementById(
        "organization-directory"
    );

    const detailSection = document.getElementById(
        "organization-detail-content"
    );

    const detailTitle = document.getElementById(
        "organization-detail-title"
    );

    const detailCategory = document.getElementById(
        "organization-detail-category"
    );

    const detailDescription = document.getElementById(
        "organization-detail-description"
    );

    const detailExamCount = document.getElementById(
        "organization-detail-exam-count"
    );

    const detailAbout = document.getElementById(
        "organization-detail-about"
    );

    const examList = document.getElementById(
        "organization-exam-list"
    );

    const examEmptyState = document.getElementById(
        "organization-exams-empty"
    );

    if (!organizationCards.length) return;

    /*
     * Frontend sample data.
     * Exam entries are starting points for the UI.
     * Configure verified exam details and question sets
     * before publishing actual practice content.
     */

    const organizations = {
        apsc: {
            name: "APSC",
            fullName: "Assam Public Service Commission",
            category: "Civil Services",
            categoryId: "administration",

            description:
                "Explore preparation areas for examinations conducted by the Assam Public Service Commission.",

            about:
                "Use this section to organize subject-wise practice and mock-test links for APSC examinations. Configure the applicable exam syllabus, question sets and test instructions before publishing.",

            exams: [
                {
                    id: "apsc-cce",
                    name: "APSC Combined Competitive Examination",
                    description: "General studies and competitive exam practice",
                    questions: "Configure question count"
                },
                {
                    id: "apsc-general-studies",
                    name: "APSC General Studies Practice",
                    description: "General studies practice questions",
                    questions: "Practice set"
                }
            ]
        },

        adre: {
            name: "ADRE",
            fullName: "Assam Direct Recruitment Examination",
            category: "Recruitment",
            categoryId: "recruitment",

            description:
                "Explore preparation sections for Assam Direct Recruitment examinations.",

            about:
                "This section is intended for ADRE-related subject practice and mock tests. Configure the relevant grade, syllabus, marking scheme and question set for each examination.",

            exams: [
                {
                    id: "adre-grade-iii",
                    name: "ADRE Grade III",
                    description: "Grade III preparation and practice",
                    questions: "Configure question count"
                },
                {
                    id: "adre-grade-iv",
                    name: "ADRE Grade IV",
                    description: "Grade IV preparation and practice",
                    questions: "Configure question count"
                }
            ]
        },

        "assam-police": {
            name: "Assam Police",
            fullName: "Assam Police Recruitment",
            category: "Police Recruitment",
            categoryId: "police",

            description:
                "Find preparation sections for Assam Police recruitment examinations.",

            about:
                "Use this section to organize police recruitment practice tests. Add verified syllabus topics, eligibility-specific test sets and accurate exam instructions before publishing.",

            exams: [
                {
                    id: "assam-police-si",
                    name: "Assam Police Sub-Inspector",
                    description: "Sub-Inspector recruitment practice",
                    questions: "Configure question count"
                },
                {
                    id: "assam-police-constable",
                    name: "Assam Police Constable",
                    description: "Constable recruitment practice",
                    questions: "Configure question count"
                }
            ]
        },

        ssuhs: {
            name: "SSUHS",
            fullName:
                "Srimanta Sankaradeva University of Health Sciences",

            category: "Health Sciences",
            categoryId: "health",

            description:
                "Explore health sciences entrance and examination preparation sections.",

            about:
                "This section can contain nursing entrance and health sciences practice material. Verify the admission process, examination details and syllabus for each applicable course.",

            exams: [
                {
                    id: "anm-entrance",
                    name: "ANM Entrance Practice",
                    description: "Nursing entrance preparation",
                    questions: "Configure question count"
                },
                {
                    id: "health-sciences-practice",
                    name: "Health Sciences Practice",
                    description: "Health sciences subject practice",
                    questions: "Practice set"
                }
            ]
        },

        "assam-tet": {
            name: "Assam TET",
            fullName: "Assam Teacher Eligibility Test",
            category: "Education",
            categoryId: "education",

            description:
                "Explore teacher eligibility exam preparation sections.",

            about:
                "This section can organize teaching aptitude, language, child development and subject-based practice. Configure the relevant paper and syllabus before publishing test material.",

            exams: [
                {
                    id: "assam-tet-paper-i",
                    name: "TET Paper I Practice",
                    description: "Primary-level teacher eligibility preparation",
                    questions: "Practice set"
                },
                {
                    id: "assam-tet-paper-ii",
                    name: "TET Paper II Practice",
                    description: "Upper-primary teacher eligibility preparation",
                    questions: "Practice set"
                }
            ]
        },

        ssc: {
            name: "SSC",
            fullName: "Staff Selection Commission",
            category: "Recruitment",
            categoryId: "recruitment",

            description:
                "Explore general recruitment preparation sections for SSC examinations.",

            about:
                "Use this section to organize reasoning, quantitative aptitude, English and general awareness practice for relevant SSC exams.",

            exams: [
                {
                    id: "ssc-general-practice",
                    name: "SSC General Practice",
                    description: "Reasoning, aptitude and general awareness",
                    questions: "Practice set"
                }
            ]
        }
    };

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getOrganizationFromCard(card) {
        return organizations[card.dataset.orgId] || null;
    }

    /* Search and filter organizations */

    function updateResults() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        organizationCards.forEach((card) => {
            const organization = getOrganizationFromCard(card);

            if (!organization) {
                card.hidden = true;
                return;
            }

            const searchableText = normalize([
                organization.name,
                organization.fullName,
                organization.category,
                organization.description,
                card.textContent
            ].join(" "));

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                organization.categoryId === activeCategory;

            const isVisible = matchesSearch && matchesCategory;

            card.hidden = !isVisible;

            if (isVisible) visibleCount += 1;
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${
                    visibleCount === 1 ? "organization" : "organizations"
                } found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    function setActiveCategory(category) {
        activeCategory = category;

        filterButtons.forEach((button) => {
            const isActive =
                button.dataset.orgFilter === category;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        updateResults();
    }

    /* Create an exam card safely */

    function createExamCard(exam) {
        const link = document.createElement("a");
        link.className = "test-card";
        link.href = `test.html?test=${encodeURIComponent(exam.id)}`;

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", "5");
        rect.setAttribute("y", "3");
        rect.setAttribute("width", "14");
        rect.setAttribute("height", "18");
        rect.setAttribute("rx", "2");
        rect.setAttribute("stroke", "currentColor");
        rect.setAttribute("stroke-width", "1.7");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M9 8h6M9 12h6M9 16h4");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.7");
        path.setAttribute("stroke-linecap", "round");

        svg.append(rect, path);
        icon.appendChild(svg);

        const content = document.createElement("span");
        content.className = "test-card-content";

        const title = document.createElement("span");
        title.className = "test-card-title";
        title.textContent = exam.name;

        const metadata = document.createElement("span");
        metadata.className = "test-card-meta";

        const description = document.createElement("span");
        description.textContent = exam.description;

        const questionCount = document.createElement("span");
        questionCount.textContent = exam.questions;

        metadata.append(description, questionCount);
        content.append(title, metadata);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        link.append(icon, content, arrow);

        return link;
    }

    /* Display selected organization */

    function showOrganization(organizationId) {
        const organization = organizations[organizationId];

        if (!organization) return false;

        if (directoryHero) directoryHero.hidden = true;
        if (directorySection) directorySection.hidden = true;
        if (detailHero) detailHero.hidden = false;
        if (detailSection) detailSection.hidden = false;

        if (detailTitle) {
            detailTitle.textContent = organization.fullName;
        }

        if (detailCategory) {
            detailCategory.textContent = organization.category;
        }

        if (detailDescription) {
            detailDescription.textContent =
                organization.description;
        }

        if (detailAbout) {
            detailAbout.textContent = organization.about;
        }

        if (detailExamCount) {
            const count = organization.exams.length;

            detailExamCount.textContent =
                `${count} ${count === 1 ? "exam entry" : "exam entries"}`;
        }

        if (examList) {
            examList.replaceChildren();

            organization.exams.forEach((exam) => {
                examList.appendChild(createExamCard(exam));
            });
        }

        if (examEmptyState) {
            examEmptyState.hidden = organization.exams.length > 0;
        }

        document.title =
            `${organization.name} Exams | studyKora`;

        return true;
    }

    /* Initialize search */

    if (searchInput) {
        searchInput.addEventListener("input", updateResults);
    }

    /* Initialize category filters */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.orgFilter;

            if (category) {
                setActiveCategory(category);
            }
        });
    });

    /* Load an organization selected through the URL */

    const params = new URLSearchParams(window.location.search);
    const requestedOrganization = normalize(params.get("org"));

    if (requestedOrganization && organizations[requestedOrganization]) {
        showOrganization(requestedOrganization);
    } else {
        if (directoryHero) directoryHero.hidden = false;
        if (directorySection) directorySection.hidden = false;
        if (detailHero) detailHero.hidden = true;
        if (detailSection) detailSection.hidden = true;

        updateResults();
    }
});
