const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/auth');

// ✅ IMPORTS ANCIENS (qui marchaient)
const { checkRegisterAccess, registerSuperAdmin, loginAdmin } = require('../controllers/authAdminController');
const { getSecurityLogs, banIP } = require('../controllers/securityMonitoringController');
const { 
  getAllProduits, getProduitById, createProduit, updateProduit, 
  deleteProduit, togglePromo 
} = require('../controllers/produitLongrichController');

const { 
  getAllProprietaires, getProprietaireById, createProprietaire, 
  updateProprietaire, deleteProprietaire, toggleActive 
} = require('../controllers/proprietairesController');

const { createBoutique, getAllBoutiques, toggleBoutiqueActive, deleteBoutique } = require('../controllers/boutiquesController');

const { 
  getAllServices, createService, updateService, toggleService, deleteService 
} = require('../controllers/servicesController');

const { 
  getAllPacksSante, createPackSante, getPackSanteById, 
  updatePackSante, togglePackSante, deletePackSante 
} = require('../controllers/packSanteController');

const { uploadFiles } = require('../config/cloudinary');

// Routes PUBLIQUES (comme avant)
router.post('/login', loginAdmin);
router.get('/register-check', checkRegisterAccess);  // ✅ AJOUTÉ
router.post('/register/:secret', registerSuperAdmin);

// ✅ NOUVELLES ROUTES SÉCURITÉ (PROTÉGÉES)
router.get('/security/status', async (req, res) => {  // ✅ INLINE TEMPORAIRE
  try {
    const { SuperAdmin } = require('../models');
    const superAdmin = await SuperAdmin.findOne({ 
      attributes: ['registerLocked'],
      where: { isActive: true },
      order: [['createdAt', 'ASC']]
    });
    const superAdminCount = await SuperAdmin.count();
    res.json({ 
      registerLocked: superAdmin?.registerLocked || false,
      superAdminCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/security/toggle-register-lock', async (req, res) => {  // ✅ INLINE TEMPORAIRE
  try {
    const { SuperAdmin } = require('../models');
    const superAdmin = await SuperAdmin.findOne({ 
      where: { isActive: true },
      order: [['createdAt', 'ASC']]
    });
    if (!superAdmin) return res.status(404).json({ error: 'Aucun Super Admin' });
    
    superAdmin.registerLocked = !superAdmin.registerLocked;
    await superAdmin.save();
    
    res.json({ 
      registerLocked: superAdmin.registerLocked,
      message: `Register ${superAdmin.registerLocked ? 'verrouillé' : 'déverrouillé'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes PROTÉGÉES
router.use(authAdmin);

// 🔐 SÉCURITÉ (comme avant)
router.get('/security/logs', getSecurityLogs);
router.post('/security/ban-ip', banIP);

// 🛍️ PRODUITS LONGRICH (comme avant)
router.get('/produits', getAllProduits);
router.get('/produits/:id', getProduitById);
router.post('/produits', createProduit);
router.put('/produits/:id', updateProduit);
router.delete('/produits/:id', deleteProduit);
router.post('/produits/:id/promo', togglePromo);

// 👥 PROPRIÉTAIRES (comme avant)
router.get('/proprietaires', getAllProprietaires);
router.get('/proprietaires/:id', getProprietaireById);
router.post('/proprietaires', uploadFiles, createProprietaire);
router.put('/proprietaires/:id', uploadFiles, updateProprietaire);
router.delete('/proprietaires/:id', deleteProprietaire);
router.post('/proprietaires/:id/toggle', toggleActive);

// 🏪 BOUTIQUES (comme avant)
router.get('/boutiques', getAllBoutiques);
router.post('/boutiques', createBoutique);
router.post('/boutiques/:id/toggle', toggleBoutiqueActive);
router.delete('/boutiques/:id', deleteBoutique);

// ✅ SERVICES VAGUE 4 (comme avant)
router.get('/services', getAllServices);
router.post('/services', uploadFiles, createService);
router.put('/services/:id', uploadFiles, updateService);
router.post('/services/:id/toggle', toggleService);
router.delete('/services/:id', deleteService);

// ✅ PACKS SANTÉ VAGUE 4 (comme avant)
router.get('/packsante', getAllPacksSante);
router.post('/packsante', uploadFiles, createPackSante);
router.get('/packsante/:id', getPackSanteById);
router.put('/packsante/:id', uploadFiles, updatePackSante);
router.post('/packsante/:id/toggle', togglePackSante);
router.delete('/packsante/:id', deletePackSante);

console.log('🛤️ ADMIN ROUTES CHARGÉES ✅');
console.log('🔒 Routes sécurité registerLock ✅ INLINE');

module.exports = router;