let rawChartData = {};
let pieChartInst = null;
let trendChartInst = null;
let dailySpendChartInst = null;
let dailyControlsInitialized = false;

const chartColors = [
    '#36d4ff', '#7c5cff', '#39e7a5', '#f8c14a', '#ff5c7a',
    '#14b8a6', '#60a5fa', '#c084fc', '#f97316', '#22c55e',
    '#e879f9', '#a3e635', '#facc15', '#fb7185', '#38bdf8'
];
const chartTextColor = '#d9e7ff';
const chartMutedColor = '#8fa2c2';
const chartGridColor = 'rgba(143, 162, 194, 0.16)';

function getRandomColor() {
    return getChartColor(Math.floor(Math.random() * chartColors.length));
}

function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatShortRangeDate(value) {
    const date = parseDateInputValue(value);
    if (!date) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonthLabel(dateStr) {
    const parsed = parseMonthKey(dateStr);
    if (!parsed) return dateStr;
    return parsed.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function parseMonthKey(key) {
    if (!key) return null;
    const direct = new Date(key);
    if (!Number.isNaN(direct.getTime())) return direct;
    const withDay = new Date(`1 ${key}`);
    return Number.isNaN(withDay.getTime()) ? null : withDay;
}

function sortMonthKeys(keys) {
    return [...keys].sort((a, b) => {
        const aDate = parseMonthKey(a);
        const bDate = parseMonthKey(b);
        if (!aDate || !bDate) return a.localeCompare(b);
        return aDate - bDate;
    });
}

function formatCurrency(amount) {
    return `£${amount.toFixed(2)}`;
}

function getChartColor(index) {
    return chartColors[index % chartColors.length];
}

function escapeHtml(value) {
    return value.toString().replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function normalizeCategoryName(value) {
    return value ? value.toString().trim().toLowerCase() : "";
}

function renderPieTotal(monthKey, total) {
    const totalEl = document.getElementById("pieTotal");
    if (!totalEl) return;

    totalEl.innerHTML = `
        <span class="pie-total-label">Total Spent</span>
        <span class="pie-total-value">${formatCurrency(total)}</span>
        <span class="pie-total-month">${formatMonthLabel(monthKey)}</span>
    `;
}

function getPotStatusClass(percent, potMax) {
    if (potMax <= 0) return "no-pot";
    if (percent >= 100) return "over";
    if (percent >= 80) return "warning";
    return "good";
}

function renderPotProgressSkeleton(monthKey) {
    const monthEl = document.getElementById("potProgressMonth");
    const listEl = document.getElementById("potProgressList");
    if (monthEl) monthEl.textContent = formatMonthLabel(monthKey);
    if (listEl) listEl.innerHTML = '<div class="empty-state">Loading pot usage...</div>';
}

function renderPotProgress(monthKey, chartEntries, categoryDetails) {
    const monthEl = document.getElementById("potProgressMonth");
    const listEl = document.getElementById("potProgressList");
    if (!listEl) return;

    if (monthEl) monthEl.textContent = formatMonthLabel(monthKey);

    const detailsByCategory = (categoryDetails || []).reduce((acc, item) => {
        acc[normalizeCategoryName(item.name)] = item;
        return acc;
    }, {});

    const rows = chartEntries.map(([category, chartAmount]) => {
        const detail = detailsByCategory[normalizeCategoryName(category)] || {};
        const spent = Number(detail.spent ?? chartAmount) || 0;
        const potMax = Number(detail.potMax || 0);
        const left = Number(detail.left ?? (potMax - spent)) || 0;
        const percent = potMax > 0 ? (spent / potMax) * 100 : 0;
        const clampedPercent = Math.max(0, Math.min(percent, 100));
        const statusClass = getPotStatusClass(percent, potMax);
        const statusText = potMax > 0 ? `${percent.toFixed(0)}% used` : "No pot set";

        return {
            category,
            html: `
            <div class="pot-progress-item ${statusClass}">
                <div class="pot-progress-top">
                    <span class="pot-progress-dot"></span>
                    <span class="pot-progress-name">${escapeHtml(category)}</span>
                    <span class="pot-progress-percent">${statusText}</span>
                </div>
                <div class="pot-progress-track" aria-hidden="true">
                    <span class="pot-progress-fill" style="width:${clampedPercent}%"></span>
                </div>
                <div class="pot-progress-meta">
                    <span>${formatCurrency(spent)} spent</span>
                    <span>${potMax > 0 ? `${formatCurrency(left)} left of ${formatCurrency(potMax)}` : "Set a pot to track usage"}</span>
                </div>
            </div>
        `,
            hasPot: potMax > 0,
            percent
        };
    }).sort((a, b) => {
        if (a.hasPot !== b.hasPot) return a.hasPot ? -1 : 1;
        if (!a.hasPot && !b.hasPot) return a.category.localeCompare(b.category);
        if (a.percent !== b.percent) return a.percent - b.percent;
        return a.category.localeCompare(b.category);
    });

    listEl.innerHTML = rows.length
        ? rows.map(row => row.html).join("")
        : '<div class="empty-state">No spending categories for this month.</div>';
}

async function loadPotProgress(monthKey, chartEntries) {
    renderPotProgressSkeleton(monthKey);

    try {
        const sheetMonth = formatMonthLabel(monthKey);
        const data = await MoneyTracker.getExpenseCategories(sheetMonth);

        if (data.status !== "ok" || !Array.isArray(data.categories)) {
            throw new Error(data.message || "Invalid category response");
        }

        renderPotProgress(monthKey, chartEntries, data.categories);
    } catch (err) {
        console.error("Failed to load pot progress:", err);
        renderPotProgress(monthKey, chartEntries, []);
    }
}

function getWeekRange(referenceDate) {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        from: toDateInputValue(start),
        to: toDateInputValue(end),
        label: "This week"
    };
}

function getMonthRange(referenceDate) {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    return {
        from: toDateInputValue(start),
        to: toDateInputValue(end),
        label: "This month"
    };
}

function setDailyRangeInputs(range) {
    const fromInput = document.getElementById("dailyFromDate");
    const toInput = document.getElementById("dailyToDate");
    if (fromInput) fromInput.value = range.from;
    if (toInput) toInput.value = range.to;
}

function setActiveDailyRange(rangeName) {
    document.querySelectorAll(".range-pill").forEach(button => {
        button.classList.toggle("active", button.dataset.range === rangeName);
    });
}

function renderDailySpendingChart(days) {
    const ctx = document.getElementById('dailySpendBarChart');
    if (!ctx) return;

    if (dailySpendChartInst) dailySpendChartInst.destroy();

    dailySpendChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(day => day.label),
            datasets: [{
                label: "Daily spending (£)",
                data: days.map(day => Number(day.amount || 0)),
                backgroundColor: 'rgba(54, 212, 255, 0.72)',
                borderColor: '#36d4ff',
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 34
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: chartTextColor }
                },
                tooltip: {
                    backgroundColor: 'rgba(7, 17, 31, 0.94)',
                    borderColor: 'rgba(54, 212, 255, 0.28)',
                    borderWidth: 1,
                    titleColor: chartTextColor,
                    bodyColor: chartMutedColor,
                    callbacks: {
                        label: function (context) {
                            return `Spent: ${formatCurrency(Number(context.parsed.y) || 0)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: chartMutedColor,
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: chartMutedColor,
                        callback: function (value) { return '£' + value; }
                    },
                    grid: { color: chartGridColor }
                }
            }
        }
    });
}

async function loadDailySpending(range) {
    const totalEl = document.getElementById("dailyRangeTotal");
    const labelEl = document.getElementById("dailyRangeLabel");

    if (labelEl) {
        labelEl.textContent = `${range.label}: ${formatShortRangeDate(range.from)} - ${formatShortRangeDate(range.to)}`;
    }
    if (totalEl) totalEl.textContent = "Loading...";

    try {
        const result = await MoneyTracker.getDailySpending(range.from, range.to);

        if (result.status !== "ok" || !Array.isArray(result.data)) {
            throw new Error(result.message || "Invalid daily spending response");
        }

        if (totalEl) totalEl.textContent = formatCurrency(Number(result.total || 0));
        renderDailySpendingChart(result.data);
    } catch (err) {
        console.error("Failed to load daily spending:", err);
        if (totalEl) totalEl.textContent = "Unavailable";
        renderDailySpendingChart([]);
    }
}

function applyDailyRangePreset(rangeName) {
    const now = new Date();
    const range = rangeName === "month" ? getMonthRange(now) : getWeekRange(now);
    setActiveDailyRange(rangeName);
    setDailyRangeInputs(range);
    loadDailySpending(range);
}

function applyCustomDailyRange() {
    const fromInput = document.getElementById("dailyFromDate");
    const toInput = document.getElementById("dailyToDate");
    if (!fromInput || !toInput || !fromInput.value || !toInput.value) return;

    setActiveDailyRange("custom");
    loadDailySpending({
        from: fromInput.value,
        to: toInput.value,
        label: "Custom range"
    });
}

function setupDailySpendingControls() {
    if (dailyControlsInitialized) return;

    const dailyChartEl = document.getElementById("dailySpendBarChart");
    const applyBtn = document.getElementById("applyDailyRangeBtn");
    if (!dailyChartEl || !applyBtn) return;

    dailyControlsInitialized = true;

    document.querySelectorAll(".range-pill").forEach(button => {
        button.addEventListener("click", () => {
            const rangeName = button.dataset.range;
            if (rangeName === "custom") {
                setActiveDailyRange("custom");
                return;
            }
            applyDailyRangePreset(rangeName);
        });
    });

    applyBtn.addEventListener("click", applyCustomDailyRange);
    applyDailyRangePreset("week");
}

async function initAnalytics() {
    try {
        const result = await MoneyTracker.getChartData();
        if (result.status !== "ok") return;

        rawChartData = result.data;

        const sortedMonthKeys = sortMonthKeys(Object.keys(rawChartData));
        const newestMonth = sortedMonthKeys[sortedMonthKeys.length - 1];

        // Populate Pie Month Dropdown
        const pieSelect = document.getElementById("pieMonthSelect");
        if (pieSelect) {
            pieSelect.innerHTML = "";
            [...sortedMonthKeys].reverse().forEach(m => {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = formatMonthLabel(m);
                pieSelect.appendChild(opt);
            });
            pieSelect.addEventListener("change", (e) => renderPieChart(e.target.value));
        }

        // Populate Category Dropdown
        populateCategoryDropdown(sortedMonthKeys);

        // Initial Render
        renderPieChart(newestMonth);
        renderTrendChart(sortedMonthKeys, "Total");
        setupDailySpendingControls();

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

    trendSelect.innerHTML = '<option value="Total">Total Spending</option>';
    const allCategories = new Set();
    months.forEach(m => {
        const monthData = rawChartData[m];
        if (monthData) {
            Object.keys(monthData).forEach(cat => {
                if (cat && cat !== "Total") allCategories.add(cat);
            });
        }
    });

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

    const sortedCategoryEntries = Object.entries(data)
        .map(([category, amount]) => [category, Number(amount) || 0])
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

    const totalSpending = sortedCategoryEntries.reduce((sum, [, amount]) => sum + amount, 0);
    renderPieTotal(monthKey, totalSpending);
    loadPotProgress(monthKey, sortedCategoryEntries);

    const pieLabels = sortedCategoryEntries.map(([category]) => category);
    const pieValues = sortedCategoryEntries.map(([, amount]) => amount);

    pieChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieValues,
                backgroundColor: sortedCategoryEntries.map((_, index) => getChartColor(index)),
                borderColor: '#07111f',
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '58%',
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `Spending breakdown for ${formatMonthLabel(monthKey)}`,
                    color: chartTextColor,
                    font: { weight: '700' },
                    padding: { bottom: 14 }
                },
                tooltip: {
                    backgroundColor: 'rgba(7, 17, 31, 0.94)',
                    borderColor: 'rgba(54, 212, 255, 0.28)',
                    borderWidth: 1,
                    titleColor: chartTextColor,
                    bodyColor: chartMutedColor,
                    callbacks: {
                        label: function (context) {
                            const value = Number(context.parsed) || 0;
                            const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : "0.0";
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
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

    // Generate a random color for this specific render
    const randomLineColor = getRandomColor();

    trendChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => formatMonthLabel(m)),
            datasets: [{
                label: filterCategory === "Total" ? "Total Spending (£)" : `${filterCategory} (£)`,
                data: dataPoints,
                borderColor: randomLineColor, // New random color for the line
                backgroundColor: randomLineColor + '22', // Same color with 13% opacity for fill
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: chartTextColor
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(7, 17, 31, 0.94)',
                    borderColor: 'rgba(54, 212, 255, 0.28)',
                    borderWidth: 1,
                    titleColor: chartTextColor,
                    bodyColor: chartMutedColor
                }
            },
            scales: {
                x: {
                    ticks: { color: chartMutedColor },
                    grid: { color: chartGridColor }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: chartMutedColor,
                        callback: function (value) { return '£' + value; }
                    },
                    grid: {
                        color: chartGridColor
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

function bootAnalytics() {
    if (typeof hideLockOverlay !== "function") {
        initAnalytics();
        return;
    }
    const overlay = document.getElementById("lockOverlay");
    if (!overlay || overlay.style.display === "none") {
        initAnalytics();
    }
}

document.addEventListener("DOMContentLoaded", bootAnalytics);
window.addEventListener("moneytracker:auth-ready", bootAnalytics);