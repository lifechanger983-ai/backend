const { Client, Commande, Boutique, sequelize } = require('../models');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

// ✅ EMAIL CONFIG
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ FONCTION PRINCIPALE CRÉATION COMMANDE (INCHANGÉE)
async function createCommande(req, res) {
  console.log('🛒 POST /boutique/:url/commande HIT ✅');
  console.log('📥 BODY RAW:', req.body);
  console.log('Produits TYPE:', typeof req.body.produits, Array.isArray(req.body.produits));

  const transaction = await sequelize.transaction();
  
  try {
    const { 
      nom, sexe, telephone, email, quartier, adresseLivraison, 
      latitude, longitude, boutiqueUrl, produits, prixTotal, 
      livraisonGratuite, typeService = 'produit_simple'
    } = req.body;

    // 1. VALIDATION BASIQUE
    if (!nom?.trim() || !telephone?.trim() || !boutiqueUrl?.trim() || 
        !Array.isArray(produits) || produits.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Données incomplètes (nom, téléphone, boutique, produits requis)' 
      });
    }

    // 2. BOUTIQUE
    const boutique = await Boutique.findOne({
      where: { urlPersonnalisee: boutiqueUrl, isActive: true },
      transaction
    });
    
    if (!boutique) {
      await transaction.rollback();
      return res.status(404).json({ error: `Boutique ${boutiqueUrl} introuvable` });
    }
    console.log(`✅ Boutique: ${boutique.nom} (${boutique.id})`);

    // 3. CLIENT (upsert)
