/* ==========================================
   StudyNow — Organization & Exam Navigation
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const organizationId = params.get("org");
    const examId = params.get("exam");

    const organizationConfigs = {
        apsc: {
            name: "APSC",
            category: "STATE EXAMINATIONS",
            description: "Explore APSC examination categories and practice resources.",
            exams: "3 Exam Categories",
            questions: "2,908 MCQs",
            groupId: "org-apsc"
        },
        adre: {
            name: "Assam Direct Recruitment",
            category: "RECRUITMENT EXAMS",
            description: "Explore ADRE examinations and focused recruitment practice.",
            exams: "4 Exam Categories",
            questions: "5,700 MCQs",
            groupId: "org-adre"
        },
        "assam-police": {
            name: "Assam Police",
            category: "UNIFORMED SERVICES",
            description: "Explore police recruitment exams and focused practice resources.",
            exams: "2 Exam Categories",
            questions: "2,000 MCQs",
            groupId: "org-assam-police"
        },
        ssuhs: {
            name: "SSUHS",
            category: "HEALTH EDUCATION",
            description: "Explore healthcare entrance exams and revision resources.",
            exams: "2 Exam Categories",
            questions: "500 MCQs",
            groupId: "org-ssuhs"
        }
    };

    const examConfigs = {
        "assam-vfa": {
            title: "Assam VFA",
            organization: "Recruitment Exam",
            description: "Explore Assam VFA preparation and mock test resources.",
            about: "Use this page to access preparation resources for the Assam VFA examination."
        },
        "anm-entrance": {
            title: "ANM Entrance",
            organization: "Healthcare Entrance",
            description: "Explore ANM entrance preparation and practice resources.",
            about: "Prepare for the ANM entrance examination using available learning and revision resources."
        },
        "adre-grade-iii": {
            title: "ADRE Grade III",
            organization: "Assam Direct Recruitment",
            description: "Explore ADRE Grade III exam preparation and mock tests.",
            about: "The Grade III practice collection is organized for focused exam preparation."
        },
        "adre-grade-iv": {
            title: "ADRE Grade IV",
            organization: "Assam Direct Recruitment",
            description: "Explore ADRE Grade IV exam preparation resources.",
            about: "Use this page to find Grade IV preparation resources when available."
        },
        "driver-recruitment": {
            title: "Driver Recruitment",
            organization: "Assam Direct Recruitment",
            description: "Explore driver recruitment preparation resources.",
            about: "This section is for driver recruitment practice material."
        },
        "adre-other": {
            title: "Other Recruitment Exams",
            organization: "Assam Direct Recruitment",
            description: "Explore other recruitment exam preparation resources.",
            about: "Additional recruitment exam categories can be listed here."
        },
        "assam-police-si": {
            title: "Sub-Inspector Exam",
            organization: "Assam Police",
            description: "Explore Assam Police Sub-Inspector preparation resources.",
            about: "Use this page to explore SI exam practice and revision resources."
        },
        "assam-police-constable": {
            title: "Constable Exam",
            organization: "Assam Police",
            description: "Explore Assam Police constable recruitment practice.",
            about: "This section is for constable recruitment preparation."
        },
        "healthcare-entrance": {
            title: "Healthcare Entrance Exam",
            organization: "SSUHS",
            description: "Explore healthcare entrance preparation resources.",
            about: "This section organizes healthcare entrance practice material."
        },
        "apsc-cce": {
            title: "Combined Competitive Examination",
            organization: "APSC",
            description: "Explore APSC CCE preparation resources.",
            about: "This section is for Combined Competitive Examination preparation."
        },
        "apsc-recruitment": {
            title: "Recruitment Exam Practice",
            organization: "APSC",
            description: "Explore APSC recruitment exam practice.",
            about: "This section organizes APSC recruitment practice resources."
        },
        "apsc-other": {
            title: "Other APSC Practice",
            organization: "APSC",
            description: "Explore additional APSC practice resources.",
            about: "Additional APSC examination resources can be listed here."
        }
    };

    const heroCategory = document.getElementById("organization-category");
    const heroTitle = document.getElementById("organization-title");
    const heroDescription = document.getElementById("organization-description");
    const examCount = document.getElementById("exam-count");
    const questionCount = document.getElementById("question-count");

    const overview = document.getElementById("organizations-overview");
    const organizationExams = document.getElementById("organization-exams");
    const examDetail = document.getElementById("exam-detail");

    const organizationExamsHeading = document.getElementById(
        "organization-exams-heading"
    );
    const organizationExamsDescription = document.getElementById(
        "organization-exams-description"
    );

    const examDetailTitle = document.getElementById("exam-detail-title");
    const examDetailDescription = document.getElementById("exam-detail-description");
    const examDetailAbout = document.getElementById("exam-detail-about");
    const examViewTests = document.getElementById("exam-view-tests");

    const primaryLink = document.getElementById("organization-primary-link");
    const secondaryLink = document.getElementById("organization-secondary-link");

    function setVisible(element, visible) {
        if (!element) return;

        element.hidden = !visible;
        element.style.display = visible ? "" : "none";
    }

    function setPageTitle(title) {
        document.title = `${title} | StudyNow`;
    }

    function showOverview() {
        setVisible(overview, true);
        setVisible(organizationExams, false);
        setVisible(examDetail, false);

        heroCategory.textContent = "EXAM PREPARATION";
        heroTitle.textContent = "Explore Organizations";
        heroDescription.textContent =
            "Find your examination and explore the available practice and revision resources.";
        examCount.textContent = "Multiple Organizations";
        questionCount.textContent = "Exam Preparation";

        primaryLink.href = "#organizations-overview";
        primaryLink.textContent = "Explore Organizations";

        secondaryLink.href = "mock-tests.html";
        secondaryLink.textContent = "Browse Mock Tests";

        setPageTitle("Organizations & Exams");
    }

    function showOrganization(config) {
        setVisible(overview, false);
        setVisible(organizationExams, true);
        setVisible(examDetail, false);

        document.querySelectorAll("[data-org-group]").forEach((group) => {
            setVisible(group, group.dataset.orgGroup === organizationId);
        });

        heroCategory.textContent = config.category;
        heroTitle.textContent = config.name;
        heroDescription.textContent = config.description;
        examCount.textContent = config.exams;
        questionCount.textContent = config.questions;

        organizationExamsHeading.textContent = `${config.name} Exams`;
        organizationExamsDescription.textContent =
            `Select an exam category to view its details.`;

        primaryLink.href = "#organization-exams";
        primaryLink.textContent = "Explore Exams";

        secondaryLink.href = "organization.html";
        secondaryLink.textContent = "All Organizations";

        setPageTitle(`${config.name} Exams`);
    }

    function showExam(config) {
        setVisible(overview, false);
        setVisible(organizationExams, false);
        setVisible(examDetail, true);

        heroCategory.textContent = config.organization;
        heroTitle.textContent = config.title;
        heroDescription.textContent = config.description;
        examCount.textContent = "Exam Details";
        questionCount.textContent = "Practice Resources";

        examDetailTitle.textContent = config.title;
        examDetailDescription.textContent = config.description;
        examDetailAbout.textContent = config.about;

        primaryLink.href = "#exam-detail";
        primaryLink.textContent = "View Exam Details";

        secondaryLink.href = "organization.html";
        secondaryLink.textContent = "All Organizations";

        examViewTests.href =
            `mock-tests.html?exam=${encodeURIComponent(examId)}`;

        setPageTitle(config.title);
    }

    function showNotFound() {
        setVisible(overview, false);
        setVisible(organizationExams, false);
        setVisible(examDetail, true);

        heroCategory.textContent = "STUDYNOW";
        heroTitle.textContent = "Exam Not Found";
        heroDescription.textContent =
            "This exam or organization is unavailable. Return to the organizations list and select an available option.";

        examCount.textContent = "Explore";
        questionCount.textContent = "Available Exams";

        examDetailTitle.textContent = "Unavailable Exam";
        examDetailDescription.textContent =
            "Choose an organization or exam from the available StudyNow listings.";
        examDetailAbout.textContent =
            "This URL does not match a currently available static exam entry.";

        primaryLink.href = "organization.html";
        primaryLink.textContent = "All Organizations";

        secondaryLink.href = "mock-tests.html";
        secondaryLink.textContent = "Browse Mock Tests";

        setPageTitle("Exam Not Found");
    }

    if (examId) {
        const config = examConfigs[examId];

        if (config) {
            showExam(config);
        } else {
            showNotFound();
        }

        return;
    }

    if (organizationId) {
        const config = organizationConfigs[organizationId];

        if (config) {
            showOrganization(config);
        } else {
            showNotFound();
        }

        return;
    }

    showOverview();
});
