const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireAuth = require('../middleware/auth');

// Salvare factură nouă
router.post('/invoices', requireAuth, (req, res) => {
    const { serie, numar, dataEmitere, dataScadenta, furnizor, client, produse, pretCuTVA } = req.body;
    const userId = req.session.user.id;

    // Calcul totaluri
    let subtotal = 0;
    let totalTVA = 0;

    (produse || []).forEach(p => {
        let valFaraTVA, tva;
        if (pretCuTVA) {
            const brut = p.cantitate * p.pretUnitar;
            valFaraTVA = brut / (1 + p.tvaPercent / 100);
            tva = brut - valFaraTVA;
        } else {
            valFaraTVA = p.cantitate * p.pretUnitar;
            tva = valFaraTVA * (p.tvaPercent / 100);
        }
        subtotal += valFaraTVA;
        totalTVA += tva;
    });

    const total = subtotal + totalTVA;

    // Insert factură
    const insertInvoice = db.prepare(`
        INSERT INTO invoices (
            user_id, serie, numar, data_emitere, data_scadenta,
            furn_nume, furn_cui, furn_reg_com, furn_adresa, furn_iban, furn_banca,
            client_nume, client_cui, client_reg_com, client_adresa, client_email,
            subtotal, total_tva, total, pret_cu_tva
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertInvoice.run(
        userId, serie, numar, dataEmitere, dataScadenta,
        furnizor.nume, furnizor.cui, furnizor.regCom, furnizor.adresa, furnizor.iban, furnizor.banca,
        client.nume, client.cui, client.regCom, client.adresa, client.email || null,
        subtotal, totalTVA, total, pretCuTVA ? 1 : 0
    );

    const invoiceId = result.lastInsertRowid;

    // Insert produse
    const insertItem = db.prepare(`
        INSERT INTO invoice_items (
            invoice_id, denumire, descriere, um, cantitate, pret_unitar,
            tva_percent, valoare_fara_tva, valoare_tva, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItems = db.transaction((items) => {
        for (const p of items) {
            let valFaraTVA, tva, tot;
            if (pretCuTVA) {
                const brut = p.cantitate * p.pretUnitar;
                valFaraTVA = brut / (1 + p.tvaPercent / 100);
                tva = brut - valFaraTVA;
                tot = brut;
            } else {
                valFaraTVA = p.cantitate * p.pretUnitar;
                tva = valFaraTVA * (p.tvaPercent / 100);
                tot = valFaraTVA + tva;
            }
            insertItem.run(invoiceId, p.denumire, p.descriere || null, p.um, p.cantitate, p.pretUnitar, p.tvaPercent, valFaraTVA, tva, tot);
        }
    });

    insertItems(produse || []);

    res.json({ success: true, id: Number(invoiceId), message: 'Factură salvată!' });
});

// Lista facturi (pentru utilizatorul curent)
router.get('/invoices', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const invoices = db.prepare(`
        SELECT id, serie, numar, data_emitere, data_scadenta,
               client_nume, client_email, subtotal, total_tva, total,
               created_at
        FROM invoices
        WHERE user_id = ?
        ORDER BY created_at DESC
    `).all(userId);

    res.json(invoices);
});

// Detalii factură (cu produse)
router.get('/invoices/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, userId);

    if (!invoice) {
        return res.status(404).json({ message: 'Factura nu a fost găsită.' });
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);

    res.json({
        ...invoice,
        furnizor: {
            nume: invoice.furn_nume,
            cui: invoice.furn_cui,
            regCom: invoice.furn_reg_com,
            adresa: invoice.furn_adresa,
            iban: invoice.furn_iban,
            banca: invoice.furn_banca,
        },
        client: {
            nume: invoice.client_nume,
            cui: invoice.client_cui,
            regCom: invoice.client_reg_com,
            adresa: invoice.client_adresa,
            email: invoice.client_email,
        },
        produse: items.map(i => ({
            denumire: i.denumire,
            descriere: i.descriere,
            um: i.um,
            cantitate: i.cantitate,
            pretUnitar: i.pret_unitar,
            tvaPercent: i.tva_percent,
        })),
        pretCuTVA: invoice.pret_cu_tva === 1,
    });
});

// Șterge factură
router.delete('/invoices/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const result = db.prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?').run(req.params.id, userId);

    if (result.changes === 0) {
        return res.status(404).json({ message: 'Factura nu a fost găsită.' });
    }
    res.json({ success: true });
});

module.exports = router;
