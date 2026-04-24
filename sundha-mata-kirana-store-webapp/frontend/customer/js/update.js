// ============================================================
// update.js — Real-time order status tracking
// ============================================================

let currentOrder = null;
let lastStatus   = null;
let pollInterval = null;
let soundEnabled = true;

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadOrderFromStorage();
    if (currentOrder) {
        renderOrderDetails(currentOrder);
        startPolling();
    } else {
        showNoOrder();
    }
});

// ── Load saved order from localStorage ────────────────────
function loadOrderFromStorage() {
    try {
        const raw = localStorage.getItem('activeOrder');
        if (!raw) return;
        const order = JSON.parse(raw);
        if (order && order.id) {
            currentOrder = order;
            lastStatus   = order.status || 'PENDING';
        }
    } catch (e) {
        console.error('Storage parse error:', e);
    }
}

// ── Start polling every 5 seconds ─────────────────────────
function startPolling() {
    fetchLatestStatus();
    pollInterval = setInterval(fetchLatestStatus, 5000);
}

// ── Fetch latest status from backend ──────────────────────
async function fetchLatestStatus() {
    if (!currentOrder?.id) return;
    try {
        const res  = await fetch(`/api/orders/${currentOrder.id}`);
        const json = await res.json();
        if (json.status !== 'success' || !json.data) return;

        const freshOrder = json.data;

        // ✅ KEY FIX: derive "effective status" from status + delivery_boy_id
        // ACCEPTED + delivery_boy_id present = delivery boy picked up = OUT_FOR_DELIVERY
        const effectiveStatus = resolveStatus(freshOrder);

        // Save to localStorage
        currentOrder.status            = freshOrder.status;
        currentOrder.delivery_boy_id   = freshOrder.delivery_boy_id || null;
        localStorage.setItem('activeOrder', JSON.stringify(currentOrder));

        // Detect change → animate + sound
        if (effectiveStatus !== lastStatus) {
            onStatusChange(effectiveStatus, lastStatus);
            lastStatus = effectiveStatus;
        }

        updateStatusUI(effectiveStatus);

    } catch (err) {
        console.error('Poll error:', err);
    }
}

// ── Resolve effective status ───────────────────────────────
// ACCEPTED + delivery_boy_id filled → OUT_FOR_DELIVERY
function resolveStatus(order) {
    if (order.status === 'ACCEPTED' && order.delivery_boy_id) {
        return 'OUT_FOR_DELIVERY';
    }
    return order.status;
}

// ── Handle status change event ─────────────────────────────
function onStatusChange(newStatus, oldStatus) {
    const hero = document.getElementById('statusHero');
    if (hero) {
        hero.classList.add('status-change');
        setTimeout(() => hero.classList.remove('status-change'), 500);
    }
    if (soundEnabled) playStatusSound(newStatus);
    if (newStatus === 'DELIVERED') {
        setTimeout(launchConfetti, 400);
    }
}

