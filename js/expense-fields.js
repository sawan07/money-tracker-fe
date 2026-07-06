const LOAN_PEOPLE_KEY = "moneytracker_loan_people";
const SHOP_OPTIONS_KEY = "moneytracker_shop_options";

const DEFAULT_LOAN_PEOPLE = [
    { name: "Mishu", amount: 50, currency: "GBP" },
    { name: "Mt", amount: 9016, currency: "BDT" },
    { name: "Afjal", amount: 129.46, currency: "USD" },
    { name: "Ani", amount: 100, currency: "GBP" },
    { name: "Ashik", amount: 1100, currency: "GBP" },
    { name: "Sajid", amount: 100000, currency: "BDT" },
    { name: "Pog", amount: 30000, currency: "BDT" },
    { name: "ehasan", amount: 2345.24, currency: "GBP" },
    { name: "Shah", amount: 650, currency: "GBP" },
    { name: "Ashik BDT", amount: 50000, currency: "BDT" },
    { name: "shuvo", amount: 0, currency: "BDT" },
    { name: "Nayara Savings", amount: 110, currency: "GBP" },
    { name: "Muji", amount: 1250, currency: "GBP" },
];

const DEFAULT_TAKEAWAY_SHOPS = [
    "Uber Eats", "Deliveroo", "Just Eat", "McDonald's", "KFC", "Domino's", "Pizza Hut", "Nando's",
];

const DEFAULT_GROCERY_SHOPS = [
    "Tesco", "Sainsbury's", "Asda", "Aldi", "Lidl", "Morrisons", "Waitrose", "Iceland", "Costco",
];

function normalizeCategoryName(value) {
    return value ? value.toString().trim().toLowerCase() : "";
}

function readJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getLoanPeople() {
    return readJsonStorage(LOAN_PEOPLE_KEY, DEFAULT_LOAN_PEOPLE);
}

function rememberLoanPerson(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const people = getLoanPeople();
    const exists = people.some(person => person.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;

    people.push({ name: trimmed, amount: 0, currency: "GBP" });
    writeJsonStorage(LOAN_PEOPLE_KEY, people);
}

function getSavedShops() {
    return readJsonStorage(SHOP_OPTIONS_KEY, []);
}

function rememberShop(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const shops = getSavedShops();
    if (shops.some(shop => shop.toLowerCase() === trimmed.toLowerCase())) return;

    shops.unshift(trimmed);
    writeJsonStorage(SHOP_OPTIONS_KEY, shops.slice(0, 50));
}

function setLoanFieldMode(apiMode) {
    const loanSelect = document.getElementById("loanPersonSelect");
    const loanInput = document.getElementById("loanPersonInput");
    if (!loanSelect || !loanInput) return;

    loanSelect.classList.toggle("hidden", !apiMode);
    loanInput.classList.toggle("hidden", apiMode);
    loanSelect.required = apiMode;
    loanInput.required = !apiMode;
}

async function populateLoanPersonOptions() {
    const loanSelect = document.getElementById("loanPersonSelect");
    const datalist = document.getElementById("loanPersonOptions");
    if (!loanSelect || !datalist) return;

    if (MoneyTracker.isApiEnabled()) {
        setLoanFieldMode(true);
        loanSelect.innerHTML = '<option value="">Select person</option>';

        try {
            const { data } = await MoneyTracker.getLoans();
            loanSelect.innerHTML = '<option value="">Select person</option>' + data.map(person => {
                const balance = `${person.amountOwed.toFixed(2)} ${person.currency}`;
                const gbp = `≈ £${person.gbpApprox.toFixed(2)}`;
                return `<option value="${person.id}">${person.displayName} — ${balance} (${gbp})</option>`;
            }).join("");
        } catch (error) {
            console.error("Failed to load loan creditors:", error);
            loanSelect.innerHTML = '<option value="">Could not load loans</option>';
        }
        return;
    }

    setLoanFieldMode(false);
    datalist.innerHTML = getLoanPeople()
        .map(person => `<option value="${person.name}"></option>`)
        .join("");
}

async function populateShopOptions(categoryName) {
    const datalist = document.getElementById("shopOptions");
    const shopInput = document.getElementById("shopInput");
    if (!datalist || !shopInput) return;

    const key = normalizeCategoryName(categoryName);
    const scope = key === "takeaway" ? "takeaway" : key === "grocery" ? "grocery" : null;
    if (!scope) {
        datalist.innerHTML = "";
        return;
    }

    let merged = [];

    if (MoneyTracker.isApiEnabled()) {
        try {
            const { data, suggestions } = await MoneyTracker.getShops(scope);
            merged = [
                ...data.map(shop => shop.name),
                ...suggestions,
            ];
        } catch (error) {
            console.error("Failed to load shops:", error);
        }
    }

    if (!merged.length) {
        const defaults = scope === "takeaway" ? DEFAULT_TAKEAWAY_SHOPS : DEFAULT_GROCERY_SHOPS;
        const saved = getSavedShops();
        merged = [...saved, ...defaults];
    }

    merged = merged.filter((shop, index, list) =>
        list.findIndex(item => item.toLowerCase() === shop.toLowerCase()) === index,
    );

    datalist.innerHTML = merged.map(shop => `<option value="${shop}"></option>`).join("");
}

function updateExpenseConditionalFields(categoryName) {
    const key = normalizeCategoryName(categoryName);
    const loanField = document.getElementById("loanPersonField");
    const shopField = document.getElementById("shopField");
    const loanInput = document.getElementById("loanPersonInput");
    const loanSelect = document.getElementById("loanPersonSelect");
    const shopInput = document.getElementById("shopInput");

    const showLoan = key === "loan paid";
    const showShop = key === "takeaway" || key === "grocery";

    if (loanField) {
        loanField.classList.toggle("hidden", !showLoan);
        if (!showLoan) {
            if (loanInput) loanInput.value = "";
            if (loanSelect) loanSelect.value = "";
        }
    }

    if (shopField) {
        shopField.classList.toggle("hidden", !showShop);
        if (shopInput) {
            shopInput.required = false;
            if (!showShop) shopInput.value = "";
            else populateShopOptions(categoryName);
        }
    }

    if (showLoan) populateLoanPersonOptions();
}

function initExpenseConditionalFields() {
    const categorySelect = document.getElementById("expenseCategorySelect");
    if (!categorySelect) return;

    const handleChange = () => updateExpenseConditionalFields(categorySelect.value);
    categorySelect.addEventListener("change", handleChange);
    handleChange();

    window.addEventListener("moneytracker:auth-ready", () => {
        updateExpenseConditionalFields(categorySelect.value);
    });
}

document.addEventListener("DOMContentLoaded", initExpenseConditionalFields);
