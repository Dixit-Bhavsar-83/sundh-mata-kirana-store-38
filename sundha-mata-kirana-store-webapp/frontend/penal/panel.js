const ADMIN_PIN = "1983";

// 1. PIN Verification
function verifyPin() {
    const val = document.getElementById('pinInput').value;
    if(val === ADMIN_PIN) {
        document.getElementById('lockScreen').classList.add('hidden');
        document.getElementById('mainPanel').classList.remove('hidden');
        startPanel(); // Start the auto-refresh loop
    } else {
        alert("Incorrect PIN!");
        document.getElementById('pinInput').value = "";
    }
}

// 2. Fetch Data (Auto-refresh enabled)
// Global variable to track data version
let lastDataSnapshot = "";

async function fetchCustomerData() {
    try {
        const res = await fetch('/api/admin/customers');
        const data = await res.json();
        
        if (data.status === "success") {
            // Data ko stringify karke compare karo
            const currentSnapshot = JSON.stringify(data.data);
            
            // Agar data wahi hai jo pehle tha, toh refresh mat karo (No flicker/delete)
            if (currentSnapshot !== lastDataSnapshot) {
                lastDataSnapshot = currentSnapshot;
                renderData(data.data);
            }
        }
    } catch (err) { 
        console.error("Backend offline, data preserved.");
    }
}

// 3. Render Data with Real-time Timestamp
function renderData(users) {
    const list = document.getElementById('customerList');
    document.getElementById('totalCount').innerText = users.length;
    
    // Create timestamp
    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    list.innerHTML = users.map(u => `
        <div class="user-card">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center font-black text-xl">
                        ${u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-lg leading-tight">${u.name}</h3>
                        <p class="text-zinc-500 text-[10px] font-black uppercase tracking-widest">${u.profession || 'CUSTOMER'}</p>
                    </div>
                </div>
                <span class="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md font-bold">${timestamp}</span>
            </div>

            <div class="space-y-3 mb-6">
                <div class="flex items-center gap-3">
                    <i class="fas fa-phone-alt text-zinc-600 text-xs"></i>
                    <span class="text-sm font-bold text-zinc-200">+91 ${u.phone}</span>
                </div>
                <div class="flex items-start gap-3 bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                    <i class="fas fa-map-marker-alt text-orange-500 text-xs mt-1"></i>
                    <div class="text-[11px] font-semibold text-zinc-400 leading-relaxed">
                        ${u.address || 'Address not provided'}
                    </div>
                </div>
            </div>

            <div class="flex gap-3">
                <button onclick='shareProfile(${JSON.stringify(u)})' 
                    class="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                    <i class="fas fa-share-nodes"></i> Share
                </button>
                <button onclick="deleteEntry('${u.phone}')" 
                    class="w-14 bg-rose-500/10 text-rose-500 py-4 rounded-2xl border border-rose-500/20 flex items-center justify-center active:scale-95 transition-all">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 4. Start Panel Logic (Prevents auto-delete during search)
function startPanel() {
    fetchCustomerData();
    setInterval(() => {
        // Sirf tabhi refresh karo jab search bar khali ho
        if(document.getElementById('searchBar').value === "") {
            fetchCustomerData();
        }
    }, 5000); // 5 seconds interval
}

// 5. Delete Logic
async function deleteEntry(phone) {
    if(confirm("Kya aap sach mein ye customer delete karna chahte hain?")) {
        await fetch(`/api/admin/delete-customer/${phone}`, { method: 'DELETE' });
        fetchCustomerData(); 
    }
}

// 6. Search Logic
document.getElementById('searchBar').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.user-card');
    cards.forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(val) ? '' : 'none';
    });
};

// 7. Share Logic
function shareProfile(u) {
    const bio = `*SUNDHA MATA KIRANA STORE*%0A👤 *Name:* ${u.name}%0A📞 *Phone:* ${u.phone}%0A🏠 *Address:* ${u.address}`;
    window.open(`https://wa.me/?text=${bio}`, '_blank');
}
