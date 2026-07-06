const DEFAULT_LOAN_IMPORT = [
    { displayName: "Mishu", amountOwed: 50, currency: "GBP" },
    { displayName: "Mt", amountOwed: 9016, currency: "BDT" },
    { displayName: "Afjal", amountOwed: 129.46, currency: "USD" },
    { displayName: "Ani", amountOwed: 100, currency: "GBP" },
    { displayName: "Ashik", amountOwed: 1100, currency: "GBP" },
    { displayName: "Sajid", amountOwed: 100000, currency: "BDT" },
    { displayName: "Pog", amountOwed: 30000, currency: "BDT" },
    { displayName: "ehasan", amountOwed: 2345.24, currency: "GBP" },
    { displayName: "Shah", amountOwed: 650, currency: "GBP" },
    { displayName: "Ashik BDT", amountOwed: 50000, currency: "BDT" },
    { displayName: "shuvo", amountOwed: 0, currency: "BDT" },
    { displayName: "Nayara Savings", amountOwed: 110, currency: "GBP" },
    { displayName: "Muji", amountOwed: 1250, currency: "GBP" },
];

function formatForeignAmount(amount, currency) {
    return `${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function renderLoansTable(creditors, totalGbpApprox) {
    const bodyEl = document.getElementById("loansTableBody");
    const totalEl = document.getElementById("loansTotalGbp");
    if (!bodyEl || !totalEl) return;

    if (!creditors.length) {
        bodyEl.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">No loan balances yet. Import your sheet or add a person below.</td>
            </tr>
        `;
        totalEl.textContent = formatMoney(0);
        return;
    }

    bodyEl.innerHTML = creditors.map(creditor => `
        <tr>
            <td>${escapeHtml(creditor.displayName)}</td>
            <td>${formatForeignAmount(creditor.amountOwed, creditor.currency)}</td>
            <td>${escapeHtml(creditor.currency)}</td>
            <td class="amount-cell">${formatMoney(creditor.gbpApprox)}</td>
        </tr>
    `).join("");

    totalEl.textContent = formatMoney(totalGbpApprox);
}

async function loadLoans() {
    const messageEl = document.getElementById("loansMessage");
    if (!MoneyTracker.isApiEnabled()) {
        if (messageEl) {
            messageEl.textContent = "Sign in to the Kotlin API to view and manage loans.";
            messageEl.className = "message";
        }
        renderLoansTable([], 0);
        return;
    }

    if (messageEl) messageEl.textContent = "Loading loans...";

    try {
        const { data, totalGbpApprox } = await MoneyTracker.getLoans();
        renderLoansTable(data, totalGbpApprox);
        if (messageEl) messageEl.textContent = "";
    } catch (error) {
        console.error("Failed to load loans:", error);
        if (messageEl) {
            messageEl.textContent = error.message || "Could not load loans";
            messageEl.className = "message error";
        }
    }
}

async function importDefaultLoans() {
    const messageEl = document.getElementById("loansMessage");
    if (!MoneyTracker.isApiEnabled()) return;

    if (messageEl) messageEl.textContent = "Importing loan sheet defaults...";

    try {
        for (const creditor of DEFAULT_LOAN_IMPORT) {
            await MoneyTracker.upsertLoan(creditor);
        }
        await loadLoans();
        if (messageEl) {
            messageEl.textContent = "Imported default loan balances";
            messageEl.className = "message success";
        }
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message || "Import failed";
            messageEl.className = "message error";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const addForm = document.getElementById("addLoanForm");
    const refreshBtn = document.getElementById("refreshLoansBtn");
    const importBtn = document.getElementById("importLoansBtn");

    loadLoans();

    window.addEventListener("moneytracker:auth-ready", loadLoans);

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadLoans);
    }

    if (importBtn) {
        importBtn.addEventListener("click", importDefaultLoans);
    }

    if (addForm) {
        addForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const messageEl = document.getElementById("loansMessage");
            const formData = new FormData(addForm);

            if (!MoneyTracker.isApiEnabled()) {
                if (messageEl) messageEl.textContent = "Sign in to add loans";
                return;
            }

            try {
                await MoneyTracker.upsertLoan({
                    displayName: formData.get("displayName"),
                    amountOwed: Number(formData.get("amountOwed")),
                    currency: formData.get("currency"),
                });
                addForm.reset();
                await loadLoans();
                if (messageEl) {
                    messageEl.textContent = "Loan person saved";
                    messageEl.className = "message success";
                }
            } catch (error) {
                if (messageEl) {
                    messageEl.textContent = error.message || "Could not save loan";
                    messageEl.className = "message error";
                }
            }
        });
    }
});
