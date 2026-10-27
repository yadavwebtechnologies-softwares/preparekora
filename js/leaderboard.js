/* PrepareKora — Leaderboard (pure client-side, RTDB only) */
"use strict";

(() => {
    const DB_BASE = "https://studykora-fc91d-default-rtdb.firebaseio.com";

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = String(text);
        return div.innerHTML;
    }

    function getInitials(name) {
        const clean = String(name || "U").trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return clean.slice(0, 2).toUpperCase() || "U";
    }

    function renderRow(entry) {
        return `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">#${entry.rank}</span>
                <span class="leaderboard-avatar">${escapeHtml(getInitials(entry.displayName))}</span>
                <span class="leaderboard-user">
                    <span class="leaderboard-name">${escapeHtml(entry.displayName || "User")}</span>
                    <span class="leaderboard-detail">${entry.attempts} attempt${entry.attempts === 1 ? "" : "s"} · ${entry.accuracy}% accuracy</span>
                </span>
                <span class="leaderboard-score">${entry.score}</span>
            </div>
        `;
    }

    function rankEntries(raw) {
        const entries = [];
        for (const u of Object.values(raw || {})) {
            if (!u || typeof u !== "object") continue;
            const attempts = Number(u.attempts) || 0;
            if (attempts < 3) continue;
            entries.push({
                displayName: u.displayName || "User",
                score: Number(u.score) || 0,
                accuracy: Number(u.accuracy) || 0,
                attempts,
                lastAttemptAt: u.lastAttemptAt || ""
            });
        }
        entries.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            const aT = new Date(a.lastAttemptAt).getTime() || 0;
            const bT = new Date(b.lastAttemptAt).getTime() || 0;
            if (bT !== aT) return bT - aT;
            return a.attempts - b.attempts;
        });
        return entries.slice(0, 100).map((e, i) => ({ ...e, rank: i + 1 }));
    }

    async function render(container, options = {}) {
        if (!container) return;
        const maxRows = options.maxRows || 100;

        container.innerHTML = `
            <div class="sk-history-loading">
                <span class="sk-profile-spinner"></span>
                <span>Loading leaderboard…</span>
            </div>
        `;

        try {
            const res = await fetch(`${DB_BASE}/publicLeaderboard.json`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const ranked = rankEntries(data);

            if (!ranked.length) {
                container.innerHTML = `
                    <div class="sk-history-empty">
                        <strong>No rankings yet</strong>
                        <p>Complete at least 3 practice tests to appear on the leaderboard.</p>
                    </div>
                `;
                return;
            }

            const shown = ranked.slice(0, maxRows);
            container.innerHTML = `<div class="leaderboard">${shown.map(renderRow).join("")}</div>`;
        } catch (error) {
            console.warn("[PrepareKora Leaderboard] Load failed:", error);
            container.innerHTML = `
                <div class="sk-history-empty">
                    <strong>Could not load leaderboard</strong>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    window.PrepareKoraLeaderboard = { render };
})();
