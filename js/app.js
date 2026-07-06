// Month generation
const monthSelect = document.getElementById("monthSelect");
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
let expenseCategorySummaries = [];
let fallbackExpenseCategories = [];
const LAST_EXPENSE_CATEGORY_KEY = "moneytracker_last_expense_category";

function generateMonths() {
    const now = new Date();
    const months = [];
    for (let offset = -2; offset <= 2; offset++) {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const monthYear = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        months.push({ label: monthYear, isCurrent: offset === 0 });
    }
    return months;
}

function populateMonthDropdown() {
    const months = generateMonths();
    const monthSelect = document.getElementById("monthSelect");

    if (!monthSelect) return;

    months.forEach(m => {
        const option = document.createElement("option");
        option.value = m.label;
        option.textContent = m.label;
        if (m.isCurrent) option.selected = true;
        monthSelect.appendChild(option);
    });
}

populateMonthDropdown();

async function sendData(type, formData, month) {
    if (type === "expense") {
        if (typeof rememberLoanPerson === "function") {
            const loanPerson = formData.get("loanPerson") || formData.get("loanCreditorId");
            if (loanPerson && !MoneyTracker.isApiEnabled()) rememberLoanPerson(loanPerson);
        }
        if (typeof rememberShop === "function") {
            const shop = formData.get("shop");
            if (shop) rememberShop(shop);
        }
    }

    try {
        if (type === "expense") {
            return await MoneyTracker.sendExpense(formData, month);
        }
        return await MoneyTracker.sendEarning(formData, month);
    } catch (err) {
        console.error("Submit failed:", err);
        throw err;
    }
}

function startProgress() {
    const bar = document.getElementById("progressBar");
    if (!bar) return;
    bar.style.width = "0";
    setTimeout(() => {
        bar.style.width = "80%";
    }, 50);
}

function finishProgress() {
    const bar = document.getElementById("progressBar");
    if (!bar) return;
    bar.style.width = "100%";
    setTimeout(() => {
        bar.style.width = "0";
    }, 400);
}

