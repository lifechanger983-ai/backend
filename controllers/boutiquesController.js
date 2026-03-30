const { Boutique } = require('../models');
const logger = require('../config/logger');

const createBoutique = async (req, res) => {
  try {
    const { nom, type, urlPersonnalisee, proprietaireId, activeProduitsLongrich, activeSante, activeAutresProduits } = req.body;
    
    // Vérifier unicité URL
    const existing = await Boutique.findOne({ where: { urlPersonnalisee } });
    if (existing) {
      return res.status(400).json({ error: 'URL personnalisée déjà utilisée' });
    }

    const boutique = await Boutique.create({
      nom,
      type,
      urlPersonnalisee,
      proprietaireId,
      activeProduitsLongrich: activeProduitsLongrich || false,
      activeSante: activeSante || false,
      activeAutresProduits: activeAutresProduits || false
    });

    logger.info(`✅ Boutique créée: ${nom} (${urlPersonnalisee})`);
    res.status(201).json(boutique);

  } catch (error) {
    logger.error('❌ Erreur createBoutique:', error);
    res.status(500).json({ error: 'Erreur création boutique' });
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

module.exports = {
  createBoutique,
  getAllBoutiques,
  toggleBoutiqueActive
};