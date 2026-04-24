// ══════════════════════════════════════════════════════════════
// delivery.js — Delivery Partner Panel | Sundha Mata Store
// ══════════════════════════════════════════════════════════════

const POLL_MS = 5000;

// Auto-detect Flask port
const BASE = (location.port === '5000' || location.port === '')
    ? ''
    : 'http://127.0.0.1:5000';

// Delivery boy ID — auto-generated, no login needed
let BOY_ID = localStorage.getItem('dboyId');
if (!BOY_ID) {
    BOY_ID = 'DB-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem('dboyId', BOY_ID);
}

// ── State ──────────────────────────────────────────────────
let liveOrders  = [];
let myOrders    = [];
let activeOrder = null;
let curTab      = 'dash';
let curSub      = 'pending';
let dashChart   = null;

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setDateLabel();
    loadAll();
    setInterval(loadAll, POLL_MS);
    setInterval(checkMidnightReset, 30000);
});

async function loadAll() {
    await Promise.all([loadLive(), loadMine()]);
    if (curTab === 'dash') refreshDashboard();
}

function manualRefresh() {
    const ic = document.querySelector('#refreshBtn i');
    if (ic) ic.classList.add('spinning');
    loadAll().finally(() => setTimeout(() => ic?.classList.remove('spinning'), 600));
}

// ══════════════════════════════════════════════════════════════
// API CALLS
// ══════════════════════════════════════════════════════════════
async function apiFetch(url, opts) {
    const res = await fetch(BASE + url, opts);
    return res.json();
}

