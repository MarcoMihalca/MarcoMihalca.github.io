// ============ AUTENTIFICARE ============
// ============ AUTENTIFICARE ============
const cachedUser = sessionStorage.getItem('facturio_user');
if (cachedUser) document.getElementById('displayUser').textContent = cachedUser;

fetch('/api/me')
    .then(r => { if (!r.ok) window.location.href = '/login.html'; return r.json(); })
    .then(data => { 
        if (data.username) {
            sessionStorage.setItem('facturio_user', data.username);
            document.getElementById('displayUser').textContent = data.username; 
        }
        fetch('/api/avatar').then(res => {
            if (res.ok) {
                const avatarEl = document.querySelector('.user-avatar');
                const v = localStorage.getItem('avatar_v') || '1';
                if (avatarEl) avatarEl.innerHTML = `<img src="/api/avatar?v=${v}" alt="Avatar">`;
            }
        });
    })
    .catch(() => window.location.href = '/login.html');

document.getElementById('btnLogout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// ============ DATE IMPLICITE ============
const today = new Date();
document.getElementById('dataEmitere').value = today.toISOString().split('T')[0];
const scadenta = new Date(today);
scadenta.setDate(scadenta.getDate() + 30);
document.getElementById('dataScadenta').value = scadenta.toISOString().split('T')[0];

const savedNumber = localStorage.getItem('facturio_lastNumber');
document.getElementById('numarFact').value = String(savedNumber ? parseInt(savedNumber) + 1 : 1).padStart(4, '0');

// ============ TOAST ============
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ============ LOGO UPLOAD ============
const logoInput = document.getElementById('logoInput');
const btnRemoveLogo = document.getElementById('btnRemoveLogo');
const logoPreview = document.getElementById('logoPreview');

// Verifică dacă există logo deja
fetch('/api/logo').then(r => {
    if (r.ok) {
        const v = localStorage.getItem('logo_v') || '1';
        logoPreview.innerHTML = `<img src="/api/logo?v=${v}" alt="Logo Temporar">`;
        btnRemoveLogo.style.display = 'inline-flex';
    } else {
        // Caută logo standard dacă nu există unul temporar
        fetch('/api/standard-logo').then(r2 => {
            if (r2.ok) {
                const v2 = localStorage.getItem('std_logo_v') || '1';
                logoPreview.innerHTML = `<img src="/api/standard-logo?v=${v2}" alt="Logo Standard">`;
                // Nu arătăm btnRemoveLogo pentru cel standard, acesta se gestionează din Profil
            }
        });
    }
});

logoInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append('logo', e.target.files[0]);

    try {
        const res = await fetch('/api/upload-logo', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            const v = Date.now();
            localStorage.setItem('logo_v', v);
            logoPreview.innerHTML = `<img src="${data.path}?v=${v}" alt="Logo">`;
            btnRemoveLogo.style.display = 'inline-flex';
            showToast('Logo încărcat cu succes!');
            if (window.updatePreview) window.updatePreview();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Eroare la încărcare.', 'error');
    }
});

btnRemoveLogo.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/logo', { method: 'DELETE' });
        if (res.ok) {
            logoPreview.innerHTML = `<span class="logo-placeholder">🖼️</span><span class="logo-text">Logo companie</span>`;
            btnRemoveLogo.style.display = 'none';
            logoInput.value = '';
            showToast('Logo șters.');
            if (window.updatePreview) window.updatePreview();
        }
    } catch (err) {
        showToast('Eroare la ștergere.', 'error');
    }
});

// ============ TABEL PRODUSE ============
let rowCounter = 0;