function parseMoneyValue(raw) {
    if (raw === undefined || raw === null || raw === "") return 0;
    const n = parseFloat(raw.toString().replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function formatMoney(numeric) {
    return `£${numeric.toFixed(2)}`;
}

function escapeHtml(value) {
    return value.toString().replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function parseTransactionDate(item) {
    const rawValue = item.date || item.timestamp;
    if (!rawValue) return null;
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTransactionDate(item) {
    const parsed = parseTransactionDate(item);
    if (!parsed) return "Unknown date";

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
    });
}

function renderHomeTransactions(items) {
    const listEl = document.getElementById("homeTransactionsList");
    if (!listEl) return;

    if (!items.length) {
        listEl.innerHTML = '<div class="empty-state">No transactions found yet.</div>';
        return;
    }

    listEl.innerHTML = items.slice(0, 3).map(item => {
        const amount = Number(item.amount || 0);
        const isExpense = item.type === "expense";
        const amountClass = isExpense ? "amount-expense" : "amount-earning";
        const sign = isExpense ? "-" : "+";
        const title = escapeHtml(item.categoryOrSource || "-");
        const meta = [item.loanCreditor, item.shop].filter(Boolean).join(" · ");
        const note = escapeHtml(meta || (item.notes ? item.notes : "No note"));
        const type = escapeHtml(item.type || "transaction");

        return `
            <div class="home-tx-item">
                <div class="home-tx-main">
                    <span class="tx-type ${isExpense ? "type-expense" : "type-earning"}">${type}</span>
                    <span class="home-tx-title">${title}</span>
                    <span class="home-tx-note">${note}</span>
                </div>
                <div class="home-tx-side">
                    <span class="home-tx-date">${formatTransactionDate(item)}</span>
                    <span class="tx-amount ${amountClass}">${sign}${formatMoney(Math.abs(amount))}</span>
                </div>
            </div>
        `;
    }).join("");
}

async function loadHomeTransactions() {
    const listEl = document.getElementById("homeTransactionsList");
    if (!listEl) return;

    listEl.innerHTML = '<div class="empty-state">Loading transactions...</div>';

    try {
        const items = await MoneyTracker.loadLatestTransactions(10);
        renderHomeTransactions(items);
    } catch (err) {
        console.error("Failed to load home transactions:", err);
        listEl.innerHTML = '<div class="empty-state">Could not load latest transactions.</div>';
    }
}

function normalizeCategoryName(value) {
    return value ? value.toString().trim().toLowerCase() : "";
}

function getExpenseCategorySelect() {
    return document.getElementById("expenseCategorySelect");
}

function captureFallbackExpenseCategories() {
    if (fallbackExpenseCategories.length) return;
    fallbackExpenseCategories = [...FALLBACK_EXPENSE_CATEGORY_NAMES];
}

function setCategorySummaryText(message) {
    const nameEl = document.getElementById("categorySummaryName");
    const countEl = document.getElementById("categorySummaryCount");
    const potMaxEl = document.getElementById("categoryPotMax");
    const spentEl = document.getElementById("categorySpent");
    const leftEl = document.getElementById("categoryLeft");

    if (nameEl) nameEl.textContent = message;
    if (countEl) countEl.textContent = "";
    [potMaxEl, spentEl, leftEl].forEach(el => {
        if (!el) return;
        el.textContent = "£0.00";
        el.classList.remove("green", "red");
    });
}

function updateExpenseCategorySummary(categoryName) {
    const selectedKey = normalizeCategoryName(categoryName);
    const summary = expenseCategorySummaries.find(item => normalizeCategoryName(item.name) === selectedKey);

    if (!summary) {
        setCategorySummaryText(categoryName ? "Pot details unavailable" : "Select a category");
        return;
    }

    localStorage.setItem(LAST_EXPENSE_CATEGORY_KEY, summary.name);

    const nameEl = document.getElementById("categorySummaryName");
    const countEl = document.getElementById("categorySummaryCount");
    const potMaxEl = document.getElementById("categoryPotMax");
    const spentEl = document.getElementById("categorySpent");
    const leftEl = document.getElementById("categoryLeft");

    const potMax = parseMoneyValue(summary.potMax);
    const spent = parseMoneyValue(summary.spent);
    const left = parseMoneyValue(summary.left);
    const recentCount = Number(summary.recentCount || 0);

    if (nameEl) nameEl.textContent = summary.name;
    if (countEl) {
        countEl.textContent = recentCount
            ? `${recentCount} of last 500 spending transactions`
            : "Not used in last 500";
    }
    if (potMaxEl) potMaxEl.textContent = formatMoney(potMax);
    if (spentEl) spentEl.textContent = formatMoney(spent);
    if (leftEl) {
        leftEl.textContent = formatMoney(left);
        leftEl.classList.remove("green", "red");
        leftEl.classList.add(left < 0 ? "red" : "green");
    }
}

function renderExpenseCategoryOptions(categories, preferredCategory) {
    const categorySelect = getExpenseCategorySelect();
    if (!categorySelect) return;

    const storedCategory = localStorage.getItem(LAST_EXPENSE_CATEGORY_KEY);
    const selectedKey = normalizeCategoryName(preferredCategory || storedCategory);
    const optionItems = categories.length
        ? categories.map(item => ({ name: item.name }))
        : fallbackExpenseCategories
            .slice()
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .map(name => ({ name }));

    if (!optionItems.length) {
        setCategorySummaryText("No categories found");
        return;
    }

    categorySelect.innerHTML = "";
    categorySelect.disabled = false;
    optionItems.forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        categorySelect.appendChild(option);
    });

    const matchingOption = Array.from(categorySelect.options)
        .find(option => normalizeCategoryName(option.value) === selectedKey);

    categorySelect.value = matchingOption ? matchingOption.value : categorySelect.options[0].value;
    updateExpenseCategorySummary(categorySelect.value);
    if (typeof updateExpenseConditionalFields === "function") {
        updateExpenseConditionalFields(categorySelect.value);
    }
}

