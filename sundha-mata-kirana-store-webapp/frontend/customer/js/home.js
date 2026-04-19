let currentCart = JSON.parse(localStorage.getItem('userCart')) || [];
let allProducts = [];
let selectedProduct = null;

window.onload = () => {
    loadProductsFromBackend();
    updateBadge();
    setupSearch();
};

async function loadProductsFromBackend() {
    try {
        const res = await fetch('/api/products', {
            method: 'GET',
            mode: 'cors' 
        });
        
        if (!res.ok) throw new Error('Server response nahi de raha!');
        
        const result = await res.json();
        allProducts = Array.isArray(result) ? result : (result.data || []);
        
        localStorage.setItem('cachedProducts', JSON.stringify(allProducts));
        renderProducts(allProducts);
    } catch (err) {
        console.error("Connection Error:", err);
        const cached = localStorage.getItem('cachedProducts');
        if (cached) {
            allProducts = JSON.parse(cached);
            renderProducts(allProducts);
        } else {
            document.getElementById('productGrid').innerHTML = `<p class="col-span-2 text-center text-zinc-400 py-10">Dukaan offline hai boss! 😅</p>`;
        }
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => {
        const inCart = currentCart.find(item => item.id === p.id);
        return `
        <div class="product-card bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col" onclick="openProductDetail(${p.id})">
            <div class="w-full h-32 flex items-center justify-center mb-3 overflow-hidden rounded-2xl bg-slate-50">
               <img src="${p.img1 || p.img || 'https://via.placeholder.com/150'}" class="h-24 w-24 object-contain">
            </div>
            <h3 class="font-bold text-xs text-slate-800 truncate px-1">${p.name}</h3>
            <p class="text-[9px] text-zinc-400 font-bold px-1 mb-2 uppercase">${p.qty || '1'} ${p.unit || 'unit'}</p>
            <div class="flex justify-between items-center mt-auto px-1">
                <span class="font-black text-slate-900 text-base">₹${p.price}</span>
                <div onclick="event.stopPropagation()">
                    ${renderQuantityControl(p, inCart ? inCart.qty : 0)}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderQuantityControl(p, qty) {
    if (qty > 0) {
        return `
        <div class="flex items-center bg-green-500 text-white rounded-xl overflow-hidden shadow-md">
            <button onclick="updateQty(${p.id}, -1)" class="w-7 h-8 flex items-center justify-center"><i class="fas fa-minus text-[8px]"></i></button>
            <span class="w-6 text-center font-bold text-xs">${qty}</span>
            <button onclick="updateQty(${p.id}, 1)" class="w-7 h-8 flex items-center justify-center"><i class="fas fa-plus text-[8px]"></i></button>
        </div>`;
    }
    return `
    <button onclick="updateQty(${p.id}, 1)" class="bg-white border border-slate-200 text-green-600 px-4 py-1.5 rounded-xl font-black text-xs shadow-sm">ADD</button>`;
}

function updateQty(id, delta) {
    const p = allProducts.find(x => x.id === id);
    const existing = currentCart.find(item => item.id === id);

    if (existing) {
        existing.qty += delta;
        if (existing.qty <= 0) currentCart = currentCart.filter(item => item.id !== id);
        if (existing.qty > 30) existing.qty = 30;
    } else if (delta > 0) {
        currentCart.push({ ...p, qty: 1 });
    }
    saveCart();
    renderProducts(allProducts);
}

function saveCart() {
    localStorage.setItem('userCart', JSON.stringify(currentCart));
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById('cartBadge');
    const totalItems = currentCart.reduce((a, b) => a + b.qty, 0);
    badge.innerText = totalItems;
    badge.classList.toggle('hidden', totalItems === 0);
}

function openProductDetail(id) {
    selectedProduct = allProducts.find(p => p.id === id);
    document.getElementById('detailImg').src = selectedProduct.img1 || selectedProduct.img;
    document.getElementById('detailName').innerText = selectedProduct.name;
    document.getElementById('detailPrice').innerText = `₹${selectedProduct.price}`;
    document.getElementById('detailQty').innerText = `${selectedProduct.qty} ${selectedProduct.unit}`;
    
    document.getElementById('productDetailScreen').classList.remove('hidden');
}

function closeProductDetail() {
    document.getElementById('productDetailScreen').classList.add('hidden');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById(id).classList.add('active-screen');
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(val) || (p.nickname && p.nickname.toLowerCase().includes(val)));
        renderProducts(filtered);
    });
}


// Popup control
function showPopup() {
    document.getElementById('orderRestrictionPopup').classList.remove('hidden');
    document.body.style.overflow = "hidden";
}

function closePopup() {
    document.getElementById('orderRestrictionPopup').classList.add('hidden');
    document.body.style.overflow = "auto";
}

// Add to cart from detail (with ₹500 rule)
function addToCartFromDetail() {
    if (!selectedProduct) return;

    // Direct add to cart (NO restriction)
    updateQty(selectedProduct.id, 1);

    // ✅ Green "Added" toast show
    showAddedToast();
}

function showAddedToast() {
    const toast = document.getElementById('addedToast');
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}


function buyNow() {
    if (!selectedProduct) return;

    if (selectedProduct.price >= 500) {

        currentCart = [{
            ...selectedProduct,
            qty: 1
        }];

        saveCart();

        // ✅ Green success screen
        showSuccessScreen();

    } else {
        showPopup(); // ₹500 restriction popup
    }
}

function showSuccessScreen() {
    const screen = document.getElementById('successScreen');
    screen.classList.remove('hidden');

    setTimeout(() => {
        screen.classList.add('hidden');
        currentCart = [];
        localStorage.removeItem('userCart');
        showScreen('home');
    }, 3000);
}
