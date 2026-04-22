const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const requireAuth = require('../middleware/auth');

// Fonturi cu suport diacritice românești
const fontRegular = path.join(__dirname, '..', 'fonts', 'arial.ttf');
const fontBold = path.join(__dirname, '..', 'fonts', 'arialbd.ttf');

// Director uploads (pentru logo)
const uploadsDir = path.join(__dirname, '..', 'uploads');

function getLogoPath(userId) {
    const extensions = ['.png', '.jpg', '.jpeg'];
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `logo_${userId}${ext}`);
        if (fs.existsSync(filePath)) return filePath;
    }
    return null;
}

// Funcție comună pentru generare PDF (returnează Buffer)
function generatePdfBuffer(invoiceData, userId) {
    return new Promise((resolve, reject) => {
        const { serie, numar, dataEmitere, dataScadenta, furnizor, client, produse, pretCuTVA } = invoiceData;
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        doc.registerFont('Arial', fontRegular);
        doc.registerFont('Arial-Bold', fontBold);

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        buildPdfContent(doc, invoiceData, userId);
        doc.end();
    });
}

// Construiește conținutul PDF
function buildPdfContent(doc, data, userId) {
    const { serie, numar, dataEmitere, dataScadenta, furnizor, client, produse, pretCuTVA } = data;

    // --- LOGO + ANTET ---
    const logoPath = userId ? getLogoPath(userId) : null;
    if (logoPath) {
        try {
            doc.image(logoPath, 50, 45, { width: 70 });
            doc.fontSize(22).font('Arial-Bold').text('FACTUR\u0102', 130, 50, { align: 'center' });
        } catch(e) {
            doc.fontSize(22).font('Arial-Bold').text('FACTUR\u0102', { align: 'center' });
        }
    } else {
        doc.fontSize(22).font('Arial-Bold').text('FACTUR\u0102', { align: 'center' });
    }

    doc.moveDown(0.3);
    doc.fontSize(10).font('Arial')
       .text(`Seria: ${serie}  |  Nr.: ${numar}  |  Data emiterii: ${dataEmitere}  |  Scaden\u021ba: ${dataScadenta || '\u2014'}`, { align: 'center' });
    
    doc.moveDown(1);

    // --- FURNIZOR & CLIENT ---
    const startY = doc.y;
    const leftX = 50;
    const rightX = 310;

    doc.fontSize(11).font('Arial-Bold').text('FURNIZOR', leftX, startY);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Arial');
    doc.text(`${furnizor.nume || '\u2014'}`, leftX);
    doc.text(`CUI: ${furnizor.cui || '\u2014'}`, leftX);
    if (furnizor.regCom) doc.text(`Nr. Reg. Com.: ${furnizor.regCom}`, leftX);
    if (furnizor.adresa) doc.text(`Adresa: ${furnizor.adresa}`, leftX);
    if (furnizor.iban) doc.text(`IBAN: ${furnizor.iban}`, leftX);
    if (furnizor.banca) doc.text(`Banca: ${furnizor.banca}`, leftX);
    const furnizorEndY = doc.y;

    doc.fontSize(11).font('Arial-Bold').text('CLIENT', rightX, startY);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Arial');
    doc.text(`${client.nume || '\u2014'}`, rightX);
    doc.text(`CUI: ${client.cui || '\u2014'}`, rightX);
    if (client.regCom) doc.text(`Nr. Reg. Com.: ${client.regCom}`, rightX);
    if (client.adresa) doc.text(`Adresa: ${client.adresa}`, rightX);
    const clientEndY = doc.y;

    doc.y = Math.max(furnizorEndY, clientEndY) + 20;

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);

    // --- TABEL PRODUSE ---
    const tableTop = doc.y;
    const colX = [50, 220, 270, 310, 380, 430, 490];

    doc.fontSize(8).font('Arial-Bold').fillColor('#333333');
    doc.text('Denumire produs/serviciu', colX[0], tableTop);
    doc.text('U.M.', colX[1], tableTop);
    doc.text('Cant.', colX[2], tableTop);
    doc.text('Pre\u021b unit.', colX[3], tableTop);
    doc.text('Cot\u0103 TVA', colX[4], tableTop);
    doc.text('Val. TVA', colX[5], tableTop);
    doc.text('Valoare', colX[6], tableTop);

    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#999999').stroke();

    let y = tableTop + 20;
    let subtotal = 0;
    let totalTVA = 0;

    doc.font('Arial').fontSize(8).fillColor('#000000');

    (produse || []).forEach(p => {
        let valoareFaraTVA, tva, total;

        if (pretCuTVA) {
            const totalBrut = p.cantitate * p.pretUnitar;
            valoareFaraTVA = totalBrut / (1 + p.tvaPercent / 100);
            tva = totalBrut - valoareFaraTVA;
            total = totalBrut;
        } else {
            valoareFaraTVA = p.cantitate * p.pretUnitar;
            tva = valoareFaraTVA * (p.tvaPercent / 100);
            total = valoareFaraTVA + tva;
        }

        subtotal += valoareFaraTVA;
        totalTVA += tva;

        if (y > 700) {
            doc.addPage();
            y = 50;
        }

        doc.font('Arial').fontSize(8).fillColor('#000000');
        doc.text(p.denumire || '\u2014', colX[0], y, { width: 165 });
        doc.text(p.um || 'buc', colX[1], y);
        doc.text(String(p.cantitate), colX[2], y);
        doc.text(p.pretUnitar.toFixed(2), colX[3], y);
        doc.text(`${p.tvaPercent}%`, colX[4], y);
        doc.text(tva.toFixed(2), colX[5], y);
        doc.text(total.toFixed(2), colX[6], y);

        y += 16;

        // Descriere suplimentară (multi-line)
        if (p.descriere && p.descriere.trim()) {
            doc.fontSize(7).fillColor('#666666');
            const descHeight = doc.heightOfString(p.descriere, { width: 490 });
            doc.text(p.descriere, colX[0] + 8, y, { width: 490 });
            y += descHeight + 6;
        }

        y += 2;
    });

    // --- SEPARATOR ---
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 15;

    // --- TOTALURI ---
    const totalGeneral = subtotal + totalTVA;
    const totalsLabelX = 350;
    const totalsValueX = 470;
    const totalsValueW = 75;

    doc.fontSize(9).font('Arial').fillColor('#000000');
    doc.text('Total f\u0103r\u0103 TVA:', totalsLabelX, y, { width: 120 });
    doc.text(`${subtotal.toFixed(2)} RON`, totalsValueX, y, { width: totalsValueW, align: 'right' });
    y += 18;

    doc.text('Total TVA:', totalsLabelX, y, { width: 120 });
    doc.text(`${totalTVA.toFixed(2)} RON`, totalsValueX, y, { width: totalsValueW, align: 'right' });
    y += 18;

    doc.moveTo(totalsLabelX, y).lineTo(545, y).strokeColor('#333333').stroke();
    y += 10;

    doc.fontSize(12).font('Arial-Bold');
    doc.text('TOTAL DE PLAT\u0102:', totalsLabelX, y, { width: 120 });
    doc.text(`${totalGeneral.toFixed(2)} RON`, totalsValueX, y, { width: totalsValueW, align: 'right' });

    // --- SUBSOL ---
    y += 50;
    if (y < 700) {
        doc.fontSize(8).font('Arial').fillColor('#999999');
        doc.text('Factur\u0103 generat\u0103 cu Facturio', 50, y, { align: 'center' });
    }
}

// Rută descărcare PDF
router.post('/generate-pdf', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const buffer = await generatePdfBuffer(req.body, userId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=factura_${req.body.serie}${req.body.numar}.pdf`);
        res.send(buffer);
    } catch (err) {
        console.error('Eroare generare PDF:', err);
        res.status(500).json({ message: 'Eroare la generarea PDF-ului.' });
    }
});

// Export funcție pentru email.js
router.generatePdfBuffer = generatePdfBuffer;
module.exports = router;
