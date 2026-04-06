const { Proprietaire } = require('../models');
const { uploadToCloudinary, deleteCloudinaryFile, getPublicIdFromUrl } = require('../config/cloudinary');
const { sendEmail } = require('../utils/sendEmail');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

// ✅ REMPLACÉ - Nouvelle version
const createProprietaire = async (req, res) => {
  try {
    console.log('📥 BODY:', req.body);
    console.log('📥 FILES:', req.files);

    let photoUrl = null;
    if (req.files?.photo?.[0]?.buffer) {
      photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
      console.log(`✅ Photo uploadée: ${photoUrl}`);
    }

    // Génération mot de passe
    const defaultPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const proprietaire = await Proprietaire.create({
      nom: req.body.nom,
      sexe: req.body.sexe,
      telephone: req.body.telephone,
      email: req.body.email || null,
      quartier: req.body.quartier || null,
      password: hashedPassword,
      photo: photoUrl,
      isActive: true
    });

    // Email...
    await sendEmail({ /* ... */ });

    console.log(`✅ Créé: ${proprietaire.nom}`);
    res.status(201).json(proprietaire);
  } catch (error) {
    console.error('❌ CREATE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ REMPLACÉ - Nouvelle version
const updateProprietaire = async (req, res) => {
  const { id } = req.params;
  
  try {
    const proprietaire = await Proprietaire.findByPk(id);
    if (!proprietaire) {
      return res.status(404).json({ error: 'Propriétaire non trouvé' });
    }

    console.log('📥 UPDATE - BODY:', req.body);
    console.log('📥 UPDATE - FILES:', req.files);

    // Supprimer ancienne photo si nouvelle
    if (req.files?.photo?.[0]?.buffer && proprietaire.photo) {
      await deleteCloudinaryFile(proprietaire.photo, 'image');
    }

    let photoUrl = proprietaire.photo;
    if (req.files?.photo?.[0]?.buffer) {
      photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
    }

    // Update
    await proprietaire.update({
      nom: req.body.nom || proprietaire.nom,
      sexe: req.body.sexe || proprietaire.sexe,
      telephone: req.body.telephone || proprietaire.telephone,
      email: req.body.email || proprietaire.email,
      quartier: req.body.quartier || proprietaire.quartier,
      photo: photoUrl,
      ...(req.body.password && { password: await bcrypt.hash(req.body.password, 12) })
    });

    console.log(`✅ Mis à jour: ${proprietaire.nom}`);
    res.json(proprietaire);
  } catch (error) {
    console.error('❌ UPDATE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fonctions inchangées
const getAllProprietaires = async (req, res) => {
  try {
    const proprietaires = await Proprietaire.findAll({
      order: [['isActive', 'DESC'], ['createdAt', 'DESC']]
    });
    logger.info(`✅ Propriétaires: ${proprietaires.length}`);
    res.json(proprietaires);
  } catch (error) {
    logger.error('Erreur getAllProprietaires:', error);
    res.status(500).json({ error: 'Erreur récupération propriétaires' });
  }
};

const getProprietaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    if (!proprietaire) return res.status(404).json({ error: 'Propriétaire non trouvé' });
    res.json(proprietaire);
  } catch (error) {
    logger.error('Erreur getProprietaire:', error);
    res.status(500).json({ error: 'Erreur propriétaire' });
  }
};

const deleteProprietaire = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    
    if (!proprietaire) return res.status(404).json({ error: 'Propriétaire non trouvé' });

    if (proprietaire.photo) {
      await deleteCloudinaryFile(proprietaire.photo, 'image');
      logger.info(`✅ DELETE IMAGE: ${getPublicIdFromUrl(proprietaire.photo)}`);
    }

    await proprietaire.destroy();
    logger.info(`✅ Propriétaire supprimé: ${proprietaire.nom}`);
    res.json({ message: 'Propriétaire supprimé' });
  } catch (error) {
    logger.error('❌ Erreur deleteProprietaire:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
};

const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    
    if (!proprietaire) return res.status(404).json({ error: 'Propriétaire non trouvé' });

    proprietaire.isActive = !proprietaire.isActive;
    await proprietaire.save();

    res.json({ 
      message: `Propriétaire ${proprietaire.isActive ? 'activé' : 'désactivé'}`,
      isActive: proprietaire.isActive 
    });
  } catch (error) {
    logger.error('❌ Erreur toggleActive:', error);
    res.status(500).json({ error: 'Erreur statut' });
  }
};

// ✅ UTILITAIRE mot de passe sécurisé
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

module.exports = {
  getAllProprietaires,
  getProprietaireById,
  createProprietaire,
  updateProprietaire,
  deleteProprietaire,
  toggleActive
};