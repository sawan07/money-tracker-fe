const API_URL = "YOUR_WEB_APP_URL"; // <-- Replace with Apps Script Web App URL

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
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
        const result = await res.json();
        return result.status === "success";
    } catch (err) {
        console.error(err);
        return false;
    }
}
