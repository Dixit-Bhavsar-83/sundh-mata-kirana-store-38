let currentCart = JSON.parse(localStorage.getItem('userCart')) || [];

window.onload = () => {
    updateCartUI();
    checkActiveOrderOnLoad();
};

// ── Check active order on page load ───────────────────────
async function checkActiveOrderOnLoad() {
    const activeId = localStorage.getItem('activeOrderId') || localStorage.getItem('lastOrderId');
    if (!activeId) return;
    try {
        const res  = await fetch(`/api/orders/${activeId}`);
        const json = await res.json();
        if (json.status === 'success') {
            const st = json.data?.status;
            if (st === 'PENDING' || st === 'ACCEPTED') {
                // Active order exists — show popup
                showActivePopup();
            } else {
                // DELIVERED or not found — clear storage
                clearActiveOrder();
            }
        } else {
            clearActiveOrder();
        }
    } catch (e) {
        clearActiveOrder();
    }
}

function clearActiveOrder() {
    localStorage.removeItem('activeOrderId');
    localStorage.removeItem('activeOrder');
    localStorage.removeItem('lastOrderId');
    localStorage.removeItem('activeOrderItems');
}

function showActivePopup() {
    const popup = document.getElementById('activeOrderPopup');
    if (popup) popup.classList.remove('hidden');
}

function goToTracking() {
    window.location.href = 'update.html';
}

// ── Cart UI ───────────────────────────────────────────────
function updateCartUI() {
    const cartList = document.getElementById('cartItems');
    if (!cartList) return;
    let total = 0;

    cartList.innerHTML = currentCart.map(item => {
        total += item.price * item.qty;
        return `
        <div class="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <img src="${item.img1 || item.img || ''}" class="w-16 h-16 object-contain" onerror="this.style.display='none'">
            <div class="flex-1">
                <h4 class="font-bold text-sm">${item.name}</h4>
                <p class="text-orange-500 font-black">₹${item.price}</p>
            </div>
            <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border">
                <button onclick="updateQty(${item.id}, -1)" class="w-6 h-6 bg-white rounded-lg shadow-sm flex items-center justify-center"><i class="fas fa-minus text-[8px]"></i></button>
                <span class="font-bold text-xs w-4 text-center">${item.qty}</span>
                <button onclick="updateQty(${item.id}, 1)" class="w-6 h-6 bg-white rounded-lg shadow-sm flex items-center justify-center"><i class="fas fa-plus text-[8px]"></i></button>
            </div>
        </div>`;
    }).join('');

    document.getElementById('cartTotal').innerText = `₹${total}`;

    const btn = document.getElementById('orderBtn');
    if (!btn) return;
    if (total > 0 && total < 500) {
        btn.innerText = `ADD ₹${500 - total} MORE`;
        btn.classList.replace('bg-slate-900', 'bg-slate-400');
    } else {
        btn.innerText = 'PLACE ORDER';
        btn.classList.replace('bg-slate-400', 'bg-slate-900');
    }
}

function updateQty(id, delta) {
    const item = currentCart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) currentCart = currentCart.filter(i => i.id !== id);
    }
    localStorage.setItem('userCart', JSON.stringify(currentCart));
    updateCartUI();
}

// ── Place Order ───────────────────────────────────────────
async function placeOrder() {
    const total = currentCart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    if (total < 500) {
        document.getElementById('orderRestrictionPopup')?.classList.remove('hidden');
        return;
    }

    // ✅ Block if PENDING or ACCEPTED order exists
    const existingId = localStorage.getItem('activeOrderId') || localStorage.getItem('lastOrderId');
    if (existingId) {
        try {
            const r    = await fetch(`/api/orders/${existingId}`);
            const json = await r.json();
            if (json.status === 'success') {
                const st = json.data?.status;
                if (st === 'PENDING' || st === 'ACCEPTED') {
                    showActivePopup();
                    return;
                } else {
                    // DELIVERED → allow new order
                    clearActiveOrder();
                }
            } else {
                clearActiveOrder();
            }
        } catch (e) {
            clearActiveOrder();
        }
    }

    // Customer info
    const cData =
        JSON.parse(localStorage.getItem('customerData')) ||
        JSON.parse(localStorage.getItem('userData'))     ||
        JSON.parse(localStorage.getItem('user'))         || {};

    const orderPayload = {
        customer_name:       cData.name        || cData.fullName    || 'Customer',
        customer_phone:      cData.phone        || cData.mobile      || '',
        customer_address:    cData.address      || cData.fullAddress || '',
        customer_profession: cData.profession   || cData.occupation  || '',
        items: currentCart.map(item => ({
            id:    item.id,
            name:  item.name,
            icon:  item.icon  || '🛒',
            qty:   item.qty,
            price: item.price
        })),
        total
    };

    let placedOrderId = null;

    try {
        const res  = await fetch('/api/orders', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(orderPayload)
        });
        const json = await res.json();
        if (json.status === 'success') {
            placedOrderId = json.data?.id;

            // ✅ Save for tracking
            localStorage.setItem('activeOrderId',    placedOrderId);
            localStorage.setItem('lastOrderId',      placedOrderId);
            localStorage.setItem('activeOrderItems', JSON.stringify(orderPayload.items));
            localStorage.setItem('activeOrder', JSON.stringify({
                ...json.data,
                items:  orderPayload.items,
                total,
                status: 'PENDING'
            }));
        }
        console.log('✅ Order placed:', json);
    } catch (err) {
        console.error('❌ Order API error:', err);
    }

    // Show success popup
    const popup = document.getElementById('orderSuccessPopup');
    if (popup) {
        popup.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    currentCart = [];
    localStorage.removeItem('userCart');

    // ✅ Redirect to update.html (tracking screen)
    setTimeout(() => {
        if (popup) { popup.classList.add('hidden'); document.body.style.overflow = 'auto'; }
        window.location.href = placedOrderId ? 'update.html' : 'home.html';
    }, 2000);
}

function closePopup() {
    document.getElementById('orderRestrictionPopup')?.classList.add('hidden');
}

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};

