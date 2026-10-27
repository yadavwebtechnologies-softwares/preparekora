/* =====================================================
   StudyKora — MCQ Test Engine
   Timer, answers, navigation, review, results
   Firebase Realtime Database result persistence
===================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = (id) => document.getElementById(id);

    const API_BASE =
        "https://studykora-api.yadavsubba2003.workers.dev";

    const DB_BASE =
        "https://studykora-fc91d-default-rtdb.firebaseio.com";

    const elements = {
        instructions: $("test-instructions"),
        workspace: $("test-workspace"),
        confirmation: $("submit-confirmation"),
        results: $("test-result-screen"),

        pageTitle: $("test-page-title"),
        pageDescription: $("test-page-description"),
        questionCount: $("test-question-count"),
        duration: $("test-duration"),
        totalMarks: $("test-total-marks"),

        instructionName: $("instruction-test-name"),
        instructionCount: $("instruction-question-count"),
        instructionDuration: $("instruction-duration"),
        instructionMarking: $("instruction-marking"),
        loadMessage: $("test-load-message"),

        start: $("start-test-button"),
        activeTitle: $("active-test-title"),
        activeSubtitle: $("active-test-subtitle"),
        timer: $("test-timer"),
        progressText: $("test-progress-text"),
        answeredCount: $("test-answered-count"),
        progress: $("test-progress"),
        progressFill: $("test-progress-fill"),

        questionNumber: $("question-number"),
        questionMarks: $("question-marks"),
        questionText: $("question-text"),
        questionInstruction: $("question-instruction"),
        options: $("answer-options"),
        answerMessage: $("answer-message"),

        markReview: $("mark-review-button"),
        clearAnswer: $("clear-answer-button"),
        previous: $("previous-question-button"),
        next: $("next-question-button"),
        questionNavigation: $("question-navigation"),
        navigationSummary: $("navigation-summary"),

        submit: $("submit-test-button"),
        cancelSubmit: $("cancel-submit-button"),
        confirmSubmit: $("confirm-submit-button"),
        confirmAnswered: $("confirm-answered-count"),
        confirmUnanswered: $("confirm-unanswered-count"),
        confirmReview: $("confirm-review-count"),

        resultTitle: $("result-title"),
        resultDescription: $("result-description"),
        resultScore: $("result-score"),
        resultCorrect: $("result-correct"),
        resultIncorrect: $("result-incorrect"),
        resultUnanswered: $("result-unanswered"),
        resultAccuracy: $("result-accuracy"),
        resultTime: $("result-time-used"),

        reviewAnswers: $("review-answers-button"),
        reviewSection: $("answer-review-section"),
        reviewList: $("answer-review-list"),
        retake: $("retake-test-button")
    };

    if (
        !elements.instructions ||
        !elements.workspace ||
        !elements.options ||
        !elements.start
    ) {
        return;
    }

    /* -----------------------------------------------
       1. Sample question bank
    ----------------------------------------------- */

    const questionBanks = {
        general: [
            {
                question: "Which city is the capital of Assam?",
                options: ["Guwahati", "Silchar", "Dispur", "Jorhat"],
                answer: 2,
                explanation: "Dispur is the capital of Assam."
            },
            {
                question: "Kaziranga National Park is especially known for which animal?",
                options: [
                    "Asiatic lion",
                    "One-horned rhinoceros",
                    "Snow leopard",
                    "Red panda"
                ],
                answer: 1,
                explanation: "Kaziranga is renowned for its population of the greater one-horned rhinoceros."
            },
            {
                question: "Which is the national animal of India?",
                options: ["Lion", "Elephant", "Bengal tiger", "Leopard"],
                answer: 2,
                explanation: "The Bengal tiger is India's national animal."
            },
            {
                question: "When did the Constitution of India come into effect?",
                options: [
                    "15 August 1947",
                    "26 January 1950",
                    "26 November 1949",
                    "2 October 1950"
                ],
                answer: 1,
                explanation: "The Constitution came into effect on 26 January 1950."
            }
        ],

        polity: [
            {
                question: "Fundamental Rights are primarily contained in which part of the Indian Constitution?",
                options: ["Part I", "Part II", "Part III", "Part IV"],
                answer: 2,
                explanation: "Fundamental Rights are contained in Part III of the Constitution."
            },
            {
                question: "Who is the constitutional head of the Union of India?",
                options: [
                    "Prime Minister",
                    "President",
                    "Chief Justice",
                    "Lok Sabha Speaker"
                ],
                answer: 1,
                explanation: "The President is the constitutional head of the Union."
            },
            {
                question: "Which House of Parliament is directly elected by the people?",
                options: [
                    "Rajya Sabha",
                    "Lok Sabha",
                    "Both Houses in the same manner",
                    "Neither House"
                ],
                answer: 1,
                explanation: "Members of the Lok Sabha are directly elected by eligible voters."
            },
            {
                question: "Which body conducts elections to Parliament and State Legislatures in India?",
                options: [
                    "Union Public Service Commission",
                    "Election Commission of India",
                    "Finance Commission",
                    "NITI Aayog"
                ],
                answer: 1,
                explanation: "The Election Commission of India administers elections to Parliament and State Legislatures."
            }
        ],

        mathematics: [
            {
                question: "What is 25% of 200?",
                options: ["25", "40", "50", "75"],
                answer: 2,
                explanation: "25% of 200 is 200 × 25 / 100 = 50."
            },
            {
                question: "A product costs ₹400. What is its price after a 10% discount?",
                options: ["₹360", "₹370", "₹380", "₹390"],
                answer: 0,
                explanation: "The discount is ₹40, so the final price is ₹360."
            },
            {
                question: "What is the average of 10, 20 and 30?",
                options: ["15", "20", "25", "30"],
                answer: 1,
                explanation: "The average is (10 + 20 + 30) / 3 = 20."
            },
            {
                question: "If a ratio is 2:3 and the total is 25, what is the smaller share?",
                options: ["5", "10", "12", "15"],
                answer: 1,
                explanation: "There are 5 total parts. Each part is 25 / 5 = 5, so the smaller share is 2 × 5 = 10."
            }
        ],

        reasoning: [
            {
                question: "Find the next number: 2, 4, 6, 8, __",
                options: ["9", "10", "11", "12"],
                answer: 1,
                explanation: "The sequence increases by 2 each time."
            },
            {
                question: "Which one is different from the others?",
                options: ["Apple", "Mango", "Banana", "Carrot"],
                answer: 3,
                explanation: "Carrot is generally classified as a root vegetable; the others are fruits."
            },
            {
                question: "If you face north and turn right, which direction will you face?",
                options: ["West", "South", "East", "North"],
                answer: 2,
                explanation: "A right turn from north points east."
            },
            {
                question: "Complete the analogy: 3 : 9 :: 4 : __",
                options: ["8", "12", "16", "20"],
                answer: 2,
                explanation: "The first number is squared: 3² = 9, so 4² = 16."
            }
        ],

        english: [
            {
                question: "Choose the synonym of 'Rapid'.",
                options: ["Slow", "Fast", "Weak", "Late"],
                answer: 1,
                explanation: "'Fast' is a synonym of 'rapid'."
            },
            {
                question: "Choose the correct plural form of 'Child'.",
                options: ["Childs", "Childes", "Children", "Childrens"],
                answer: 2,
                explanation: "The correct plural form is 'children'."
            },
            {
                question: "Choose the grammatically correct sentence.",
                options: [
                    "She go to school.",
                    "She going to school.",
                    "She goes to school.",
                    "She gone to school."
                ],
                answer: 2,
                explanation: "With 'she' in the simple present tense, the verb is 'goes'."
            },
            {
                question: "Choose the antonym of 'Ancient'.",
                options: ["Old", "Historic", "Modern", "Past"],
                answer: 2,
                explanation: "'Modern' is an antonym of 'ancient'."
            }
        ],

        computer: [
            {
                question: "Which component is commonly called the brain of a computer?",
                options: ["Monitor", "CPU", "Keyboard", "Printer"],
                answer: 1,
                explanation: "The CPU processes instructions and is commonly called the brain of a computer."
            },
            {
                question: "Which type of memory is volatile?",
                options: ["ROM", "RAM", "DVD", "Hard disk"],
                answer: 1,
                explanation: "RAM is volatile memory: its contents are generally lost when power is removed."
            },
            {
                question: "Which of these is an input device?",
                options: ["Monitor", "Speaker", "Keyboard", "Projector"],
                answer: 2,
                explanation: "A keyboard is used to enter data into a computer."
            },
            {
                question: "What does URL stand for?",
                options: [
                    "Universal Read Link",
                    "Uniform Resource Locator",
                    "Unified Reference Language",
                    "User Routing Link"
                ],
                answer: 1,
                explanation: "URL stands for Uniform Resource Locator."
            }
        ],

        science: [
            {
                question: "What is the chemical formula of water?",
                options: ["CO₂", "O₂", "H₂O", "NaCl"],
                answer: 2,
                explanation: "A water molecule contains two hydrogen atoms and one oxygen atom."
            },
            {
                question: "Which organ pumps blood around the human body?",
                options: ["Lungs", "Heart", "Kidneys", "Stomach"],
                answer: 1,
                explanation: "The heart pumps blood through the circulatory system."
            },
            {
                question: "What is the SI unit of force?",
                options: ["Joule", "Watt", "Newton", "Pascal"],
                answer: 2,
                explanation: "The SI unit of force is the newton."
            },
            {
                question: "Which pigment plays a central role in photosynthesis?",
                options: ["Haemoglobin", "Chlorophyll", "Melanin", "Keratin"],
                answer: 1,
                explanation: "Chlorophyll absorbs light energy used in photosynthesis."
            }
        ],

        geography: [
            {
                question: "Which major river flows through Assam and is known as the Brahmaputra?",
                options: ["Godavari", "Brahmaputra", "Narmada", "Krishna"],
                answer: 1,
                explanation: "The Brahmaputra flows through Assam."
            },
            {
                question: "Which is the largest continent by area?",
                options: ["Africa", "Europe", "Asia", "South America"],
                answer: 2,
                explanation: "Asia is the largest continent by land area."
            },
            {
                question: "What causes day and night on Earth?",
                options: [
                    "Earth's rotation",
                    "Earth's revolution around the Sun",
                    "The Moon's rotation",
                    "Ocean tides"
                ],
                answer: 0,
                explanation: "Earth's rotation on its axis causes day and night."
            },
            {
                question: "Which imaginary line divides Earth into Northern and Southern Hemispheres?",
                options: ["Prime Meridian", "Tropic of Cancer", "Equator", "Arctic Circle"],
                answer: 2,
                explanation: "The Equator divides Earth into the Northern and Southern Hemispheres."
            }
        ],

        history: [
            {
                question: "Who was the Mauryan emperor associated with the Kalinga War and its aftermath?",
                options: ["Ashoka", "Chandragupta II", "Harsha", "Samudragupta"],
                answer: 0,
                explanation: "Ashoka's rule is closely associated with the Kalinga War and his subsequent embrace of Buddhist principles."
            },
            {
                question: "In which year did the Indian Rebellion of 1857 begin?",
                options: ["1757", "1857", "1885", "1942"],
                answer: 1,
                explanation: "The major uprising commonly called the Indian Rebellion of 1857 began in 1857."
            },
            {
                question: "In which year did India gain independence from British rule?",
                options: ["1935", "1942", "1947", "1950"],
                answer: 2,
                explanation: "India became independent on 15 August 1947."
            },
            {
                question: "Who founded the Maurya Empire?",
                options: ["Ashoka", "Chandragupta Maurya", "Bindusara", "Kanishka"],
                answer: 1,
                explanation: "Chandragupta Maurya founded the Maurya Empire."
            }
        ],

        culture: [
            {
                question: "Bihu is a major group of festivals associated with which Indian state?",
                options: ["Assam", "Punjab", "Kerala", "Gujarat"],
                answer: 0,
                explanation: "Bihu is closely associated with Assamese culture and seasonal celebrations."
            },
            {
                question: "Sattriya is a classical dance form associated with which state?",
                options: ["Odisha", "Assam", "Tamil Nadu", "Rajasthan"],
                answer: 1,
                explanation: "Sattriya originated in Assam and is one of India's classical dance forms."
            },
            {
                question: "Majuli, the famous river island in Assam, is located in which river?",
                options: ["Ganga", "Barak", "Brahmaputra", "Teesta"],
                answer: 2,
                explanation: "Majuli is located in the Brahmaputra River system."
            },
            {
                question: "The traditional gamosa is strongly associated with the culture of which state?",
                options: ["Assam", "Goa", "Haryana", "Sikkim"],
                answer: 0,
                explanation: "The gamosa is an important cultural symbol of Assam."
            }
        ]
    };

    const testNames = {
        "assam-vfa": "Assam VFA Exam",
        "apsc-cce": "APSC CCE Practice",
        "apsc-general-studies": "APSC General Studies",
        "adre-grade-iii": "ADRE Grade III",
        "adre-grade-iv": "ADRE Grade IV",
        "assam-police-si": "Assam Police SI",
        "assam-police-constable": "Assam Police Constable",
        "assam-tet-paper-i": "Assam TET Paper I",
        "assam-tet-paper-ii": "Assam TET Paper II",
        "anm-entrance": "ANM Entrance Practice",
        "health-sciences-practice": "Health Sciences Practice",
        "ssc-general-practice": "SSC General Practice",
        "current-affairs": "Current Affairs Practice"
    };

    const subjectNames = {
        "general-knowledge": "General Knowledge",
        "assamese": "Assamese",
        "english": "English",
        "mathematics": "Mathematics",
        "reasoning": "Reasoning",
        "computer": "Computer",
        "geography": "Geography",
        "polity": "Indian Polity",
        "history": "History",
        "economics": "Economics",
        "science": "General Science",
        "assam-culture": "Assam Art and Culture"
    };

    const params = new URLSearchParams(window.location.search);
    const requestedTest = (params.get("test") || "").trim().toLowerCase();
    const requestedSubject = (params.get("subject") || "").trim().toLowerCase();
    const requestedTopic = (params.get("topic") || "").trim().toLowerCase();

    let testName = "General Knowledge Practice";
    let bankName = "general";
    let questionSourceIsFallback = false;

    if (requestedTest) {
        testName = testNames[requestedTest] ||
            requestedTest.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

        if (requestedTest.includes("apsc")) {
            bankName = "polity";
        } else if (requestedTest.includes("police") || requestedTest.includes("ssc")) {
            bankName = "reasoning";
        } else if (requestedTest.includes("anm") || requestedTest.includes("health")) {
            bankName = "science";
        } else if (requestedTest.includes("tet")) {
            bankName = "english";
        } else {
            bankName = "general";
        }

        if (requestedTest === "current-affairs") {
            bankName = "general";
        }
    } else if (requestedSubject && subjectNames[requestedSubject]) {
        testName = `${subjectNames[requestedSubject]} Practice`;

        const bankMap = {
            "general-knowledge": "general",
            assamese: "general",
            english: "english",
            mathematics: "mathematics",
            reasoning: "reasoning",
            computer: "computer",
            geography: "geography",
            polity: "polity",
            history: "history",
            economics: "general",
            science: "science",
            "assam-culture": "culture"
        };

        bankName = bankMap[requestedSubject] || "general";
    }

    const topicBankMap = {
        "indian-history": "history",
        "ancient-india": "history",
        "medieval-india": "history",
        "modern-india": "history",
        "assam-history": "history",
        "indian-geography": "geography",
        "world-geography": "geography",
        "assam-geography": "geography",
        "physical-geography": "geography",
        "constitution": "polity",
        "fundamental-rights": "polity",
        "parliament": "polity",
        "president-governor": "polity",
        "constitutional-bodies": "polity",
        "number-system": "mathematics",
        percentage: "mathematics",
        "ratio-proportion": "mathematics",
        "profit-loss": "mathematics",
        "time-work": "mathematics",
        grammar: "english",
        vocabulary: "english",
        "synonyms-antonyms": "english",
        "sentence-correction": "english",
        comprehension: "english",
        "computer-fundamentals": "computer",
        "hardware-software": "computer",
        "internet-basics": "computer",
        "ms-office": "computer",
        "cyber-security": "computer",
        "assam-festivals": "culture",
        "art-handicrafts": "culture",
        "traditional-culture": "culture",
        "culture-personalities": "culture"
    };

    if (requestedTopic && topicBankMap[requestedTopic]) {
        bankName = topicBankMap[requestedTopic];
        testName = requestedTopic.replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    /* Try RTDB first — admin-created tests may exist under tests/{id} */
    const rtdbLookupKey =
        requestedTest || requestedSubject || requestedTopic || bankName;
    let rtdbTest = null;
    try {
        const rtdbResponse = await fetch(
            `${DB_BASE}/tests/${encodeURIComponent(rtdbLookupKey)}.json`
        );
        if (rtdbResponse.ok) {
            rtdbTest = await rtdbResponse.json();
        }
    } catch (_) { /* silent fallback to hardcoded */ }

    let questions;
    let marksPerQuestion = 1;
    let durationSeconds = 10 * 60;

    if (
        rtdbTest &&
        Array.isArray(rtdbTest.questions) &&
        rtdbTest.questions.length > 0
    ) {
        questions = rtdbTest.questions;
        if (rtdbTest.title) testName = rtdbTest.title;
        if (Number(rtdbTest.duration) > 0) {
            durationSeconds = Number(rtdbTest.duration);
        }
        if (Number(rtdbTest.marksPerQuestion) > 0) {
            marksPerQuestion = Number(rtdbTest.marksPerQuestion);
        }
    } else {
        questions = questionBanks[bankName];
        if (!questions) {
            questions = questionBanks.general;
            questionSourceIsFallback = true;
        }
    }

    const totalQuestions = questions.length;
    const totalMarks = totalQuestions * marksPerQuestion;

    let currentIndex = 0;
    let remainingSeconds = durationSeconds;
    let timerId = null;
    let startedAt = null;
    let finishedAt = null;
    let testStarted = false;
    let testFinished = false;
    let resultSaveStarted = false;

    let selectedAnswers = Array(totalQuestions).fill(null);
    let markedForReview = Array(totalQuestions).fill(false);

    function formatTime(seconds) {
        const safeSeconds = Math.max(0, seconds);
        const minutes = Math.floor(safeSeconds / 60);
        const remainder = safeSeconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    function showMessage(element, message, type = "") {
        if (!element) return;

        element.textContent = message;

        if (type) {
            element.dataset.type = type;
        } else {
            delete element.dataset.type;
        }
    }

    function setPageDetails() {
        document.title = `${testName} | studyKora`;

        elements.pageTitle.textContent = testName;
        elements.pageDescription.textContent =
            "Answer each sample MCQ, navigate between questions and review your result.";

        elements.questionCount.textContent =
            `${totalQuestions} Questions`;

        elements.duration.textContent = "10 Minutes";
        elements.totalMarks.textContent = `${totalMarks} Marks`;

        elements.instructionName.textContent = testName;
        elements.instructionCount.textContent = String(totalQuestions);
        elements.instructionDuration.textContent = "10 minutes";
        elements.instructionMarking.textContent =
            "1 mark per correct answer; no negative marking in this demo.";

        elements.activeTitle.textContent = testName;
        elements.activeSubtitle.textContent =
            "Demo questions are provided for UI and interaction testing.";

        showMessage(
            elements.loadMessage,
            "This is a frontend demo with sample questions. Configure and verify the appropriate exam question bank before using it for real preparation.",
            "success"
        );

        if (questionSourceIsFallback) {
            showMessage(
                elements.loadMessage,
                "The requested test was not configured. A general practice sample is shown instead.",
                "error"
            );
        }
    }

    function getAnsweredCount() {
        return selectedAnswers.filter((answer) => answer !== null).length;
    }

    function getReviewCount() {
        return markedForReview.filter(Boolean).length;
    }

    function renderOptions() {
        const question = questions[currentIndex];

        elements.options.replaceChildren();

        question.options.forEach((optionText, optionIndex) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "option-item";

            const letter = document.createElement("span");
            letter.className = "option-letter";
            letter.textContent = String.fromCharCode(65 + optionIndex);

            const text = document.createElement("span");
            text.textContent = optionText;

            const isSelected = selectedAnswers[currentIndex] === optionIndex;

            if (isSelected) {
                button.classList.add("is-selected");
            }

            button.setAttribute("aria-pressed", String(isSelected));
            button.append(letter, text);

            button.addEventListener("click", () => {
                if (testFinished) return;

                selectedAnswers[currentIndex] = optionIndex;

                renderOptions();
                renderNavigation();
                updateProgress();

                showMessage(
                    elements.answerMessage,
                    "Answer saved for this test session.",
                    "success"
                );
            });

            elements.options.appendChild(button);
        });
    }

    function renderQuestion() {
        const question = questions[currentIndex];

        elements.questionNumber.textContent =
            `Question ${currentIndex + 1} of ${totalQuestions}`;

        elements.questionText.textContent = question.question;
        elements.questionMarks.textContent =
            `${marksPerQuestion} ${marksPerQuestion === 1 ? "mark" : "marks"}`;

        elements.questionInstruction.textContent =
            "Choose one answer. You can change it before submitting.";

        elements.markReview.setAttribute(
            "aria-pressed",
            String(markedForReview[currentIndex])
        );

        elements.markReview.textContent = markedForReview[currentIndex]
            ? "Remove Review Mark"
            : "Mark for Review";

        elements.previous.disabled = currentIndex === 0;
        elements.next.disabled = currentIndex === totalQuestions - 1;
        elements.next.textContent =
            currentIndex === totalQuestions - 1
                ? "Last Question"
                : "Next Question";

        showMessage(elements.answerMessage, "");
        renderOptions();
        renderNavigation();
        updateProgress();
    }

    function renderNavigation() {
        elements.questionNavigation.replaceChildren();

        questions.forEach((question, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "filter-button";
            button.textContent = String(index + 1);

            const isCurrent = index === currentIndex;
            const isAnswered = selectedAnswers[index] !== null;
            const isMarked = markedForReview[index];

            if (isCurrent) {
                button.classList.add("is-active");
            } else if (isAnswered) {
                button.classList.add("chip-primary");
            }

            const state = isMarked
                ? "marked for review"
                : isAnswered
                    ? "answered"
                    : "not answered";

            button.title = `Question ${index + 1}: ${state}`;
            button.setAttribute(
                "aria-label",
                `Question ${index + 1}, ${state}${isCurrent ? ", current question" : ""}`
            );

            if (isCurrent) {
                button.setAttribute("aria-current", "step");
            }

            button.addEventListener("click", () => {
                if (testFinished) return;

                currentIndex = index;
                renderQuestion();
            });

            elements.questionNavigation.appendChild(button);
        });

        const answered = getAnsweredCount();
        const unanswered = totalQuestions - answered;
        const review = getReviewCount();

        elements.navigationSummary.textContent =
            `${answered} answered, ${unanswered} unanswered, ${review} marked for review.`;
    }

    function updateProgress() {
        const answered = getAnsweredCount();
        const percent = Math.round((answered / totalQuestions) * 100);

        elements.answeredCount.textContent =
            `${answered} answered`;

        elements.progressText.textContent =
            `Question ${currentIndex + 1} of ${totalQuestions}`;

        elements.progress.setAttribute("aria-valuenow", String(percent));
        elements.progressFill.style.width = `${percent}%`;
    }

    function startTimer() {
        stopTimer();

        elements.timer.textContent = formatTime(remainingSeconds);

        timerId = window.setInterval(() => {
            if (testFinished) {
                stopTimer();
                return;
            }

            remainingSeconds -= 1;

            elements.timer.textContent = formatTime(remainingSeconds);

            if (remainingSeconds <= 60) {
                elements.timer.setAttribute(
                    "aria-label",
                    "One minute or less remaining"
                );
            }

            if (remainingSeconds <= 0) {
                stopTimer();
                finishTest(true);
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    function getElapsedSeconds() {
        if (!startedAt) return 0;

        const endTime = finishedAt || Date.now();

        return Math.min(
            durationSeconds,
            Math.max(0, Math.floor((endTime - startedAt) / 1000))
        );
    }

    function showSubmitConfirmation() {
        const answered = getAnsweredCount();
        const unanswered = totalQuestions - answered;
        const review = getReviewCount();

        elements.confirmAnswered.textContent = `Answered: ${answered}`;
        elements.confirmUnanswered.textContent = `Unanswered: ${unanswered}`;
        elements.confirmReview.textContent = `Marked for review: ${review}`;

        elements.confirmation.hidden = false;

        elements.confirmation.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            block: "center"
        });
    }

    function buildReview() {
        elements.reviewList.replaceChildren();

        questions.forEach((question, index) => {
            const card = document.createElement("article");
            card.className = "question-panel";

            const meta = document.createElement("div");
            meta.className = "question-meta";

            const number = document.createElement("span");
            number.textContent = `Question ${index + 1}`;

            const status = document.createElement("span");
            status.className = "chip";

            const selected = selectedAnswers[index];
            const isCorrect = selected === question.answer;

            status.textContent = selected === null
                ? "Unanswered"
                : isCorrect
                    ? "Correct"
                    : "Incorrect";

            meta.append(number, status);

            const title = document.createElement("h3");
            title.className = "question-text";
            title.textContent = question.question;

            const chosen = document.createElement("p");
            chosen.className = "section-description";
            chosen.textContent = selected === null
                ? "Your answer: Not answered"
                : `Your answer: ${String.fromCharCode(65 + selected)}. ${question.options[selected]}`;

            const correct = document.createElement("p");
            correct.className = "section-description";
            correct.textContent =
                `Correct answer: ${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}`;

            const explanation = document.createElement("p");
            explanation.className = "notice mt-sm";
            explanation.textContent = question.explanation;

            card.append(meta, title, chosen, correct, explanation);
            elements.reviewList.appendChild(card);
        });
    }

    /* -----------------------------------------------
       2. Firebase session helpers
    ----------------------------------------------- */

    function readSessionObject(storage, key) {
        try {
            const raw = storage.getItem(key);
            if (!raw) return null;

            const value = JSON.parse(raw);

            return value && typeof value === "object"
                ? value
                : null;
        } catch (_) {
            return null;
        }
    }

    function findStudyKoraSession() {
        const stores = [
            window.sessionStorage,
            window.localStorage
        ];

        for (const storage of stores) {
            for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index);
                if (!key) continue;

                const data = readSessionObject(storage, key);
                if (!data) continue;

                const user =
                    data.user && typeof data.user === "object"
                        ? data.user
                        : {};

                const uid =
                    user.uid ||
                    user.localId ||
                    data.uid ||
                    data.localId;

                const idToken =
                    data.idToken ||
                    data.accessToken ||
                    data.token;

                const refreshToken = data.refreshToken;

                if (uid && idToken) {
                    return {
                        storage,
                        key,
                        data,
                        user,
                        uid,
                        idToken,
                        refreshToken
                    };
                }
            }
        }

        return null;
    }

    async function getStudyKoraSession() {
        const session = findStudyKoraSession();

        if (!session) return null;

        const expiresAt = Number(
            session.data.expiresAt || 0
        );

        const savedAt = Number(
            session.data.savedAt || 0
        );

        const expiresIn = Number(
            session.data.expiresIn || 0
        );

        const calculatedExpiry =
            expiresAt ||
            (
                savedAt && expiresIn
                    ? savedAt + expiresIn * 1000
                    : 0
            );

        const needsRefresh =
            !session.idToken ||
            (
                calculatedExpiry > 0 &&
                calculatedExpiry < Date.now() + 60000
            );

        if (needsRefresh && session.refreshToken) {
            try {
                const response = await fetch(
                    `${API_BASE}/auth/refresh`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            refreshToken: session.refreshToken
                        })
                    }
                );

                const payload = await response.json();

                if (!response.ok || !payload.idToken) {
                    throw new Error(
                        payload.error ||
                        "Could not refresh authentication session."
                    );
                }

                session.data.idToken = payload.idToken;

                session.data.refreshToken =
                    payload.refreshToken ||
                    session.refreshToken;

                session.data.expiresIn =
                    Number(payload.expiresIn || 3600);

                session.data.savedAt = Date.now();

                session.data.expiresAt =
                    Date.now() +
                    session.data.expiresIn * 1000;

                session.data.user = {
                    ...session.user,
                    ...(payload.user || {})
                };

                session.idToken = session.data.idToken;
                session.refreshToken = session.data.refreshToken;
                session.user = session.data.user;

                session.storage.setItem(
                    session.key,
                    JSON.stringify(session.data)
                );
            } catch (error) {
                console.warn(
                    "[StudyKora] Token refresh failed:",
                    error.message
                );
            }
        }

        return session;
    }

    function makeAttemptId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            "attempt_" +
            Date.now() +
            "_" +
            Math.random().toString(36).slice(2, 12)
        );
    }

    function buildAttemptRecord(result) {
        const answers = questions.map((question, index) => {
            const selected = selectedAnswers[index];
            const correct = question.answer;

            return {
                questionIndex: index + 1,
                question: question.question,
                selectedAnswer: selected,
                selectedOption:
                    selected === null
                        ? null
                        : question.options[selected],
                correctAnswer: correct,
                correctOption: question.options[correct],
                isCorrect: selected === correct,
                unanswered: selected === null,
                markedForReview: Boolean(markedForReview[index]),
                explanation: question.explanation
            };
        });

        return {
            attemptId: makeAttemptId(),

            testId:
                requestedTest ||
                requestedSubject ||
                requestedTopic ||
                bankName,

            testTitle: testName,
            subject: requestedSubject || bankName,
            topic: requestedTopic || null,

            completedAt: new Date().toISOString(),

            totalQuestions: result.totalQuestions,
            correctAnswers: result.correctCount,
            incorrectAnswers: result.incorrectCount,
            unanswered: result.unansweredCount,

            score: result.score,
            totalMarks,
            accuracy: result.accuracy,

            timeTakenSeconds: result.timeTakenSeconds,
            timeExpired: result.timeExpired,

            answers
        };
    }

    async function saveTestAttempt(result) {
        const session = await getStudyKoraSession();

        if (!session || !session.uid || !session.idToken) {
            return {
                saved: false,
                reason: "sign-in-required"
            };
        }

        const record = buildAttemptRecord(result);

        const url =
            `${DB_BASE}/users/${encodeURIComponent(session.uid)}` +
            `/testAttempts/${encodeURIComponent(record.attemptId)}.json` +
            `?auth=${encodeURIComponent(session.idToken)}`;

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                payload && payload.error
                    ? payload.error
                    : `Firebase save failed (${response.status}).`
            );
        }

        return {
            saved: true,
            attemptId: record.attemptId
        };
    }

    async function saveAndReportResult(result) {
        if (resultSaveStarted) return;
        resultSaveStarted = true;

        if (elements.resultDescription) {
            elements.resultDescription.textContent =
                "Your result is ready. Saving your test record…";
        }

        try {
            const outcome = await saveTestAttempt(result);

            if (outcome.saved) {
                if (elements.resultDescription) {
                    elements.resultDescription.textContent =
                        "Your answers have been evaluated. Your test result has been saved to your account.";
                }

                console.info(
                    "[StudyKora] Test attempt saved:",
                    outcome.attemptId
                );

                window.dispatchEvent(
                    new CustomEvent("studyKora:test-saved", {
                        detail: {
                            attemptId: outcome.attemptId,
                            testId:
                                requestedTest ||
                                requestedSubject ||
                                requestedTopic ||
                                bankName,
                            testTitle: testName,
                            score: result.score,
                            totalMarks,
                            accuracy: result.accuracy
                        }
                    })
                );

                return;
            }

            if (elements.resultDescription) {
                elements.resultDescription.textContent =
                    "Your result is ready, but it was not saved because you are not signed in. Sign in to save test history to your account.";
            }
        } catch (error) {
            console.error(
                "[StudyKora] Unable to save test attempt:",
                error
            );

            if (elements.resultDescription) {
                elements.resultDescription.textContent =
                    "Your result is shown, but saving it failed. Please check your connection and Firebase access before taking another test.";
            }
        }
    }

    /* -----------------------------------------------
       3. Finish and calculate the test result
    ----------------------------------------------- */

    function finishTest(timeExpired = false) {
        if (testFinished) return;

        testFinished = true;
        finishedAt = Date.now();

        stopTimer();

        const correctCount = questions.reduce((total, question, index) => {
            return total + (
                selectedAnswers[index] === question.answer
                    ? 1
                    : 0
            );
        }, 0);

        const answeredCount = getAnsweredCount();

        const incorrectCount = selectedAnswers.reduce((total, answer, index) => {
            return total + (
                answer !== null &&
                answer !== questions[index].answer
                    ? 1
                    : 0
            );
        }, 0);

        const unansweredCount = totalQuestions - answeredCount;
        const score = correctCount * marksPerQuestion;

        const accuracy = answeredCount > 0
            ? Math.round((correctCount / answeredCount) * 100)
            : 0;

        const result = {
            totalQuestions,
            correctCount,
            incorrectCount,
            unansweredCount,
            score,
            accuracy,
            timeTakenSeconds: getElapsedSeconds(),
            timeExpired
        };

        elements.instructions.hidden = true;
        elements.workspace.hidden = true;
        elements.confirmation.hidden = true;
        elements.results.hidden = false;
        elements.reviewSection.hidden = true;

        elements.resultTitle.textContent = "Your Test Result";

        elements.resultDescription.textContent = timeExpired
            ? "The time limit has ended. Here is your result."
            : "Your answers have been evaluated.";

        elements.resultScore.textContent = `${score} / ${totalMarks}`;
        elements.resultCorrect.textContent = String(correctCount);
        elements.resultIncorrect.textContent = String(incorrectCount);
        elements.resultUnanswered.textContent = String(unansweredCount);
        elements.resultAccuracy.textContent = `${accuracy}%`;
        elements.resultTime.textContent =
            formatTime(getElapsedSeconds());

        buildReview();

        elements.results.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            block: "start"
        });

        // Save only once per completed attempt.
        void saveAndReportResult(result);
    }

    function resetTest() {
        stopTimer();

        currentIndex = 0;
        remainingSeconds = durationSeconds;
        startedAt = null;
        finishedAt = null;
        testStarted = false;
        testFinished = false;
        resultSaveStarted = false;

        selectedAnswers = Array(totalQuestions).fill(null);
        markedForReview = Array(totalQuestions).fill(false);

        elements.instructions.hidden = false;
        elements.workspace.hidden = true;
        elements.confirmation.hidden = true;
        elements.results.hidden = true;
        elements.reviewSection.hidden = true;

        elements.timer.textContent = formatTime(durationSeconds);
        elements.timer.setAttribute("aria-label", "Time remaining");

        showMessage(elements.answerMessage, "");

        setPageDetails();

        window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth"
        });
    }

    /* -----------------------------------------------
       4. Event handlers
    ----------------------------------------------- */

    elements.start.addEventListener("click", () => {
        if (testStarted || testFinished) return;

        testStarted = true;
        startedAt = Date.now();

        elements.instructions.hidden = true;
        elements.workspace.hidden = false;
        elements.confirmation.hidden = true;

        renderQuestion();
        startTimer();

        elements.workspace.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            block: "start"
        });
    });

    elements.previous.addEventListener("click", () => {
        if (!testStarted || testFinished || currentIndex <= 0) return;

        currentIndex -= 1;
        renderQuestion();
    });

    elements.next.addEventListener("click", () => {
        if (
            !testStarted ||
            testFinished ||
            currentIndex >= totalQuestions - 1
        ) {
            return;
        }

        currentIndex += 1;
        renderQuestion();
    });

    elements.markReview.addEventListener("click", () => {
        if (!testStarted || testFinished) return;

        markedForReview[currentIndex] =
            !markedForReview[currentIndex];

        renderQuestion();
    });

    elements.clearAnswer.addEventListener("click", () => {
        if (!testStarted || testFinished) return;

        selectedAnswers[currentIndex] = null;

        renderQuestion();

        showMessage(
            elements.answerMessage,
            "Your answer has been cleared."
        );
    });

    elements.submit.addEventListener("click", () => {
        if (!testStarted || testFinished) return;
        showSubmitConfirmation();
    });

    elements.cancelSubmit.addEventListener("click", () => {
        elements.confirmation.hidden = true;
    });

    elements.confirmSubmit.addEventListener("click", () => {
        finishTest(false);
    });

    elements.reviewAnswers.addEventListener("click", () => {
        elements.reviewSection.hidden = false;

        elements.reviewSection.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            block: "start"
        });
    });

    elements.retake.addEventListener("click", resetTest);

    /* -----------------------------------------------
       5. Initial setup
    ----------------------------------------------- */

    setPageDetails();

    elements.timer.textContent = formatTime(durationSeconds);
    elements.progress.setAttribute("aria-valuenow", "0");
});
