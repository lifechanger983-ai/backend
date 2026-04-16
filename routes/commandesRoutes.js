const express = require('express');
const router = express.Router();
const { Commande } = require('../models');
const logger = require('../config/logger');

// POST /api/commandes/creer
router.post('/creer', async (req, res) => {
  try {
    const {
      nom, sexe, telephone, email, quartier, adresseLivraison,
      latitude, longitude, boutiqueUrl, produits, prixTotal
    } = req.body;

    const commande = await Commande.create({
      nom, sexe, telephone, email, quartier, 
      adresseLivraison, latitude, longitude,
      boutiqueUrl, produits, prixTotal,
      statut: 'EN_ATTENTE'
    });

    logger.info(`✅ Commande créée: ${nom} - ${prixTotal} FCFA`);
    
    res.json({
      success: true,
      commande: commande.id,
      redirect: `/boutique/${boutiqueUrl}/confirmation/${commande.id}`
    });
  } catch (error) {
    logger.error('❌ Erreur création commande:', error);
    res.status(500).json({ error: 'Erreur création commande' });
  }
});

module.exports = router;