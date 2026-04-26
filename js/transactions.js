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

        listEl.innerHTML = items.map((item) => {
            const amount = Number(item.amount || 0);
            const sign = item.type === "expense" ? "-" : "+";
            const amountClass = item.type === "expense" ? "amount-expense" : "amount-earning";
            const txDate = item.date ? new Date(item.date).toLocaleDateString("en-GB") : "-";
            const note = item.notes ? item.notes : "No note";

            return `
                <div class="tx-item">
                    <div class="tx-top">
                        <span class="tx-type ${item.type === "expense" ? "type-expense" : "type-earning"}">${item.type}</span>
                        <span class="tx-amount ${amountClass}">${sign}£${Math.abs(amount).toFixed(2)}</span>
                    </div>
                    <div class="tx-main">${item.categoryOrSource || "-"}</div>
                    <div class="tx-meta">
                        <span>${item.month || "-"}</span>
                        <span>${txDate}</span>
                    </div>
                    <div class="tx-note">${note}</div>
                </div>
            `;
        }).join("");
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