async function patchStatus(orderId, status) {
    return fetch(`${BASE}/api/orders/${orderId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status, delivery_boy_id: BOY_ID })
    });
}

async function loadLive() {
    try {
        const j = await apiFetch('/api/delivery/live');
        if (j?.status !== 'success') return;
        const fresh = j.data || [];
        if (liveOrders.length > 0 && fresh.length > liveOrders.length) {
            const n = fresh.length - liveOrders.length;
            toast(`${n} new order${n > 1 ? 's' : ''} arrived! 🔔`);
        }
        liveOrders = fresh;
        setBadge('liveBadge', liveOrders.length);
        const dot = document.getElementById('navLiveDot');
        if (dot) { liveOrders.length > 0 ? dot.classList.remove('hidden') : dot.classList.add('hidden'); }
        renderLive();
    } catch (e) { console.error('Live err:', e); }
}

async function loadMine() {
    try {
        const j = await apiFetch(`/api/delivery/mine?boy_id=${BOY_ID}`);
        if (j?.status !== 'success') return;
        
        myOrders = j.data || [];
        
        // Stats update karo
        const todayStr = new Date().toISOString().split('T');
        const todayDelivered = myOrders.filter(o => o.status === 'DELIVERED' && o.created_at?.startsWith(todayStr));
        
        // Stats update (Assuming these IDs exist in your HTML)
        setEl('dActive', myOrders.filter(o => o.status === 'ACCEPTED').length);
        
        // AB CHART CALL KARO:
        updateDashChart(todayDelivered);
        
        renderMine(); // Aapka purana rendering function
    } catch (e) { console.error('Mine err:', e); }
}

// ══════════════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════════════
async function acceptOrder(orderId) {
    // 1. Pehle check karo ki kya koi aur order 'ACCEPTED' state mein hai?
    const hasActiveOrder = myOrders.some(o => o.status === 'ACCEPTED' || o.status === 'ON_WAY');

    if (hasActiveOrder) {
        // Agar pehle se koi order chal raha hai, toh popup dikhao
        alert("Alert! Aapka ek order already chal raha hai. Naya order lene ke liye pehle use complete karein.");
        
        // Update.html par redirect karo
        window.location.href = 'update.html';
        return; // Function yahin ruk jayega
    }

    // 2. Agar koi active order nahi hai, toh hi order accept karo
    try {
        const res = await apiFetch(`/api/delivery/accept?id=${orderId}&boy_id=${BOY_ID}`);
        if (res.status === 'success') {
            alert("Order Accepted!");
            loadMine(); // List refresh karo
        }
    } catch (e) { console.error(e); }
}

async function markDelivered(e, orderId) {
    e.stopPropagation();
    const btn  = e.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner spinning mr-1"></i>Updating…';
    btn.disabled  = true;

    try {
        const res = await patchStatus(orderId, 'DELIVERED');
        if (res.ok) {
            myOrders = myOrders.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o);
            renderMine();
            const active = myOrders.filter(o => o.status === 'ACCEPTED').length;
            setBadge('mineBadge', active);
            setEl('dActive', active);
            toast('Delivered! 🎉', '✅');
            if (activeOrder?.id === orderId) {
                activeOrder.status = 'DELIVERED';
                activeOrder._type  = 'completed';
                refreshDetBtn();
            }
            if (curTab === 'dash') refreshDashboard();
        }
    } catch (err) {
        console.error(err);
        btn.innerHTML = orig;
        btn.disabled  = false;
    }
}

// ══════════════════════════════════════════════════════════════
// RENDER LIVE ORDERS
// ══════════════════════════════════════════════════════════════
function renderLive() {
    const container = document.getElementById('liveList');
    if (!container) return;
    const term     = q('liveSearch').toLowerCase().trim();
    const filtered = liveOrders.filter(o =>
        !term ||
        (o.customer_name  || '').toLowerCase().includes(term) ||
        (o.id             || '').toLowerCase().includes(term) ||
        (o.customer_phone || '').includes(term)
    );
    setEl('liveCount', filtered.length);
    if (!filtered.length) {
        container.innerHTML = emptyHTML('📭', 'No pending orders right now', 'New orders appear here automatically');
        return;
    }
    container.innerHTML = '';
    filtered.forEach((o, i) => container.appendChild(buildCard(o, 'live', i)));
}

// ══════════════════════════════════════════════════════════════
// RENDER MY DELIVERIES
// ══════════════════════════════════════════════════════════════
function renderMine() {
    const term     = q('mineSearch').toLowerCase().trim();
    const filterFn = o =>
        !term ||
        (o.customer_name  || '').toLowerCase().includes(term) ||
        (o.id             || '').toLowerCase().includes(term) ||
        (o.customer_phone || '').includes(term);
    renderList('pendingList',   myOrders.filter(o => o.status === 'ACCEPTED').filter(filterFn),  'pending');
    renderList('completedList', myOrders.filter(o => o.status === 'DELIVERED').filter(filterFn), 'completed');
}

function renderList(id, orders, type) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!orders.length) {
        const cfg = type === 'pending'
            ? { ico: '🚚', t: 'No active deliveries',    s: 'Accept live orders to start' }
            : { ico: '🏆', t: 'No completed deliveries', s: 'Delivered orders appear here' };
        el.innerHTML = emptyHTML(cfg.ico, cfg.t, cfg.s);
        return;
    }
    el.innerHTML = '';
    orders.forEach((o, i) => el.appendChild(buildCard(o, type, i)));
}

// ══════════════════════════════════════════════════════════════
// BUILD ORDER CARD
// ══════════════════════════════════════════════════════════════
function buildCard(order, type, idx) {
    const name  = order.customer_name || 'Unknown';
    const items = order.items || [];
    const total = order.total || 0;
    const dt    = fmtDT(order.created_at);

    const card = document.createElement('div');
    card.className = 'order-card fade-up';
    if (type === 'live') card.classList.add('glow-new');
    card.style.animationDelay = `${idx * 40}ms`;
    card.onclick = () => openDetail(order, type);

    const avBg  = type === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500';
    const badge = type === 'live'
        ? `<span class="text-[10px] font-black text-orange-500">⏳ ${order.status === 'ACCEPTED' ? 'Owner Accepted' : 'Pending'}</span>`
        : type === 'pending'
        ? `<span class="text-[10px] font-black text-blue-500">🚚 Out for delivery</span>`
        : `<span class="text-[10px] font-black text-green-500">✅ Delivered</span>`;

    const actionRow = type === 'live'
        ? `<button onclick="acceptOrder(event,'${order.id}')"
                class="w-full mt-3 text-white text-sm font-black py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                style="background:linear-gradient(135deg,#f97316,#dc2626);box-shadow:0 4px 14px rgba(249,115,22,.3)">
                <i class="fa-solid fa-bolt text-xs"></i> Accept Order
           </button>`
        : type === 'pending'
        ? `<button onclick="markDelivered(event,'${order.id}')"
                class="w-full mt-3 bg-green-500 text-white text-sm font-black py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-green-200">
                <i class="fa-solid fa-check text-xs"></i> Mark as Delivered
           </button>`
        : `<div class="mt-3 text-center text-sm font-black text-green-500 py-1">🎉 Successfully Delivered</div>`;

    card.innerHTML = `
        <div class="p-4">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full ${avBg} flex items-center justify-center text-xl font-black shrink-0 border ${type==='completed'?'border-green-100':'border-orange-100'}">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start gap-2">
                        <h3 class="font-black text-slate-800 text-sm truncate">${esc(name)}</h3>
                        <span class="font-black text-slate-800 text-sm shrink-0">₹${total.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="flex justify-between items-center mt-0.5">
                        <p class="text-xs text-slate-400 font-medium">
                            ${items.length} item${items.length !== 1 ? 's' : ''} &bull;
                            <span class="font-mono text-[10px] text-slate-300">#${sid(order.id)}</span>
                        </p>
                        ${badge}
                    </div>
                    <p class="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                        <i class="fa-regular fa-clock text-[9px]"></i>${dt}
                    </p>
                </div>
            </div>
            ${actionRow}
        </div>`;
    return card;
}

// ══════════════════════════════════════════════════════════════
// DETAIL OVERLAY
// ══════════════════════════════════════════════════════════════
function openDetail(order, type) {
    activeOrder = { ...order, _type: type };

    const name    = order.customer_name    || '';
    const phone   = order.customer_phone   || '';
    const address = order.customer_address || '';
    const total   = order.total || 0;
    const dt      = fmtDT(order.created_at);

    setEl('detMeta',  dt);
    setEl('detId',    '#' + (order.id || '').toUpperCase());
    setEl('detTime',  dt);
    setEl('detName',  name    || '—');
    setEl('detPhone', phone   || '—');
    setEl('detAddr',  address || '—');
    setEl('detTotal', '₹' + total.toLocaleString('en-IN'));

    // Status badge
    const badge = document.getElementById('detStatusBadge');
    if (badge) {
        const cfg = {
            PENDING:   { cls: 'bg-orange-100 text-orange-600', t: '⏳ Pending'  },
            ACCEPTED:  { cls: 'bg-blue-100 text-blue-600',     t: '🚚 Accepted' },
            DELIVERED: { cls: 'bg-green-100 text-green-600',   t: '✅ Delivered' },
        };
        const c = cfg[order.status] || cfg.PENDING;
        badge.className   = `text-xs font-black px-3 py-1.5 rounded-full shrink-0 ${c.cls}`;
        badge.textContent = c.t;
    }

    // Items
    const di = document.getElementById('detItems');
    if (di) {
        di.innerHTML = !(order.items || []).length
            ? '<p class="text-center py-6 text-slate-400 text-sm">No item details</p>'
            : (order.items || []).map(item => `
                <div class="flex items-center justify-between px-4 py-3.5">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shrink-0">
                            ${item.icon || '🛒'}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${esc(item.name || '')}</p>
                            <p class="text-xs text-slate-400">${item.qty} × ₹${item.price}</p>
                        </div>
                    </div>
                    <p class="font-black text-slate-700 text-sm">₹${((item.qty||1)*(item.price||0)).toLocaleString('en-IN')}</p>
                </div>`).join('');
    }

    document.getElementById('detCallBtn').onclick  = () => { if (phone) location.href = `tel:${phone}`; };
    document.getElementById('detShareBtn').onclick = () => shareOrder(order, dt);

    refreshDetBtn();
    document.getElementById('detailOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    activeOrder = null;
}

function refreshDetBtn() {
    const btn    = document.getElementById('detActionBtn');
    if (!btn || !activeOrder) return;
    const status = activeOrder.status;
    const type   = activeOrder._type;

    if (status === 'DELIVERED') {
        btn.textContent    = '🎉 Order Delivered!';
        btn.className      = 'w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest bg-slate-100 text-slate-400 cursor-not-allowed';
        btn.disabled       = true;
        btn.onclick        = null;
        btn.style.background = '';
        return;
    }

    if (type === 'live' || status === 'PENDING' || (status === 'ACCEPTED' && !activeOrder.delivery_boy_id)) {
        btn.innerHTML      = '<i class="fa-solid fa-bolt mr-2"></i>Accept Order';
        btn.className      = 'w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest active:scale-95 transition-all text-white shadow-xl';
        btn.style.background = 'linear-gradient(135deg,#f97316,#dc2626)';
        btn.disabled       = false;
        btn.onclick        = async () => {
            btn.innerHTML  = '<i class="fa fa-spinner spinning mr-2"></i>Accepting…';
            btn.disabled   = true;
            const res      = await patchStatus(activeOrder.id, 'ACCEPTED');
            if (res.ok) {
                liveOrders = liveOrders.filter(o => o.id !== activeOrder.id);
                activeOrder.status = 'ACCEPTED';
                activeOrder._type  = 'pending';
                await loadMine();
                renderLive();
                setBadge('liveBadge', liveOrders.length);
                refreshDetBtn();
                toast('Order accepted! 🚚', '✅');
            }
        };
    } else {
        btn.innerHTML      = '<i class="fa-solid fa-check mr-2"></i>Mark as Delivered';
        btn.className      = 'w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest active:scale-95 transition-all bg-green-500 text-white shadow-xl shadow-green-200';
        btn.style.background = '';
        btn.disabled       = false;
        btn.onclick        = async () => {
            btn.innerHTML  = '<i class="fa fa-spinner spinning mr-2"></i>Updating…';
            btn.disabled   = true;
            const res      = await patchStatus(activeOrder.id, 'DELIVERED');
            if (res.ok) {
                myOrders       = myOrders.map(o => o.id === activeOrder.id ? { ...o, status: 'DELIVERED' } : o);
                activeOrder.status = 'DELIVERED';
                activeOrder._type  = 'completed';
                renderMine();
                const a = myOrders.filter(o => o.status === 'ACCEPTED').length;
                setBadge('mineBadge', a);
                setEl('dActive', a);
                refreshDetBtn();
                toast('Delivered! 🎉', '✅');
                if (curTab === 'dash') refreshDashboard();
            }
        };
    }
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function refreshDashboard() {
    const todayStr  = new Date(Date.now() + 19800000).toISOString().split('T')[0];
    const delivered = myOrders.filter(o =>
        o.status === 'DELIVERED' &&
        o.created_at &&
        new Date(Date.parse(o.created_at) + 19800000).toISOString().split('T')[0] === todayStr
    );
    const earnings = delivered.reduce((s, o) => s + (o.total || 0), 0);

    animateCount('dEarnings',  earnings);
    animateCount('dDelivered', delivered.length);
    setEl('dEarnNote', `From ${delivered.length} delivered order${delivered.length !== 1 ? 's' : ''} today`);

    const listEl = document.getElementById('dashDeliveredList');
    if (listEl) {
        listEl.innerHTML = !delivered.length
            ? '<div class="text-center py-4 text-slate-300 text-xs font-semibold">No deliveries yet</div>'
            : delivered.slice(0, 5).map(o => `
                <div class="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <div>
                        <div class="font-bold text-sm text-slate-700">${esc(o.customer_name || '—')}</div>
                        <div class="text-[10px] text-slate-400">#${sid(o.id)} &bull; ${fmtDT(o.created_at)}</div>
                    </div>
                    <div class="font-black text-orange-500 text-sm">₹${(o.total || 0).toLocaleString('en-IN')}</div>
                </div>`).join('');
    }
    updateDashChart(delivered);
}

function updateDashChart(delivered) {
    const canvas = document.getElementById('dashChart');
    const empty  = document.getElementById('dashChartEmpty');
    if (!canvas) return;

    const hourNow = new Date().getHours();
    const labels = [], earn = [], cnt = [];

    for (let h = 6; h <= Math.max(hourNow, 6); h++) {
        labels.push(h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`);
        const inHour = delivered.filter(o => {
            if (!o.created_at) return false;
            return new Date(Date.parse(o.created_at) + 19800000).getUTCHours() === h;
        });
        earn.push(inHour.reduce((s, o) => s + (o.total || 0), 0));
        cnt.push(inHour.length * 80);
    }

    const hasData = earn.some(v => v > 0) || cnt.some(v => v > 0);
    if (!hasData) {
        if (empty) empty.classList.remove('hidden');
        if (dashChart) { dashChart.destroy(); dashChart = null; }
        return;
    }
    if (empty) empty.classList.add('hidden');

    const ctx = canvas.getContext('2d');
    const og  = ctx.createLinearGradient(0, 0, 0, 180);
    og.addColorStop(0, 'rgba(249,115,22,.45)'); og.addColorStop(1, 'rgba(249,115,22,.02)');
    const ig  = ctx.createLinearGradient(0, 0, 0, 180);
    ig.addColorStop(0, 'rgba(99,102,241,.35)'); ig.addColorStop(1, 'rgba(99,102,241,.02)');

    if (dashChart) {
        dashChart.data.labels                      = labels;
        dashChart.data.datasets[0].data            = earn;
        dashChart.data.datasets[1].data            = cnt;
        dashChart.data.datasets[0].backgroundColor = og;
        dashChart.data.datasets[1].backgroundColor = ig;
        dashChart.update('active');
        return;
    }

    dashChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Earnings ₹', data: earn, borderColor: '#f97316', backgroundColor: og,
                  borderWidth: 2.5, tension: .42, fill: true, pointRadius: 4, pointHoverRadius: 7,
                  pointBackgroundColor: '#fff', pointBorderColor: '#f97316', pointBorderWidth: 2.5 },
                { label: 'Deliveries', data: cnt, borderColor: '#6366f1', backgroundColor: ig,
                  borderWidth: 2, borderDash: [5, 4], tension: .42, fill: true,
                  pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#fff',
                  pointBorderColor: '#6366f1', pointBorderWidth: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeInOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,.93)', padding: 12, cornerRadius: 13,
                    titleFont: { size: 11, weight: 'bold' }, bodyFont: { size: 11 },
                    callbacks: {
                        title: i => `🕐 ${i[0].label}`,
                        label: c => c.dataset.label.startsWith('Earn')
                            ? `  💰 ₹${c.raw.toLocaleString('en-IN')}`
                            : `  📦 ${Math.round(c.raw / 80)} deliveries`
                    }
                }
            },
            scales: {
                y: { display: false, beginAtZero: true },
                x: { grid: { display: false }, border: { display: false },
                     ticks: { color: '#94a3b8', font: { size: 10, weight: '600' } } }
            }
        }
    });
}


