const express = require('express');
const router = express.Router();
const commandeController = require('../controllers/commandeController');

// ✅ IMPORT + DEBUG 
let { getBoutiqueConfig, getBoutiqueProduits } = require('../controllers/clientShopController');
console.log('🛒 DEBUG IMPORTS:');
console.log('getBoutiqueConfig:', typeof getBoutiqueConfig);
console.log('getBoutiqueProduits:', typeof getBoutiqueProduits);
console.log('validerCommande:', typeof commandeController.validerCommande);
console.log('sendCommandeEmail:', typeof commandeController.sendCommandeEmail);

// ✅ SUPPRIMEZ TOUS les console.log('🔥 NOUVELLES FONCTIONS... (inutiles)

// ✅ FALLBACK INLINE getBoutiqueConfig (identique)
if (typeof getBoutiqueConfig !== 'function') {
  console.log('⚠️ getBoutiqueConfig INLINE');
  getBoutiqueConfig = async (req, res) => {
    try {
      const { Boutique } = require('../models');
      const boutique = await Boutique.findOne({
        where: { urlPersonnalisee: req.params.url, isActive: true }
      });
      if (!boutique) return res.status(404).json({ error: 'Boutique introuvable' });
      res.json({
        id: boutique.id,
        nom: boutique.nom,
        theme: { primaire: '#10b981', secondaire: '#0f172a' }
      });
    } catch (error) {
      console.error('❌ getBoutiqueConfig ERROR:', error);
      res.status(500).json({ error: 'Erreur boutique' });
    }
  };
}

router.get('/boutique/:url', getBoutiqueConfig);
router.get('/boutique/:url/produits', getBoutiqueProduits || ((req, res) => res.json([])));

// ✅ PRODUITS LONGRICH (identique)
router.get('/boutique/:urlBoutique/produits-longrich', async (req, res) => {
  try {
    const { urlBoutique } = req.params;
    const { Boutique, ProduitLongrich } = require('../models');
    
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

// 🔥 ROUTES COMMANDE - TOUTES avec commandeController.
router.post('/boutique/:urlBoutique/commande', async (req, res) => {
  try {
    console.log('🛒 POST /boutique/commande HIT');
    await commandeController.createCommande(req, res);
  } catch (error) {
    console.error('❌ ERREUR commande boutique:', error);
    res.status(500).json({ error: 'Erreur création commande' });
  }
});

// 🔥 VALIDATION (LIGNE 83 → commandeController.validerCommande)
router.post('/boutique/:urlBoutique/commande/:commandeId/valider', commandeController.validerCommande);

// 🔥 EMAIL (LIGNE 86 → commandeController.sendCommandeEmail)
router.post('/boutique/:urlBoutique/commande/:commandeId/email-confirmation', commandeController.sendCommandeEmail);

// ✅ AUTRES ROUTES
router.post('/commandes/creer', commandeController.createCommande);
router.get('/commandes/recu/:id', commandeController.getRecu);
router.get('/commandes/boutique/:boutiqueUrl', commandeController.listerCommandesBoutique);

console.log('✅ ROUTES CLIENT FINALES CHARGÉES');
module.exports = router;