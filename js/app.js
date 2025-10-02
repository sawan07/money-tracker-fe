const API_URL = "https://script.google.com/macros/s/AKfycbyNX0lZ0t-pl7nTWbv6m7FYTF4BZ7_jTWWotZ3oj3vnawgCIzqV41gn1GqykoT-JFBcEw/exec";

// Month generation
const monthSelect = document.getElementById("monthSelect");
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

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
    months.forEach(m => {
        const option = document.createElement("option");
        option.value = m.label;
        option.textContent = m.label;
        if (m.isCurrent) option.selected = true;
        monthSelect.appendChild(option);
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

function updateBalanceDisplay(balance) {
    const balanceEl = document.getElementById("remainingBalance");

    // Ensure balance is a number
    let numericBalance = parseFloat(balance.toString().replace(/[^\d.-]/g, "")) || 0;

    balanceEl.textContent = `£${numericBalance.toFixed(2)}`;

    if (numericBalance < 100) {
        balanceEl.classList.remove("green");
        balanceEl.classList.add("red");
    } else {
        balanceEl.classList.remove("red");
        balanceEl.classList.add("green");
    }
}

async function fetchBalance(month) {
    console.log("Fetching balance for month:", month); // Debug

    try {
        const res = await fetch(`${API_URL}?month=${encodeURIComponent(month)}`);
        const data = await res.json();
        console.log("API response:", data); // Debug

        if (data.status === "ok") {
            updateBalanceDisplay(data.remaining);
        } else {
            console.error("Balance error:", data.message);
        }
    } catch (err) {
        console.error("Fetch balance failed:", err);
    }
}

// --- Run after DOM is ready ---
document.addEventListener("DOMContentLoaded", () => {
    // Initial fetch
    const currentMonth = monthSelect.value;
    fetchBalance(currentMonth);

    // Refetch when month changes
    monthSelect.addEventListener("change", (e) => {
        fetchBalance(e.target.value);
    });
});



