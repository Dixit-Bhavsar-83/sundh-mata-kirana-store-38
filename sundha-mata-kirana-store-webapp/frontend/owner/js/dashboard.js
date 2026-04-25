// ============================================================
// dashboard.js — Smooth line charts matching reference image
// ============================================================

let salesChart  = null;
let weeklyChart = null;
let currentEarnings = 0;
let currentOrders   = 0;
let currentPending  = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadWeeklyInsights();
    setInterval(loadDashboardStats, 10000);
    setInterval(loadWeeklyInsights, 60000);
    checkMidnightReset();
});

function manualRefresh() {
    const icon = document.querySelector('#refreshBtn i');
    icon.classList.add('spinning');
    Promise.all([loadDashboardStats(), loadWeeklyInsights()])
        .finally(() => setTimeout(() => icon.classList.remove('spinning'), 600));
}

// ── TODAY STATS ────────────────────────────────────────────
async function loadDashboardStats() {
    try {
        const res  = await fetch('/api/dashboard/stats');
        const json = await res.json();
        if (json.status !== 'success') return;

        const { total_orders, pending, earnings, hourly } = json.data;

        if (earnings !== currentEarnings)   { animateCounter('stat-earnings', currentEarnings, earnings);    currentEarnings = earnings; }
        if (total_orders !== currentOrders) { animateCounter('stat-orders',   currentOrders, total_orders);  currentOrders   = total_orders; }
        if (pending !== currentPending)     { animateCounter('stat-pending',   currentPending, pending);     currentPending  = pending; updateNavBadge(pending); }

        const accepted = total_orders - pending;
        const noteEl   = document.getElementById('earnings-note');
        if (noteEl) noteEl.textContent = `From ${accepted} accepted order${accepted !== 1 ? 's' : ''} today`;

        // KEY FIX: JSON returns string keys "6","7"…
        updateSalesChart(hourly || {});

    } catch (err) { console.error('Stats error:', err); }
}

function animateCounter(elId, from, to) {
    const el = document.getElementById(elId);
    if (!el) return;
    const steps = 40, diff = to - from;
    let step = 0;
    const t = setInterval(() => {
        step++;
        el.textContent = Math.round(from + diff * (1 - Math.pow(1 - step / steps, 3))).toLocaleString('en-IN');
        if (step >= steps) { clearInterval(t); el.textContent = to.toLocaleString('en-IN'); }
    }, 600 / steps);
}

