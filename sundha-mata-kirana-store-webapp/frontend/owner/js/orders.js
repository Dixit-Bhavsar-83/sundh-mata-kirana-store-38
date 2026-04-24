// orders.js — Real-time backend se orders fetch
let allOrders    = [];
let activeOrder  = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    refreshInterval = setInterval(loadOrders, 5000);
    document.body.style.zoom = "90%";
});

async function loadOrders() {
    try {
        const res  = await fetch('/api/orders');
        const json = await res.json();
        if (json.status !== 'success') return;

        const fresh = json.data || [];

        if (allOrders.length > 0 && fresh.length > allOrders.length) {
            const n = fresh.length - allOrders.length;
            showToast(`${n} new order${n > 1 ? 's' : ''} received! 🔔`);
        }

        allOrders = fresh;
        renderAllSections(allOrders);
        updateHeaderCounts(allOrders);
    } catch (err) {
        console.error('Orders fetch error:', err);
    }
}

function updateHeaderCounts(orders) {
    const pending  = orders.filter(o => o.status === 'PENDING').length;
    const accepted = orders.filter(o => o.status === 'ACCEPTED').length;
    setEl('activeCount',   pending);
    setEl('pendingCount',  pending);
    setEl('acceptedCount', accepted);
    const d = document.getElementById('detActiveCount');
    if (d) d.textContent = pending;
}

function renderAllSections(orders) {
    renderSection('pendingList',  orders.filter(o => o.status === 'PENDING'),  'pending');
    renderSection('acceptedList', orders.filter(o => o.status === 'ACCEPTED'), 'accepted');
}

function renderSection(containerId, orders, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-300">
                <div class="text-5xl mb-3">${type === 'pending' ? '📭' : '✅'}</div>
                <p class="text-sm font-semibold">
                    ${type === 'pending' ? 'No pending orders' : 'No accepted orders yet'}
                </p>
            </div>`;
        return;
    }

    container.innerHTML = '';
    orders.forEach((order, idx) => {
        const card = buildOrderCard(order, type, idx);
        container.appendChild(card);
    });
}

function buildOrderCard(order, type, idx) {
    const name       = order.customer_name       || order.name       || 'Unknown';
    const phone      = order.customer_phone      || order.phone      || '';
    const profession = order.customer_profession || order.profession || '';
    const items      = order.items || [];
    const total      = order.total || 0;
    const dateStr    = formatDateTime(order.created_at);
    const isPending  = type === 'pending';

    const card = document.createElement('div');
    card.className = [
        'bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between cursor-pointer transition-all border',
        isPending ? 'border-orange-100 pending-card' : 'border-green-50 accepted-pulse',
        'order-card-new'
    ].join(' ');
    card.style.animationDelay = `${idx * 60}ms`;
    card.onclick = () => openDetails(order);

    card.innerHTML = `
        <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="rounded-full flex items-center justify-center text-xl font-black uppercase shrink-0
                        ${isPending ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'}"
                 style="width:52px;height:52px;">
                ${name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-800 text-base truncate">${escHtml(name)}</h3>
                ${profession ? `<p class="text-xs text-orange-400 font-semibold">${escHtml(profession)}</p>` : ''}
                <p class="text-xs text-slate-400 font-medium mt-0.5">
                    ${items.length} Item${items.length !== 1 ? 's' : ''} &bull;
                    <span class="font-mono text-slate-300">#${shortId(order.id)}</span>
                </p>
                <p class="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                    <i class="fa-regular fa-clock text-[9px]"></i> ${dateStr}
                </p>
            </div>
        </div>
        <div class="text-right shrink-0 ml-3">
            <p class="font-black text-slate-800 text-base">₹${total.toLocaleString('en-IN')}</p>
            <span class="text-[10px] font-extrabold mt-1 uppercase tracking-tight block
                         ${isPending ? 'text-orange-500' : 'text-green-500'}">
                ${isPending ? '⏳ Pending' : '✓ Accepted'}
            </span>
            ${isPending ? `
            <button onclick="quickAccept(event,'${order.id}')"
                class="mt-2 text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full font-bold hover:bg-orange-600 transition">
                Accept
            </button>` : ''}
        </div>`;
    return card;
}

async function quickAccept(e, orderId) {
    e.stopPropagation();
    await acceptOrder(orderId);
}

function openDetails(order) {
    activeOrder = order;
    const overlay = document.getElementById('detailOverlay');

    const name       = order.customer_name       || order.name       || '';
    const phone      = order.customer_phone      || order.phone      || '';
    const address    = order.customer_address    || order.address    || '';
    const profession = order.customer_profession || order.profession || '';
    const total      = order.total || 0;
    const dateStr    = formatDateTime(order.created_at);

    setEl('detOrderMeta', dateStr);
    setEl('detOrderId',   `#${(order.id || '').toUpperCase()}`);
    setEl('detDateTime',  dateStr);
    setEl('detName',      name);
    setEl('detPhone',     phone);
    setEl('detAddr',      address);
    setEl('detTotal',     `₹${total.toLocaleString('en-IN')}`);

    const profEl = document.getElementById('detProfession');
    if (profEl) {
        profEl.textContent = profession || '—';
        profEl.closest('.profession-row')?.classList.toggle('hidden', !profession);
    }

    const container = document.getElementById('itemsContainer');
    container.innerHTML = (order.items || []).length === 0
        ? '<p class="text-slate-400 text-sm text-center py-4">No items info</p>'
        : (order.items || []).map(item => `
            <div class="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div class="flex gap-3 items-center">
                    <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                        ${item.icon || '🛒'}
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-700 text-sm">${escHtml(item.name || '')}</h4>
                        <p class="text-xs text-slate-400">${item.qty} × ₹${item.price}</p>
                    </div>
                </div>
                <p class="font-black text-slate-800 text-sm">₹${((item.qty || 1) * (item.price || 0)).toLocaleString('en-IN')}</p>
            </div>`).join('');

    const acceptBtn = document.getElementById('acceptBtn');
    if (order.status === 'ACCEPTED') {
        acceptBtn.textContent = '✓ ORDER ACCEPTED';
        acceptBtn.className   = 'w-full bg-green-500 text-white py-6 rounded-[1.8rem] font-black text-xl tracking-wider uppercase shadow-xl cursor-not-allowed opacity-80';
        acceptBtn.disabled    = true;
    } else {
        acceptBtn.textContent = 'ACCEPT ORDER';
        acceptBtn.className   = 'w-full bg-[#f35c15] text-white py-6 rounded-[1.8rem] font-black text-xl tracking-wider uppercase shadow-xl active:scale-95 transition-transform';
        acceptBtn.disabled    = false;
    }

    document.getElementById('callBtn').onclick = () => {
        if (phone) window.location.href = `tel:${phone}`;
    };

    overlay.classList.remove('hidden');
}

function closeDetails() {
    document.getElementById('detailOverlay').classList.add('hidden');
}

document.getElementById('acceptBtn').onclick = async () => {
    if (!activeOrder || activeOrder.status !== 'PENDING') return;
    await acceptOrder(activeOrder.id);
    activeOrder.status = 'ACCEPTED';
    openDetails(activeOrder);
};

async function acceptOrder(orderId) {
    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ status: 'ACCEPTED' })
        });
        if (res.ok) {
            allOrders = allOrders.map(o => o.id === orderId ? { ...o, status: 'ACCEPTED' } : o);
            renderAllSections(allOrders);
            updateHeaderCounts(allOrders);
            showToast('Order accepted! ✅');
        }
    } catch (err) {
        console.error('Accept error:', err);
    }
}

