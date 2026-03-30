const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Commande, Client, Boutique } = require('../models');

const generateReceiptPDF = async (commandeId) => {
  try {
    const commande = await Commande.findByPk(commandeId, {
      include: [
        { model: Client, as: 'monClient' },
        { model: Boutique, as: 'maBoutique', include: [{ model: Proprietaire, as: 'monProprietaire' }] }
      ]
    });

    if (!commande) throw new Error('Commande introuvable');

    const doc = new PDFDocument({ margin: 50 });
    const filename = `receipt-${commande.recuCommande}.pdf`;
    const filepath = path.join(__dirname, '../uploads/receipts', filename);
    
    // Créer dossier si inexistant
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#10B981').text('BON DE COMMANDE', 50, 50);
    doc.fontSize(12).font('Helvetica').fillColor('#333')
      .text(`Numéro: ${commande.recuCommande}`, 50, 90)
      .text(`Date: ${new Date(commande.createdAt).toLocaleDateString('fr-FR')}`, 50, 110);

    // Boutique
    doc.moveDown().fontSize(14).font('Helvetica-Bold').fillColor('#333')
      .text('BOUTIQUE:', { continued: true }).fillColor('#000').text(`${commande.maBoutique.nom}`);
    doc.text(`Propriétaire: ${commande.maBoutique.monProprietaire.nom}`, { 
      continued: false, 
      indent: 20 
    });

    // Client
    doc.moveDown().fontSize(14).font('Helvetica-Bold').fillColor('#333')
      .text('CLIENT:', { continued: true }).fillColor('#000').text(commande.monClient.nom);
    doc.text(`Téléphone: ${commande.monClient.telephone}`, { indent: 20 });
    doc.text(`Adresse: ${commande.monClient.adresseLivraison || commande.monClient.quartier}`, { indent: 20 });

    // Produits
    doc.moveDown(2).fontSize(16).font('Helvetica-Bold').fillColor('#10B981')
      .text('PRODUITS COMMANDÉS:', 50, doc.y);
    
    let yPos = doc.y + 30;
    let total = 0;
    
    commande.produits.forEach((item, index) => {
      doc.fontSize(11).font('Helvetica').fillColor('#333')
        .text(`${index + 1}. ${item.nom} (${item.quantite}x)`, 50, yPos);
      doc.text(`Prix U: ${item.prixUnitaire.toFixed(2)} FCFA`, 300, yPos);
      doc.text(`Total: ${(item.prixUnitaire * item.quantite).toFixed(2)} FCFA`, 450, yPos);
      total += item.prixUnitaire * item.quantite;
      yPos += 25;
    });

    // Total
    doc.moveDown().fontSize(18).font('Helvetica-Bold').fillColor('#10B981')
      .text(`TOTAL: ${commande.prixTotal.toFixed(2)} FCFA`, 400, yPos + 20);

    // Footer
    doc.moveDown(3).fontSize(10).font('Helvetica').fillColor('#666')
      .text('Présentez ce reçu au livreur pour confirmer votre commande.', {
        align: 'center',
        width: 500
      })
      .text('Livraisons après 19h interdites.', { align: 'center', width: 500 });

    doc.end();
    return filepath;

  } catch (error) {
    console.error('❌ PDF GENERATION ERROR:', error);
    throw error;
  }
};

module.exports = { receiptGenerator: generateReceiptPDF };
