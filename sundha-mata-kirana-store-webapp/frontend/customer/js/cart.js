let currentCart = JSON.parse(localStorage.getItem('userCart')) || [];

window.onload = () => {
    updateCartUI();
};

function updateCartUI() {
    const cartList = document.getElementById('cartItems');
    let total = 0;
    
    cartList.innerHTML = currentCart.map(item => {
        total += item.price * item.qty;
        return `
        <div class="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <img src="${item.img}" class="w-16 h-16 object-contain">
            <div class="flex-1"><h4 class="font-bold text-sm">${item.name}</h4><p class="text-orange-500 font-black">₹${item.price}</p></div>
            <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border">
                <button onclick="updateQty(${item.id}, -1)" class="w-6 h-6 bg-white rounded-lg"><i class="fas fa-minus text-[8px]"></i></button>
                <span class="font-bold text-xs">${item.qty}</span>
                <button onclick="updateQty(${item.id}, 1)" class="w-6 h-6 bg-white rounded-lg"><i class="fas fa-plus text-[8px]"></i></button>
            </div>
        </div>`;
    }).join('');

    document.getElementById('cartTotal').innerText = `₹${total}`;
    
    const btn = document.getElementById('orderBtn');
    if(total > 0 && total < 500) {
        btn.innerText = `ADD ₹${500 - total} MORE`;
        btn.classList.replace('bg-slate-900', 'bg-slate-400');
    } else {
        btn.innerText = "PLACE ORDER";
        btn.classList.replace('bg-slate-400', 'bg-slate-900');
    }
}

function updateQty(id, delta) {
    const item = currentCart.find(i => i.id === id);
    if(item) {
        item.qty += delta;
        if(item.qty <= 0) currentCart = currentCart.filter(i => i.id !== id);
    }
    localStorage.setItem('userCart', JSON.stringify(currentCart));
    updateCartUI();
}

function placeOrder() {
    const total = currentCart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    if (total < 500) {
        document.getElementById('orderRestrictionPopup').classList.remove('hidden');
        return;
    }

    // ✅ Show success animation
    const popup = document.getElementById('orderSuccessPopup');
    popup.classList.remove('hidden');

    // 🔒 lock screen
    document.body.style.overflow = "hidden";

    // 🧹 clear cart
    currentCart = [];
    localStorage.removeItem('userCart');

    // ⏱ auto close after 3 sec
    setTimeout(() => {
        popup.classList.add('hidden');
        document.body.style.overflow = "auto";

        // redirect
        window.location.href = 'home.html';

    }, 3000);
}

function closePopup() {
    document.getElementById('orderRestrictionPopup').classList.add('hidden');
}

