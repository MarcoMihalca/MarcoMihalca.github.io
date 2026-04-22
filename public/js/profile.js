// ============ AUTENTIFICARE & INITIALIZARE ============
// ============ AUTENTIFICARE & INITIALIZARE ============
const cachedUser = sessionStorage.getItem('facturio_user');
if (cachedUser) {
    document.getElementById('displayUser').textContent = cachedUser;
    document.getElementById('profileUsername').textContent = cachedUser;
}

fetch('/api/me')
    .then(r => { if (!r.ok) window.location.href = '/login.html'; return r.json(); })
    .then(data => { 
        if (data.username) {
            sessionStorage.setItem('facturio_user', data.username);
            document.getElementById('displayUser').textContent = data.username; 
            document.getElementById('profileUsername').textContent = data.username;
        }
    })
    .catch(() => window.location.href = '/login.html');

document.getElementById('btnLogout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// ============ TOAST ============
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ============ GESTIUNE AVATAR ============
const avatarInput = document.getElementById('avatarInput');
const btnRemoveAvatar = document.getElementById('btnRemoveAvatar');
const profileAvatarPreview = document.getElementById('profileAvatarPreview');

function loadAvatar() {
    fetch('/api/avatar').then(r => {
        if (r.ok) {
            const v = localStorage.getItem('avatar_v') || '1';
            const imgHtml = `<img src="/api/avatar?v=${v}" alt="Avatar">`;
            profileAvatarPreview.innerHTML = imgHtml;
            
            // Actualizează și navbar
            const navAvatar = document.querySelector('.user-avatar');
            if (navAvatar) navAvatar.innerHTML = imgHtml;
            
            const btnContainer = document.getElementById('btnRemoveAvatarContainer');
            if (btnContainer) btnContainer.style.display = 'flex';
        } else {
            profileAvatarPreview.innerHTML = '<span class="profile-placeholder">👤</span>';
            const navAvatar = document.querySelector('.user-avatar');
            if (navAvatar) navAvatar.innerHTML = '👤';
            
            const btnContainer = document.getElementById('btnRemoveAvatarContainer');
            if (btnContainer) btnContainer.style.display = 'none';
        }
    });
}
loadAvatar();

avatarInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append('avatar', e.target.files[0]);

    try {
        const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('avatar_v', Date.now());
            showToast('Poză de profil actualizată!');
            loadAvatar();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Eroare la încărcare avatar.', 'error');
    }
});

btnRemoveAvatar.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/avatar', { method: 'DELETE' });
        if (res.ok) {
            showToast('Poza de profil a fost ștearsă.');
            avatarInput.value = '';
            loadAvatar();
        }
    } catch (err) {
        showToast('Eroare la ștergere avatar.', 'error');
    }
});

// ============ GESTIUNE LOGO STANDARD ============
const standardLogoInput = document.getElementById('standardLogoInput');
const btnRemoveStandardLogo = document.getElementById('btnRemoveStandardLogo');
const standardLogoPreview = document.getElementById('standardLogoPreview');

function loadStandardLogo() {
    fetch('/api/standard-logo').then(r => {
        if (r.ok) {
            const v = localStorage.getItem('std_logo_v') || '1';
            standardLogoPreview.innerHTML = `<img src="/api/standard-logo?v=${v}" alt="Logo Standard">`;
            btnRemoveStandardLogo.style.display = 'inline-flex';
        } else {
            standardLogoPreview.innerHTML = `<span class="logo-placeholder">🖼️</span><span class="logo-text">Fără logo</span>`;
            btnRemoveStandardLogo.style.display = 'none';
        }
    });
}
loadStandardLogo();

standardLogoInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append('standard_logo', e.target.files[0]);

    try {
        const res = await fetch('/api/upload-standard-logo', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('std_logo_v', Date.now());
            showToast('Logo standard salvat cu succes!');
            loadStandardLogo();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Eroare la încărcare logo.', 'error');
    }
});

btnRemoveStandardLogo.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/standard-logo', { method: 'DELETE' });
        if (res.ok) {
            showToast('Logo standard șters.');
            standardLogoInput.value = '';
            loadStandardLogo();
        }
    } catch (err) {
        showToast('Eroare la ștergere logo.', 'error');
    }
});
