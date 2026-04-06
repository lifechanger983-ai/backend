// backend/routes/clientRoutes.js - REMPLACEZ COMPLET
const express = require('express');
const router = express.Router();
const { getBoutiqueConfig, getBoutiqueProduits } = require('../controllers/clientShopController');
const { Boutique, ProduitLongrich } = require('../models'); // ✅ IMPORTS MODÈLES

// API publique boutique
router.get('/boutique/:url', getBoutiqueConfig);
router.get('/boutique/:url/produits', getBoutiqueProduits);

// ✅ NOUVELLE ROUTE - PRODUITS LONGRICH DIRECT
router.get('/boutique/:urlBoutique/produits-longrich', async (req, res) => {
  try {
    const { urlBoutique } = req.params;
    const boutique = await Boutique.findOne({ 
      where: { urlPersonnalisee: urlBoutique, isActive: true } 
    });
    
    if (!boutique) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const produits = await ProduitLongrich.findAll({
      where: { isActive: true },
      order: [['categorie', 'ASC'], ['nom', 'ASC']]
    });

    console.log(`✅ ${produits.length} produits Longrich pour ${urlBoutique}`);
    res.json(produits);
  } catch (error) {
    console.error('❌ ERREUR produits-longrich:', error);
    res.status(500).json({ error: 'Erreur produits Longrich' });
  }
});

module.exports = router;
