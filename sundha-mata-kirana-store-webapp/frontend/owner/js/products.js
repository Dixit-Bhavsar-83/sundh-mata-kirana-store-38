let inventory = JSON.parse(localStorage.getItem('products')) || [];

let editMode = false;
let editId = null;

// Development mein Flask use karo, Live Server nahi!
const BASE_URL = window.location.port === '5500' 
    ? 'http://localhost:5000/api'  // agar galti se 5500 pe khula
    : '/api';                       // Flask pe sahi kaam karega

/* =========================
   MODAL CONTROL
========================= */
function toggleModal(show) {
    const modal = document.getElementById('addProductModal');
    const overlay = document.getElementById('modalOverlay');
    const form = document.getElementById('productForm');

    if (show) {
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = "hidden";
    } else {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = "auto";

        form.reset();
        resetImagePreviews();

        editMode = false;
        editId = null;
    }
}

/* =========================
   IMAGE PREVIEW
========================= */
function previewImage(input, previewId, iconId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
            document.getElementById(previewId).src = e.target.result;
            document.getElementById(previewId).classList.remove('hidden');
            document.getElementById(iconId).classList.add('hidden');
        };

        reader.readAsDataURL(input.files[0]);
    }
}

function resetImagePreviews() {
    ['preview1', 'preview2'].forEach(id => {
        const img = document.getElementById(id);
        if (img) {
            img.src = "";
            img.classList.add('hidden');
        }
    });

    ['icon1', 'icon2'].forEach(id => {
        const icon = document.getElementById(id);
        if (icon) icon.classList.remove('hidden');
    });
}

/* =========================
   EDIT PRODUCT (🔥 FIXED)
========================= */
function editProduct(id) {
    const product = inventory.find(p => p.id === id);
    if (!product) return;

    editMode = true;
    editId = id;

    document.getElementById('pName').value = product.name || "";
    document.getElementById('pNick').value = product.nick || "";
    document.getElementById('pUnit').value = product.unit || "";
    document.getElementById('pQty').value = product.qty || "";
    document.getElementById('pPrice').value = product.price || "";

    // images
    const img1 = document.getElementById('preview1');
    img1.src = product.img1;
    img1.classList.remove('hidden');

    if (product.img2) {
        const img2 = document.getElementById('preview2');
        img2.src = product.img2;
        img2.classList.remove('hidden');
    }

    toggleModal(true);
}

/* =========================
   DELETE PRODUCT
========================= */
async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;

    try {
        await fetch(`/api/admin/delete-product/${id}`, {
    method: 'DELETE'
});

        inventory = inventory.filter(p => p.id !== id);
        saveToLocal();
        renderProducts(inventory);

    } catch (err) {
        alert("Delete failed");
    }
}

/* =========================
   SAVE / UPDATE PRODUCT
========================= */
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        id: editMode ? editId : Date.now(),
        name: document.getElementById('pName').value,
        nick: document.getElementById('pNick').value,
        unit: document.getElementById('pUnit').value,
        qty: document.getElementById('pQty').value,
        price: document.getElementById('pPrice').value,
        img1: document.getElementById('preview1').src,
        img2: document.getElementById('preview2').src
    };

    try {
       const url = editMode
    ? `/api/admin/update-product/${editId}`
    : `/api/admin/add-product`;

        const method = editMode ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
        });

        if (!res.ok) throw new Error();

        if (editMode) {
            const index = inventory.findIndex(p => p.id === editId);
            if (index !== -1) inventory[index] = productData;
        } else {
            inventory.unshift(productData);
        }

        saveToLocal();
        renderProducts(inventory);
        toggleModal(false);

    } catch (err) {
        alert("Backend not working, saved locally");

        // fallback local save
        if (editMode) {
            const index = inventory.findIndex(p => p.id === editId);
            inventory[index] = productData;
        } else {
            inventory.unshift(productData);
        }

        saveToLocal();
        renderProducts(inventory);
        toggleModal(false);
    }
});

/* =========================
   SEARCH
========================= */
document.getElementById('productSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();

    const filtered = inventory.filter(p =>
        (p.name || "").toLowerCase().includes(term) ||
        (p.nick || "").toLowerCase().includes(term)
    );

    renderProducts(filtered);
});

/* =========================
   RENDER PRODUCTS
========================= */
function renderProducts(data) {
    const list = document.getElementById('productList');
    list.innerHTML = "";

    if (!data.length) {
        list.innerHTML = `<div class="text-center py-10 text-gray-400">No products</div>`;
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="bg-white p-3 rounded-xl shadow flex justify-between items-center mb-3">

            <div class="flex gap-3 items-center">
                <img src="${item.img1}" class="w-14 h-14 rounded-lg object-cover">

                <div>
                    <h3 class="font-bold text-sm">${item.name}</h3>
                    <p class="text-orange-600 font-bold">₹${item.price}</p>
                    <p class="text-xs text-gray-400">${item.qty} ${item.unit}</p>
                </div>
            </div>

            <div class="flex gap-2">
    <button onclick="editProduct(${item.id})"
        class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-orange-100">
        <i class="fa-solid fa-pen text-[11px] text-gray-600"></i>
    </button>

    <button onclick="deleteProduct(${item.id})"
        class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center active:bg-red-200">
        <i class="fa-solid fa-trash text-[11px] text-red-500"></i>
    </button>
</div>
        </div>
    `).join('');
}

/* =========================
   LOCAL SAVE
========================= */
function saveToLocal() {
    localStorage.setItem('products', JSON.stringify(inventory));
}

/* =========================
   INIT
========================= */
renderProducts(inventory);

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};