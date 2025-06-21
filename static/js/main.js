// ✅ Initialize cart from localStorage (for sync and count)
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
updateCartCount();

// ✅ Update cart count badge
function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = cart.length;
}

// ✅ Add product to cart (server + local)
function addToCart(productName, price, imageUrl) {
    const item = {
        name: productName,
        price: price,
        quantity: 1,
        image: imageUrl
    };

    fetch('/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    })
    .then(res => {
        if (res.status === 401) {
            alert("🚫 Please log in to add items to your cart.");
            window.location.href = "/login";
            return;
        }
        return res.json();
    })
    .then(data => {
        if (data && data.success) {
            cart.push(item);
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            showToast(`✅ ${productName} added to cart!`);
        } else if (data && data.error) {
            alert(`❌ Failed: ${data.error}`);
        }
    })
    .catch(err => {
        console.error(err);
        alert("⚠️ Could not connect to server. Try again.");
    });
}

// ✅ Show a toast-style message (non-blocking)
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ✅ Search products
function searchProduct() {
    let query = document.getElementById("search-bar").value.toLowerCase();
    let products = document.querySelectorAll(".product");

    products.forEach(product => {
        let name = product.getAttribute("data-name").toLowerCase();
        product.style.display = name.includes(query) ? "block" : "none";
    });
}

// ✅ Toggle login/signup form (header mode)
function toggleForm() {
    const form = document.getElementById("form-container");
    if (form) {
        form.style.display = (form.style.display === "block") ? "none" : "block";
    }
}

function switchForm() {
    isLogin = !isLogin;
    document.getElementById("form-title").textContent = isLogin ? "Log in" : "Create account";
    document.querySelector(".btn").textContent = isLogin ? "Log in" : "Create account";
    document.getElementById("switch-link").textContent = isLogin ? "Sign up" : "Log in";
}

function togglePassword() {
    const passwordField = document.getElementById("password");
    if (passwordField) {
        passwordField.type = (passwordField.type === "password") ? "text" : "password";
    }
}

// ✅ Optional: Hide taskbar if used
function hideTaskbar() {
    const taskbar = document.getElementById("taskbar");
    const formContainer = document.getElementById("form-container");
    if (taskbar) taskbar.style.display = "none";
    if (formContainer) formContainer.style.display = "none";
}

// ✅ Hide form when clicking outside
document.addEventListener("click", function(event) {
    const form = document.getElementById("form-container");
    const userIcon = document.querySelector(".user-icon");

    if (form && userIcon && !form.contains(event.target) && !userIcon.contains(event.target)) {
        form.style.display = "none";
    }
});

// ✅ Optional: Show category alert
function showProducts(category) {
    alert("Showing products for: " + category);
}

// ✅ Remove header login form if already logged in
const isLoggedIn = document.body.dataset.loggedIn === 'true';
if (isLoggedIn) {
    document.getElementById('form-container')?.remove();
}


function closeModal() {
        document.getElementById('welcome-modal').style.display = 'none';
        // Remove ?new=1 from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
        document.getElementById('welcome-modal').style.display = 'block';
    }

