// ============ PREVIEW LOGIC ============
const previewPanel = document.getElementById('previewPanel');
const previewContent = document.getElementById('previewContent');
const btnTogglePreview = document.getElementById('btnTogglePreview');
const btnFloatPreview = document.getElementById('btnFloatPreview');

// Mobile toggles
if (btnTogglePreview) {
    btnTogglePreview.addEventListener('click', () => {
        previewPanel.classList.remove('open');
    });
}
if (btnFloatPreview) {
    btnFloatPreview.addEventListener('click', () => {
        previewPanel.classList.add('open');
        updatePreview();
    });
}

// Desktop toggle
const desktopPreviewToggle = document.getElementById('desktopPreviewToggle');
if (desktopPreviewToggle) {
    desktopPreviewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            previewPanel.classList.remove('hide-desktop');
        } else {
            previewPanel.classList.add('hide-desktop');
        }
    });
}

function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const updatePreview = debounce(async () => {
    // Verificăm dacă panoul de preview este vizibil sau pe desktop (nu are clasa 'open' pe mobil dar pe desktop e mereu vizibil de fapt...
    // Dar hai să facem update oricum
    if (!window.gatherPayload) return;
    
    let payload;
    try {
        payload = window.gatherPayload();
    } catch(e) { return; }

    const curLogo = document.querySelector('#logoPreview img')?.src || '';

    // HTML replica of the PDF
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    ${curLogo ? `<img src="${curLogo}" style="max-width: 60px; max-height: 50px;">` : `<div style="font-size: 20px; font-weight: bold; color: #ccc;">FACTURIO</div>`}
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 18px; color: #333;">FACTURĂ</h1>
                    <p style="margin: 4px 0 0; font-size: 10px; color: #666;">Seria: ${payload.serie || '—'}  |  Nr.: ${payload.numar || '—'}</p>
                    <p style="margin: 2px 0 0; font-size: 10px; color: #666;">Data: ${payload.dataEmitere || '—'}</p>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 15px;">
                <div style="width: 45%;">
                    <h3 style="margin: 0 0 6px; font-size: 11px; color: #333;">FURNIZOR</h3>
                    <p style="margin: 2px 0;"><strong>${payload.furnizor.nume || '—'}</strong></p>
                    <p style="margin: 2px 0;">CUI: ${payload.furnizor.cui || '—'}</p>
                    <p style="margin: 2px 0;">Reg. Com: ${payload.furnizor.regCom || '—'}</p>
                    <p style="margin: 2px 0;">Str: ${payload.furnizor.adresa || '—'}</p>
                </div>
                <div style="width: 45%;">
                    <h3 style="margin: 0 0 6px; font-size: 11px; color: #333;">CLIENT</h3>
                    <p style="margin: 2px 0;"><strong>${payload.client.nume || '—'}</strong></p>
                    <p style="margin: 2px 0;">CUI: ${payload.client.cui || '—'}</p>
                    <p style="margin: 2px 0;">Reg. Com: ${payload.client.regCom || '—'}</p>
                    <p style="margin: 2px 0;">Str: ${payload.client.adresa || '—'}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 20px;">
                <thead>
                    <tr style="border-bottom: 1px solid #aaa; text-align: left;">
                        <th style="padding: 4px 2px;">Denumire</th>
                        <th style="padding: 4px 2px;">UM</th>
                        <th style="padding: 4px 2px;">Cant.</th>
                        <th style="padding: 4px 2px;">Preț</th>
                        <th style="padding: 4px 2px;">TVA</th>
                        <th style="padding: 4px 2px; text-align: right;">Valoare</th>
                    </tr>
                </thead>
                <tbody>
                    ${payload.produse.map(p => {
                        let sub = 0, tva = 0, tot = 0;
                        if (payload.pretCuTVA) {
                            const brut = p.cantitate * p.pretUnitar;
                            sub = brut / (1 + p.tvaPercent / 100);
                            tva = brut - sub;
                            tot = brut;
                        } else {
                            sub = p.cantitate * p.pretUnitar;
                            tva = sub * (p.tvaPercent / 100);
                            tot = sub + tva;
                        }

                        let res = `
                            <tr>
                                <td style="padding: 6px 2px; font-weight: bold;">${p.denumire || '—'}</td>
                                <td style="padding: 6px 2px;">${p.um}</td>
                                <td style="padding: 6px 2px;">${p.cantitate}</td>
                                <td style="padding: 6px 2px;">${p.pretUnitar.toFixed(2)}</td>
                                <td style="padding: 6px 2px;">${p.tvaPercent}%</td>
                                <td style="padding: 6px 2px; text-align: right;">${tot.toFixed(2)}</td>
                            </tr>
                        `;
                        if (p.descriere) {
                            res += `<tr><td colspan="6" style="padding: 0 2px 8px; color: #666; font-style: italic;">${p.descriere.replace(/\n/g, '<br>')}</td></tr>`;
                        } else {
                            res += `<tr><td colspan="6" style="padding-bottom: 2px; border-bottom: 1px dashed #eee;"></td></tr>`;
                        }
                        return res;
                    }).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 200px; text-align: right; border-top: 1px solid #aaa; padding-top: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px;">
                        <span style="color: #666;">Subtotal f. TVA:</span>
                        <span>${document.getElementById('subtotalDisplay').textContent}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px;">
                        <span style="color: #666;">Total TVA:</span>
                        <span>${document.getElementById('tvaDisplay').textContent}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; font-weight: bold; border-top: 1px solid #eee; padding-top: 6px;">
                        <span>TOTAL PLATA:</span>
                        <span>${document.getElementById('totalDisplay').textContent}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('previewContent').innerHTML = html;

}, 400);

window.updatePreview = updatePreview;

// Initializare
setTimeout(updatePreview, 500);
