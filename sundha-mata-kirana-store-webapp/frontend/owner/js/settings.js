///settings.html


document.addEventListener('DOMContentLoaded', () => {
    loadSavedProfile();
});

// Navigation
function openSub(id) {
    document.getElementById(id).classList.add('active');
}

function closeSub(id) {
    document.getElementById(id).classList.remove('active');
}

// ✅ IMAGE FIX (MAIN BUG FIXED)
function previewProfile(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('editImgPreview');
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Save Profile
function saveProfile() {
    const name = document.getElementById('editName').value;
    const shop = document.getElementById('editShop').value;
    const img = document.getElementById('editImgPreview').src;

    localStorage.setItem('ownerName', name);
    localStorage.setItem('shopName', shop);
    localStorage.setItem('ownerImage', img);

    updateUI(name, shop, img);

    alert("Saved Successfully 🚀");
    closeSub('profileScreen');
}

// Load Saved
function loadSavedProfile() {
    const name = localStorage.getItem('ownerName');
    const shop = localStorage.getItem('shopName');
    const img = localStorage.getItem('ownerImage');

    if (name) {
        document.getElementById('editName').value = name;
        document.getElementById('mainOwnerName').innerText = name;
    }

    if (shop) {
        document.getElementById('editShop').value = shop;
        document.getElementById('mainShopName').innerText = shop;
    }

    if (img) {
        document.getElementById('editImgPreview').src = img;
        document.getElementById('mainOwnerImg').src = img;
    }
}

// Update UI
function updateUI(name, shop, img) {
    document.getElementById('mainOwnerName').innerText = name;
    document.getElementById('mainShopName').innerText = shop;
    document.getElementById('mainOwnerImg').src = img;
}

// Password strength
function checkPassStrength(val) {
    const bar = document.getElementById('strengthBar');
    const text = document.getElementById('strengthText');

    if(val.length < 6) {
        bar.style.width = '30%';
        bar.className = 'strength-bar bg-red-500';
        text.innerText = 'Weak';
    } else if (val.match(/[0-9]/) && val.match(/[A-Z]/)) {
        bar.style.width = '100%';
        bar.className = 'strength-bar bg-green-500';
        text.innerText = 'Strong';
    } else {
        bar.style.width = '60%';
        bar.className = 'strength-bar bg-orange-500';
        text.innerText = 'Medium';
    }
}

// 🔥 NEW FEATURES

function exportData() {
    const data = JSON.stringify(localStorage);
    const blob = new Blob([data], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup.json";
    a.click();
}

function importData() {
    const input = document.createElement("input");
    input.type = "file";

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            const data = JSON.parse(reader.result);

            for (let key in data) {
                localStorage.setItem(key, data[key]);
            }

            alert("Data Restored ✅");
            location.reload();
        };

        reader.readAsText(file);
    };

    input.click();
}

function clearAllData() {
    if(confirm("Are you sure? This will delete everything!")) {
        localStorage.clear();
        location.reload();
    }
}

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};

async function shareApp() {
    const shareData = {
        title: 'Sundha Mata Kirana Store',
        text: 'Best online grocery shopping app! Order now:',
        url: 'https://sundh-mata-kirana-store-38.onrender.com' // Yahan apna link paste kar dena
    };

    try {
        if (navigator.share) {
            // Mobile ke liye native share menu
            await navigator.share(shareData);
        } else {
            // Agar browser support nahi karta, toh link copy kar lo
            navigator.clipboard.writeText(shareData.url);
            alert("Link copy ho gaya, boss! Ab kahin bhi paste karo.");
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
}