function addProductRow(data = {}) {
    rowCounter++;
    const tbody = document.getElementById('productRows');
    const tr = document.createElement('tr');
    tr.id = `row-${rowCounter}`;
    tr.innerHTML = `
        <td>
            <input type="text" name="denumire" placeholder="Denumire produs" value="${data.denumire || ''}" required>
            <textarea name="descriere" class="item-desc" placeholder="Descriere suplimentară (opțional)" rows="1">${data.descriere || ''}</textarea>
        </td>
        <td>
            <select name="um">
                <option value="buc" ${data.um === 'buc' ? 'selected' : ''}>buc</option>
                <option value="kg" ${data.um === 'kg' ? 'selected' : ''}>kg</option>
                <option value="l" ${data.um === 'l' ? 'selected' : ''}>l</option>
                <option value="m" ${data.um === 'm' ? 'selected' : ''}>m</option>
                <option value="mp" ${data.um === 'mp' ? 'selected' : ''}>mp</option>
                <option value="ore" ${data.um === 'ore' ? 'selected' : ''}>ore</option>
                <option value="set" ${data.um === 'set' ? 'selected' : ''}>set</option>
            </select>
        </td>
        <td>
            <input type="number" name="cantitate" min="0.01" step="0.01" value="${data.cantitate || 1}" required>
        </td>
        <td>
            <input type="number" name="pretUnitar" min="0" step="0.01" value="${data.pretUnitar || ''}" placeholder="0.00" required>
        </td>
        <td style="display: flex; gap: 4px; align-items: center;">
            <select name="tvaPercentSelect" onchange="window.handleTvaChange(this)">
                <option value="19" ${data.tvaPercent === 19 || data.tvaPercent === undefined ? 'selected' : ''}>19%</option>
                <option value="9" ${data.tvaPercent === 9 ? 'selected' : ''}>9%</option>
                <option value="5" ${data.tvaPercent === 5 ? 'selected' : ''}>5%</option>
                <option value="0" ${data.tvaPercent === 0 ? 'selected' : ''}>0%</option>
                <option value="custom" ${data.tvaPercent !== undefined && ![0, 5, 9, 19].includes(parseFloat(data.tvaPercent)) ? 'selected' : ''}>Custom</option>
            </select>
            <input type="number" name="tvaPercentCustom" min="0" step="0.1" placeholder="%" 
                   style="display: ${data.tvaPercent !== undefined && ![0, 5, 9, 19].includes(parseFloat(data.tvaPercent)) ? 'block' : 'none'}; width: 60px;" 
                   value="${![0, 5, 9, 19].includes(parseFloat(data.tvaPercent)) ? data.tvaPercent : ''}">
        </td>
        <td class="row-total" id="rowTotal-${rowCounter}">0.00</td>
        <td>
            <button type="button" class="btn-remove-row" onclick="removeRow('row-${rowCounter}')">✕</button>
        </td>
    `;
    tbody.appendChild(tr);

    tr.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => {
            recalculate();
            if (window.updatePreview) window.updatePreview();
        });
    });

    recalculate();
}

function removeRow(id) {
    const tbody = document.getElementById('productRows');
    if (tbody.children.length <= 1) return;
    document.getElementById(id).remove();
    recalculate();
    if (window.updatePreview) window.updatePreview();
}

// Handler pentru Custom TVA
window.handleTvaChange = function(selectEl) {
    const customInput = selectEl.nextElementSibling;
    if (selectEl.value === 'custom') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
    recalculate();
    if (window.updatePreview) window.updatePreview();
};

// TVA Toggle
const tvaToggle = document.getElementById('pretCuTVA');
const tvaToggleWrapper = document.getElementById('tvaToggleWrapper');
const tvaToggleHint = document.getElementById('tvaToggleHint');

tvaToggle.addEventListener('change', () => {
    if (tvaToggle.checked) {
        tvaToggleWrapper.classList.add('active');
        tvaToggleHint.textContent = 'TVA-ul va fi extras din prețul introdus';
    } else {
        tvaToggleWrapper.classList.remove('active');
        tvaToggleHint.textContent = 'TVA-ul va fi adăugat la prețul introdus';
    }
    recalculate();
    if (window.updatePreview) window.updatePreview();
});

// Calcul totaluri
function recalculate() {
    let subtotal = 0;
    let totalTVA = 0;
    const inclTVA = tvaToggle.checked;

    const rows = document.querySelectorAll('#productRows tr');
    rows.forEach(row => {
        const cantitate = parseFloat(row.querySelector('[name="cantitate"]').value) || 0;
        const pretUnitar = parseFloat(row.querySelector('[name="pretUnitar"]').value) || 0;
        
        let tvaPercent = 0;
        const tvaSelectOption = row.querySelector('[name="tvaPercentSelect"]').value;
        if (tvaSelectOption === 'custom') {
            tvaPercent = parseFloat(row.querySelector('[name="tvaPercentCustom"]').value) || 0;
        } else {
            tvaPercent = parseFloat(tvaSelectOption) || 0;
        }

        let valoareFaraTVA, tva;
        if (inclTVA) {
            const totalBrut = cantitate * pretUnitar;
            valoareFaraTVA = totalBrut / (1 + tvaPercent / 100);
            tva = totalBrut - valoareFaraTVA;
        } else {
            valoareFaraTVA = cantitate * pretUnitar;
            tva = valoareFaraTVA * (tvaPercent / 100);
        }

        subtotal += valoareFaraTVA;
        totalTVA += tva;

        const totalCell = row.querySelector('.row-total');
        if (totalCell) {
            totalCell.textContent = (valoareFaraTVA + tva).toFixed(2);
        }
    });

    const total = subtotal + totalTVA;
    document.getElementById('subtotalDisplay').textContent = `${subtotal.toFixed(2)} RON`;
    document.getElementById('tvaDisplay').textContent = `${totalTVA.toFixed(2)} RON`;
    document.getElementById('totalDisplay').textContent = `${total.toFixed(2)} RON`;
}

