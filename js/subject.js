"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const el = {
        directoryHero: document.getElementById("subject-directory-hero"),
        detailHero: document.getElementById("subject-detail-hero"),
        directory: document.getElementById("subject-directory"),
        detailContent: document.getElementById("subject-detail-content"),

        search: document.getElementById("subject-search"),
        filters: document.getElementById("subject-filters"),
        grid: document.getElementById("subject-grid"),
        resultCount: document.getElementById("subject-result-count"),
        emptyState: document.getElementById("subject-empty-state"),

        category: document.getElementById("subject-detail-category"),
        title: document.getElementById("subject-detail-title"),
        description: document.getElementById("subject-detail-description"),
        about: document.getElementById("subject-detail-about"),
        tags: document.getElementById("subject-detail-tags"),
        topics: document.getElementById("subject-topics"),

        startTest: document.getElementById("subject-start-test"),
        practiceButton: document.getElementById("subject-practice-button")
    };

    const subjectData = {
        "general-knowledge": {
            name: "General Knowledge",
            category: "General Studies",
            filter: "general",
            description: "Practise static GK and important general awareness questions.",
            about: "Revise important facts and general knowledge topics for competitive examinations.",
            tags: ["General Studies", "MCQ Practice", "Exam Preparation"],
            topics: [
                "Static General Knowledge",
                "Important Days",
                "Books and Authors",
                "Awards and Honours",
                "Important Organizations"
            ]
        },

        "assamese": {
            name: "Assamese",
            category: "Languages",
            filter: "language",
            description: "Practise Assamese language and grammar questions.",
            about: "Build your Assamese language skills through grammar, vocabulary and language-based questions.",
            tags: ["Language", "Grammar", "MCQ Practice"],
            topics: [
                "Assamese Grammar",
                "Vocabulary",
                "Synonyms and Antonyms",
                "Literature",
                "Language Usage"
            ]
        },

        "english": {
            name: "English",
            category: "Languages",
            filter: "language",
            description: "Improve English grammar, vocabulary and comprehension.",
            about: "Practise English language questions commonly used in competitive examinations.",
            tags: ["Language", "Grammar", "Vocabulary"],
            topics: [
                "Parts of Speech",
                "Tenses",
                "Vocabulary",
                "Synonyms and Antonyms",
                "Sentence Correction",
                "Reading Comprehension"
            ]
        },

        "mathematics": {
            name: "Mathematics",
            category: "Aptitude",
            filter: "aptitude",
            description: "Practise arithmetic and numerical ability questions.",
            about: "Strengthen calculation skills and numerical problem-solving through topic-wise practice.",
            tags: ["Numerical Ability", "Arithmetic", "MCQ Practice"],
            topics: [
                "Number System",
                "Percentage",
                "Ratio and Proportion",
                "Profit and Loss",
                "Average",
                "Time and Work",
                "Time, Speed and Distance"
            ]
        },

        "reasoning": {
            name: "Reasoning",
            category: "Aptitude",
            filter: "aptitude",
            description: "Develop logical and analytical reasoning skills.",
            about: "Practise questions that develop logical thinking, pattern recognition and problem-solving ability.",
            tags: ["Logical Reasoning", "Analytical Ability", "MCQ Practice"],
            topics: [
                "Number Series",
                "Coding and Decoding",
                "Analogy",
                "Classification",
                "Direction Sense",
                "Blood Relations",
                "Logical Puzzles"
            ]
        },

        "computer": {
            name: "Computer",
            category: "Other Subjects",
            filter: "other",
            description: "Revise computer fundamentals and basic IT concepts.",
            about: "Learn essential computer concepts and practise computer-awareness questions.",
            tags: ["Computer Awareness", "IT Basics", "MCQ Practice"],
            topics: [
                "Computer Fundamentals",
                "Hardware and Software",
                "Operating Systems",
                "Internet Basics",
                "MS Office",
                "Computer Networks"
            ]
        },

        "geography": {
            name: "Geography",
            category: "General Studies",
            filter: "general",
            description: "Study Assam, Indian and world geography.",
            about: "Revise physical and human geography, maps, resources and important geographical facts.",
            tags: ["General Studies", "Geography", "MCQ Practice"],
            topics: [
                "Physical Geography",
                "Indian Geography",
                "Geography of Assam",
                "Rivers and Mountains",
                "Climate and Environment",
                "World Geography"
            ]
        },

        "polity": {
            name: "Indian Polity",
            category: "General Studies",
            filter: "general",
            description: "Practise questions on the Indian Constitution and governance.",
            about: "Understand constitutional provisions, government institutions and important aspects of Indian governance.",
            tags: ["Indian Constitution", "Governance", "MCQ Practice"],
            topics: [
                "Constitutional Basics",
                "Fundamental Rights",
                "Directive Principles",
                "Union Government",
                "State Government",
                "Constitutional Bodies"
            ]
        },

        "history": {
            name: "History",
            category: "General Studies",
            filter: "general",
            description: "Revise Indian history and the history of Assam.",
            about: "Study important historical periods, events, movements and personalities relevant to examinations.",
            tags: ["Indian History", "Assam History", "MCQ Practice"],
            topics: [
                "Ancient Indian History",
                "Medieval Indian History",
                "Modern Indian History",
                "Indian Freedom Movement",
                "History of Assam"
            ]
        },

        "economics": {
            name: "Economics",
            category: "General Studies",
            filter: "general",
            description: "Learn basic economics and important economic concepts.",
            about: "Practise questions on economic fundamentals, the Indian economy and related terminology.",
            tags: ["Economics", "Indian Economy", "MCQ Practice"],
            topics: [
                "Basic Economic Concepts",
                "National Income",
                "Banking",
                "Inflation",
                "Indian Economy",
                "Government Budget"
            ]
        },

        "science": {
            name: "General Science",
            category: "Other Subjects",
            filter: "other",
            description: "Revise basic scientific concepts and general science.",
            about: "Build general science knowledge through questions covering important concepts from different scientific fields.",
            tags: ["General Science", "Science Basics", "MCQ Practice"],
            topics: [
                "Physics",
                "Chemistry",
                "Biology",
                "Human Body",
                "Scientific Instruments",
                "Everyday Science"
            ]
        },

        "assam-culture": {
            name: "Assam Art and Culture",
            category: "General Studies",
            filter: "general",
            description: "Explore Assam's heritage, traditions, festivals and culture.",
            about: "Revise important aspects of Assam's cultural heritage, traditional practices, art forms and festivals.",
            tags: ["Assam GK", "Culture", "Regional Studies"],
            topics: [
                "Festivals of Assam",
                "Traditional Dance and Music",
                "Literature of Assam",
                "Historical Monuments",
                "Cultural Personalities",
                "Heritage and Traditions"
            ]
        }
    };

    /*
     * Shared helper functions
     */

    function createElement(tag, className, text) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined) {
            node.textContent = text;
        }

        return node;
    }

    function makeTestUrl(subjectId, topic) {
        const params = new URLSearchParams();

        params.set("subject", subjectId);

        if (topic) {
            params.set("topic", topic);
        }

        return `test.html?${params.toString()}`;
    }

    function makeTopicSlug(topic) {
        return topic
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    /*
     * Search and category filters
     */

    function updateSubjectDirectory() {
        if (!el.grid) return;

        const searchTerm = el.search
            ? el.search.value.trim().toLowerCase()
            : "";

        const activeButton = el.filters
            ? el.filters.querySelector(
                '[data-subject-filter][aria-pressed="true"]'
            )
            : null;

        const activeFilter = activeButton
            ? activeButton.dataset.subjectFilter
            : "all";

        const cards = Array.from(
            el.grid.querySelectorAll("[data-subject-card]")
        );

        let visibleCount = 0;

        cards.forEach((card) => {
            const name = card.dataset.subjectName || "";
            const id = card.dataset.subjectId || "";
            const category = card.dataset.subjectCategory || "";
            const description =
                card.querySelector(".card-description")?.textContent || "";

            const searchText =
                `${name} ${id} ${category} ${description}`.toLowerCase();

            const matchesSearch = searchText.includes(searchTerm);

            const matchesFilter =
                activeFilter === "all" || category === activeFilter;

            const visible = matchesSearch && matchesFilter;

            card.hidden = !visible;

            if (visible) {
                visibleCount++;
            }
        });

        if (el.resultCount) {
            el.resultCount.textContent =
                `Showing ${visibleCount} of ${cards.length} subjects.`;
        }

        if (el.emptyState) {
            el.emptyState.hidden = visibleCount > 0;
        }
    }

    if (el.search) {
        el.search.addEventListener("input", updateSubjectDirectory);
    }

    if (el.filters) {
        el.filters.addEventListener("click", (event) => {
            const button = event.target.closest("[data-subject-filter]");

            if (!button || !el.filters.contains(button)) {
                return;
            }

            el.filters
                .querySelectorAll("[data-subject-filter]")
                .forEach((filterButton) => {
                    const selected = filterButton === button;

                    filterButton.classList.toggle("is-active", selected);
                    filterButton.setAttribute(
                        "aria-pressed",
                        String(selected)
                    );
                });

            updateSubjectDirectory();
        });
    }

    /*
     * Render selected subject details
     */

    function renderSubject(subjectId) {
        const subject = subjectData[subjectId];

        if (!subject) {
            return false;
        }

        if (el.directoryHero) {
            el.directoryHero.hidden = true;
            el.directoryHero.setAttribute("aria-hidden", "true");
        }

        if (el.directory) {
            el.directory.hidden = true;
        }

        if (el.detailHero) {
            el.detailHero.hidden = false;
        }

        if (el.detailContent) {
            el.detailContent.hidden = false;
        }

        if (el.category) {
            el.category.textContent = subject.category;
        }

        if (el.title) {
            el.title.textContent = subject.name;
        }

        if (el.description) {
            el.description.textContent = subject.description;
        }

        if (el.about) {
            el.about.textContent = subject.about;
        }

        /*
         * Subject-specific metadata
         */

        document.title = `${subject.name} Practice | StudyKora`;

        const metaDescription = document.querySelector(
            'meta[name="description"]'
        );

        if (metaDescription) {
            metaDescription.content =
                `${subject.description} Practise with StudyKora.`;
        }

        /*
         * Practice links
         */

        const testUrl = makeTestUrl(subjectId);

        if (el.startTest) {
            el.startTest.href = testUrl;
        }

        if (el.practiceButton) {
            el.practiceButton.href = testUrl;
        }

        /*
         * Subject tags
         */

        if (el.tags) {
            el.tags.replaceChildren();

            subject.tags.forEach((tag) => {
                const chip = createElement(
                    "span",
                    "chip chip-primary",
                    tag
                );

                el.tags.appendChild(chip);
            });
        }

        /*
         * Subject topics
         */

        if (el.topics) {
            el.topics.replaceChildren();

            subject.topics.forEach((topic, index) => {
                const link = createElement("a", "listing-card");

                link.href = makeTestUrl(
                    subjectId,
                    makeTopicSlug(topic)
                );

                const icon = createElement(
                    "span",
                    "card-icon",
                    String(index + 1).padStart(2, "0")
                );

                icon.setAttribute("aria-hidden", "true");

                const content = createElement("span", "card-content");

                const title = createElement(
                    "span",
                    "card-title",
                    topic
                );

                const description = createElement(
                    "span",
                    "card-description",
                    `Practise ${topic.toLowerCase()} questions.`
                );

                content.append(title, description);

                const arrow = createElement(
                    "span",
                    "card-arrow",
                    "›"
                );

                arrow.setAttribute("aria-hidden", "true");

                link.append(icon, content, arrow);
                el.topics.appendChild(link);
            });
        }

        return true;
    }

    /*
     * URL support:
     * subject.html?subject=english
     */

    const params = new URLSearchParams(window.location.search);
    const requestedSubject = (
        params.get("subject") || ""
    ).trim().toLowerCase();

    if (requestedSubject && subjectData[requestedSubject]) {
        renderSubject(requestedSubject);
    } else {
        updateSubjectDirectory();
    }
});
