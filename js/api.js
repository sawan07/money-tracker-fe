const MoneyTracker = (() => {
    const GAS_URL =
        "https://script.google.com/macros/s/AKfycby6VamdvDR7uSPqlpC6tTiJWx1uVUJqABb1nXV8WaMJKXNTSoi9zHe9ULrYpPwQHoWCJw/exec";

    const STORAGE = {
        apiBase: "moneytracker_api_base",
        token: "moneytracker_auth_token",
        user: "moneytracker_auth_user",
    };

    const DEFAULT_API_BASE = "http://localhost:8081";

    function getApiBase() {
        return localStorage.getItem(STORAGE.apiBase) || DEFAULT_API_BASE;
    }

    function setApiBase(url) {
        localStorage.setItem(STORAGE.apiBase, url.replace(/\/$/, ""));
    }

    function getToken() {
        return localStorage.getItem(STORAGE.token);
    }

    function getUser() {
        try {
            const raw = localStorage.getItem(STORAGE.user);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function isApiEnabled() {
        return Boolean(getToken());
    }

    function clearSession() {
        localStorage.removeItem(STORAGE.token);
        localStorage.removeItem(STORAGE.user);
    }

    function saveSession(token, user) {
        localStorage.setItem(STORAGE.token, token);
        localStorage.setItem(STORAGE.user, JSON.stringify(user || null));
    }

    async function apiFetch(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${getApiBase()}${path}`, {
            ...options,
            headers,
        });

        let payload = null;
        const text = await response.text();
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { message: text };
            }
        }

        if (response.status === 401) {
            clearSession();
            window.dispatchEvent(new CustomEvent("moneytracker:auth-required"));
            throw new Error(payload?.message || "Session expired. Please sign in again.");
        }

        if (!response.ok) {
            throw new Error(payload?.message || `Request failed (${response.status})`);
        }

        return payload;
    }

    async function login(email, password) {
        const result = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        saveSession(result.token, result.user);
        window.dispatchEvent(new CustomEvent("moneytracker:auth-ready"));
        return result;
    }

    async function register(email, password, displayName) {
        const result = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, displayName }),
        });
        saveSession(result.token, result.user);
        window.dispatchEvent(new CustomEvent("moneytracker:auth-ready"));
        return result;
    }

    function logout() {
        clearSession();
        window.dispatchEvent(new CustomEvent("moneytracker:auth-required"));
    }

    async function sendExpense(formData, month) {
        if (isApiEnabled()) {
            const body = {
                month,
                date: formData.get("date"),
                amount: String(formData.get("amount")),
                category: formData.get("category"),
            };
            const notes = formData.get("notes");
            if (notes) body.notes = notes;

            const loanCreditorId = formData.get("loanCreditorId");
            if (loanCreditorId) body.loanCreditorId = loanCreditorId;

            const shop = formData.get("shop");
            if (shop) body.shop = shop;

            await apiFetch("/expenses", {
                method: "POST",
                body: JSON.stringify(body),
            });
            return true;
        }

        return sendGasPayload("expense", formData, month);
    }

    async function sendEarning(formData, month) {
        if (isApiEnabled()) {
            const body = {
                month,
                date: formData.get("date"),
                amount: String(formData.get("amount")),
                source: formData.get("source"),
            };
            const notes = formData.get("notes");
            if (notes) body.notes = notes;

            await apiFetch("/earnings", {
                method: "POST",
                body: JSON.stringify(body),
            });
            return true;
        }

        return sendGasPayload("earning", formData, month);
    }

    async function sendGasPayload(type, formData, month) {
        const category = formData.get("category");
        const loanPerson = formData.get("loanPerson");
        const shop = formData.get("shop");
        let notes = formData.get("notes") || "";

        if (type === "expense") {
            if (loanPerson) {
                notes = notes ? `${notes} | Paid to: ${loanPerson}` : `Paid to: ${loanPerson}`;
            }
            if (shop) {
                notes = notes ? `${notes} | Shop: ${shop}` : `Shop: ${shop}`;
            }
        }

        const payload = {
            type,
            month,
            date: formData.get("date"),
            amount: formData.get("amount"),
            category,
            source: formData.get("source"),
            notes,
            loanPerson: loanPerson || null,
            shop: shop || null,
        };

        await fetch(GAS_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload),
        });
        return true;
    }

    async function loadLatestTransactions(limit = 10) {
        if (isApiEnabled()) {
            const result = await apiFetch(`/transactions/latest?limit=${limit}`);
            return Array.isArray(result.data) ? result.data : [];
        }

        const res = await fetch(`${GAS_URL}?action=getLatestTransactions&_=${Date.now()}`, {
            cache: "no-store",
        });
        const result = await res.json();
        if (result.status !== "ok") {
            throw new Error(result.message || "Could not load transactions");
        }
        return Array.isArray(result.data) ? result.data : [];
    }

    async function fetchBalance(month) {
        if (isApiEnabled()) {
            const result = await apiFetch(`/months/${encodeURIComponent(month)}/overview`);
            return {
                status: "ok",
                left: result.left,
                scheduledLeft: result.scheduledLeft,
                forecastLeft: result.forecastLeft,
                remaining: result.remaining,
            };
        }

        const res = await fetch(`${GAS_URL}?month=${encodeURIComponent(month)}`);
        return res.json();
    }

    async function getExpenseCategories(month) {
        if (isApiEnabled()) {
            const result = await apiFetch(
                `/categories/expense-summary?month=${encodeURIComponent(month)}`,
            );
            return {
                status: "ok",
                categories: Array.isArray(result.categories) ? result.categories : [],
            };
        }

        const res = await fetch(
            `${GAS_URL}?action=getExpenseCategories&month=${encodeURIComponent(month)}&_=${Date.now()}`,
            { cache: "no-store" },
        );
        return res.json();
    }

    async function getChartData() {
        if (isApiEnabled()) {
            const result = await apiFetch("/analytics/chart-data");
            return { status: "ok", data: result.data || {} };
        }

        const res = await fetch(`${GAS_URL}?action=getChartData&_=${Date.now()}`, {
            cache: "no-store",
        });
        return res.json();
    }

    async function getDailySpending(from, to) {
        if (isApiEnabled()) {
            const result = await apiFetch(
                `/analytics/daily-spending?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            );
            return {
                status: "ok",
                total: result.total,
                data: Array.isArray(result.data) ? result.data : [],
            };
        }

        const res = await fetch(
            `${GAS_URL}?action=getDailySpending&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&_=${Date.now()}`,
            { cache: "no-store" },
        );
        return res.json();
    }

    async function getLoans() {
        const result = await apiFetch("/loans");
        return {
            data: Array.isArray(result.data) ? result.data : [],
            totalGbpApprox: Number(result.totalGbpApprox || 0),
        };
    }

    async function upsertLoan(creditor) {
        const result = await apiFetch("/loans", {
            method: "PUT",
            body: JSON.stringify(creditor),
        });
        return result.data;
    }

    async function deleteLoan(creditorId) {
        await apiFetch(`/loans/${creditorId}`, { method: "DELETE" });
    }

    async function getShops(scope) {
        const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
        const result = await apiFetch(`/shops${query}`);
        return {
            data: Array.isArray(result.data) ? result.data : [],
            suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };
    }

    return {
        GAS_URL,
        STORAGE,
        DEFAULT_API_BASE,
        getApiBase,
        setApiBase,
        getToken,
        getUser,
        isApiEnabled,
        clearSession,
        login,
        register,
        logout,
        apiFetch,
        sendExpense,
        sendEarning,
        loadLatestTransactions,
        fetchBalance,
        getExpenseCategories,
        getChartData,
        getDailySpending,
        getLoans,
        upsertLoan,
        deleteLoan,
        getShops,
    };
})();

const API_URL = MoneyTracker.GAS_URL;

window.MoneyTracker = MoneyTracker;