function updateNavBadge(count) {
    const badge = document.getElementById('navPendingBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 9 ? '9+' : count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}

// ── HELPER: make gradient fill ─────────────────────────────
function makeGradient(ctx, colorTop, colorBottom) {
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0,   colorTop);
    grad.addColorStop(0.6, colorBottom);
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    return grad;
}

// ── SHARED CHART OPTIONS ───────────────────────────────────
function sharedLineOptions(customCallbacks) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15,23,42,0.92)',
                titleColor: '#fff',
                bodyColor:  'rgba(255,255,255,0.8)',
                padding: 14,
                cornerRadius: 14,
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                titleFont: { size: 12, weight: 'bold' },
                bodyFont:  { size: 12 },
                callbacks: customCallbacks
            }
        },
        scales: {
            y: {
                display: true,
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                border: { display: false },
                ticks: {
                    color: '#b0bec5',
                    font: { size: 10 },
                    callback: v => v >= 1000 ? `₹${(v/1000).toFixed(1)}k` : `₹${v}`
                }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: '#b0bec5', font: { size: 10, weight: '600' } }
            }
        }
    };
}
// ── LIVE SALES CHART (Today, hourly) ──────────────────────
function updateSalesChart(hourlyData) {
    const canvas = document.getElementById('salesChart');
    const emptyState = document.getElementById('chartEmptyState');
    if (!canvas) return;

    const startHour = 6;
    const endHour = 22; 
    const labels = [], earningsArr = [], ordersArr = [];

    // Calculate Max values for scaling
    let maxEarnings = 1000; 
    let maxOrders = 1;

    for (let h = startHour; h <= endHour; h++) {
        const slot = hourlyData[String(h)] || hourlyData[h] || { earnings: 0, orders: 0 };
        labels.push(h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`);
        
        earningsArr.push(slot.earnings || 0);
        ordersArr.push(slot.orders || 0);
        
        if (slot.earnings > maxEarnings) maxEarnings = slot.earnings;
        if (slot.orders > maxOrders) maxOrders = slot.orders;
    }

    // Normalization factor: Orders ko Earnings ke scale par laane ke liye
    const scaleFactor = maxEarnings / maxOrders;

    const hasData = earningsArr.some(v => v > 0) || ordersArr.some(v => v > 0);

    if (!hasData) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (salesChart) { salesChart.destroy(); salesChart = null; }
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    const ctx = canvas.getContext('2d');

    // Orders ko Earnings ke level pe scale karna (visual sirf)
    const scaledOrders = ordersArr.map(o => o * (scaleFactor * 0.5)); 

    if (salesChart) {
        salesChart.data.labels = labels;
        salesChart.data.datasets.data = earningsArr;
        salesChart.data.datasets.data = scaledOrders;
        salesChart.update('active');
        return;
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Earnings (₹)',
                    data: earningsArr,
                    borderColor: '#f97316',
                    backgroundColor: makeGradient(ctx, 'rgba(251,113,20,0.55)', 'rgba(251,113,20,0.04)'),
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Orders',
                    data: scaledOrders,
                    borderColor: '#6366f1',
                    backgroundColor: makeGradient(ctx, 'rgba(99,102,241,0.45)', 'rgba(99,102,241,0.03)'),
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: sharedLineOptions({
            title: (items) => `🕐 ${items.label}`,
            label: (ctx) => {
                if (ctx.dataset.label.startsWith('Earnings'))
                    return ` 💰 Earnings: ₹${ctx.raw.toLocaleString('en-IN')}`;
                // Original value show karne ke liye scale wapas reverse kiya
                const originalOrders = Math.round(ctx.raw / (scaleFactor * 0.5));
                return ` 📦 Orders: ${originalOrders}`;
            }
        }),
        plugins: [shadowPlugin]
    });
}

// ── WEEKLY CHART (7-day smooth line — same reference style) ─
function updateWeeklyChart(days) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    const labels   = days.map(d => d.dayName);
    const earnings = days.map(d => d.earnings);
    const orders   = days.map(d => d.orders * 60);
    const ctx      = canvas.getContext('2d');

    if (weeklyChart) {
        weeklyChart.data.labels                      = labels;
        weeklyChart.data.datasets[0].data            = earnings;
        weeklyChart.data.datasets[1].data            = orders;
        weeklyChart.data.datasets[0].backgroundColor = makeGradient(ctx,'rgba(251,113,20,0.55)','rgba(251,113,20,0.04)');
        weeklyChart.data.datasets[1].backgroundColor = makeGradient(ctx,'rgba(99,102,241,0.45)','rgba(99,102,241,0.03)');
        weeklyChart.update();
        return;
    }

    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Earnings (₹)',
                    data: earnings,
                    borderColor: '#f97316',
                    backgroundColor: makeGradient(ctx,'rgba(251,113,20,0.55)','rgba(251,113,20,0.04)'),
                    borderWidth: 2.5,
                    tension: 0.42,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f97316',
                    pointBorderWidth: 2.5,
                    pointHoverBackgroundColor: '#f97316',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'Orders',
                    data: orders,
                    borderColor: '#6366f1',
                    backgroundColor: makeGradient(ctx,'rgba(99,102,241,0.45)','rgba(99,102,241,0.03)'),
                    borderWidth: 2.5,
                    tension: 0.42,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2.5,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: sharedLineOptions({
            title: (items) => items[0].label,
            label: (ctx)  => {
                if (ctx.dataset.label.startsWith('Earnings'))
                    return `  💰 ₹${ctx.raw.toLocaleString('en-IN')}`;
                return `  📦 ${Math.round(ctx.raw / 60)} orders`;
            }
        }),
        plugins: [shadowPlugin]
    });
}

// ── SHADOW PLUGIN (line glow) ──────────────────────────────
const shadowPlugin = {
    id: 'lineShadow',
    beforeDatasetsDraw(chart) {
        chart.ctx.save();
    },
    afterDatasetsDraw(chart) {
        chart.ctx.restore();
    },
    beforeDatasetDraw(chart, args) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.shadowColor  = args.index === 0 ? 'rgba(249,115,22,0.30)' : 'rgba(99,102,241,0.25)';
        ctx.shadowBlur   = 14;
        ctx.shadowOffsetY = 5;
    },
    afterDatasetDraw(chart) {
        chart.ctx.restore();
    }
};

// ── WEEKLY INSIGHTS ────────────────────────────────────────
async function loadWeeklyInsights() {
    try {
        const res  = await fetch('/api/dashboard/weekly');
        const json = await res.json();
        if (json.status !== 'success') return;

        const daily   = json.data || {};
        const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const nowIST  = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
        const days    = [];
        let totalEarnings = 0, totalOrders = 0, bestLabel = '—', bestE = 0;

        for (let i = 6; i >= 0; i--) {
            const d       = new Date(nowIST); d.setDate(d.getDate() - i);
            const key     = d.toISOString().split('T')[0];
            const dayName = DAY_SHORT[d.getDay()];
            const shortDate = `${d.getDate()} ${d.toLocaleString('en-IN',{month:'short'})}`;
            const e = daily[key]?.earnings || 0;
            const o = daily[key]?.orders   || 0;
            days.push({ key, dayName, shortDate, earnings: e, orders: o });
            totalEarnings += e; totalOrders += o;
            if (e > bestE) { bestE = e; bestLabel = `${dayName} ₹${e.toLocaleString('en-IN')}`; }
        }

        document.getElementById('weeklyTotal').textContent       = `₹${totalEarnings.toLocaleString('en-IN')}`;
        document.getElementById('weeklyOrderCount').textContent  = `${totalOrders} order${totalOrders!==1?'s':''} this week`;
        document.getElementById('bestDay').textContent           = bestLabel || '—';
        document.getElementById('avgEarnings').textContent       = `₹${Math.round(totalEarnings/7).toLocaleString('en-IN')}`;

        updateWeeklyChart(days);
        renderDailyBreakdown(days);
        renderWeekRow(days);

    } catch (err) { console.error('Weekly error:', err); }
}

// ── WEEK DAY ROW ───────────────────────────────────────────
function renderWeekRow(days) {
    const container = document.getElementById('weekDayRow');
    if (!container) return;
    const todayKey = days[days.length - 1].key;
    container.innerHTML = days.map(d => {
        const isToday = d.key === todayKey;
        const hasData = d.orders > 0;
        return `
        <div class="flex flex-col items-center gap-1 flex-1">
            <p class="text-[10px] font-bold ${isToday ? 'text-orange-500' : 'text-slate-400'}">${d.dayName}</p>
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black
                ${isToday ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                          : hasData ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}">
                ${hasData ? d.orders : '·'}
            </div>
            <p class="text-[9px] font-semibold ${isToday ? 'text-orange-400' : 'text-slate-300'}">
                ${d.earnings>0 ? '₹'+(d.earnings>=1000 ? Math.round(d.earnings/1000)+'k' : d.earnings) : '—'}
            </p>
        </div>`;
    }).join('');
}

// ── DAILY BREAKDOWN ────────────────────────────────────────
function renderDailyBreakdown(days) {
    const container = document.getElementById('dailyBreakdown');
    if (!container) return;
    const maxE     = Math.max(...days.map(d => d.earnings), 1);
    const todayKey = days[days.length - 1].key;
    container.innerHTML = [...days].reverse().map(d => {
        const pct     = Math.round((d.earnings / maxE) * 100);
        const isToday = d.key === todayKey;
        return `
        <div class="flex items-center gap-3">
            <div class="w-12 shrink-0 text-right">
                <p class="text-xs font-bold ${isToday ? 'text-orange-500' : 'text-slate-500'}">${d.dayName}</p>
                <p class="text-[9px] text-slate-300">${d.shortDate}</p>
            </div>
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-700
                    ${isToday ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-indigo-400'}"
                     style="width:${pct}%"></div>
            </div>
            <div class="w-20 text-right shrink-0">
                <p class="text-xs font-bold text-slate-700">₹${d.earnings.toLocaleString('en-IN')}</p>
                <p class="text-[9px] text-slate-400">${d.orders} orders</p>
            </div>
        </div>`;
    }).join('');
}

// ── MIDNIGHT RESET ─────────────────────────────────────────
function checkMidnightReset() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours()===0 && now.getMinutes()===0 && now.getSeconds()<30) {
            currentEarnings=0; currentOrders=0; currentPending=0;
            ['stat-earnings','stat-orders','stat-pending']
                .forEach(id => { const el=document.getElementById(id); if(el) el.textContent='0'; });
            if (salesChart)  { salesChart.destroy();  salesChart=null; }
            if (weeklyChart) { weeklyChart.destroy(); weeklyChart=null; }
            loadDashboardStats();
            loadWeeklyInsights();
        }
    }, 30000);
}

