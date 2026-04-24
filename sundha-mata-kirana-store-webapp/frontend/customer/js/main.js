// Check for existing user
window.onload = () => {
    if(localStorage.getItem('customerData')) {
        window.location.href = 'home.html';
    }
};

const phoneInput = document.getElementById('phoneNumber');
const continueBtn = document.getElementById('continueBtn');
const form = document.getElementById('loginForm');
const addressArea = document.getElementById('fullAddress');

// Numeric only for phone
phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    validateForm();
});

// Character count for address
addressArea.addEventListener('input', (e) => {
    document.getElementById('charCount').innerText = `${e.target.value.length}/120`;
    validateForm();
});

function validateForm() {
    const isNameValid = document.getElementById('fullName').value.trim().length > 2;
    const isPhoneValid = phoneInput.value.length === 10;
    const isAddrValid = addressArea.value.trim().length > 10;

    if(isNameValid && isPhoneValid && isAddrValid) {
        continueBtn.disabled = false;
        continueBtn.classList.replace('bg-slate-200', 'bg-orange-500');
    } else {
        continueBtn.disabled = true;
        continueBtn.classList.replace('bg-orange-500', 'bg-slate-200');
    }
}



continueBtn.onclick = async (e) => {
    e.preventDefault(); // Ye refresh rokega
    
    const userData = {
        name: document.getElementById('fullName').value,
        phone: phoneInput.value,
        profession: document.getElementById('profession').value,
        state: "Gujarat",
        city: "Ahmedabad",
        pincode: "380005",
        address: addressArea.value
    };

    console.log("Sending Data:", userData); // Check karne ke liye

    try {
        const response = await registerUser(userData);
        if(response.success) {
            localStorage.setItem('customerData', JSON.stringify(userData));
            window.location.href = 'home.html';
        }
    } catch (error) {
        console.error("Login Error:", error);
        phoneInput.parentElement.classList.add('shake');
        setTimeout(() => phoneInput.parentElement.classList.remove('shake'), 400);
        alert("Registration Failed! Backend check karo boss.");
    }
};

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};