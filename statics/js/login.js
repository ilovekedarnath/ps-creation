document.addEventListener("DOMContentLoaded", () => {
    // 🔁 Auto-show signup form if Flask sets `window.showSignup = true`
    if (window.showSignup === true) {
        toggleForm('signup');
    } else {
        toggleForm('login');
    }
});

// 🔀 Toggle between Login and Signup forms
function toggleForm(mode = 'login') {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const title = document.getElementById('form-title');
    const switchText = document.getElementById('switch-text');
    const strengthMsg = document.getElementById('strength-msg');
    const checklist = document.getElementById('password-checklist');

    if (mode === 'signup') {
        loginForm.style.display = "none";
        signupForm.style.display = "block";
        title.textContent = "Sign Up";
        switchText.textContent = "Already have an account? Login";
        switchText.onclick = () => toggleForm('login');
        strengthMsg.textContent = '';
        checklist.style.display = 'block';
    } else {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        title.textContent = "Login";
        switchText.textContent = "Don't have an account? Sign Up";
        switchText.onclick = () => toggleForm('signup');
        strengthMsg.textContent = '';
        checklist.style.display = 'none';
    }
}

// 👁️ Toggle password visibility
function toggleVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.type = field.type === 'password' ? 'text' : 'password';
}

// ✅ Validate password strength in real-time
function checkPasswordStrength(password) {
    const msg = document.getElementById('strength-msg');
    const signupBtn = document.getElementById('signup-btn');
    const checklist = document.getElementById('password-checklist');

    if (!msg || !signupBtn || !checklist) return;

    checklist.style.display = 'block'; // show checklist while typing

    const hasLength = password.length >= 6;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[\W_]/.test(password);

    document.getElementById('check-length').textContent = `${hasLength ? '✅' : '❌'} At least 6 characters`;
    document.getElementById('check-uppercase').textContent = `${hasUpper ? '✅' : '❌'} Contains uppercase letter`;
    document.getElementById('check-lowercase').textContent = `${hasLower ? '✅' : '❌'} Contains lowercase letter`;
    document.getElementById('check-number').textContent = `${hasNumber ? '✅' : '❌'} Contains a number`;
    document.getElementById('check-symbol').textContent = `${hasSymbol ? '✅' : '❌'} Contains a symbol`;

    const isStrong = hasLength && hasUpper && hasLower && hasNumber && hasSymbol;

    msg.textContent = isStrong ? "Strong password ✅" : "Please fulfill all conditions";
    msg.className = isStrong ? "strength-msg strong" : "strength-msg weak";

    signupBtn.disabled = !isStrong;
}