async function refreshExpenseCategories(month, preferredCategory) {
    const categorySelect = getExpenseCategorySelect();
    if (!categorySelect || !month) return;

    captureFallbackExpenseCategories();
    setCategorySummaryText("Loading category details...");
    categorySelect.disabled = true;
    categorySelect.innerHTML = '<option>Loading categories...</option>';

    try {
        const data = await MoneyTracker.getExpenseCategories(month);

        if (data.status !== "ok" || !Array.isArray(data.categories)) {
            throw new Error(data.message || "Invalid category response");
        }

        expenseCategorySummaries = data.categories;
        renderExpenseCategoryOptions(expenseCategorySummaries, preferredCategory);
    } catch (err) {
        console.error("Fetch expense categories failed:", err);
        expenseCategorySummaries = [];
        renderExpenseCategoryOptions([], preferredCategory);
        setCategorySummaryText("Could not load category details");
    }
}

function applyLeftStatColor(el, numeric, mode) {
    el.classList.remove("green", "red");
    if (mode === "threshold100") {
        if (numeric < 100) el.classList.add("red");
        else el.classList.add("green");
    } else {
        if (numeric < 0) el.classList.add("red");
        else el.classList.add("green");
    }
}

function updateLeftSummaryDisplay(data) {
    const leftEl = document.getElementById("remainingBalance");
    const scheduledEl = document.getElementById("scheduledLeftBalance");
    const forecastEl = document.getElementById("forecastLeftBalance");

    const leftRaw = data.left !== undefined ? data.left : data.remaining;
    const leftNum = parseMoneyValue(leftRaw);

    if (leftEl) {
        leftEl.textContent = formatMoney(leftNum);
        applyLeftStatColor(leftEl, leftNum, "threshold100");
    }

    const scheduledNum = parseMoneyValue(data.scheduledLeft);
    if (scheduledEl) {
        scheduledEl.textContent = formatMoney(scheduledNum);
        applyLeftStatColor(scheduledEl, scheduledNum, "signed");
    }

    const forecastNum = parseMoneyValue(data.forecastLeft);
    if (forecastEl) {
        forecastEl.textContent = formatMoney(forecastNum);
        applyLeftStatColor(forecastEl, forecastNum, "signed");
    }
}

async function fetchBalance(month) {
    if (!month) return;

    try {
        const data = await MoneyTracker.fetchBalance(month);
        if (data.status === "ok") {
            updateLeftSummaryDisplay(data);
        } else {
            console.error("Balance error:", data.message);
        }
    } catch (err) {
        console.error("Fetch balance failed:", err);
    }
}

function refreshHomeData() {
    const monthSelectEl = document.getElementById("monthSelect");
    const month = monthSelectEl ? monthSelectEl.value : "";
    loadHomeTransactions();
    if (month) {
        fetchBalance(month);
        refreshExpenseCategories(month);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const monthSelectEl = document.getElementById("monthSelect");
    const expenseCategorySelect = getExpenseCategorySelect();

    captureFallbackExpenseCategories();
    refreshHomeData();

    if (monthSelectEl) {
        monthSelectEl.addEventListener("change", (e) => {
            fetchBalance(e.target.value);
            refreshExpenseCategories(e.target.value);
        });
    }

    if (expenseCategorySelect) {
        expenseCategorySelect.addEventListener("change", (e) => {
            updateExpenseCategorySummary(e.target.value);
        });
        if (!monthSelectEl) {
            updateExpenseCategorySummary(expenseCategorySelect.value);
        }
    }

    const refreshBtn = document.getElementById("refreshBalanceBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", refreshHomeData);
    }

    window.addEventListener("moneytracker:auth-ready", refreshHomeData);
});