// 3. CLIENT (upsert) - SANS isFinalise (n'existe pas dans modèle Client)
let client = await Client.findOne({ where: { telephone }, transaction });
if (!client) {
  client = await Client.create({
    nom: nom.trim(),
    sexe,
    telephone: telephone.trim(),
    email: email?.trim() || null,
    quartier: quartier?.trim() || null,
    adresseLivraison: adresseLivraison?.trim() || null,
    latitude: latitude || null,
    longitude: longitude || null,
    // ✅ SUPPRIMÉ : isFinalise (n'existe pas)
  }, { transaction });
  console.log(`👤 NOUVEAU client: ${client.id}`);
} else {
      console.log(`👤 Client existant: ${client.id}`);
    }

    // 4. ✅ PRODUITS VALIDATION FLEXIBLE
    let parsedProduits;
    try {
      parsedProduits = Array.isArray(produits) ? produits : JSON.parse(produits);
      console.log('🔍 parsedProduits:', parsedProduits);
    } catch (e) {
      console.log('❌ JSON Parse FAIL:', e.message);
      await transaction.rollback();
      return res.status(400).json({ error: 'Produits invalides (JSON)' });
    }

    // ✅ VALIDATION STRICTE
    const validatedProduits = parsedProduits
      .map(p => {
        const prixBase = parseFloat(p.prixClient || p.prixPromo || p.prix || 0);
        const qte = parseInt(p.quantity || p.quantite || 1);
        return {
          produitId: p.id,
          nom: (p.nom || 'Inconnu').trim(),
          prixUnitaire: prixBase,
          quantite: qte,
          sousTotal: prixBase * qte,
          categorie: p.categorie || null,
          promoActive: !!(p.prixPromo || p.promoActive)
        };
      })
      .filter(p => p.produitId && p.nom && p.prixUnitaire > 0 && p.quantite > 0);

    console.log('✅ validatedProduits:', validatedProduits);
    
    if (validatedProduits.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Produits invalides (aucun valide)' });
    }

    // 5. TOTAL CHECK
    const totalCalcule = validatedProduits.reduce((sum, p) => sum + p.sousTotal, 0);
    console.log(`💰 Total frontend: ${prixTotal}, calculé: ${totalCalcule}`);

    // 6. COMMANDE BROUILLON 🔥
    const commande = await Commande.create({
      clientId: client.id,
      boutiqueId: boutique.id,
      proprietaireId: boutique.proprietaireId,
      typeService,
      produits: JSON.stringify(validatedProduits),
      prixTotal: parseFloat(prixTotal) || totalCalcule,
      quartierLivraison: quartier,
      adresseLivraison,
      telephoneClient: telephone,
      statut: 'brouillon',  // 🔥 STATUT BROUILLON
      latitude,
      longitude,
      livraisonGratuite: !!livraisonGratuite,
      notes: null,
      recuCommande: null  // 🔥 À remplir après validation
    }, { transaction });

    await transaction.commit();
    console.log('🎉 COMMANDE BROUILLON OK:', commande.id);

    // 🔥 RÉPONSE IMMÉDIATE AVEC LIEN PDF + VALIDATION
    const pdfUrl = `${process.env.FRONTEND_LOCAL_URL}/boutique/${boutiqueUrl}/recu/${commande.id}?telephone=${telephone}`;
    
    res.status(201).json({
      success: true,
      commandeId: commande.id,
      statut: 'brouillon',
      message: '✅ Commande brouillon créée !',
      actions: {
        pdfUrl,  // Lien téléchargement PDF
        validerUrl: `/boutique/${boutiqueUrl}/commande/${commande.id}/valider`  // Pour validation finale
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('💥 ERREUR createCommande:', error);
    res.status(500).json({ 
      error: 'Erreur création commande',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

// 🔥 VALIDATION FINALE (appelée après téléchargement PDF)
// 🔥 validerCommande - VERSION DEBUG + ROBUSTE
// 🔥 validerCommande - VERSION BULLETPROOF (remplacez la fonction existante)
async function validerCommande(req, res) {
  console.log('🔥 validerCommande HIT:', req.params.commandeId);
  console.log('📥 BODY:', req.body);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { commandeId } = req.params;
    const { telephone, recuTelecharge } = req.body;
    
    // 1. VALIDATION INPUTS
    if (!commandeId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'commandeId requis' });
    }
    if (!recuTelecharge) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Téléchargez d\'abord votre reçu !' });
    }

    // 2. TROUVER COMMANDE SANS INCLUDE (ÉVITE LES BUGS)
    console.log('🔍 Recherche commande:', commandeId);
    const commande = await Commande.findByPk(commandeId, { transaction });
    
    if (!commande) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Commande introuvable' });
    }
    
    console.log('✅ Commande trouvée:', commande.id.slice(-8), 'statut:', commande.statut);
    
    // 3. VÉRIFIER STATUT BROUILLON
    if (commande.statut !== 'brouillon') {
      await transaction.rollback();
      return res.status(400).json({ error: `Commande déjà ${commande.statut}` });
    }

    // 4. RÉCUPÉRER CLIENT ET BOUTIQUE SÉPARÉMENT (SAFE)
    const client = await Client.findByPk(commande.clientId, { transaction });
    const boutique = await Boutique.findByPk(commande.boutiqueId, { transaction });
    
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Client introuvable' });
    }
    if (!boutique) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Boutique introuvable' });
    }

    // 5. FINALISER COMMANDE
    console.log('🔄 UPDATE → en_attente');
    commande.statut = 'en_attente';
    commande.recuCommande = `recu_${commande.id.slice(-8)}.pdf`;
    await commande.save({ transaction });
    
    console.log('✅ Commande sauvée:', commande.statut);

    await transaction.commit();
    console.log('✅ TRANSACTION COMMIT');

    // 🔥 FIX: EMAIL SIMPLE NON-BLOQUANT (sans PDF, sans include complexe)
    setImmediate(async () => {  // ASYNC NON-BLOQUANT
      try {
        if (client.email) {
          console.log('📧 Envoi email ASYNC:', client.email);
          
          await transporter.sendMail({
            from: `"${boutique.nom}" <${process.env.EMAIL_USER}>`,
            to: client.email,
            subject: `✅ Commande #${commande.id.slice(-8)} Confirmée - ${boutique.nom}`,
            html: `
              <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #059669;">✅ Commande Confirmée !</h1>
                <p>Bonjour <strong>${client.nom}</strong>,</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                  <h2>📄 Détails</h2>
                  <p><strong>ID:</strong> #${commande.id.slice(-8)}</p>
                  <p><strong>Total:</strong> ${commande.prixTotal.toLocaleString()} FCFA</p>
                  <p><strong>Tél:</strong> ${client.telephone}</p>
                  <p><strong>Statut:</strong> ${commande.statut.toUpperCase()}</p>
                  <p><strong>Adresse:</strong> ${client.quartier || 'Mvolyé'} - ${client.adresseLivraison || ''}</p>
                </div>
                <p>📎 <a href="${process.env.FRONTEND_LOCAL_URL || 'http://localhost:3000'}/boutique/${boutique.urlPersonnalisee}/recu/${commande.id}?telephone=${client.telephone}">Télécharger PDF Reçu</a></p>
                <p>🚚 Livraison en préparation</p>
                <hr>
                <p>${boutique.nom} - Merci !</p>
              </div>
            `
          });
          console.log('✅ EMAIL CONFIRMATION ENVOYÉ:', client.email);
        } else {
          console.log('⚠️ PAS D\'EMAIL pour client:', client.telephone);
        }
      } catch (emailError) {
        console.error('❌ EMAIL ÉCHOUÉ (non-bloquant):', emailError.message);
      }
    });

    console.log('🎉 validerCommande SUCCÈS');
    res.json({ 
      success: true, 
      commandeId: commande.id,
      message: '✅ Commande validée !' 
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('💥 validerCommande ERROR COMPLET:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      commandeId: req.params.commandeId
    });
    res.status(500).json({ error: 'Erreur validation serveur', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

// ✅ NOUVELLE ROUTE : EMAIL CONFIRMATION SIMPLE
// ✅ FIX sendCommandeEmail - Gestion erreurs + logs
async function sendCommandeEmail(req, res) {
  try {
    const { commandeId, email, nom, total, telephone } = req.body;
    
    console.log('📧 EMAIL CONFIRMATION:', { 
      commandeId: commandeId?.slice(-8), 
      email, 
      nom, 
      total 
    });

    // 🔥 VÉRIFICATION STRICTE
    if (!commandeId || !email) {
      return res.status(400).json({ error: 'commandeId et email requis' });
    }

    // Récupérer commande avec includes
    const commande = await Commande.findByPk(commandeId, {
      include: [{ model: Client, attributes: ['nom', 'telephone'] }, { model: Boutique, attributes: ['nom'] }]
    });

    if (!commande) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    console.log('✅ COMMANDE TROUVÉE:', commande.id.slice(-8), commande.Boutique?.nom);

    // ✅ EMAIL SIMPLE
    await transporter.sendMail({
      from: `"${commande.Boutique?.nom || 'NEFER RITA'} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Commande #${commande.id.slice(-8)} - ${nom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669; text-align: center;">✅ Commande Confirmée !</h1>
          <p>Bonjour <strong>${nom}</strong>,</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937;">📄 Détails</h2>
            <p><strong>ID:</strong> #${commande.id.slice(-8)}</p>
            <p><strong>Total:</strong> ${parseFloat(total || commande.prixTotal).toLocaleString()} FCFA</p>
            <p><strong>Téléphone:</strong> ${telephone || commande.Client?.telephone || commande.telephoneClient}</p>
            <p><strong>Statut:</strong> ${commande.statut?.toUpperCase() || 'EN ATTENTE'}</p>
          </div>

          <p>🚚 Livraison en préparation • Suivi: ${telephone}</p>
          <hr style="border: 1px solid #e5e7eb;">
          <p style="text-align: center; color: #6b7280;">
            Merci ! ${commande.Boutique?.nom || 'NEFER RITA'}
          </p>
        </div>
      `
    });

    console.log('✅ EMAIL ENVOYÉ:', email);
    res.json({ success: true, message: 'Email envoyé !' });

  } catch (error) {
    console.error('❌ EMAIL 500:', error.message);
    res.status(500).json({ error: 'Erreur envoi email' });
  }
}

// ✅ FONCTIONS PDF/EMAIL EXISTANTES (INCHANGÉES)
async function generateReceiptPDFBuffer(commande, client, boutique) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50 });
    const stream = doc.pipe(new PassThrough());
    
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    doc.fontSize(24).font('Helvetica-Bold').text(boutique.nom, { align: 'center' });
    doc.fontSize(12).text(`ID Boutique: ${boutique.id.slice(0,8)}`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).font('Helvetica-Bold').text('REÇU DE COMMANDE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${client.nom} (${client.sexe})`);
    doc.text(`Tél: ${client.telephone}`);
    doc.text(`Email: ${client.email || 'Non fourni'}`);
    doc.text(`Adresse: ${client.adresseLivraison || client.quartier}, Efoulan`);
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica-Bold').text(`Commande #${commande.id.slice(0,8)}`, { underline: true });
    doc.text(`Date: ${new Date(commande.createdAt).toLocaleString('fr-FR')}`);
    doc.text(`Statut: ${commande.statut.toUpperCase()}`);
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').text('PRODUITS:', { underline: true });
    const produits = JSON.parse(commande.produits);
    produits.forEach(p => {
      const prix = p.prixPromo || p.prixClient;
      doc.text(`${p.nom} x${p.quantite || 1} - ${parseFloat(prix).toLocaleString()} FCFA`);
    });
    
    doc.moveDown();
    doc.fontSize(18).font('Helvetica-Bold').text(`TOTAL: ${commande.prixTotal.toLocaleString()} FCFA`, { align: 'right' });
    doc.text(`Livraison gratuite: ${commande.livraisonGratuite ? 'OUI' : 'NON'}`, { align: 'right' });
    
    doc.moveDown(2);
    doc.fontSize(10).text('Merci pour votre confiance !', { align: 'center' });
    doc.text('Suivez votre commande sur notre plateforme.', { align: 'center' });
    
    doc.end();
  });
}