// ── Update ALL UI based on status ─────────────────────────
function updateStatusUI(status) {
    const wrap    = document.getElementById('statusIconWrap');
    const emoji   = document.getElementById('statusEmoji');
    const title   = document.getElementById('statusTitle');
    const sub     = document.getElementById('statusSub');
    const label   = document.getElementById('blinkLabel');
    const dot     = document.getElementById('blinkDot');
    const text    = document.getElementById('blinkText');
    const dispSt  = document.getElementById('dispStatus');
    const etaBar  = document.getElementById('etaBar');
    const navDot  = document.getElementById('navActiveDot');
    const delCard = document.getElementById('deliveredCard');
    const newBtn  = document.getElementById('newOrderBtn');

    if (!wrap) return;
    wrap.className  = 'status-icon-wrap';
    label.className = 'blink-label';

    // ── PENDING ──────────────────────────────────────────
    if (status === 'PENDING') {
        wrap.classList.add('pending');
        emoji.textContent = '⏳';
        title.textContent = 'Waiting for confirmation…';
        title.style.color = '#92400E';
        sub.textContent   = 'Your order has been placed. The store owner will confirm it shortly.';
        label.classList.add('pending');
        dot.classList.add('blinking');
        text.textContent  = 'PENDING CONFIRMATION';
        dispSt.textContent = 'PENDING';
        dispSt.style.cssText = 'background:#FFFBEB;border:1px solid #FCD34D;border-radius:99px;padding:4px 12px;font-size:10px;font-weight:900;color:#D97706';
        etaBar.classList.add('hidden');
        if (navDot) navDot.classList.remove('hidden');
        setProgress(1);

    // ── ACCEPTED (store preparing, no delivery boy yet) ──
    } else if (status === 'ACCEPTED') {
        wrap.classList.add('accepted');
        emoji.textContent = '👨‍🍳';
        title.textContent = 'Order accepted & being prepared!';
        title.style.color = '#1D4ED8';
        sub.textContent   = 'The store has accepted your order and is packing it for delivery.';
        label.classList.add('accepted');
        dot.classList.remove('blinking');
        text.textContent  = 'ORDER ACCEPTED';
        dispSt.textContent = 'ACCEPTED';
        dispSt.style.cssText = 'background:#EFF6FF;border:1px solid #BFDBFE;border-radius:99px;padding:4px 12px;font-size:10px;font-weight:900;color:#2563EB';
        showETA(30, 45);
        if (navDot) navDot.classList.remove('hidden');
        setProgress(2);

    // ── OUT FOR DELIVERY (delivery boy accepted) ──────────
    } else if (status === 'OUT_FOR_DELIVERY') {
        wrap.classList.add('accepted');
        emoji.textContent = '🚚';
        title.textContent = 'Out for delivery!';
        title.style.color = '#7C3AED';
        sub.textContent   = 'Your order is on the way! The delivery partner is heading to your address.';
        label.className   = 'blink-label accepted';
        dot.classList.remove('blinking');
        text.textContent  = 'OUT FOR DELIVERY';
        dispSt.textContent = 'OUT FOR DELIVERY';
        dispSt.style.cssText = 'background:#F5F3FF;border:1px solid #DDD6FE;border-radius:99px;padding:4px 12px;font-size:10px;font-weight:900;color:#7C3AED';
        showETA(10, 20);
        if (navDot) navDot.classList.remove('hidden');
        setProgress(3);

    // ── DELIVERED ─────────────────────────────────────────
    } else if (status === 'DELIVERED') {
        wrap.classList.add('delivered');
        emoji.textContent = '✅';
        title.textContent = 'Order delivered successfully!';
        title.style.color = '#15803D';
        sub.textContent   = 'Your order has arrived. Thank you for choosing Sundha Mata Kirana Store! 🙏';
        label.classList.add('delivered');
        dot.classList.remove('blinking');
        text.textContent  = 'DELIVERED ✓';
        dispSt.textContent = 'DELIVERED';
        dispSt.style.cssText = 'background:#F0FDF4;border:1px solid #BBF7D0;border-radius:99px;padding:4px 12px;font-size:10px;font-weight:900;color:#16A34A';
        etaBar.classList.add('hidden');
        if (navDot) navDot.classList.add('hidden');
        setProgress(4);

        if (delCard) delCard.classList.add('show');
        if (newBtn)  newBtn.classList.add('show');

        // Stop polling
        clearInterval(pollInterval);

        // ✅ Clear active order → customer can place new order
        localStorage.removeItem('activeOrder');
        localStorage.removeItem('activeOrderId');
        localStorage.removeItem('lastOrderId');
        localStorage.removeItem('activeOrderItems');

        // Auto redirect to home after 6 seconds
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 6000);
    }
}

// ── Progress bar steps ────────────────────────────────────
function setProgress(step) {
    const fill = document.getElementById('progressFill');
    if (fill) {
        const pct = step === 1 ? '8%' : step === 2 ? '42%' : step === 3 ? '75%' : '100%';
        fill.style.width = pct;
    }

    const stepDefs = [
        { circle: 'step1', text: 'step1t' },
        { circle: 'step2', text: 'step2t' },
        { circle: 'step3', text: 'step3t' },
        { circle: 'step4', text: 'step4t' },
    ];
    const emojis   = ['✓', '🏪', '🚚', '🎉'];
    const doneIcon = '<i class="fa-solid fa-check text-xs"></i>';

    stepDefs.forEach((s, i) => {
        const cEl = document.getElementById(s.circle);
        const tEl = document.getElementById(s.text);
        if (!cEl || !tEl) return;
        cEl.className = 'p-circle';
        tEl.className = 'p-text';
        if (i < step - 1) {
            cEl.classList.add('done');
            cEl.innerHTML = doneIcon;
            tEl.classList.add('done');
        } else if (i === step - 1) {
            cEl.classList.add('active');
            cEl.innerHTML = emojis[i];
            tEl.classList.add('active');
        } else {
            cEl.classList.add('inactive');
            cEl.innerHTML = emojis[i];
            tEl.classList.add('inactive');
        }
    });
}

