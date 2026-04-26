function parseTxDate(item) {
    const rawValue = item.date || item.timestamp;
    if (!rawValue) return null;
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(dateObj) {
    if (!dateObj) return "unknown";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getRelativeDateLabel(dateObj) {
    if (!dateObj) return "Unknown Date";

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffMs = todayStart.getTime() - targetStart.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return dateObj.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

async function loadLatestTransactions() {
    const listEl = document.getElementById("transactionsList");
    if (!listEl) return;

    listEl.innerHTML = '<div class="empty-state">Loading transactions...</div>';

    try {
        const res = await fetch(`${API_URL}?action=getLatestTransactions`);
        const responseText = await res.text();
        let result = null;

        try {
            result = JSON.parse(responseText);
        } catch (parseErr) {
            console.error("Transactions response is not JSON:", responseText);
            listEl.innerHTML = '<div class="empty-state">Unexpected API response. Please hard refresh and try again.</div>';
            return;
        }

        if (result.status !== "ok") {
            const apiMsg = result.message ? ` (${result.message})` : "";
            listEl.innerHTML = `<div class="empty-state">Could not load transactions${apiMsg}</div>`;
            return;
        }

        const items = Array.isArray(result.data) ? result.data : [];
        if (!items.length) {
            listEl.innerHTML = '<div class="empty-state">No transactions found yet.</div>';
            return;
        }

        const groupedByDate = items.reduce((acc, item) => {
            const itemDate = parseTxDate(item);
            const dateKey = toDateKey(itemDate);

            if (!acc[dateKey]) {
                acc[dateKey] = {
                    label: getRelativeDateLabel(itemDate),
                    totalExpense: 0,
                    entries: []
                };
            }

            const amount = Number(item.amount || 0);
            if (item.type === "expense") {
                acc[dateKey].totalExpense += amount;
            }

            acc[dateKey].entries.push(item);
            return acc;
        }, {});

        const groupedHtml = Object.values(groupedByDate).map((group) => {
            const entriesHtml = group.entries.map((item) => {
                const amount = Number(item.amount || 0);
                const sign = item.type === "expense" ? "-" : "+";
                const amountClass = item.type === "expense" ? "amount-expense" : "amount-earning";
                const note = item.notes ? item.notes : "No note";
                const itemDate = parseTxDate(item);
                const txTime = itemDate ? itemDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";

                return `
                    <div class="tx-item">
                        <div class="tx-top">
                            <span class="tx-type ${item.type === "expense" ? "type-expense" : "type-earning"}">${item.type}</span>
                            <span class="tx-amount ${amountClass}">${sign}£${Math.abs(amount).toFixed(2)}</span>
                        </div>
                        <div class="tx-main">${item.categoryOrSource || "-"}</div>
                        <div class="tx-meta">
                            <span>${txTime}</span>
                        </div>
                        <div class="tx-note">${note}</div>
                    </div>
                `;
            }).join("");

            return `
                <section class="tx-group">
                    <div class="tx-group-header">
                        <div class="tx-group-date">${group.label}</div>
                        <div class="tx-group-total">Expense: £${group.totalExpense.toFixed(2)}</div>
                    </div>
                    ${entriesHtml}
                </section>
            `;
        }).join("");

        listEl.innerHTML = groupedHtml;
    } catch (err) {
        console.error("Failed to load latest transactions:", err);
        listEl.innerHTML = '<div class="empty-state">Network error while loading transactions.</div>';
    }
}

const originalHideOverlayTransactions = hideLockOverlay;
hideLockOverlay = function () {
    originalHideOverlayTransactions();
    loadLatestTransactions();
};

document.addEventListener("DOMContentLoaded", () => {
    const refreshBtn = document.getElementById("refreshTransactionsBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadLatestTransactions);
    }
});
