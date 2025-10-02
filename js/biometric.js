// ---------- Biometric (WebAuthn) client-only unlock ----------

const LOCK_KEY = "moneytracker_cred_id"; // store credential id

// Utilities to convert
function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}
function str2ab(str) {
    return (new TextEncoder()).encode(str);
}
function ab2buf(ab) { return new Uint8Array(ab); }

// Show/hide overlay:
function showLockOverlay() {
    const o = document.getElementById("lockOverlay");
    if (o) o.style.display = "flex";
}
function hideLockOverlay() {
    const o = document.getElementById("lockOverlay");
    if (o) o.style.display = "none";
}

// Register a new credential (call once)
async function registerBiometric() {
    if (!window.PublicKeyCredential) {
        alert("WebAuthn not supported in this browser.");
        return;
    }
    try {
        // Create a (client-side) random challenge
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));

        const publicKey = {
            challenge: challenge,
            rp: { name: "Money Tracker" },
            user: {
                id: str2ab("local-user-id"), // arbitrary local id
                name: "local-user",
                displayName: "Local User"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
            timeout: 60000,
            authenticatorSelection: {
                authenticatorAttachment: "platform", // prefer platform authenticator => Face ID / Touch ID
                userVerification: "preferred"
            },
            attestation: "none"
        };

        const cred = await navigator.credentials.create({ publicKey });
        // Store credential id locally (base64)
        const rawId = cred.rawId;
        const idHex = buf2hex(rawId);
        localStorage.setItem(LOCK_KEY, idHex);

        alert("Biometric registration succeeded. You can now use Unlock.");
    } catch (err) {
        console.error("registerBiometric error", err);
        alert("Registration failed: " + err);
    }
}

// Use credential to prompt biometric and unlock
async function authenticateBiometric() {
    if (!window.PublicKeyCredential) {
        alert("WebAuthn not supported in this browser.");
        return false;
    }
    try {
        const idHex = localStorage.getItem(LOCK_KEY);
        let allowCreds = undefined;
        if (idHex) {
            // convert hex id back to Uint8Array
            const idBytes = new Uint8Array(idHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            allowCreds = [{ id: idBytes.buffer, type: "public-key", transports: ["internal"] }];
        }

        // server-style challenge (client-generated random)
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));

        const publicKey = {
            challenge: challenge,
            timeout: 60000,
            allowCredentials: allowCreds,
            userVerification: "preferred"
        };

        // this will trigger Face ID / Touch ID prompt
        const assertion = await navigator.credentials.get({ publicKey });

        // If we got here without throwing, user authenticated successfully.
        // NOTE: we are not sending assertion to server for verification (client-only flow).
        console.log("assertion ok", assertion);
        return true;
    } catch (err) {
        console.error("authenticateBiometric error", err);
        return false;
    }
}

// Hook up buttons and auto-lock on load
document.addEventListener("DOMContentLoaded", () => {
    // If no credential saved, show overlay with register option
    const cred = localStorage.getItem(LOCK_KEY);
    const registerBtn = document.getElementById("registerBtn");
    const unlockBtn = document.getElementById("unlockBtn");

    if (!cred) {
        showLockOverlay();
    } else {
        // We can attempt immediate prompt on load:
        showLockOverlay();
        authenticateBiometric().then(ok => {
            if (ok) hideLockOverlay();
            else showLockOverlay(); // keep showing overlay
        });
    }

    if (registerBtn) registerBtn.addEventListener("click", async () => {
        await registerBiometric();
    });
    if (unlockBtn) unlockBtn.addEventListener("click", async () => {
        const ok = await authenticateBiometric();
        if (ok) hideLockOverlay();
        else alert("Authentication failed or cancelled.");
    });
});
