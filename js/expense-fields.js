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
    "Uber Eats",
    "Deliveroo",
    "Just Eat",
    "McDonald's",
    "KFC",
    "Domino's",
    "Pizza Hut",
    "Nando's",
];

const DEFAULT_GROCERY_SHOPS = [
    "Tesco",
    "Sainsbury's",
    "Asda",
    "Aldi",
    "Lidl",
    "Morrisons",
    "Waitrose",
    "Iceland",
    "Costco",
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

function populateLoanPersonOptions() {
    const datalist = document.getElementById("loanPersonOptions");
    if (!datalist) return;

    datalist.innerHTML = getLoanPeople()
        .map(person => `<option value="${person.name}"></option>`)
        .join("");
}

function populateShopOptions(categoryName) {
    const datalist = document.getElementById("shopOptions");
    if (!datalist) return;

    const key = normalizeCategoryName(categoryName);
    const defaults = key === "takeaway"
        ? DEFAULT_TAKEAWAY_SHOPS
        : key === "grocery"
            ? DEFAULT_GROCERY_SHOPS
            : [];

    const saved = getSavedShops();
    const merged = [...saved, ...defaults]
        .filter((shop, index, list) => list.findIndex(item => item.toLowerCase() === shop.toLowerCase()) === index);

    datalist.innerHTML = merged.map(shop => `<option value="${shop}"></option>`).join("");
}

function updateExpenseConditionalFields(categoryName) {
    const key = normalizeCategoryName(categoryName);
    const loanField = document.getElementById("loanPersonField");
    const shopField = document.getElementById("shopField");
    const loanInput = document.getElementById("loanPersonInput");
    const shopInput = document.getElementById("shopInput");

    const showLoan = key === "loan paid";
    const showShop = key === "takeaway" || key === "grocery";

    if (loanField) {
        loanField.classList.toggle("hidden", !showLoan);
        if (loanInput) {
            loanInput.required = showLoan;
            if (!showLoan) loanInput.value = "";
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
}

document.addEventListener("DOMContentLoaded", initExpenseConditionalFields);
