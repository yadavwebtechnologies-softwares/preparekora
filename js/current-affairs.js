/* ==========================================
   StudyNow — Current Affairs
   Design and Develop by Yadav Web Technologies
========================================== */

"use strict";

const affairsData = {
    daily: {
        title: "Daily Current Affairs",
        resources: [
            {
                title: "Daily News and Events",
                description: "Review important daily developments"
            },
            {
                title: "Daily General Awareness",
                description: "Revise key facts and general awareness"
            }
        ]
    },

    assam: {
        title: "Assam Current Affairs",
        resources: [
            {
                title: "Assam News and Developments",
                description: "Explore state-level current affairs"
            },
            {
                title: "Assam General Awareness",
                description: "Revise Assam-focused exam topics"
            }
        ]
    },

    national: {
        title: "National Current Affairs",
        resources: [
            {
                title: "National News and Events",
                description: "Explore important events across India"
            },
            {
                title: "National General Awareness",
                description: "Review topics relevant to competitive exams"
            }
        ]
    },

    quiz: {
        title: "Current Affairs Quiz",
        resources: [
            {
                title: "Daily Practice Quiz",
                description: "Practise questions based on current events"
            },
            {
                title: "Revision Quiz",
                description: "Review previously studied topics"
            }
        ]
    }
};

const resourceHeading = document.getElementById("resource-heading");
const resourceList = document.getElementById("affairs-resource-list");


function createResourceCard(resource, index) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "listing-card";
    card.dataset.affairsResource = String(index);

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.style.background = "var(--green-soft)";
    icon.style.color = "var(--green)";
    icon.setAttribute("aria-hidden", "true");

    icon.innerHTML = `
        <svg viewBox="0 0 24 24">
            <rect x="5" y="4" width="14" height="17" rx="2"></rect>
            <path d="M9 4V3h6v1M8 10h8M8 14h8"></path>
        </svg>
    `;

    const content = document.createElement("span");
    content.className = "card-content";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = resource.title;

    const description = document.createElement("span");
    description.className = "card-description";
    description.textContent = resource.description;

    content.append(title, description);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    card.append(icon, content, arrow);

    return card;
}


function renderAffairs(categoryId) {
    const category = affairsData[categoryId] || affairsData.daily;

    resourceHeading.textContent = category.title;

    const fragment = document.createDocumentFragment();

    category.resources.forEach((resource, index) => {
        fragment.appendChild(createResourceCard(resource, index));
    });

    resourceList.replaceChildren(fragment);
}


function showResourceNotice(title) {
    const modal = document.getElementById("notice-modal");
    const modalTitle = document.getElementById("notice-title");
    const modalMessage = document.getElementById("notice-message");

    if (!modal || !modalTitle || !modalMessage) return;

    modalTitle.textContent = title;
    modalMessage.textContent =
        "This resource is a static frontend preview. Its content will be added during a future upgrade.";

    modal.hidden = false;
    document.body.classList.add("modal-open");
}


document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const categoryCard = event.target.closest("[data-affairs-category]");

    if (categoryCard) {
        const categoryId = categoryCard.dataset.affairsCategory;
        const url = new URL(window.location.href);

        url.searchParams.set("category", categoryId);
        window.history.replaceState({}, "", url);

        renderAffairs(categoryId);

        document.getElementById("practice-resources")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;
    }

    const resourceCard = event.target.closest("[data-affairs-resource]");

    if (resourceCard) {
        const title = resourceCard.querySelector(".card-title")?.textContent;
        if (title) showResourceNotice(title);
    }
});


function initializeCurrentAffairs() {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category") || "daily";

    renderAffairs(categoryId);
}

initializeCurrentAffairs();
