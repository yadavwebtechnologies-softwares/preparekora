
/* =====================================================
   studyKora — Subject Page
   Search, filters, subject details and topic navigation
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("subject-search");
    const subjectCards = Array.from(
        document.querySelectorAll("[data-subject-card]")
    );

    const filterButtons = Array.from(
        document.querySelectorAll("[data-subject-filter]")
    );

    const resultCount = document.getElementById("subject-result-count");
    const emptyState = document.getElementById("subject-empty-state");

    const directoryHero = document.getElementById("subject-directory-hero");
    const detailHero = document.getElementById("subject-detail-hero");
    const directorySection = document.getElementById("subject-directory");
    const detailSection = document.getElementById("subject-detail-content");

    const detailTitle = document.getElementById("subject-detail-title");
    const detailCategory = document.getElementById("subject-detail-category");
    const detailDescription = document.getElementById(
        "subject-detail-description"
    );

    const detailAbout = document.getElementById("subject-detail-about");
    const detailTags = document.getElementById("subject-detail-tags");
    const topicsContainer = document.getElementById("subject-topics");

    const startTestLink = document.getElementById("subject-start-test");
    const practiceButton = document.getElementById("subject-practice-button");

    if (!subjectCards.length) return;

    const subjects = {
        "general-knowledge": {
            name: "General Knowledge",
            category: "General Studies",
            categoryId: "general",
            description:
                "Practise important facts, static GK and general awareness for competitive examinations.",
            topics: [
                ["Indian History", "indian-history"],
                ["Indian Geography", "indian-geography"],
                ["Indian Polity", "indian-polity"],
                ["General Science", "general-science"],
                ["Important Facts", "important-facts"]
            ]
        },

        assamese: {
            name: "Assamese",
            category: "Language",
            categoryId: "language",
            description:
                "Practise Assamese grammar, vocabulary, literature and language-based questions.",
            topics: [
                ["Assamese Grammar", "assamese-grammar"],
                ["Vocabulary", "vocabulary"],
                ["Literature", "literature"],
                ["Language Usage", "language-usage"]
            ]
        },

        english: {
            name: "English",
            category: "Language",
            categoryId: "language",
            description:
                "Improve grammar, vocabulary, comprehension and other English language skills.",
            topics: [
                ["Grammar", "grammar"],
                ["Vocabulary", "vocabulary"],
                ["Synonyms and Antonyms", "synonyms-antonyms"],
                ["Sentence Correction", "sentence-correction"],
                ["Comprehension", "comprehension"]
            ]
        },

        mathematics: {
            name: "Mathematics",
            category: "Aptitude",
            categoryId: "aptitude",
            description:
                "Practise arithmetic, numerical ability and mathematics questions for competitive exams.",
            topics: [
                ["Number System", "number-system"],
                ["Percentage", "percentage"],
                ["Ratio and Proportion", "ratio-proportion"],
                ["Profit and Loss", "profit-loss"],
                ["Time and Work", "time-work"]
            ]
        },

        reasoning: {
            name: "Reasoning",
            category: "Aptitude",
            categoryId: "aptitude",
            description:
                "Develop logical thinking through verbal and non-verbal reasoning practice.",
            topics: [
                ["Number Series", "number-series"],
                ["Analogy", "analogy"],
                ["Coding and Decoding", "coding-decoding"],
                ["Direction Sense", "direction-sense"],
                ["Logical Reasoning", "logical-reasoning"]
            ]
        },

        computer: {
            name: "Computer",
            category: "Other Subjects",
            categoryId: "other",
            description:
                "Revise computer fundamentals, hardware, software, internet and basic digital concepts.",
            topics: [
                ["Computer Fundamentals", "computer-fundamentals"],
                ["Hardware and Software", "hardware-software"],
                ["Internet Basics", "internet-basics"],
                ["MS Office", "ms-office"],
                ["Cyber Security Basics", "cyber-security"]
            ]
        },

        geography: {
            name: "Geography",
            category: "General Studies",
            categoryId: "general",
            description:
                "Study physical, Indian and world geography, including important geographical facts about Assam.",
            topics: [
                ["Physical Geography", "physical-geography"],
                ["Indian Geography", "indian-geography"],
                ["World Geography", "world-geography"],
                ["Assam Geography", "assam-geography"]
            ]
        },

        polity: {
            name: "Indian Polity",
            category: "General Studies",
            categoryId: "general",
            description:
                "Practise questions on the Indian Constitution, government institutions and governance.",
            topics: [
                ["Indian Constitution", "constitution"],
                ["Fundamental Rights", "fundamental-rights"],
                ["Parliament", "parliament"],
                ["President and Governor", "president-governor"],
                ["Constitutional Bodies", "constitutional-bodies"]
            ]
        },

        history: {
            name: "History",
            category: "General Studies",
            categoryId: "general",
            description:
                "Revise ancient, medieval and modern Indian history, including Assam's historical background.",
            topics: [
                ["Ancient India", "ancient-india"],
                ["Medieval India", "medieval-india"],
                ["Modern India", "modern-india"],
                ["Assam History", "assam-history"]
            ]
        },

        economics: {
            name: "Economics",
            category: "General Studies",
            categoryId: "general",
            description:
                "Learn basic economic concepts, the Indian economy and important economic indicators.",
            topics: [
                ["Basic Economics", "basic-economics"],
                ["Indian Economy", "indian-economy"],
                ["Banking", "banking"],
                ["Economic Planning", "economic-planning"]
            ]
        },

        science: {
            name: "General Science",
            category: "Other Subjects",
            categoryId: "other",
            description:
                "Review basic concepts in physics, chemistry, biology and everyday science.",
            topics: [
                ["Physics", "physics"],
                ["Chemistry", "chemistry"],
                ["Biology", "biology"],
                ["Everyday Science", "everyday-science"]
            ]
        },

        "assam-culture": {
            name: "Assam Art and Culture",
            category: "General Studies",
            categoryId: "general",
            description:
                "Explore the traditions, festivals, heritage, literature and cultural history of Assam.",
            topics: [
                ["Festivals of Assam", "assam-festivals"],
                ["Art and Handicrafts", "art-handicrafts"],
                ["Traditional Culture", "traditional-culture"],
                ["Literature and Personalities", "culture-personalities"]
            ]
        }
    };

    let activeCategory = "all";

    function normalize(value) {
        return String(value || "")
            .trim()
            .toLocaleLowerCase();
    }

    function getSubjectFromCard(card) {
        const id = card.dataset.subjectId;
        return subjects[id] || null;
    }

    function updateResults() {
        const query = normalize(searchInput?.value);
        let visibleCount = 0;

        subjectCards.forEach((card) => {
            const subject = getSubjectFromCard(card);

            if (!subject) {
                card.hidden = true;
                return;
            }

            const searchableText = normalize([
                subject.name,
                subject.category,
                subject.description,
                card.textContent
            ].join(" "));

            const matchesSearch = searchableText.includes(query);

            const matchesCategory =
                activeCategory === "all" ||
                subject.categoryId === activeCategory;

            const isVisible = matchesSearch && matchesCategory;

            card.hidden = !isVisible;

            if (isVisible) visibleCount += 1;
        });

        if (resultCount) {
            resultCount.textContent =
                `${visibleCount} ${visibleCount === 1 ? "subject" : "subjects"} found`;
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    function setActiveCategory(category) {
        activeCategory = category;

        filterButtons.forEach((button) => {
            const isActive = button.dataset.subjectFilter === category;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        updateResults();
    }

    function makeTopicCard(subjectId, topicName, topicId) {
        const link = document.createElement("a");
        link.className = "listing-card";

        const params = new URLSearchParams({
            subject: subjectId,
            topic: topicId
        });

        link.href = `test.html?${params.toString()}`;

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "Q";

        const content = document.createElement("span");
        content.className = "card-content";

        const title = document.createElement("span");
        title.className = "card-title";
        title.textContent = topicName;

        const description = document.createElement("span");
        description.className = "card-description";
        description.textContent = "Practise MCQs";

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        content.append(title, description);
        link.append(icon, content, arrow);

        return link;
    }

    function addDetailTag(text) {
        const tag = document.createElement("span");
        tag.className = "chip chip-primary";
        tag.textContent = text;
        detailTags?.appendChild(tag);
    }

    function showSubjectDetail(subjectId) {
        const subject = subjects[subjectId];

        if (!subject) {
            return false;
        }

        if (directoryHero) directoryHero.hidden = true;
        if (directorySection) directorySection.hidden = true;
        if (detailHero) detailHero.hidden = false;
        if (detailSection) detailSection.hidden = false;

        if (detailTitle) detailTitle.textContent = subject.name;

        if (detailCategory) {
            detailCategory.textContent = subject.category;
        }

        if (detailDescription) {
            detailDescription.textContent = subject.description;
        }

        if (detailAbout) {
            detailAbout.textContent = subject.description;
        }

        if (detailTags) {
            detailTags.replaceChildren();
            addDetailTag(subject.category);
            addDetailTag("MCQ Practice");
            addDetailTag("Competitive Exams");
        }

        if (topicsContainer) {
            topicsContainer.replaceChildren();

            subject.topics.forEach(([topicName, topicId]) => {
                topicsContainer.appendChild(
                    makeTopicCard(subjectId, topicName, topicId)
                );
            });
        }

        const practiceUrl =
            `test.html?subject=${encodeURIComponent(subjectId)}`;

        if (startTestLink) {
            startTestLink.href = practiceUrl;
        }

        if (practiceButton) {
            practiceButton.href = practiceUrl;
        }

        document.title = `${subject.name} Practice | studyKora`;

        return true;
    }

    /* Search */

    if (searchInput) {
        searchInput.addEventListener("input", updateResults);
    }

    /* Category filters */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.subjectFilter;

            if (!category) return;

            setActiveCategory(category);
        });
    });

    /* Load the selected subject from the URL */

    const params = new URLSearchParams(window.location.search);
    const requestedSubject = normalize(params.get("subject"));

    if (requestedSubject && subjects[requestedSubject]) {
        showSubjectDetail(requestedSubject);
    } else {
        if (directoryHero) directoryHero.hidden = false;
        if (directorySection) directorySection.hidden = false;
        if (detailHero) detailHero.hidden = true;
        if (detailSection) detailSection.hidden = true;

        updateResults();
    }
});
