const { Boutique, Proprietaire } = require('../models'); // ✅ IMPORT Proprietaire
const { sendProprietaireCredentials } = require('../utils/sendEmail'); // ✅ IMPORT Email
const { sendBoutiqueNotification } = require('../utils/sendBoutiqueNotification'); // ✅ NOUVEAU IMPORT
const logger = require('../config/logger');


const createBoutique = async (req, res) => {
  try {
    const { nom, type, urlPersonnalisee, proprietaireId, activeProduitsLongrich, activeSante, activeAutresProduits } = req.body;
    
    // Vérifier unicité URL
    const existing = await Boutique.findOne({ where: { urlPersonnalisee } });
    if (existing) {
      return res.status(400).json({ error: 'URL personnalisée déjà utilisée' });
    }

    // ✅ VÉRIFIER propriétaire existe
    const proprietaire = await Proprietaire.findByPk(proprietaireId);
    if (!proprietaire) {
      return res.status(404).json({ error: 'Propriétaire non trouvé' });
    }

    // Vérifier que le propriétaire a un email
    if (!proprietaire.email) {
      console.warn(`⚠️ Propriétaire ${proprietaire.nom} n'a pas d'email, notification ignorée`);
    }

    const boutique = await Boutique.create({
      nom,
      type,
      urlPersonnalisee,
      proprietaireId,
      activeProduitsLongrich: activeProduitsLongrich || false,
      activeSante: activeSante || false,
      activeAutresProduits: activeAutresProduits || false,
      isActive: true
    });

    const urlBoutique = boutique.urlPersonnalisee; // Juste l'URL personnalisée

    // ✅ ENVOI NOTIFICATION BOUTIQUE (UNIQUEMENT si email existe)
    if (proprietaire.email) {
      try {
        await sendBoutiqueNotification({
          email: proprietaire.email,
          nom: proprietaire.nom,
          telephone: proprietaire.telephone || 'Non renseigné',
          nomBoutique: boutique.nom,
          urlBoutique: urlBoutique
        });
        logger.info(`📧 Email boutique envoyé à ${proprietaire.email}`);
      } catch (emailError) {
        console.warn('⚠️ Email boutique échoué mais boutique créée:', emailError.message);
        // Continue malgré l'erreur email
      }
    }

    logger.info(`✅ Boutique créée: ${nom} (${urlPersonnalisee})`);
    
    res.status(201).json({
      ...boutique.toJSON(),
      message: "🎉 Boutique créée avec succès !",
      proprietaire: {
        nom: proprietaire.nom,
        email: proprietaire.email || 'Non configuré',
        telephone: proprietaire.telephone || 'Non renseigné'
      }
    });

  } catch (error) {
    console.error('❌ createBoutique FULL ERROR:', error);
    logger.error('❌ Erreur createBoutique:', error);
    res.status(500).json({ error: 'Erreur création boutique', details: error.message });
  }
};


const getAllBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.findAll({
      include: [{ model: require('../models').Proprietaire, as: 'monProprietaire' }],
      order: [['isActive', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(boutiques);
  } catch (error) {
    logger.error('Erreur getAllBoutiques:', error);
    res.status(500).json({ error: 'Erreur récupération boutiques' });
  }
};

const toggleBoutiqueActive = async (req, res) => {
  try {
    const { id } = req.params;
    const boutique = await Boutique.findByPk(id);
    
    if (!boutique) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    boutique.isActive = !boutique.isActive;
    await boutique.save();

    res.json({
      message: `Boutique ${boutique.isActive ? 'activée' : 'désactivée'}`,
      isActive: boutique.isActive
    });

  } catch (error) {
    logger.error('Erreur toggleBoutique:', error);
    res.status(500).json({ error: 'Erreur statut boutique' });
  }
};
// ✅ AJOUTEZ CETTE FONCTION
const deleteBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const boutique = await Boutique.findByPk(id, {
      include: [{ model: require('../models').Proprietaire, as: 'monProprietaire' }]
    });
    
    if (!boutique) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    await boutique.destroy();
    
    logger.info(`🗑️ Boutique supprimée: ${boutique.nom} (${boutique.urlPersonnalisee})`);
    
    res.json({ 
      message: 'Boutique supprimée avec succès',
      nom: boutique.nom 
    });
  } catch (error) {
    logger.error('Erreur deleteBoutique:', error);
    res.status(500).json({ error: 'Erreur suppression boutique' });
  }
};

// ✅ METTRE À JOUR LES EXPORTS
module.exports = {
  createBoutique,
  getAllBoutiques,
  toggleBoutiqueActive,
  deleteBoutique  // ✅ AJOUTEZ CETTE LIGNE
};
