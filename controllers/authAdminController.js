const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const { SuperAdmin } = require('../models');
const logger = require('../config/logger');

const checkRegisterAccess = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findOne({ 
      attributes: ['registerLocked'],
      order: [['createdAt', 'ASC']] // Premier créé
    });
    
    if (!superAdmin) {
      // Aucun super admin → Accès OK pour 1er
      return res.json({ access: true });
    }
    
    // Super admin existe → Check verrou + count
    const countAdmins = await SuperAdmin.count();
    const blocked = superAdmin.registerLocked || countAdmins > 1;
    
    if (blocked) {
      logger.warn('🚨 Accès /register bloqué', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        reason: superAdmin.registerLocked ? 'registerLocked' : 'multiple_admins'
      });
    }
    
    res.json({ 
      access: !blocked,
      reason: blocked ? (superAdmin.registerLocked ? 'locked_by_admin' : 'already_exists') : 'ok'
    });
  } catch (error) {
    logger.error('❌ Erreur checkRegisterAccess:', error);
    res.status(500).json({ error: 'Erreur système' });
  }
};

const toggleRegisterLock = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findOne({ 
      where: { isActive: true },
      order: [['createdAt', 'ASC']]
    });
    
    if (!superAdmin) {
      return res.status(404).json({ error: 'Aucun Super Admin actif' });
    }
    
    superAdmin.registerLocked = !superAdmin.registerLocked;
    await superAdmin.save();
    
    logger.info(`🔒 Register ${superAdmin.registerLocked ? 'VERROUILLÉ' : 'DÉVERROUILLÉ'} par Super Admin`);
    
    res.json({ 
      success: true,
      registerLocked: superAdmin.registerLocked,
      message: `Accès register ${superAdmin.registerLocked ? 'désactivé' : 'activé'}` 
    });
  } catch (error) {
    logger.error('❌ Erreur toggleRegisterLock:', error);
    res.status(500).json({ error: 'Erreur toggle' });
  }
};

const registerSuperAdmin = async (req, res) => {
  const { secret } = req.params;
  
  if (secret !== process.env.SUPERADMIN_REGISTER_SECRET_URL) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    // ✅ DOUBLE CHECK : count + registerLocked
    const superAdmin = await SuperAdmin.findOne({ 
      attributes: ['registerLocked'],
      order: [['createdAt', 'ASC']]
    });
    
    const countAdmins = await SuperAdmin.count();
    
    if (superAdmin?.registerLocked || countAdmins > 0) {
      logger.warn('🚨 Tentative création admin bloquée', {
        count: countAdmins,
        locked: superAdmin?.registerLocked,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: "🚨 SUPER ADMIN DÉJÀ CRÉÉ ! Accès interdit.",
        details: "Contactez support@mega-ecom.cm"
      });
    }

    const { nom, email, password, telephone } = req.body;
    
    const existing = await SuperAdmin.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newAdmin = await SuperAdmin.create({
      nom,
      email,
      password: hashedPassword,
      telephone,
      registerLocked: false // Nouveau admin → register déverrouillé
    });

    logger.info(`✅ NOUVEAU Super Admin #1 créé: ${email}`);
    res.status(201).json({ 
      message: '🎉 Premier Super Admin créé avec succès',
      adminId: newAdmin.id 
    });
  } catch (error) {
    logger.error('❌ Erreur registerSuperAdmin:', error);
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

module.exports = { 
  checkRegisterAccess,
  toggleRegisterLock,  // ✅ NOUVEAU
  registerSuperAdmin, 
  loginAdmin 
};