addProductRow();
document.getElementById('btnAddRow').addEventListener('click', () => addProductRow());

// ============ COLECTARE PAYLOAD ============
function gatherPayload() {
    const produse = [];
    document.querySelectorAll('#productRows tr').forEach(row => {
        let tvaPercent = 0;
        const tvaSelectOption = row.querySelector('[name="tvaPercentSelect"]').value;
        if (tvaSelectOption === 'custom') {
            tvaPercent = parseFloat(row.querySelector('[name="tvaPercentCustom"]').value) || 0;
        } else {
            tvaPercent = parseFloat(tvaSelectOption) || 0;
        }

        produse.push({
            denumire: row.querySelector('[name="denumire"]').value,
            descriere: row.querySelector('[name="descriere"]').value,
            um: row.querySelector('[name="um"]').value,
            cantitate: parseFloat(row.querySelector('[name="cantitate"]').value) || 0,
            pretUnitar: parseFloat(row.querySelector('[name="pretUnitar"]').value) || 0,
            tvaPercent: tvaPercent,
        });
    });

    return {
        serie: document.getElementById('serieFact').value,
        numar: document.getElementById('numarFact').value,
        dataEmitere: document.getElementById('dataEmitere').value,
        dataScadenta: document.getElementById('dataScadenta').value,
        furnizor: {
            nume: document.getElementById('furnNume').value,
            cui: document.getElementById('furnCUI').value,
            regCom: document.getElementById('furnRegCom').value,
            adresa: document.getElementById('furnAdresa').value,
            iban: document.getElementById('furnIBAN').value,
            banca: document.getElementById('furnBanca').value,
        },
        client: {
            nume: document.getElementById('clientNume').value,
            cui: document.getElementById('clientCUI').value,
            regCom: document.getElementById('clientRegCom').value,
            adresa: document.getElementById('clientAdresa').value,
            email: document.getElementById('clientEmail').value,
        },
        produse,
        pretCuTVA: document.getElementById('pretCuTVA').checked,
    };
}

// Salvează factura în istoric (în DB)
async function saveToHistory(payload) {
    try {
        await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.error('Nu am putut salva factura în istoric', e);
    }
}

// ============ DESCARCĂ PDF ============
document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = gatherPayload();

    const btn = document.getElementById('btnGenerate');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Se generează...</span>';

    try {
        await saveToHistory(payload);

        const res = await fetch('/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${payload.serie}${payload.numar}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        localStorage.setItem('facturio_lastNumber', parseInt(payload.numar));
        showToast('Document PDF descărcat!');
    } catch (err) {
        showToast('Eroare la generarea PDF.', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
});

// ============ EXPORT XML E-FACTURA ============
document.getElementById('btnExportXml').addEventListener('click', async () => {
    if (!document.getElementById('invoiceForm').checkValidity()) {
        document.getElementById('invoiceForm').reportValidity();
        return;
    }

    const payload = gatherPayload();
    const btn = document.getElementById('btnExportXml');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Se exportă...</span>';

    try {
        await saveToHistory(payload);

        const res = await fetch('/api/export-xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `efactura_${payload.serie}${payload.numar}.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('XML exportat cu succes!');
    } catch (err) {
        showToast('Eroare la exportul XML.', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
});

// ============ TRIMITE EMAIL ============
document.getElementById('btnSendEmail').addEventListener('click', async () => {
    if (!document.getElementById('invoiceForm').checkValidity()) {
        document.getElementById('invoiceForm').reportValidity();
        return;
    }

    const payload = gatherPayload();
    if (!payload.client.email) {
        showToast('Completează adresa de email a clientului!', 'error');
        document.getElementById('clientEmail').focus();
        return;
    }

    const btn = document.getElementById('btnSendEmail');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ Se trimite...</span>';

    try {
        await saveToHistory(payload);

        const res = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: payload.client.email, invoiceData: payload }),
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.message);
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Eroare rețea.', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
});

// ============ EVENIMENTE PREVIEW ============
const inputs = document.querySelectorAll('#invoiceForm input');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        if (window.updatePreview) window.updatePreview();
    });
});
