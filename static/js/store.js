// ✅ Load cart from server on page load
document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-cart')
        .then(res => res.ok ? res.json() : Promise.reject('Not logged in'))
        .then(cart => {
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart(cart);
        })
        .catch(() => {
            alert("⚠️ Login required");
            window.location.href = "/login";
        });
});

// ✅ Render cart
function renderCart(cart) {
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('total-price');
    container.innerHTML = '';
    let total = 0;

    if (!cart || cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        totalElement.innerHTML = '<strong>Total: $0</strong>';
        updateCartCount(0);
        return;
    }

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${item.image}" width="50" class="product-img" />
            <span><strong>${item.name}</strong> - $${item.price} ×</span>
            <div class="quantity-controls">
                <button onclick="updateQuantity(${index}, -1)">➖</button>
                <input type="number" min="1" value="${item.quantity}" onchange="changeQuantity(${index}, this.value)">
                <button onclick="updateQuantity(${index}, 1)">➕</button>
            </div>
            <span>= $${(item.price * item.quantity).toFixed(2)}</span>
            <button class="remove-btn" onclick="removeItem(${index})">🗑 Remove</button>
        `;
        container.appendChild(li);
    });

    totalElement.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
    updateCartCount(cart.length);
}

// ✅ Update quantity (+/-)
function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart(cart);
        saveCartToServer(cart);
        updateCartCount(cart.length);
    }
}

// ✅ Update via input field
function changeQuantity(index, newQuantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        let quantity = parseInt(newQuantity);
        if (isNaN(quantity) || quantity <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = quantity;
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart(cart);
        saveCartToServer(cart);
        updateCartCount(cart.length);
    }
}

// ✅ Remove item
function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(cart);
    saveCartToServer(cart);
    updateCartCount(cart.length);
}

// ✅ Save cart to DB
function saveCartToServer(cart) {
    fetch('/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart)
    }).catch(err => console.error("⚠️ Sync error:", err));
}

// ✅ Clear cart
document.getElementById('clear-cart').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your cart?")) {
        fetch('/clear-cart', { method: 'POST' })
            .then(res => {
                if (res.ok) {
                    localStorage.removeItem('cart');
                    renderCart([]);
                    showToast("🧹 Cart cleared!");
                    updateCartCount(0);
                }
            }).catch(() => alert("❌ Failed to clear cart"));
    }
});

// ✅ Checkout
document.getElementById('checkout').addEventListener('click', () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert("🛒 Cart is empty!");
        return;
    }

    fetch('/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart)
    }).then(res => {
        if (res.ok) {
            showToast("✅ Cart saved. Checkout proceeding...");
        } else {
            alert("❌ Failed to save cart.");
        }
    });
});

// ✅ Toast utility
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

// ✅ Update cart badge
function updateCartCount(count) {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
}