async function generateAndSendReceipt(commandeId, client, boutique) {
  try {
    const commande = await Commande.findByPk(commandeId, {
      include: [Client, Boutique]
    });

    if (!commande || !client.email) {
      console.log('⚠️ Pas d\'email pour:', client.telephone);
      return;
    }

    const pdfBuffer = await generateReceiptPDFBuffer(commande, commande.Client, commande.Boutique);

    await transporter.sendMail({
      from: `"${boutique.nom}" <${process.env.EMAIL_USER}>`,
      to: client.email,
      subject: `Reçu #${commande.id.slice(-8)} - ${boutique.nom}`,
      html: `
        <h2 style="color: #059669;">✅ Votre commande est confirmée !</h2>
        <p><strong>ID:</strong> ${commande.id.slice(-8)}</p>
        <p><strong>Total:</strong> ${commande.prixTotal.toLocaleString()} FCFA</p>
        <p><a href="${process.env.FRONTEND_LOCAL_URL}/boutique/${boutique.urlPersonnalisee}/recu/${commande.id}?telephone=${client.telephone}">📄 Télécharger PDF</a></p>
        <hr><p>👋 WhatsApp: ${process.env.WHATSAPP_GROUPE}</p>
      `,
      attachments: [{
        filename: `recu_${commande.id.slice(-8)}.pdf`,
        content: pdfBuffer
      }]
    });

    console.log('📧 Reçu envoyé:', client.email);

  } catch (error) {
    console.error('❌ EMAIL/PDF:', error);
  }
}

