const initialOrders = [
    {
        id: "ORD-5521",
        name: "Rahul Sharma",
        phone: "9876543210",
        address: "Flat 402, Shivam Appt, Area 380005, Ahmedabad",
        items: [
            { name: "Aashirvaad Atta 5kg", qty: 1, price: 245, img: "https://via.placeholder.com/150" },
            { name: "Maggi Noodles", qty: 4, price: 15, total: 60, img: "https://via.placeholder.com/150" }
        ],
        total: 305,
        status: "PENDING"
    },
    {
        id: "ORD-5522",
        name: "Anjali Patel",
        phone: "9988776655",
        address: "B-21, Gokuldham Soc, Satellite, Ahmedabad",
        items: [
            { name: "Dairy Milk Silk", qty: 1, price: 56, img: "https://via.placeholder.com/150" }
        ],
        total: 56,
        status: "ACCEPTED"
    }
];

let activeOrder = null;
let filteredOrders = [...initialOrders]; // Search ke liye backup

function renderOrders(dataToRender = initialOrders) {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    
    // Counter Update (Sirf Pending orders ke liye)
    const pendingCount = initialOrders.filter(o => o.status === "PENDING").length;
    document.getElementById('activeCount').innerText = pendingCount;
    if(document.getElementById('detActiveCount')) {
        document.getElementById('detActiveCount').innerText = pendingCount;
    }

    dataToRender.forEach(order => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-all";
        card.onclick = () => openDetails(order);
        
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 font-bold text-xl uppercase">
                    ${order.name.charAt(0)}
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 text-lg">${order.name}</h3>
                    <p class="text-sm text-slate-400 font-medium">${order.items.length} Items • ${order.id}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-slate-800">Rs. ${order.total}</p>
                <p class="text-[10px] font-extrabold ${order.status === 'ACCEPTED' ? 'text-blue-500' : 'text-slate-400'} mt-1 uppercase tracking-tighter">${order.status}</p>
            </div>
        `;
        list.appendChild(card);
    });
}

function openDetails(order) {
    activeOrder = order;
    const overlay = document.getElementById('detailOverlay');
    
    // Fill Customer Data
    document.getElementById('detName').innerText = order.name;
    document.getElementById('detPhone').innerText = order.phone;
    document.getElementById('detAddr').innerText = order.address;
    
    // Fill Items
    const container = document.getElementById('itemsContainer');
    container.innerHTML = order.items.map(item => `
        <div class="flex justify-between items-center">
            <div class="flex gap-4 items-center">
                <img src="${item.img}" class="w-14 h-14 rounded-xl bg-gray-100 object-cover border">
                <div>
                    <h4 class="font-bold text-slate-700">${item.name}</h4>
                    <p class="text-xs text-slate-400 font-medium">${item.qty} x Rs. ${item.price}</p>
                </div>
            </div>
            <p class="font-bold text-slate-800">Rs. ${item.qty * item.price}</p>
        </div>
    `).join('');

    // Accept Button State Fix
    const acceptBtn = document.getElementById('acceptBtn');
    if(order.status === "ACCEPTED") {
        acceptBtn.innerText = "ORDER COMPLETED";
        acceptBtn.classList.remove('bg-[#f35c15]');
        acceptBtn.classList.add('bg-blue-500'); 
        acceptBtn.disabled = true;
    } else {
        acceptBtn.innerText = "ACCEPT ORDER";
        acceptBtn.classList.remove('bg-blue-500', 'bg-slate-400');
        acceptBtn.classList.add('bg-[#f35c15]');
        acceptBtn.disabled = false;
    }

    overlay.classList.remove('hidden');
}

function closeDetails() {
    document.getElementById('detailOverlay').classList.add('hidden');
}

// FIX: Accept Order Logic
document.getElementById('acceptBtn').onclick = () => {
    if(activeOrder && activeOrder.status === "PENDING") {
        activeOrder.status = "ACCEPTED";
        renderOrders(); // Refresh status on main list
        closeDetails(); // Close detail view
    }
};

// FIX: Advanced WhatsApp Share (Aapke exact format mein)
document.getElementById('shareBtn').onclick = () => {
    if(!activeOrder) return;
    
    const itemsText = activeOrder.items.map(i => `- ${i.name} (${i.qty} Qty)`).join('%0A');
    
    const message = `📦 *NEW ORDER DETAILS*%0A%0A👤 *Customer:* ${activeOrder.name}%0A📞 *Phone:* ${activeOrder.phone}%0A📍 *Address:* ${activeOrder.address}%0A%0A🛒 *Items List:*%0A${itemsText}%0A%0A💰 *Total Amount:* Rs. ${activeOrder.total}%0A🆔 *Order ID:* #${activeOrder.id}%0A%0APlease process this order quickly!`;
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
};

// FIX: Advanced Search Working
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = initialOrders.filter(o => 
        o.name.toLowerCase().includes(term) || 
        o.id.toLowerCase().includes(term) ||
        o.phone.includes(term)
    );
    renderOrders(filtered); // Filtered data render karein
});

// Initial Load
renderOrders();