document.getElementById('shareBtn').onclick = () => {
    if (!activeOrder) return;

    const name       = activeOrder.customer_name       || activeOrder.name       || '';
    const phone      = activeOrder.customer_phone      || activeOrder.phone      || '';
    const address    = activeOrder.customer_address    || activeOrder.address    || '';
    const profession = activeOrder.customer_profession || activeOrder.profession || '';
    const total      = activeOrder.total || 0;
    const dateStr    = formatDateTime(activeOrder.created_at);
    const orderId    = (activeOrder.id || '').toUpperCase();

    const itemsText = (activeOrder.items || [])
        .map(i => `  - ${i.name} × ${i.qty}  →  ₹${i.price * i.qty}`)
        .join('%0A');

    const msg =
        `🛒 *NEW ORDER — Sundha Mata Kirana*%0A` +
        `━━━━━━━━━━━━━━━━━━%0A` +
        `🆔 *Order ID:* ${orderId}%0A` +
        `🕐 *Time:* ${dateStr}%0A%0A` +
        `👤 *Customer Details*%0A` +
        `• Name: ${name}%0A` +
        `• Phone: ${phone}%0A` +
        `• Profession: ${profession || 'N/A'}%0A` +
        `• Address: ${address}%0A%0A` +
        `📦 *Items Ordered*%0A` +
        `${itemsText}%0A%0A` +
        `💰 *Total: ₹${total.toLocaleString('en-IN')}*%0A` +
        `📍 *Status: ${activeOrder.status}*`;

    window.open(`https://wa.me/?text=${msg}`, '_blank');
};

document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) { renderAllSections(allOrders); return; }
    const filtered = allOrders.filter(o => {
        const name  = (o.customer_name  || o.name  || '').toLowerCase();
        const phone = (o.customer_phone || o.phone || '');
        const id    = (o.id || '').toLowerCase();
        return name.includes(term) || phone.includes(term) || id.includes(term);
    });
    renderAllSections(filtered);
});

function showToast(msg) {
    const toast = document.getElementById('newOrderToast');
    const text  = document.getElementById('toastText');
    if (!toast) return;
    text.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('toast-in');
    setTimeout(() => {
        toast.classList.remove('toast-in');
        toast.classList.add('toast-out');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('toast-out');
        }, 400);
    }, 3000);
}

// ─────────────────────────────────────────────────────────
// ✅ FIXED: formatDateTime — UTC → IST (India +5:30)
// Supabase stores timestamps in UTC.
// new Date(iso) browser se galat local time deta tha.
// Solution: manually add 5hr 30min to UTC milliseconds.
// ─────────────────────────────────────────────────────────
function formatDateTime(iso) {
    if (!iso) return '—';

    // Parse the ISO string as UTC
    const utcMs = Date.parse(iso);
    if (isNaN(utcMs)) return '—';

    // Add IST offset: +5 hours 30 minutes = 19800 seconds = 19800000 ms
    const istMs = utcMs + (5 * 60 + 30) * 60 * 1000;
    const d     = new Date(istMs);

    // Format using UTC getters (because we already shifted to IST manually)
    const day   = d.getUTCDate();
    const month = ['Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
    const year  = d.getUTCFullYear();

    let   hours = d.getUTCHours();
    const mins  = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    hours       = hours % 12 || 12;

    return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
}

function shortId(id)    { return (id || '').slice(-6).toUpperCase(); }
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function escHtml(str)   { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};

