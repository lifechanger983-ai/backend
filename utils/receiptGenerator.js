const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateReceiptPDF = (commande, client, boutique, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=recu_${commande.id}.pdf`);
  
  doc.pipe(res);
  
  // Header boutique
  doc.fontSize(24).font('Helvetica-Bold').text(boutique.nom, { align: 'center' });
  doc.fontSize(12).text(`ID Boutique: ${boutique.id.slice(0,8)}`, { align: 'center' });
  doc.moveDown();
  
  // Infos client
  doc.fontSize(16).font('Helvetica-Bold').text('REÇU DE COMMANDE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Client: ${client.nom} (${client.sexe})`, { continued: true });
  doc.text(` | Tél: ${client.telephone}`, { align: 'left' });
  doc.text(`Email: ${client.email || 'Non fourni'}`, { align: 'left' });
  doc.text(`Adresse: ${client.adresseLivraison || client.quartier}, Efoulan`, { align: 'left' });
  doc.moveDown();
  
  // Détails commande
  doc.fontSize(14).font('Helvetica-Bold').text(`Commande #${commande.id.slice(0,8)}`, { underline: true });
  doc.text(`Date: ${new Date(commande.createdAt).toLocaleString('fr-FR')}`);
  doc.text(`Statut: ${commande.statut.toUpperCase()}`);
  doc.moveDown();
  
  // Produits
  doc.fontSize(12).font('Helvetica-Bold').text('PRODUITS:', { underline: true });
  const produits = JSON.parse(commande.produits);
  let total = 0;
  
  produits.forEach(p => {
    const prix = p.prixPromo || p.prixClient;
    total += parseFloat(prix) * p.quantite;
    doc.text(`${p.nom} x${p.quantite} - ${prix} FCFA`, 50, doc.y, { continued: false });
  });
  
  doc.moveDown();
  doc.fontSize(18).font('Helvetica-Bold').text(`TOTAL: ${commande.prixTotal.toLocaleString()} FCFA`, { align: 'right' });
  doc.text('Livraison gratuite: ' + (commande.livraisonGratuite ? 'OUI' : 'NON'), { align: 'right' });
  
  doc.moveDown(2);
  doc.fontSize(10).text('Merci pour votre confiance !', { align: 'center' });
  doc.text('Suivez votre commande sur notre plateforme.', { align: 'center' });
  
  doc.end();
};

module.exports = { generateReceiptPDF };