const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/auth');

// ✅ IMPORTS TOUS CONTROLLEURS
const { registerSuperAdmin, loginAdmin } = require('../controllers/authAdminController');
const { getSecurityLogs, banIP } = require('../controllers/securityMonitoringController');
const { 
  getAllProduits, getProduitById, createProduit, updateProduit, 
  deleteProduit, togglePromo 
} = require('../controllers/produitLongrichController');

const { 
  getAllProprietaires, getProprietaireById, createProprietaire, 
  updateProprietaire, deleteProprietaire, toggleActive 
} = require('../controllers/proprietairesController');

const { createBoutique, getAllBoutiques, toggleBoutiqueActive } = require('../controllers/boutiquesController');

// ✅ SERVICES VAGUE 4 - IMPORTS
const { 
  getAllServices, createService, updateService, toggleService, deleteService 
} = require('../controllers/servicesController');

// ✅ PACKS SANTÉ VAGUE 4 - IMPORT COMPLET
// ✅ À LA FIN des imports existants
const { 
  getAllPacksSante,
  createPackSante, 
  getPackSanteById, 
  updatePackSante, 
  togglePackSante, 
  deletePackSante 
} = require('../controllers/packSanteController');

// ✅ MULTER - VOTRE VERSION EXISTANTE (fields)
const { uploadFiles } = require('../config/cloudinary');

// Routes PUBLIQUES
router.post('/login', loginAdmin);
router.post('/register/:secret', registerSuperAdmin);

// Routes PROTÉGÉES
router.use(authAdmin);

// 🔐 SÉCURITÉ
router.get('/security/logs', getSecurityLogs);
router.post('/security/ban-ip', banIP);

// 🛍️ PRODUITS LONGRICH
router.get('/produits', getAllProduits);
router.get('/produits/:id', getProduitById);
router.post('/produits', createProduit);
router.put('/produits/:id', updateProduit);
router.delete('/produits/:id', deleteProduit);
router.post('/produits/:id/promo', togglePromo);

// 👥 PROPRIÉTAIRES
// Routes Propriétaires (après routes produits)
router.get('/proprietaires', getAllProprietaires);
router.get('/proprietaires/:id', getProprietaireById);
router.post('/proprietaires', uploadFiles, createProprietaire);
router.put('/proprietaires/:id', uploadFiles, updateProprietaire);
router.delete('/proprietaires/:id', deleteProprietaire);
router.post('/proprietaires/:id/toggle', toggleActive);
// 🏪 BOUTIQUES
router.get('/boutiques', getAllBoutiques);
router.post('/boutiques', createBoutique);
router.post('/boutiques/:id/toggle', toggleBoutiqueActive);

// ✅ SERVICES VAGUE 4 - VOTRE uploadFiles (fields)
// ✅ REMPLACEZ UNIQUEMENT les routes services :
// ✅ SERVICES VAGUE 4
router.get('/services', getAllServices);
router.post('/services', uploadFiles, createService);
router.put('/services/:id', uploadFiles, updateService);
router.post('/services/:id/toggle', toggleService);
router.delete('/services/:id', deleteService);

// ✅ PACKS SANTÉ VAGUE 4
// ✅ À LA FIN des routes existantes (après services)
router.get('/packsante', getAllPacksSante);
router.post('/packsante', uploadFiles, createPackSante);      // ✅ uploadFiles
router.get('/packsante/:id', getPackSanteById);
router.put('/packsante/:id', uploadFiles, updatePackSante);  // ✅ uploadFiles OBLIGATOIRE
router.post('/packsante/:id/toggle', togglePackSante);
router.delete('/packsante/:id', deletePackSante);

console.log('🛤️ ADMIN ROUTES CHARGÉES ✅');
console.log('✅ Services & Packs Santé routes prêtes avec uploadFiles !');

module.exports = router;