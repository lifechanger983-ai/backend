const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const { SuperAdmin } = require('../models');
const logger = require('../config/logger');

const registerSuperAdmin = async (req, res) => {
  const { secret } = req.params;
  
  if (secret !== process.env.SUPERADMIN_REGISTER_SECRET_URL) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    const { nom, email, password, telephone } = req.body;
    
    // Vérifier si existe déjà
    const existing = await SuperAdmin.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Super Admin existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const superAdmin = await SuperAdmin.create({
      nom,
      email,
      password: hashedPassword,
      telephone
    });

    logger.info(`✅ Super Admin créé: ${email}`);
    res.status(201).json({ 
      message: 'Super Admin créé avec succès',
      adminId: superAdmin.id 
    });
  } catch (error) {
    logger.error('❌ Erreur register:', error);
    res.status(500).json({ error: 'Erreur création' });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ where: { email } });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Update lastLogin
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken({ 
      id: admin.id, 
      email: admin.email, 
      isSuperAdmin: true 
    });

    logger.info(`🔐 Login Super Admin: ${email}`);
    res.json({ 
      token,
      admin: { id: admin.id, nom: admin.nom, email: admin.email }
    });
  } catch (error) {
    logger.error('❌ Erreur login:', error);
    res.status(500).json({ error: 'Erreur login' });
  }
};

module.exports = { registerSuperAdmin, loginAdmin };