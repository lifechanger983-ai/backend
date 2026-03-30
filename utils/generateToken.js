const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const generateToken = (payload, expiresIn = '7d') => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    return token;
  } catch (error) {
    logger.error('❌ Token generation failed:', error);
    throw new Error('Erreur génération token');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.warn('⚠️ Token invalide:', error.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };