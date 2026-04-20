let rawChartData = {};

async function initAnalytics() {
    const res = await fetch(`${API_URL}?action=getChartData`);
    const result = await res.json();
    if (result.status !== "ok") return;

    rawChartData = result.data;
    // Sort months: Recent to Old
    const months = Object.keys(rawChartData).sort((a, b) => new Date(b) - new Date(a));

    const pieSelect = document.getElementById("pieMonthSelect");
    months.forEach(m => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = m;
        pieSelect.appendChild(opt);
    });

    renderPieChart(months[0]);
    renderTrendChart(months);

    pieSelect.addEventListener("change", (e) => renderPieChart(e.target.value));
}

function renderPieChart(month) {
    const data = rawChartData[month];
    const ctx = document.getElementById('categoryPieChart').getContext('2d');
    if (window.pieChartInst) window.pieChartInst.destroy();

    window.pieChartInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#795548']
            }]
        }
    });
}

function renderTrendChart(months) {
    const ctx = document.getElementById('trendLineChart').getContext('2d');
    // Line chart shows months ordered recent to old as requested
    const totals = months.map(m => Object.values(rawChartData[m]).reduce((a, b) => a + b, 0));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Total Spending (£)',
                data: totals,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.3
            }]
        }
    });
}

// Ensure charts only load after biometric unlock
const originalHideOverlay = hideLockOverlay;
hideLockOverlay = function () {
    originalHideOverlay();
    initAnalytics();
};