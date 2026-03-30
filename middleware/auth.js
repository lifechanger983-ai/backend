const { verifyToken } = require('../utils/generateToken');
const logger = require('../config/logger');

const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  req.user = decoded;
  next();
};

module.exports = authAdmin;