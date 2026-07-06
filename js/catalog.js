function populateSelect(selectEl, names, preferredValue) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        selectEl.appendChild(option);
    });
    if (preferredValue && names.includes(preferredValue)) {
        selectEl.value = preferredValue;
    }
}

function updateSetupBanner(show) {
    const banner = document.getElementById("setupBanner");
    if (banner) banner.classList.toggle("hidden", !show);
}

async function loadSpendingCategoryOptions(preferredCategory) {
    const select = document.getElementById("expenseCategorySelect");
    if (!select) return [];

    if (!MoneyTracker.isApiEnabled()) {
        populateSelect(select, FALLBACK_EXPENSE_CATEGORY_NAMES, preferredCategory);
        updateSetupBanner(false);
        return FALLBACK_EXPENSE_CATEGORY_NAMES.map(name => ({ name }));
    }

    select.disabled = true;
    select.innerHTML = "<option>Loading categories...</option>";

    try {
        const categories = await MoneyTracker.listSpendingCategories();
        const names = categories.map(item => item.name);
        if (!names.length) {
            populateSelect(select, ["No categories yet"], preferredCategory);
            updateSetupBanner(true);
            return [];
        }

        populateSelect(select, names, preferredCategory);
        updateSetupBanner(false);
        return categories;
    } catch (error) {
        console.error("Failed to load spending categories:", error);
        populateSelect(select, FALLBACK_EXPENSE_CATEGORY_NAMES, preferredCategory);
        return [];
    } finally {
        select.disabled = false;
    }
}

async function loadEarningSourceOptions(preferredSource) {
    const select = document.getElementById("earningSourceSelect");
    if (!select) return;

    if (!MoneyTracker.isApiEnabled()) {
        populateSelect(select, FALLBACK_EARNING_SOURCE_NAMES, preferredSource);
        return;
    }

    select.disabled = true;
    select.innerHTML = "<option>Loading sources...</option>";

    try {
        const categories = await MoneyTracker.listEarningCategories();
        const names = categories.map(item => item.name);
        populateSelect(select, names.length ? names : ["No sources yet"], preferredSource);
    } catch (error) {
        console.error("Failed to load earning categories:", error);
        populateSelect(select, FALLBACK_EARNING_SOURCE_NAMES, preferredSource);
    } finally {
        select.disabled = false;
    }
}

async function seedDefaultCategories() {
    const messageEl = document.getElementById("setupMessage");
    if (!MoneyTracker.isApiEnabled()) {
        if (messageEl) messageEl.textContent = "Sign in to the API first.";
        return;
    }

    if (messageEl) {
        messageEl.textContent = "Creating default categories...";
        messageEl.className = "message";
    }

    try {
        for (const category of DEFAULT_SPENDING_CATEGORIES) {
            await MoneyTracker.upsertSpendingCategory(category);
        }
        for (const category of DEFAULT_EARNING_CATEGORIES) {
            await MoneyTracker.upsertEarningCategory(category);
        }

        const month = document.getElementById("monthSelect")?.value;
        await loadSpendingCategoryOptions(localStorage.getItem("moneytracker_last_expense_category"));
        await loadEarningSourceOptions();
        if (month && typeof refreshExpenseCategories === "function") {
            await refreshExpenseCategories(month);
        }
        if (typeof refreshHomeData === "function") refreshHomeData();

        if (messageEl) {
            messageEl.textContent = "Default categories saved.";
            messageEl.className = "message success";
        }
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message || "Could not seed categories";
            messageEl.className = "message error";
        }
    }
}

async function initializeSelectedMonth() {
    const messageEl = document.getElementById("setupMessage");
    const month = document.getElementById("monthSelect")?.value;
    if (!month) return;

    if (!MoneyTracker.isApiEnabled()) {
        if (messageEl) messageEl.textContent = "Sign in to the API first.";
        return;
    }

    if (messageEl) {
        messageEl.textContent = `Initializing ${month}...`;
        messageEl.className = "message";
    }

    try {
        await MoneyTracker.initializeMonth(month);
        if (typeof refreshExpenseCategories === "function") {
            await refreshExpenseCategories(month);
        }
        if (typeof fetchBalance === "function") await fetchBalance(month);
        if (typeof refreshHomeData === "function") refreshHomeData();

        if (messageEl) {
            messageEl.textContent = `${month} initialized from your recurring templates.`;
            messageEl.className = "message success";
        }
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message || "Could not initialize month";
            messageEl.className = "message error";
        }
    }
}

async function refreshCatalogUi() {
    const preferredCategory = localStorage.getItem("moneytracker_last_expense_category");
    await loadSpendingCategoryOptions(preferredCategory);
    await loadEarningSourceOptions();

    const month = document.getElementById("monthSelect")?.value;
    if (month && typeof refreshExpenseCategories === "function") {
        await refreshExpenseCategories(month, preferredCategory);
    }
    if (typeof updateExpenseConditionalFields === "function") {
        const category = document.getElementById("expenseCategorySelect")?.value;
        if (category) updateExpenseConditionalFields(category);
    }
}

function initCatalogUi() {
    const seedBtn = document.getElementById("seedCategoriesBtn");
    const initBtn = document.getElementById("initializeMonthBtn");

    if (seedBtn) seedBtn.addEventListener("click", seedDefaultCategories);
    if (initBtn) initBtn.addEventListener("click", initializeSelectedMonth);

    window.addEventListener("moneytracker:auth-ready", refreshCatalogUi);

    if (MoneyTracker.isApiEnabled()) {
        refreshCatalogUi();
    } else {
        loadSpendingCategoryOptions();
        loadEarningSourceOptions();
    }
}

document.addEventListener("DOMContentLoaded", initCatalogUi);