// ✅ FONCTIONS EXISTANTES INCHANGÉES
async function getRecu(req, res) {
  try {
    const { id } = req.params;
    const { telephone } = req.query;

    console.log('📄 Reçu:', id, telephone);

    const commande = await Commande.findByPk(id, {
      include: [
        { model: Client, where: { telephone } },
        { model: Boutique }
      ]
    });

    if (!commande) {
      return res.status(404).json({ error: 'Reçu introuvable' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recu_${commande.id.slice(-8)}.pdf`);
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text(commande.Boutique.nom, { align: 'center' });
    doc.fontSize(12).text(`ID Boutique: ${commande.Boutique.id.slice(0,8)}`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).font('Helvetica-Bold').text('REÇU DE COMMANDE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${commande.Client.nom} (${commande.Client.sexe})`);
    doc.text(`Tél: ${commande.Client.telephone}`);
    doc.text(`Email: ${commande.Client.email || 'Non fourni'}`);
    doc.text(`Adresse: ${commande.Client.adresseLivraison || commande.Client.quartier}, Efoulan`);
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica-Bold').text(`Commande #${commande.id.slice(0,8)}`, { underline: true });
    doc.text(`Date: ${new Date(commande.createdAt).toLocaleString('fr-FR')}`);
    doc.text(`Statut: ${commande.statut.toUpperCase()}`);
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').text('PRODUITS:', { underline: true });
    const produits = JSON.parse(commande.produits);
    produits.forEach(p => {
      const prix = p.prixPromo || p.prixClient;
      doc.text(`${p.nom} x${p.quantite || 1} - ${parseFloat(prix).toLocaleString()} FCFA`);
    });
    
    doc.moveDown();
    doc.fontSize(18).font('Helvetica-Bold').text(`TOTAL: ${commande.prixTotal.toLocaleString()} FCFA`, { align: 'right' });
    doc.text(`Livraison gratuite: ${commande.livraisonGratuite ? 'OUI' : 'NON'}`, { align: 'right' });
    
    doc.moveDown(2);
    doc.fontSize(10).text('Merci pour votre confiance !', { align: 'center' });
    doc.text('Suivez votre commande sur notre plateforme.', { align: 'center' });
    
    doc.end();

  } catch (error) {
    console.error('❌ RECU:', error);
    res.status(500).json({ error: 'Erreur PDF', details: error.message });
  }
}

async function listerCommandesBoutique(req, res) {
  try {
    const { boutiqueUrl } = req.params;
    console.log('📋 Commandes boutique:', boutiqueUrl);
    
    const boutique = await Boutique.findOne({ where: { urlPersonnalisee: boutiqueUrl } });
    if (!boutique) return res.status(404).json({ error: 'Boutique introuvable' });

    const commandes = await Commande.findAll({
      where: { boutiqueId: boutique.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      count: commandes.length,
      commandes: commandes.map(c => ({
        id: c.id,
        total: c.prixTotal,
        statut: c.statut,
        date: c.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ LISTE:', error);
    res.status(500).json({ error: 'Erreur liste' });
  }
}

// 🔥 NOUVEAU : EMAIL COMPLET AVEC RÉCAP + PDF
async function sendCompleteReceiptEmail(commandeId, client, boutique) {
  try {
    const commande = await Commande.findByPk(commandeId, {
      include: [Client, Boutique]
    });

    const pdfBuffer = await generateReceiptPDFBuffer(commande, commande.Client, commande.Boutique);

    await transporter.sendMail({
      from: `"${boutique.nom}" <${process.env.EMAIL_USER}>`,
      to: client.email,
      subject: `✅ Reçu #${commande.id.slice(-8)} - Commande confirmée`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669; text-align: center;">✅ Commande Confirmée !</h1>
          <p>Bonjour <strong>${client.nom}</strong>,</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937;">📄 Détails Commande</h2>
            <p><strong>ID:</strong> #${commande.id.slice(-8)}</p>
            <p><strong>Total:</strong> ${commande.prixTotal.toLocaleString()} FCFA</p>
            <p><strong>Téléphone:</strong> ${client.telephone}</p>
            <p><strong>Adresse:</strong> ${client.adresseLivraison || client.quartier}</p>
            <p><strong>Statut:</strong> ${commande.statut.toUpperCase()}</p>
          </div>

          <p>📎 <strong>Reçu PDF joint</strong> à cet email</p>
          <p>🚚 Livraison en cours de préparation</p>
          
          <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="text-align: center; color: #6b7280;">
            Merci pour votre confiance !<br>
            ${boutique.nom}
          </p>
        </div>
      `,
      attachments: [{
        filename: `recu_commande_${commande.id.slice(-8)}.pdf`,
        content: pdfBuffer
      }]
    });

    console.log('📧 ✅ EMAIL COMPLET (RÉCAP+PDF) ENVOYÉ:', client.email);
  } catch (error) {
    console.error('❌ EMAIL COMPLET ÉCHOUÉ:', error);
  }
}

// Dans controllers/commandeController.js - AJOUTEZ CES FONCTIONS




module.exports = { 
  createCommande, 
  
  validerCommande,   // 🔥 NOUVEAU : validation finale
  getRecu, 
  listerCommandesBoutique, 
  sendCommandeEmail  // ✅ NOUVEAU EXPORT
};