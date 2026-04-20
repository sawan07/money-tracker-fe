let rawChartData = {};
let pieChartInst = null;
let trendChartInst = null;

// 1. Expanded color palette to prevent repeats
const chartColors = [
    '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
    '#795548', '#00bcd4', '#607d8b', '#e91e63', '#3f51b5',
    '#009688', '#8bc34a', '#ffc107', '#ff5722', '#673ab7'
];

// 2. Helper to format "Wed Apr 01..." into "April 2026"
function formatMonthLabel(dateStr) {
    const d = new Date(dateStr);
    // Use 'en-GB' for UK specific formatting
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

async function initAnalytics() {
    try {
        const res = await fetch(`${API_URL}?action=getChartData`);
        const result = await res.json();
        if (result.status !== "ok") {
            console.error("Data fetch failed:", result.message);
            return;
        }

        rawChartData = result.data;

        // Sort months: Oldest to Newest for the Trend
        const sortedMonthKeys = Object.keys(rawChartData).sort((a, b) => new Date(a) - new Date(b));
        const newestMonth = sortedMonthKeys[sortedMonthKeys.length - 1];

        // Populate Pie Month Dropdown with clean names
        const pieSelect = document.getElementById("pieMonthSelect");
        if (pieSelect) {
            pieSelect.innerHTML = ""; // Clear existing to prevent duplicates
            [...sortedMonthKeys].reverse().forEach(m => {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = formatMonthLabel(m); // Apply formatting
                pieSelect.appendChild(opt);
            });

            pieSelect.addEventListener("change", (e) => renderPieChart(e.target.value));
        }

        // Populate Category Dropdown for the second graph
        populateCategoryDropdown(sortedMonthKeys);

        // Initial Render
        renderPieChart(newestMonth);
        renderTrendChart(sortedMonthKeys, "Total");

        // Trend filter listener
        const trendSelect = document.getElementById("trendCategorySelect");
        if (trendSelect) {
            trendSelect.addEventListener("change", (e) => renderTrendChart(sortedMonthKeys, e.target.value));
        }
    } catch (err) {
        console.error("initAnalytics error:", err);
    }
}

function populateCategoryDropdown(months) {
    const trendSelect = document.getElementById("trendCategorySelect");
    if (!trendSelect) return;

    // Reset dropdown to just "Total Spending"
    trendSelect.innerHTML = '<option value="Total">Total Spending</option>';

    const allCategories = new Set();
    months.forEach(m => {
        const monthData = rawChartData[m];
        if (monthData) {
            Object.keys(monthData).forEach(cat => {
                // Ensure we don't add "Total" twice and handle empty keys
                if (cat && cat !== "Total") allCategories.add(cat);
            });
        }
    });

    // Sort alphabetically for better UX
    Array.from(allCategories).sort().forEach(cat => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = cat;
        trendSelect.appendChild(opt);
    });
}

function renderPieChart(monthKey) {
    const data = rawChartData[monthKey];
    const ctx = document.getElementById('categoryPieChart').getContext('2d');
    if (!ctx || !data) return;

    if (pieChartInst) pieChartInst.destroy();

    pieChartInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: chartColors
            }]
        },
        options: {
            plugins: {
                title: { display: true, text: `Spending breakdown for ${formatMonthLabel(monthKey)}` }
            }
        }
    });
}

function renderTrendChart(months, filterCategory) {
    const ctx = document.getElementById('trendLineChart').getContext('2d');
    if (!ctx) return;

    if (trendChartInst) trendChartInst.destroy();

    const dataPoints = months.map(m => {
        if (filterCategory === "Total") {
            return Object.values(rawChartData[m]).reduce((a, b) => a + b, 0);
        }
        return rawChartData[m][filterCategory] || 0;
    });

    trendChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => formatMonthLabel(m)), // Apply formatting to X-axis
            datasets: [{
                label: filterCategory === "Total" ? "Total Spending (£)" : `${filterCategory} (£)`,
                data: dataPoints,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) { return '£' + value; } // Add GBP symbol
                    }
                }
            }
        }
    });
}

// Biometric Hook
const originalHideOverlay = hideLockOverlay;
hideLockOverlay = function () {
    originalHideOverlay();
    initAnalytics();
};