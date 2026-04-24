// C:\Users\HP\Documents\sundha-mata-kirana-store-webapp\frontend\customer\js\api.js

const BASE_URL = "/api";

// ✅ Bas itna — floating fetch hata do
const API = {


    // Customer Registration
    registerCustomer: async (userData) => {
        try {
            const response = await fetch(`${BASE_URL}/customer/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: "Server unreachable" };
        }
    },

    // Owner Login
    ownerLogin: async (credentials) => {
        try {
            const response = await fetch(`${BASE_URL}/owner/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(credentials)
            });
            return await response.json();
        } catch (error) {
            console.error("Owner API Error:", error);
            return { status: "error", message: "Server unreachable" };
        }
    }
};

// Global function taaki main.js use kar sake
async function registerUser(data) {
    const result = await API.registerCustomer(data);
    if (result.status === "success") {
        return { success: true };
    } else {
        throw new Error(result.message);
    }
}

// Kisi bhi screen (home/cart/update) ke top par ye script daal do
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
    // Jab bhi user back kare, use seedha Home par bhejo
    window.location.href = 'home.html'; 
};

