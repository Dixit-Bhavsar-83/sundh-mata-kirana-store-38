const PIN_KEY = "1983";
let isSearching = false;

// 1. PIN Verification
function verifyPin() {
    const input = document.getElementById('adminPin').value;
    if(input === PIN_KEY) {
        document.getElementById('pinScreen').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        fetchCustomerData(); // Load first time
    } else {
        alert("Incorrect PIN Boss!");
        document.getElementById('adminPin').value = '';
    }
}

// 2. Fetch Data from Flask
async function fetchCustomerData() {
    if(isSearching) return; // Search ke waqt auto-refresh pause

    try {
        const response = await fetch('api/owner/get-customers');
        const data = await response.json();
        renderTable(data);
    } catch (error) {
        console.error("Panel Fetch Error:", error);
    }
}

// 3. Render Table
function renderTable(customers) {
    const tbody = document.getElementById('customerTableBody');
    const totalCount = document.getElementById('totalCount');
    
    tbody.innerHTML = '';
    totalCount.innerText = Object.keys(customers).length;

    Object.keys(customers).forEach(phone => {
        const user = customers[phone];
        tbody.innerHTML += `
            <tr class="hover:bg-white/[0.02] transition-colors">
                <td class="p-5 font-bold">${user.name}</td>
                <td class="p-5 font-medium text-slate-400">${phone}</td>
                <td class="p-5"><span class="bg-white/5 px-3 py-1 rounded-lg text-xs font-bold border border-white/5">${user.profession}</span></td>
                <td class="p-5 text-slate-500 text-xs">${new Date().toLocaleString()}</td>
                <td class="p-5 flex justify-center gap-3">
                    <button onclick="shareUser('${phone}')" class="p-2 hover:text-orange-500"><i class="fa-solid fa-share-nodes"></i></button>
                    <button onclick="deleteUser('${phone}')" class="p-2 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}
//Auto refresh
setInterval(() => {
    if (document.hidden) return;

    const pinScreen = document.getElementById('pinScreen');

    if (pinScreen && !pinScreen.classList.contains('hidden')) return;

    fetchCustomerData();
}, 5000);

// 5. Real-time Search Logic
document.getElementById('adminSearch').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    isSearching = val.length > 0;
    
    const rows = document.querySelectorAll('#customerTableBody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(val) ? '' : 'none';
    });
});