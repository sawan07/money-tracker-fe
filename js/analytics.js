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
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

async function initAnalytics() {
    const res = await fetch(`${API_URL}?action=getChartData`);
    const result = await res.json();
    if (result.status !== "ok") return;

    rawChartData = result.data;

    // Sort months: Oldest to Newest for the Trend, Newest for the Pie
    const sortedMonthKeys = Object.keys(rawChartData).sort((a, b) => new Date(a) - new Date(b));
    const newestMonth = sortedMonthKeys[sortedMonthKeys.length - 1];

    // Populate Pie Month Dropdown with clean names
    const pieSelect = document.getElementById("pieMonthSelect");
    [...sortedMonthKeys].reverse().forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = formatMonthLabel(m);
        pieSelect.appendChild(opt);
    });

    // Populate Category Dropdown for the second graph
    populateCategoryDropdown(sortedMonthKeys);

    // Initial Render
    renderPieChart(newestMonth);
    renderTrendChart(sortedMonthKeys, "Total");

    // Listeners
    pieSelect.addEventListener("change", (e) => renderPieChart(e.target.value));

    const trendSelect = document.getElementById("trendCategorySelect");
    if (trendSelect) {
        trendSelect.addEventListener("change", (e) => renderTrendChart(sortedMonthKeys, e.target.value));
    }
}

function populateCategoryDropdown(months) {
    const trendSelect = document.getElementById("trendCategorySelect");
    if (!trendSelect) return;

    const allCategories = new Set();
    months.forEach(m => {
        Object.keys(rawChartData[m]).forEach(cat => allCategories.add(cat));
    });

    allCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = cat;
        trendSelect.appendChild(opt);
    });
}

function renderPieChart(monthKey) {
    const data = rawChartData[monthKey];
    const ctx = document.getElementById('categoryPieChart').getContext('2d');
    if (pieChartInst) pieChartInst.destroy();

    pieChartInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: chartColors // Fixed repetitive colors
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
    if (trendChartInst) trendChartInst.destroy();

    const dataPoints = months.map(m => {
        if (filterCategory === "Total") {
            return Object.values(rawChartData[m]).reduce((a, b) => a + b, 0);
        }
        return rawChartData[m][filterCategory] || 0;