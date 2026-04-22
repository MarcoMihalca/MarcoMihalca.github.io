const introCard = document.getElementById('introCard');
const formCard = document.getElementById('formCard');
const btnGoLogin = document.getElementById('btnGoLogin');
const btnGoRegister = document.getElementById('btnGoRegister');
const btnBackToIntro = document.getElementById('btnBackToIntro');

const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');
const btnLogin = document.getElementById('btnLogin');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const rememberMeContainer = document.querySelector('.remember-me');
const formSubtitle = document.getElementById('formSubtitle');
const forgotLink = document.querySelector('.forgot-link');

let isRegisterMode = false;

// --- NAVIGATION LOGIC ---

btnGoLogin.addEventListener('click', () => {
    isRegisterMode = false;
    setupFormUI();
    
    // Animate out intro
    introCard.classList.remove('slide-in-left');
    introCard.classList.add('slide-out-left');
    
    // Animate in form synchronously
    formCard.style.display = 'block';
    formCard.classList.remove('slide-out-right');
    formCard.classList.add('slide-in-right');
    
    setTimeout(() => {
        introCard.style.display = 'none';
        document.getElementById('username').focus();
    }, 500);
});

btnGoRegister.addEventListener('click', () => {
    isRegisterMode = true;
    setupFormUI();
    
    // Animate out intro
    introCard.classList.remove('slide-in-left');
    introCard.classList.add('slide-out-left');
    
    // Animate in form synchronously
    formCard.style.display = 'block';
    formCard.classList.remove('slide-out-right');
    formCard.classList.add('slide-in-right');
    
    setTimeout(() => {
        introCard.style.display = 'none';
        document.getElementById('username').focus();
    }, 500);
});

btnBackToIntro.addEventListener('click', (e) => {
    e.preventDefault();
    errorMsg.classList.remove('show');
    
    // Animate out form
    formCard.classList.remove('slide-in-right');
    formCard.classList.add('slide-out-right');
    
    // Animate in intro synchronously
    introCard.style.display = 'block';
    introCard.classList.remove('slide-out-left');
    introCard.classList.add('slide-in-left');
    
    setTimeout(() => {
        formCard.style.display = 'none';
    }, 500);
});

function setupFormUI() {
    errorMsg.classList.remove('show');
    passwordInput.value = '';
    
    if (isRegisterMode) {
        document.title = 'Facturio — Creează Cont Nou';
        formSubtitle.textContent = 'Creează un cont pentru a continua';
        btnLogin.querySelector('span').textContent = 'Creează Cont Nou →';
        rememberMeContainer.style.display = 'none';
        if (forgotLink) forgotLink.style.display = 'none';
    } else {
        document.title = 'Facturio — Autentificare';
        formSubtitle.textContent = 'Autentifică-te pentru a continua';
        btnLogin.querySelector('span').textContent = 'Intră în cont →';
        rememberMeContainer.style.display = 'flex';
        if (forgotLink) forgotLink.style.display = 'inline';
    }
}

// --- FORM LOGIC ---

// Toggle vizibilitate parolă
togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.textContent = isPassword ? '🙈' : '👁️';
});

// Submit formular
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError('Completează toate câmpurile.');
        return;
    }

    // Loading state
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
    errorMsg.classList.remove('show');

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Animație succes
            btnLogin.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            btnLogin.innerHTML = `<span>✓ ${isRegisterMode ? 'Cont creat!' : 'Autentificat!'}</span>`;
            
            // Declanșare animație ieșire pentru panou
            formCard.classList.add('login-success-out');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } else {
            showError(data.message || 'Eroare.');
            btnLogin.classList.remove('loading');
            btnLogin.disabled = false;
            btnLogin.querySelector('span').textContent = isRegisterMode ? 'Creează Cont Nou →' : 'Intră în cont →';
        }
    } catch (err) {
        showError('Eroare de conexiune. Încearcă din nou.');
        btnLogin.classList.remove('loading');
        btnLogin.disabled = false;
        btnLogin.querySelector('span').textContent = isRegisterMode ? 'Creează Cont Nou →' : 'Intră în cont →';
    }
});

function showError(msg) {
    errorText.textContent = msg;
    errorMsg.classList.remove('show');
    // Force reflow pentru restart animație
    void errorMsg.offsetWidth;
    errorMsg.classList.add('show');
}
