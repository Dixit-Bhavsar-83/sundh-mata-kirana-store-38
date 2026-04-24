// Auth Logic with Auto-Login Feature

document.addEventListener("DOMContentLoaded", () => {
    // 🔥 AUTO-LOGIN CHECK: Agar pehle se login hai toh dashboard pe bhej do
    const isLoggedIn = localStorage.getItem("isOwnerLoggedIn");
    if (isLoggedIn === "true") {
        window.location.href = "../owner/dashboard.html";
    }
});

document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMessage");
    const loginBtn = document.getElementById("loginBtn");

    // UI Feedback
    loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> VERIFYING...`;
    loginBtn.disabled = true;

    try {
        const res = await fetch("/api/owner/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include", 
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await res.json();

        if (res.ok && data.status === "success") {
            // 🔥 SESSION SAVE: Browser ko batao ki owner login ho chuka hai
            localStorage.setItem("isOwnerLoggedIn", "true");
            localStorage.setItem("ownerUsername", username); // Baad mein use karne ke liye
            
            window.location.href = "../owner/dashboard.html"; 
        } else {
            errorMsg.classList.remove("hidden");
            loginBtn.innerHTML = `LOGIN TO DASHBOARD <i class="fa-solid fa-arrow-right-long text-orange-500"></i>`;
            loginBtn.disabled = false;
        }

    } catch (err) {
        console.error("Login Error:", err);
        errorMsg.innerText = "SERVER ERROR. CHECK BACKEND!";
        errorMsg.classList.remove("hidden");
        loginBtn.innerHTML = `LOGIN TO DASHBOARD`;
        loginBtn.disabled = false;
    }
});

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};