// ── ETA bar ───────────────────────────────────────────────
function showETA(minMin, maxMin) {
    const etaBar  = document.getElementById('etaBar');
    const etaTime = document.getElementById('etaTime');
    if (etaBar)  etaBar.classList.remove('hidden');
    if (etaTime) etaTime.textContent = `${minMin}–${maxMin} min`;
    const etaRight = document.getElementById('etaRight');
    if (etaRight) etaRight.textContent = 'estimated';
}

// ── Render order details on page load ─────────────────────
function renderOrderDetails(order) {
    setEl('dispOrderId',   `#${(order.id || '').toUpperCase()}`);
    setEl('dispOrderTime', formatDateTime(order.created_at || order.date));
    setEl('dispTotal',     `₹${(order.total || 0).toLocaleString('en-IN')}`);

    const items = order.items || [];
    const list  = document.getElementById('itemsList');
    if (list) {
        if (!items.length) {
            list.innerHTML = '<p style="color:#ccc;font-size:13px;text-align:center;padding:12px">No items found</p>';
        } else {
            list.innerHTML = items.map(item => `
                <div class="item-row">
                    <div class="item-emoji">${item.icon || '🛒'}</div>
                    <div class="item-info">
                        <div class="item-name">${escHtml(item.name || '')}</div>
                        <div class="item-qty">${item.qty} × ₹${item.price}</div>
                    </div>
                    <div class="item-price">₹${((item.qty || 1) * (item.price || 0)).toLocaleString('en-IN')}</div>
                </div>`).join('');
        }
    }

    // Show initial status (will be updated by polling)
    const effective = resolveStatus(order);
    updateStatusUI(effective);
}

// ── No active order ───────────────────────────────────────
function showNoOrder() {
    const content = document.querySelector('.content');
    if (!content) return;
    content.innerHTML = `
        <div style="text-align:center;padding:60px 24px;animation:slideUp .4s ease both">
            <div style="font-size:64px;margin-bottom:16px">📭</div>
            <h2 style="font-size:20px;font-weight:900;color:#1C1407;margin-bottom:8px">No Active Order</h2>
            <p style="font-size:13px;color:#94A3B8;font-weight:600;line-height:1.6;margin-bottom:28px">
                You haven't placed any order yet.<br>Go to the store and shop away!
            </p>
            <a href="home.html" style="display:inline-block;background:linear-gradient(135deg,#F97316,#DC2626);color:white;padding:14px 32px;border-radius:16px;font-weight:900;font-size:15px;text-decoration:none;box-shadow:0 6px 20px rgba(249,115,22,.35)">
                🛒 Start Shopping
            </a>
        </div>`;
    const navDot = document.getElementById('navActiveDot');
    if (navDot) navDot.classList.add('hidden');
}

// ── New order button ──────────────────────────────────────
function startNewOrder() {
    localStorage.removeItem('activeOrder');
    localStorage.removeItem('activeOrderId');
    localStorage.removeItem('lastOrderId');
    window.location.href = 'home.html';
}

// ── Sound notification ────────────────────────────────────
function playStatusSound(status) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx   = new AudioCtx();
        const freqs = {
            ACCEPTED:         [523, 659, 784],
            OUT_FOR_DELIVERY: [659, 784, 880],
            DELIVERED:        [784, 880, 1047],
            PENDING:          [440]
        };
        const notes = freqs[status] || freqs.PENDING;
        notes.forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type            = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.05);
            gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + i * 0.12 + 0.35);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime  + i * 0.12 + 0.4);
        });
    } catch (e) { /* silent fail */ }
}

// ── Confetti ──────────────────────────────────────────────
function launchConfetti() {
    const canvas  = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#F97316','#22C55E','#3B82F6','#F59E0B','#EC4899','#8B5CF6'];
    const pieces = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width, y: -20,
        r: Math.random() * 6 + 3, d: Math.random() * 4 + 2,
        c: colors[Math.floor(Math.random() * colors.length)],
        t: Math.random() * Math.PI * 2, ts: Math.random() * 0.1 + 0.02
    }));

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.y += p.d; p.t += p.ts; p.x += Math.sin(p.t) * 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.c;
            ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
            ctx.fill();
        });
        frame++;
        if (frame < 120) requestAnimationFrame(draw);
        else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; }
    }
    draw();
}

// ── Helpers ───────────────────────────────────────────────
// IST-aware date format
function formatDateTime(iso) {
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

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
