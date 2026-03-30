const { Service } = require('../models');
const { uploadToCloudinary, deleteCloudinaryFile } = require('../config/cloudinary');

const getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      where: { isActive: true },
      order: [['nom', 'ASC']]
    });
    res.json(services);
  } catch (error) {
    console.error('❌ GET SERVICES:', error);
    res.status(500).json({ error: 'Erreur services' });
  }
};

const createService = async (req, res) => {
  try {
    let photoUrl = 'https://via.placeholder.com/300x200?text=SERVICE';
    
    const fileBuffer = req.file?.buffer || (req.files?.photo?.[0]?.buffer);
    if (fileBuffer) {
      photoUrl = await uploadToCloudinary(fileBuffer, 'image');
    }

    const service = await Service.create({
      nom: req.body.nom,
      description: req.body.description,
      photo: photoUrl,
      isActive: true
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('❌ CREATE SERVICE:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findByPk(id);
    if (!service) return res.status(404).json({ error: 'Service non trouvé' });

    const fileBuffer = req.file?.buffer || (req.files?.photo?.[0]?.buffer);
    if (fileBuffer) {
      if (service.photo !== 'https://via.placeholder.com/300x200?text=SERVICE') {
        await deleteCloudinaryFile(service.photo);
      }
      service.photo = await uploadToCloudinary(fileBuffer, 'image');
    }

    await service.update({
      nom: req.body.nom || service.nom,
      description: req.body.description || service.description,
      isActive: req.body.isActive !== undefined ? req.body.isActive : service.isActive
    });

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findByPk(id);
    if (!service) return res.status(404).json({ error: 'Non trouvé' });

    service.isActive = !service.isActive;
    await service.save();
    res.json({ isActive: service.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Erreur toggle' });
  }
};

const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await Service.findByPk(id);
    if (!service) return res.status(404).json({ error: 'Non trouvé' });

    if (service.photo !== 'https://via.placeholder.com/300x200?text=SERVICE') {
      await deleteCloudinaryFile(service.photo);
    }
    await service.destroy();
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllServices,
  createService,
  updateService,
  toggleService,
  deleteService
};