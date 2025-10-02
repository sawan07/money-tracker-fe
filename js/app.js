const API_URL = "https://script.google.com/macros/s/AKfycbwC8QnN-1hEzeRMPP5NYvZkfk_v6fXQ-XSoxZ7zwnxCpgrSC9hUWQlYaGnT4koKknR4iA/exec";

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

