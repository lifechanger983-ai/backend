const logger = require('../config/logger');

const gestionErreurs = (err, req, res, next) => {
  logger.error('❌ ERREUR:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    ip: req.ip,
    method: req.method
  });

  // Erreurs Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ 
      error: 'Ressource déjà existante' 
    });
  }

  // Erreurs Validation
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ 
      error: 'Données invalides',
      details: err.errors.map(e => e.message)
    });
  }

  // Erreur générique
  res.status(500).json({ 
    error: 'Erreur serveur interne' 
  });
};

module.exports = gestionErreurs;