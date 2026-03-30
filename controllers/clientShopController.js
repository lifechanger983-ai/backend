const { Boutique, ProduitLongrich } = require('../models');

// GET /api/boutique/:urlBoutique/config - Config boutique + thème
const getBoutiqueConfig = async (req, res) => {
  try {
    const { urlBoutique } = req.params;
    const boutique = await Boutique.findOne({
      where: { urlPersonnalisee: urlBoutique, isActive: true },
      attributes: ['id', 'nom', 'urlPersonnalisee', 'themeCouleurPrimaire', 'themeCouleurSecondaire']
    });

    if (!boutique) {
      return res.status(404).json({ error: 'Boutique introuvable ou inactive' });
    }

    res.json({
      id: boutique.id,
      nom: boutique.nom,
      url: boutique.urlPersonnalisee,
      theme: {
        primaire: boutique.themeCouleurPrimaire || '#10b981',
        secondaire: boutique.themeCouleurSecondaire || '#0f172a'
      }
    });
  } catch (error) {
    console.error('getBoutiqueConfig', error);
    res.status(500).json({ error: 'Erreur serveur boutique' });
  }
};

// GET /api/boutique/:urlBoutique/produits - Produits Longrich actifs
const getBoutiqueProduits = async (req, res) => {
  try {
    const { urlBoutique } = req.params;
    const boutique = await Boutique.findOne({
      where: { urlPersonnalisee: urlBoutique, isActive: true },
      attributes: ['id']
    });

    if (!boutique) {
      return res.status(404).json({ error: 'Boutique introuvable ou inactive' });
    }

    const produits = await ProduitLongrich.findAll({
      where: { isActive: true },
      order: [['categorie', 'ASC'], ['nom', 'ASC']]
    });

    res.json(produits);
  } catch (error) {
    console.error('getBoutiqueProduits', error);
    res.status(500).json({ error: 'Erreur chargement produits' });
  }
};

module.exports = { getBoutiqueConfig, getBoutiqueProduits };
