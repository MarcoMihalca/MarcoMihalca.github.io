const express = require('express');
const { create } = require('xmlbuilder2');
const router = express.Router();
const requireAuth = require('../middleware/auth');

// Export XML UBL 2.1 (e-Factura ANAF)
router.post('/export-xml', requireAuth, (req, res) => {
    const { serie, numar, dataEmitere, dataScadenta, furnizor, client, produse, pretCuTVA } = req.body;

    // Calcul totaluri
    let subtotal = 0;
    let totalTVA = 0;
    const linii = (produse || []).map((p, i) => {
        let valFaraTVA, tva, total;
        if (pretCuTVA) {
            const brut = p.cantitate * p.pretUnitar;
            valFaraTVA = brut / (1 + p.tvaPercent / 100);
            tva = brut - valFaraTVA;
            total = brut;
        } else {
            valFaraTVA = p.cantitate * p.pretUnitar;
            tva = valFaraTVA * (p.tvaPercent / 100);
            total = valFaraTVA + tva;
        }
        subtotal += valFaraTVA;
        totalTVA += tva;
        return { ...p, valFaraTVA, tva, total, index: i + 1 };
    });

    const totalGeneral = subtotal + totalTVA;

    // Construire XML UBL 2.1
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Invoice', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        });

    // Informații factură
    doc.ele('cbc:UBLVersionID').txt('2.1').up();
    doc.ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1').up();
    doc.ele('cbc:ID').txt(`${serie}${numar}`).up();
    doc.ele('cbc:IssueDate').txt(dataEmitere).up();
    if (dataScadenta) {
        doc.ele('cbc:DueDate').txt(dataScadenta).up();
    }
    doc.ele('cbc:InvoiceTypeCode').txt('380').up(); // Factură comercială
    doc.ele('cbc:DocumentCurrencyCode').txt('RON').up();

    // Furnizor
    const supplier = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    if (furnizor.regCom) {
        supplier.ele('cac:PartyIdentification').ele('cbc:ID').txt(furnizor.regCom).up().up();
    }
    supplier.ele('cac:PartyName').ele('cbc:Name').txt(furnizor.nume || '').up().up();
    const supplierAddr = supplier.ele('cac:PostalAddress');
    if (furnizor.adresa) {
        supplierAddr.ele('cbc:StreetName').txt(furnizor.adresa).up();
    }
    supplierAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt('RO').up().up();
    supplierAddr.up();
    const supplierTax = supplier.ele('cac:PartyTaxScheme');
    supplierTax.ele('cbc:CompanyID').txt(furnizor.cui || '').up();
    supplierTax.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
    supplierTax.up();
    supplier.ele('cac:PartyLegalEntity').ele('cbc:RegistrationName').txt(furnizor.nume || '').up().up();
    supplier.up().up();

    // Client
    const customer = doc.ele('cac:AccountingCustomerParty').ele('cac:Party');
    customer.ele('cac:PartyName').ele('cbc:Name').txt(client.nume || '').up().up();
    const customerAddr = customer.ele('cac:PostalAddress');
    if (client.adresa) {
        customerAddr.ele('cbc:StreetName').txt(client.adresa).up();
    }
    customerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt('RO').up().up();
    customerAddr.up();
    if (client.cui) {
        const customerTax = customer.ele('cac:PartyTaxScheme');
        customerTax.ele('cbc:CompanyID').txt(client.cui).up();
        customerTax.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
        customerTax.up();
    }
    customer.ele('cac:PartyLegalEntity').ele('cbc:RegistrationName').txt(client.nume || '').up().up();
    customer.up().up();

    // Totaluri TVA
    const taxTotal = doc.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: 'RON' }).txt(totalTVA.toFixed(2)).up();
    const taxSub = taxTotal.ele('cac:TaxSubtotal');
    taxSub.ele('cbc:TaxableAmount', { currencyID: 'RON' }).txt(subtotal.toFixed(2)).up();
    taxSub.ele('cbc:TaxAmount', { currencyID: 'RON' }).txt(totalTVA.toFixed(2)).up();
    const taxCat = taxSub.ele('cac:TaxCategory');
    taxCat.ele('cbc:ID').txt('S').up();
    taxCat.ele('cbc:Percent').txt('19').up();
    taxCat.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
    taxCat.up();
    taxSub.up();
    taxTotal.up();

    // Total monetar
    const legalTotal = doc.ele('cac:LegalMonetaryTotal');
    legalTotal.ele('cbc:LineExtensionAmount', { currencyID: 'RON' }).txt(subtotal.toFixed(2)).up();
    legalTotal.ele('cbc:TaxExclusiveAmount', { currencyID: 'RON' }).txt(subtotal.toFixed(2)).up();
    legalTotal.ele('cbc:TaxInclusiveAmount', { currencyID: 'RON' }).txt(totalGeneral.toFixed(2)).up();
    legalTotal.ele('cbc:PayableAmount', { currencyID: 'RON' }).txt(totalGeneral.toFixed(2)).up();
    legalTotal.up();

    // Linii factură
    linii.forEach(l => {
        const line = doc.ele('cac:InvoiceLine');
        line.ele('cbc:ID').txt(String(l.index)).up();
        line.ele('cbc:InvoicedQuantity', { unitCode: l.um === 'buc' ? 'EA' : l.um.toUpperCase() }).txt(String(l.cantitate)).up();
        line.ele('cbc:LineExtensionAmount', { currencyID: 'RON' }).txt(l.valFaraTVA.toFixed(2)).up();
        
        const item = line.ele('cac:Item');
        item.ele('cbc:Name').txt(l.denumire || '').up();
        if (l.descriere) {
            item.ele('cbc:Description').txt(l.descriere).up();
        }
        const itemTax = item.ele('cac:ClassifiedTaxCategory');
        itemTax.ele('cbc:ID').txt('S').up();
        itemTax.ele('cbc:Percent').txt(String(l.tvaPercent)).up();
        itemTax.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
        itemTax.up();
        item.up();

        const price = line.ele('cac:Price');
        price.ele('cbc:PriceAmount', { currencyID: 'RON' }).txt(l.pretUnitar.toFixed(2)).up();
        price.up();
        line.up();
    });

    const xml = doc.end({ prettyPrint: true });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=efactura_${serie}${numar}.xml`);
    res.send(xml);
});

module.exports = router;