// ── DASHBOARD STATS (NEW) ───────────────────────────────────────────
async function loadDashboardStats() {
    try {
        // Delivery boy ke liye specific API endpoint use karo jo sirf uska data laye
        const res = await fetch(`/api/delivery/stats?boy_id=${BOY_ID}`);
        const json = await res.json();
        if (json.status !== 'success') return;

        const { total_delivered, total_earnings, active_pending, hourly } = json.data;

        // Animate stats
        animateCount('dEarnings', total_earnings); // 'dEarnings' aapke HTML element ki ID hai
        animateCount('dDelivered', total_delivered);
        setEl('dActive', active_pending); 

        // Update Chart
        updateSalesChart(hourly || {});
    } catch (err) { console.error('Dashboard Stats error:', err); }
}

// ── SALES CHART (MERGED FROM OWNER DASHBOARD) ──────────────────────
function updateSalesChart(hourlyData) {
    const canvas = document.getElementById('dashChart'); // Aapke HTML ka canvas ID
    if (!canvas) return;

    const labels = [], earnings = [], orders = [];
    for (let h = 6; h <= 22; h++) {
        const slot = hourlyData[h] || { earnings: 0, orders: 0 };
        labels.push(h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`);
        earnings.push(slot.earnings || 0);
        orders.push(slot.orders || 0);
    }

    if (dashChart) {
        dashChart.data.labels = labels;
        dashChart.data.datasets.data = earnings;
        dashChart.data.datasets.data = orders;
        dashChart.update();
        return;
    }

    dashChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Earnings', data: earnings, borderColor: '#f97316', fill: true, tension: 0.4 },
                { label: 'Orders', data: orders, borderColor: '#6366f1', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}


// ══════════════════════════════════════════════════════════════
// SHARE
// ══════════════════════════════════════════════════════════════
function shareOrder(order, dt) {
    const name    = order.customer_name    || '';
    const phone   = order.customer_phone   || '';
    const address = order.customer_address || '';
    const total   = order.total || 0;
    const id      = (order.id || '').toUpperCase();
    const items   = (order.items || []).map(i => `  • ${i.name} ×${i.qty} = ₹${i.price * i.qty}`).join('%0A');
    const msg =
        `🚚 *DELIVERY – Sundha Mata Kirana*%0A━━━━━━━━━━━━━━━%0A` +
        `🆔 *${id}*  |  🕐 ${dt}%0A%0A` +
        `👤 *${name}*%0A📞 ${phone}%0A📍 ${address}%0A%0A` +
        `📦 *Items:*%0A${items}%0A%0A💰 *Total: ₹${total.toLocaleString('en-IN')}*`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════════
function switchTab(tab) {
    curTab = tab;
    ['dash', 'live', 'mine'].forEach(t => {
        document.getElementById(`sec-${t}`)?.classList.toggle('hidden', t !== tab);
        document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.toggle('active', t === tab);
        document.getElementById(`nav-${t}`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'dash') refreshDashboard();
    if (tab === 'live') renderLive();
    if (tab === 'mine') renderMine();
}

function switchSub(sub) {
    curSub = sub;
    document.getElementById('pendingList')  ?.classList.toggle('hidden', sub !== 'pending');
    document.getElementById('completedList')?.classList.toggle('hidden', sub !== 'completed');
    document.getElementById('subPending')   ?.classList.toggle('active', sub === 'pending');
    document.getElementById('subCompleted') ?.classList.toggle('active', sub === 'completed');
}

// ══════════════════════════════════════════════════════════════
// MIDNIGHT RESET
// ══════════════════════════════════════════════════════════════
function checkMidnightReset() {
    const n = new Date();
    if (n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() < 30) {
        liveOrders = [];
        renderLive();
        setBadge('liveBadge', 0);
        if (dashChart) { dashChart.destroy(); dashChart = null; }
    }
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function fmtDT(iso) {
    if (!iso) return '—';
    const utcMs = Date.parse(iso);
    if (isNaN(utcMs)) return '—';
    const d   = new Date(utcMs + 19800000);
    const day = d.getUTCDate();
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
    const yr  = d.getUTCFullYear();
    let   h   = d.getUTCHours();
    const m   = String(d.getUTCMinutes()).padStart(2, '0');
    const ap  = h >= 12 ? 'PM' : 'AM';
    h         = h % 12 || 12;
    return `${day} ${mon} ${yr}, ${h}:${m} ${ap}`;
}

function setDateLabel() {
    const d = document.getElementById('dashDate');
    if (!d) return;
    const now = new Date(Date.now() + 19800000);
    d.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const from = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
    if (from === target) return;
    const steps = 30, diff = target - from;
    let s = 0;
    const t = setInterval(() => {
        s++;
        el.textContent = Math.round(from + diff * (1 - Math.pow(1 - s / steps, 3))).toLocaleString('en-IN');
        if (s >= steps) { clearInterval(t); el.textContent = target.toLocaleString('en-IN'); }
    }, 600 / steps);
}

function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) { el.textContent = count > 9 ? '9+' : count; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
}

function emptyHTML(ico, title, sub) {
    return `<div class="empty"><div class="empty-ico">${ico}</div>
        <div class="font-bold text-slate-400 text-sm">${title}</div>
        <p class="text-xs">${sub}</p></div>`;
}

let toastTimer = null;
function toast(msg, ico = '🔔') {
    const el = document.getElementById('toast');
    const me = document.getElementById('toastMsg');
    const ie = document.getElementById('toastIcon');
    if (!el) return;
    if (toastTimer) clearTimeout(toastTimer);
    me.textContent = msg; ie.textContent = ico;
    el.classList.remove('hidden');
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

function q(id)      { return document.getElementById(id)?.value || ''; }
function setEl(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function sid(id)    { return (id || '').slice(-6).toUpperCase(); }
function esc(s)     { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

