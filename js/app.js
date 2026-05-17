const API_URL = "https://script.google.com/macros/s/AKfycby6VamdvDR7uSPqlpC6tTiJWx1uVUJqABb1nXV8WaMJKXNTSoi9zHe9ULrYpPwQHoWCJw/exec";

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
    const monthSelect = document.getElementById("monthSelect"); // cite: 4

    // Safety check: if the element isn't on this page, stop here
    if (!monthSelect) return;

    months.forEach(m => {
        const option = document.createElement("option");
        option.value = m.label;
        option.textContent = m.label;
        if (m.isCurrent) option.selected = true;
        monthSelect.appendChild(option); // cite: 4
    });
}

populateMonthDropdown();

// Helper to send data
async function sendData(type, formData, month) {
    const payload = {
        type,
        month,
        date: formData.get("date"),
        amount: formData.get("amount"),
        category: formData.get("category"),
        source: formData.get("source"),
        notes: formData.get("notes")
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",   // 👈 disables CORS enforcement
            headers: { "Content-Type": "text/plain" }, // 👈 avoid preflight
            body: JSON.stringify(payload)
        });

        // ⚠️ With no-cors, response is opaque, so we can't read it.
        // Just assume success if no error thrown.
        return true;

    } catch (err) {
        console.error("Fetch failed:", err);
        return false;
    }
}

function startProgress() {
    const bar = document.getElementById("progressBar");
    bar.style.width = "0";
    setTimeout(() => {
        bar.style.width = "80%"; // grow to 80% while waiting
    }, 50);
}

function finishProgress() {
    const bar = document.getElementById("progressBar");
    bar.style.width = "100%"; // complete bar
    setTimeout(() => {
        bar.style.width = "0"; // reset after short delay
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

function normalizeCategoryName(value) {
    return value ? value.toString().trim().toLowerCase() : "";
}

function getExpenseCategorySelect() {
    return document.getElementById("expenseCategorySelect");
}

function captureFallbackExpenseCategories() {
    const categorySelect = getExpenseCategorySelect();
    if (!categorySelect || fallbackExpenseCategories.length) return;

    fallbackExpenseCategories = Array.from(categorySelect.options)
        .map(option => option.value)
        .filter(Boolean);
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
}

async function refreshExpenseCategories(month, preferredCategory) {
    const categorySelect = getExpenseCategorySelect();
    if (!categorySelect || !month) return;

    captureFallbackExpenseCategories();
    setCategorySummaryText("Loading category details...");
    categorySelect.disabled = true;
    categorySelect.innerHTML = '<option>Loading categories...</option>';

    try {
        const res = await fetch(`${API_URL}?action=getExpenseCategories&month=${encodeURIComponent(month)}`);
        const data = await res.json();

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
    console.log("Fetching balance for month:", month); // Debug

    try {
        const res = await fetch(`${API_URL}?month=${encodeURIComponent(month)}`);
        const data = await res.json();
        console.log("API response:", data); // Debug

        if (data.status === "ok") {
            updateLeftSummaryDisplay(data);
        } else {
            console.error("Balance error:", data.message);
        }
    } catch (err) {
        console.error("Fetch balance failed:", err);
    }
}

// --- Run after DOM is ready ---
document.addEventListener("DOMContentLoaded", () => {
    const monthSelect = document.getElementById("monthSelect"); // cite: 4
    const expenseCategorySelect = getExpenseCategorySelect();

    captureFallbackExpenseCategories();

    if (monthSelect) {
        const currentMonth = monthSelect.value;
        fetchBalance(currentMonth); // cite: 4
        refreshExpenseCategories(currentMonth);

        monthSelect.addEventListener("change", (e) => {
            fetchBalance(e.target.value); // cite: 4
            refreshExpenseCategories(e.target.value);
        });
    }

    if (expenseCategorySelect) {
        expenseCategorySelect.addEventListener("change", (e) => {
            updateExpenseCategorySummary(e.target.value);
        });
        if (!monthSelect) {
            updateExpenseCategorySummary(expenseCategorySelect.value);
        }
    }

    const refreshBtn = document.getElementById("refreshBalanceBtn"); // cite: 4
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            const month = monthSelect ? monthSelect.value : "";
            if (month) {
                fetchBalance(month); // cite: 4
                refreshExpenseCategories(month);
            }
        });
    }
});




