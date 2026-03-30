const { ProduitLongrich } = require('../models');
const { 
  uploadFiles, 
  uploadToCloudinary, 
  deleteCloudinaryFile, 
  getPublicIdFromUrl 
} = require('../config/cloudinary');
const logger = require('../config/logger');

const getAllProduits = async (req, res) => {
  try {
    const produits = await ProduitLongrich.findAll({
      where: { isActive: true },
      order: [['categorie', 'ASC'], ['nom', 'ASC']]
    });
    res.json(produits);
  } catch (error) {
    logger.error('Erreur getAllProduits:', error);
    res.status(500).json({ error: 'Erreur récupération produits' });
  }
};

const getProduitById = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    if (!produit) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(produit);
  } catch (error) {
    logger.error('Erreur getProduit:', error);
    res.status(500).json({ error: 'Erreur produit' });
  }
};

const createProduit = async (req, res) => {
  uploadFiles(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      let photoUrl = req.body.photo;
      let videoUrl = req.body.videoDemo;

      // Upload photo si fichier
      if (req.files?.photo?.[0]?.buffer) {
        photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
      }

      // Upload vidéo si fichier
      if (req.files?.videoDemoFile?.[0]?.buffer) {
        videoUrl = await uploadToCloudinary(req.files.videoDemoFile[0].buffer, 'video');
      }

      const produit = await ProduitLongrich.create({
        ...req.body,
        photo: photoUrl,
        videoDemo: videoUrl || null,
        prixPromo: req.body.prixPromo || null
      });

      logger.info(`✅ Produit créé: ${produit.nom}`);
      res.status(201).json(produit);
    } catch (error) {
      logger.error('❌ Erreur createProduit:', error);
      res.status(500).json({ error: 'Erreur création produit' });
    }
  });
};

const updateProduit = async (req, res) => {
  const { id } = req.params;
  
  uploadFiles(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const produit = await ProduitLongrich.findByPk(id);
      if (!produit) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      // Suppression anciennes images si nouvelles uploadées
      if (req.files?.photo?.[0]?.buffer && produit.photo) {
        await deleteCloudinaryFile(produit.photo, 'image');
      }
      if (req.files?.videoDemoFile?.[0]?.buffer && produit.videoDemo) {
        await deleteCloudinaryFile(produit.videoDemo, 'video');
      }

      let photoUrl = req.body.photo || produit.photo;
      let videoUrl = req.body.videoDemo || produit.videoDemo;

      // Upload nouvelles images
      if (req.files?.photo?.[0]?.buffer) {
        photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, 'image');
      }
      if (req.files?.videoDemoFile?.[0]?.buffer) {
        videoUrl = await uploadToCloudinary(req.files.videoDemoFile[0].buffer, 'video');
      }

      await produit.update({
        ...req.body,
        photo: photoUrl,
        videoDemo: videoUrl,
        prixPromo: req.body.prixPromo || null
      });

      logger.info(`✅ Produit mis à jour: ${produit.nom}`);
      res.json(produit);
    } catch (error) {
      logger.error('❌ Erreur updateProduit:', error);
      res.status(500).json({ error: 'Erreur mise à jour' });
    }
  });
};

const deleteProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Supprimer images Cloudinary
    if (produit.photo) await deleteCloudinaryFile(produit.photo, 'image');
    if (produit.videoDemo) await deleteCloudinaryFile(produit.videoDemo, 'video');

    await produit.destroy();
    logger.info(`✅ Produit supprimé: ${produit.nom}`);
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    logger.error('❌ Erreur deleteProduit:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
};

const togglePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const produit = await ProduitLongrich.findByPk(id);
    
    if (!produit) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    produit.promoActive = !produit.promoActive;
    await produit.save();

    res.json({ 
      message: `Promo ${produit.promoActive ? 'activée' : 'désactivée'}`,
      promoActive: produit.promoActive 
    });
  } catch (error) {
    logger.error('❌ Erreur togglePromo:', error);
    res.status(500).json({ error: 'Erreur promo' });
  }
};

module.exports = {
  getAllProduits,
  getProduitById,
  createProduit,
  updateProduit,
  deleteProduit,
  togglePromo
};