// ✅ packSanteController.js - VAGUE 4 100% FONCTIONNEL
const { Sante } = require('../models');
const { 
  uploadFiles, 
  uploadToCloudinary, 
  deleteCloudinaryFile 
} = require('../config/cloudinary');
const logger = require('../config/logger');

const getAllPacksSante = async (req, res) => {
  try {
    console.log('🔍 GET ALL PACKS SANTÉ');
    const packs = await Sante.findAll({
      where: { isActive: true },
      order: [['categorie', 'ASC'], ['probleme', 'ASC']]
    });
    console.log(`✅ ${packs.length} packs santé trouvés`);
    res.json(packs);
  } catch (error) {
    logger.error('❌ GET PACKS SANTÉ:', error);
    res.status(500).json({ error: 'Erreur packs santé' });
  }
};

const getPackSanteById = async (req, res) => {
  try {
    const pack = await Sante.findByPk(req.params.id);
    if (!pack) return res.status(404).json({ error: 'Pack non trouvé' });
    res.json(pack);
  } catch (error) {
    logger.error('❌ GET PACK ID:', error);
    res.status(500).json({ error: 'Erreur pack' });
  }
};

// ✅ CREATE - BUFFER MEMORY 100%
const createPackSante = async (req, res) => {
  uploadFiles(req, res, async (err) => {
    if (err) {
      console.error('❌ MULTER CREATE ERROR:', err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      console.log('🚀 CREATE PACK SANTÉ START');
      console.log('📋 BODY:', req.body);
      console.log('📁 FILES:', Object.keys(req.files || {}));

      // DEBUG VIDÉO CRITIQUE
      if (req.files?.videoDemoFile?.[0]) {
        const file = req.files.videoDemoFile[0];
        console.log('🎥 BUFFER INFO:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          bufferLength: file.buffer?.length || 0
        });
      }

      let videoDemoUrl = null;
      if (req.files?.videoDemoFile?.[0]?.buffer) {
        console.log('🎥 UPLOAD VIDÉO START');
        videoDemoUrl = await uploadToCloudinary(req.files.videoDemoFile[0].buffer, 'video');
        console.log('✅ VIDÉO UPLOADED:', videoDemoUrl);
      }

      const pack = await Sante.create({
        categorie: req.body.categorie,
        probleme: req.body.probleme,
        consigneUtilisation: req.body.consigneUtilisation,
        packProduits: req.body.packProduits,  // ✅ JSON direct
        videoDemo: videoDemoUrl,
        isActive: true
      });

      console.log('✅ Pack créé ID:', pack.id);
      res.status(201).json(pack);
    } catch (error) {
      console.error('❌ CREATE PACK ERROR:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
};

// ✅ UPDATE - IDENTIQUE CREATE (callback MULTER)
const updatePackSante = async (req, res) => {
  const { id } = req.params;
  
  uploadFiles(req, res, async (err) => {
    if (err) {
      console.error('❌ MULTER UPDATE ERROR:', err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      console.log('🔄 UPDATE PACK START ID:', id);
      console.log('📋 UPDATE BODY:', req.body);
      console.log('📁 UPDATE FILES:', Object.keys(req.files || {}));

      const pack = await Sante.findByPk(id);
      if (!pack) return res.status(404).json({ error: 'Pack non trouvé' });

      // Supprimer ancienne vidéo SI nouvelle
      if (req.files?.videoDemoFile?.[0]?.buffer && pack.videoDemo) {
        console.log('🗑️ DELETE OLD VIDEO:', pack.videoDemo);
        await deleteCloudinaryFile(pack.videoDemo, 'video');
      }

      let videoDemoUrl = pack.videoDemo;
      if (req.files?.videoDemoFile?.[0]?.buffer) {
        console.log('🎥 NEW VIDEO UPLOAD');
        videoDemoUrl = await uploadToCloudinary(req.files.videoDemoFile[0].buffer, 'video');
        console.log('✅ NEW VIDEO URL:', videoDemoUrl);
      }

      await pack.update({
        categorie: req.body.categorie || pack.categorie,
        probleme: req.body.probleme || pack.probleme,
        consigneUtilisation: req.body.consigneUtilisation || pack.consigneUtilisation,
        packProduits: req.body.packProduits || pack.packProduits,
        videoDemo: videoDemoUrl
      });

      console.log('✅ Pack mis à jour ID:', pack.id);
      res.json(pack);
    } catch (error) {
      console.error('❌ UPDATE PACK ERROR:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
};

// ✅ TOGGLE
const togglePackSante = async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await Sante.findByPk(id);
    
    if (!pack) return res.status(404).json({ error: 'Pack non trouvé' });

    pack.isActive = !pack.isActive;
    await pack.save();

    console.log(`✅ Pack ${pack.isActive ? 'activé' : 'désactivé'} ID:`, pack.id);
    res.json({ isActive: pack.isActive, id: pack.id });
  } catch (error) {
    console.error('❌ TOGGLE ERROR:', error);
    res.status(500).json({ error: 'Erreur toggle' });
  }
};

// ✅ DELETE + NETTOYAGE VIDÉO
const deletePackSante = async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await Sante.findByPk(id);
    
    if (!pack) return res.status(404).json({ error: 'Pack non trouvé' });

    if (pack.videoDemo) {
      console.log('🗑️ DELETE VIDEO:', pack.videoDemo);
      await deleteCloudinaryFile(pack.videoDemo, 'video');
    }

    await pack.destroy();
    console.log('✅ Pack supprimé ID:', id);
    res.json({ message: 'Pack supprimé avec succès', id });
  } catch (error) {
    console.error('❌ DELETE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllPacksSante,
  getPackSanteById,
  createPackSante,
  updatePackSante,
  togglePackSante,
  deletePackSante
};