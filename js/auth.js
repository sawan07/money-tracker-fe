function ensureAuthOverlay() {
    if (document.getElementById("authOverlay")) return;

    document.body.insertAdjacentHTML(
        "afterbegin",
        `
        <div id="authOverlay" class="auth-overlay hidden">
            <div class="auth-card">
                <h2>Sign in to PockeTrend</h2>
                <p class="auth-subtitle">Sign in to sync expenses, loans, pots, and analytics with the Kotlin API.</p>
                <form id="authForm">
                    <label>
                        API URL
                        <input type="url" id="authApiBase" required>
                    </label>
                    <label>
                        Email
                        <input type="email" id="authEmail" required autocomplete="username">
                    </label>
                    <label>
                        Password
                        <input type="password" id="authPassword" required minlength="6" autocomplete="current-password">
                    </label>
                    <label>
                        Display name (register only)
                        <input type="text" id="authDisplayName" autocomplete="name">
                    </label>
                    <div class="auth-actions">
                        <button type="submit" id="authLoginBtn">Sign in</button>
                        <button type="button" id="authRegisterBtn" class="secondary-btn">Create account</button>
                    </div>
                    <button type="button" id="authGasBtn" class="link-btn">Continue with Google Sheets (legacy)</button>
                    <div id="authMessage" class="message" aria-live="polite"></div>
                </form>
            </div>
        </div>
        `,
    );

    const overlay = document.getElementById("authOverlay");
    const apiBaseInput = document.getElementById("authApiBase");
    const messageEl = document.getElementById("authMessage");
    const gasBtn = document.getElementById("authGasBtn");

    apiBaseInput.value = MoneyTracker.getApiBase();

    function setMessage(text, type = "") {
        messageEl.textContent = text;
        messageEl.className = type ? `message ${type}` : "message";
    }

    function showOverlay() {
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
    }

    function updateAuthUi() {
        const signedIn = MoneyTracker.isApiEnabled();
        hideOverlay();
        document.body.classList.toggle("api-authenticated", signedIn);

        const user = MoneyTracker.getUser();
        const statusEl = document.getElementById("authStatus");
        const signInBtn = document.getElementById("authSignInBtn");
        const signOutBtn = document.getElementById("authSignOutBtn");

        if (statusEl) {
            statusEl.textContent = signedIn
                ? `Signed in as ${user?.displayName || user?.email || "user"}`
                : "Using Google Sheets backend";
        }
        if (signInBtn) signInBtn.classList.toggle("hidden", signedIn);
        if (signOutBtn) signOutBtn.classList.toggle("hidden", !signedIn);
    }

    document.getElementById("authForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("Signing in...");
        MoneyTracker.setApiBase(apiBaseInput.value.trim());

        try {
            await MoneyTracker.login(
                document.getElementById("authEmail").value.trim(),
                document.getElementById("authPassword").value,
            );
            setMessage("Signed in", "success");
            updateAuthUi();
            window.dispatchEvent(new CustomEvent("moneytracker:auth-ready"));
        } catch (error) {
            setMessage(error.message || "Sign in failed", "error");
        }
    });

    document.getElementById("authRegisterBtn").addEventListener("click", async () => {
        setMessage("Creating account...");
        MoneyTracker.setApiBase(apiBaseInput.value.trim());

        try {
            await MoneyTracker.register(
                document.getElementById("authEmail").value.trim(),
                document.getElementById("authPassword").value,
                document.getElementById("authDisplayName").value.trim() || undefined,
            );
            setMessage("Account created", "success");
            updateAuthUi();
            window.dispatchEvent(new CustomEvent("moneytracker:auth-ready"));
        } catch (error) {
            setMessage(error.message || "Registration failed", "error");
        }
    });

    gasBtn.addEventListener("click", () => {
        MoneyTracker.clearSession();
        hideOverlay();
        document.body.classList.remove("api-authenticated");
        const statusEl = document.getElementById("authStatus");
        if (statusEl) statusEl.textContent = "Using Google Sheets backend";
        window.dispatchEvent(new CustomEvent("moneytracker:auth-ready"));
    });

    const signOutBtn = document.getElementById("authSignOutBtn");
    if (signOutBtn) {
        signOutBtn.addEventListener("click", () => {
            MoneyTracker.logout();
            showOverlay();
            updateAuthUi();
        });
    }

    const signInBtn = document.getElementById("authSignInBtn");
    if (signInBtn) {
        signInBtn.addEventListener("click", showOverlay);
    }

    window.addEventListener("moneytracker:auth-required", showOverlay);
    window.addEventListener("moneytracker:auth-ready", updateAuthUi);

    if (!MoneyTracker.isApiEnabled()) {
        showOverlay();
    }

    updateAuthUi();
}

document.addEventListener("DOMContentLoaded", ensureAuthOverlay);
