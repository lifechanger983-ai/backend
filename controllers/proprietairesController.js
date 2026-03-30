require('dotenv').config();  // ✅ Chargement .env
const { Proprietaire } = require('../models');
const bcrypt = require('bcryptjs');
const { sendProprietaireCredentials } = require('../utils/sendEmail');
const { uploadToCloudinary, deleteCloudinaryFile } = require('../config/cloudinary');
const logger = require('../config/logger');

// ✅ URL Frontend dynamique
const getFrontendUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' 
    ? process.env.FRONTEND_VERCEL_URL 
    : process.env.FRONTEND_LOCAL_URL;
};

const createProprietaire = async (req, res) => {
  // ✅ REPONSE IMMÉDIATE pour éviter timeout frontend
  const responseSent = { sent: false };
  
  setImmediate(() => {
    if (!responseSent.sent) {
      res.status(202).json({ 
        message: 'Propriétaire en cours de création...', 
        id: 'processing' 
      });
      responseSent.sent = true;
    }
  });

  try {
    console.log('📤 POST /proprietaires - req.body:', req.body);
    console.log('📤 req.files:', req.files ? Object.keys(req.files) : 'Aucun fichier');

    const { nom, sexe, telephone, email, quartier, password } = req.body;
    
    // Validation
    if (!nom || !telephone || !password) {
      if (!responseSent.sent) {
        return res.status(400).json({ error: 'Nom, téléphone et mot de passe obligatoires' });
      }
      return;
    }

    // Vérifier téléphone unique
    const existing = await Proprietaire.findOne({ where: { telephone } });
    if (existing) {
      if (!responseSent.sent) {
        return res.status(400).json({ error: 'Téléphone déjà utilisé' });
      }
      return;
    }

    // Hacher mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Photo PARALLÈLE (non-bloquant)
    let photoUrl = null;
    if (req.files && req.files.photo && req.files.photo[0]) {
      console.log('🖼️ Upload photo:', req.files.photo[0].originalname);
      // Fire & forget - ne bloque pas la réponse
      (async () => {
        try {
          photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
          console.log('✅ Photo uploadée:', photoUrl);
        } catch (photoError) {
          console.error('⚠️ Photo échouée:', photoError.message);
        }
      })();
    }

    // Créer propriétaire
    const proprietaire = await Proprietaire.create({
      nom: nom.trim(),
      sexe,
      telephone: telephone.trim(),
      email: email?.trim() || null, 
      password: passwordHash, 
      quartier: quartier?.trim() || null, 
      photo: photoUrl || null, 
      isActive: true
    });

    // ✅ ENVOYER RÉPONSE FINALE RAPIDE
    if (!responseSent.sent) {
      logger.info(`✅ Propriétaire créé: ${nom} (${telephone})`);
      res.status(201).json({
        id: proprietaire.id,
        nom: proprietaire.nom,
        telephone: proprietaire.telephone,
        email: proprietaire.email,
        isActive: proprietaire.isActive,
        photo: proprietaire.photo
      });
      responseSent.sent = true;
    }

    // Email ASYNCHRONE (non-bloquant)
    if (email) {
      (async () => {
        try {
          const frontendUrl = getFrontendUrl();
          await sendProprietaireCredentials(
            email, nom, telephone, password,
            `${frontendUrl}/proprietaires/login`  // ✅ URL .env
          );
          console.log('✅ Email envoyé:', email);
        } catch (emailError) {
          console.warn('⚠️ Email échoué:', emailError.message);
        }
      })();
    }

  } catch (error) {
    console.error('❌ createProprietaire FULL ERROR:', error);
    if (!responseSent.sent) {
      res.status(500).json({ error: `Erreur création: ${error.message}` });
    }
  }
};

const updateProprietaire = async (req, res) => {
  try {
    console.log('📤 PUT /proprietaires - req.body:', req.body);
    console.log('📤 req.files:', req.files ? Object.keys(req.files) : 'Aucun fichier');

    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    
    if (!proprietaire) {
      return res.status(404).json({ error: 'Propriétaire non trouvé' });
    }

    // Photo ASYNCHRONE
    let photoUrl = proprietaire.photo;
    if (req.files && req.files.photo && req.files.photo[0]) {
      (async () => {
        try {
          if (proprietaire.photo) {
            await deleteCloudinaryFile(proprietaire.photo);
          }
          photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
          console.log('✅ Photo mise à jour:', photoUrl);
        } catch (photoError) {
          console.error('⚠️ Photo update échouée:', photoError.message);
        }
      })();
    }

    // Updates
    const updates = {
      nom: req.body.nom?.trim() || proprietaire.nom,
      sexe: req.body.sexe || proprietaire.sexe,
      telephone: req.body.telephone?.trim() || proprietaire.telephone,
      email: req.body.email?.trim() || proprietaire.email,
      quartier: req.body.quartier?.trim() || proprietaire.quartier,
      photo: photoUrl
    };

    if (req.body.password) {
      updates.password = await bcrypt.hash(req.body.password, 12);
    }

    await proprietaire.update(updates);
    
    res.json({
      message: 'Mis à jour',
      proprietaire: {
        id: proprietaire.id,
        nom: updates.nom,
        telephone: updates.telephone,
        email: updates.email,
        isActive: proprietaire.isActive,
        photo: updates.photo
      }
    });

  } catch (error) {
    console.error('❌ updateProprietaire:', error);
    res.status(500).json({ error: `Erreur mise à jour: ${error.message}` });
  }
};

const getAllProprietaires = async (req, res) => {
  try {
    const proprietaires = await Proprietaire.findAll({
      attributes: { exclude: ['password'] },
      order: [['isActive', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(proprietaires);
  } catch (error) {
    console.error('❌ getAllProprietaires:', error);
    res.status(500).json({ error: 'Erreur récupération' });
  }
};

const getProprietaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!proprietaire) {
      return res.status(404).json({ error: 'Non trouvé' });
    }
    res.json(proprietaire);
  } catch (error) {
    console.error('❌ getProprietaire:', error);
    res.status(500).json({ error: 'Erreur récupération' });
  }
};

const toggleProprietaireActive = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    
    if (!proprietaire) {
      return res.status(404).json({ error: 'Non trouvé' });
    }

    proprietaire.isActive = !proprietaire.isActive;
    await proprietaire.save();

    res.json({ isActive: proprietaire.isActive });
  } catch (error) {
    console.error('❌ toggleProprietaire:', error);
    res.status(500).json({ error: 'Erreur statut' });
  }
};

const deleteProprietaire = async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await Proprietaire.findByPk(id);
    
    if (!proprietaire) {
      return res.status(404).json({ error: 'Non trouvé' });
    }

    if (proprietaire.photo) {
      (async () => {
        try {
          await deleteCloudinaryFile(proprietaire.photo);
        } catch (deleteError) {
          console.error('⚠️ Suppression photo échouée:', deleteError.message);
        }
      })();
    }

    await proprietaire.destroy();
    res.json({ message: 'Supprimé' });
  } catch (error) {
    console.error('❌ deleteProprietaire:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
};

module.exports = {
  createProprietaire,
  getAllProprietaires,
  getProprietaireById,
  updateProprietaire,
  toggleProprietaireActive,
  deleteProprietaire
};