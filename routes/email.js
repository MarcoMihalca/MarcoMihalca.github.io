const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const transporter = require('../config/emailConfig');
const { generatePdfBuffer } = require('./pdf');

// Trimitere factură pe email
router.post('/send-invoice', requireAuth, async (req, res) => {
    const { email, invoiceData } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Adresa de email este obligatorie.' });
    }

    try {
        // Generează PDF în memorie
        const pdfBuffer = await generatePdfBuffer(invoiceData, req.session.user.id);

        const { serie, numar } = invoiceData;

        // Trimite email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Facturio <noreply@facturio.ro>',
            to: email,
            subject: `Factură ${serie}${numar} — Facturio`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #fff; margin: 0; font-size: 24px;">📄 Facturio</h1>
                    </div>
                    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #334155; font-size: 16px;">Bună ziua,</p>
                        <p style="color: #475569;">Atașat găsiți factura <strong>${serie}${numar}</strong>.</p>
                        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Client:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${invoiceData.client?.nume || '—'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Data emiterii:</td>
                                <td style="padding: 8px 0; color: #1e293b;">${invoiceData.dataEmitere || '—'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Total:</td>
                                <td style="padding: 8px 0; color: #6366f1; font-weight: 700; font-size: 18px; border-top: 1px solid #e2e8f0;">${invoiceData.total || '—'} RON</td>
                            </tr>
                        </table>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Factură generată cu Facturio</p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: `factura_${serie}${numar}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        });

        res.json({ success: true, message: `Factura a fost trimisă pe ${email}!` });
    } catch (err) {
        console.error('Eroare trimitere email:', err.message);
        res.status(500).json({ message: 'Eroare la trimiterea emailului. Verifică configurarea SMTP.' });
    }
});

module.exports = router;
