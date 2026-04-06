// controllers/clientShopController.js - ✅ FICHIER COMPLET À JOUR (100% fonctionnel)

const { Boutique, ProduitLongrich, Proprietaire, Service } = require('../models');


// GET /api/boutique/:url - Récupère config boutique + propriétaire + services actifs
const getBoutiqueConfig = async (req, res) => {
  try {
    const { url } = req.params;
    
    const boutique = await Boutique.findOne({
      where: { 
        urlPersonnalisee: url, 
        isActive: true 
      },
      include: [
        {
          model: Proprietaire, 
          as: 'monProprietaire',
          attributes: ['nom', 'sexe', 'photo']
        }
      ]
    });

    if (!boutique) {
      return res.status(404).json({ 
        error: 'Boutique introuvable ou inactive' 
      });
    }

    // ✅ Services actifs - LOGIQUE COMPLÈTE
    const services = await Service.findAll({
      where: { isActive: true },
      attributes: ['id', 'nom', 'photo', 'description']
    });

    console.log('🔍 Services DB:', services.map(s => s.nom));
    console.log('🏪 Flags boutique:', {
      longrich: boutique.activeProduitsLongrich,
      sante: boutique.activeSante,
      autres: boutique.activeAutresProduits
    });

    // ✅ Filtrage services selon flags boutique
    const servicesFiltres = services.map(s => ({
      ...s.toJSON(),
      active: 
        (boutique.activeProduitsLongrich && (
          s.nom.includes('LONG RICH') || 
          s.nom.includes('PRODUITS')
        )) ||
        (boutique.activeSante && s.nom.includes('SANTE')) ||
        (boutique.activeAutresProduits && s.nom.includes('AUTRE'))
    }));

    const servicesActifs = servicesFiltres.filter(s => s.active);
    console.log('✅ Services actifs:', servicesActifs.map(s => s.nom));

    res.json({
      id: boutique.id,
      nom: boutique.nom,
      url: boutique.urlPersonnalisee,
      proprietaire: {
        nom: boutique.monProprietaire.nom,
        sexe: boutique.monProprietaire.sexe,
        photo: boutique.monProprietaire.photo
      },
      services: servicesActifs,  // ✅ Services filtrés selon flags boutique
      activeProduitsLongrich: boutique.activeProduitsLongrich || false,
      activeSante: boutique.activeSante || false,
      activeAutresProduits: boutique.activeAutresProduits || false,
      theme: {
        primaire: boutique.themeCouleurPrimaire || '#10b981',
        secondaire: boutique.themeCouleurSecondaire || '#0f172a'
      }
    });
  } catch (error) {
    console.error('❌ getBoutiqueConfig ERROR:', error);
    res.status(500).json({ error: 'Erreur serveur boutique' });
  }
};


// GET /api/boutique/:url/produits - Produits Longrich groupés par catégorie
const getBoutiqueProduits = async (req, res) => {
  try {
    const { url } = req.params;
    
    const boutique = await Boutique.findOne({
      where: { 
        urlPersonnalisee: url, 
        isActive: true
      }
    });

    if (!boutique) {
      return res.status(404).json({ 
        error: 'Boutique introuvable' 
      });
    }

    // ✅ Vérification flag + fallback pour test
    if (!boutique.activeProduitsLongrich) {
      return res.status(403).json({ 
        error: 'Produits Longrich non activés pour cette boutique' 
      });
    }

    const produits = await ProduitLongrich.findAll({
      where: { isActive: true },
      order: [['categorie', 'ASC'], ['nom', 'ASC']]
    });

    console.log(`✅ ${produits.length} produits Longrich pour ${url}`);

    // Groupement par catégorie + prix promo
    const produitsParCategorie = produits.reduce((acc, produit) => {
      const categorie = produit.categorie || 'sans_categorie';
      if (!acc[categorie]) acc[categorie] = [];
      
      acc[categorie].push({
        ...produit.toJSON(),
        prixAffiche: produit.promoActive && produit.prixPromo > 0 
          ? produit.prixPromo 
          : produit.prixClient
      });
      return acc;
    }, {});

    res.json(produitsParCategorie);
  } catch (error) {
    console.error('❌ getBoutiqueProduits ERROR:', error);
    res.status(500).json({ error: 'Erreur chargement produits' });
  }
};

module.exports = {
  getBoutiqueConfig,
  getBoutiqueProduits
};
