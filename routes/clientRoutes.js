const express = require('express');
const router = express.Router();
const { getBoutiqueConfig, getBoutiqueProduits } = require('../controllers/clientShopController');

// API publique boutique
router.get('/boutique/:urlBoutique/config', getBoutiqueConfig);
router.get('/boutique/:urlBoutique/produits', getBoutiqueProduits);
router.get('/boutique/:urlBoutique/produits-longrich', getBoutiqueProduits); // Alias

module.exports = router;
