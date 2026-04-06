require('dotenv').config();
const express = require('express');
const http = require('http');
const { sequelize, connect } = require('./config/database');
const securityMiddleware = require('./config/security');
const logger = require('./config/logger');
const monitoringRawData = require('./middleware/monitoringRawData');
const gestionErreurs = require('./middleware/erreursGestion');
const detectAttaques = require('./middleware/detectAttaques').detectAttaques;
const initSockets = require('./config/socket');

// ✅ VAGUE 5 : Routes Client (PUBLIQUES)
const clientRoutes = require('./routes/clientRoutes');

// ✅ Routes Admin (PROTÉGÉES)
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// =========================================
// 🛡️ MIDDLEWARES SÉCURITÉ (ORDRE CRITIQUE)
// =========================================
app.use(detectAttaques);  // ✅ 1er : Détecte attaques
securityMiddleware.forEach(middleware => app.use(middleware));  // ✅ Helmet, CORS, etc.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/logs', express.static('logs'));
app.use(monitoringRawData);  // ✅ Monitoring perf

// =========================================
// 🩺 HEALTHCHECK (Railway/Heroku)
// =========================================
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() }));

// =========================================
// 🚀 ROUTES (ORDRE IMPORTANT)
// =========================================
// ✅ 1. Routes CLIENT PUBLIQUES (Vague 5)
app.use('/api', clientRoutes);

// ✅ 2. Routes ADMIN PROTÉGÉES
app.use('/api/admin', adminRoutes);

// =========================================
// ❌ 404 + ERREURS GLOBALES
// =========================================
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ✅ Gestion erreurs globale (DERNier)
app.use(gestionErreurs);

// =========================================
// 🗄️ INITIALISATION DB + SOCKETS
// =========================================
const initApp = async () => {
  try {
    await connect();
    const io = initSockets(server, securityMiddleware);
    server.io = io;
    
    server.listen(PORT, () => {
      console.log(`\n🚀 SERVEUR MEGA ECOMMERCE v5 ✅`);
      console.log(`📍 PORT: ${PORT}`);
      console.log(`🛡️ Sécurité Watchdog ACTIVÉ`);
      console.log(`🔌 Socket /admin-watchdog PRÊT`);
      console.log(`🌐 API Client: /api/boutique/:url ✅`);
      console.log(`🔐 API Admin: /api/admin/* 🔒`);
      console.log(`\n`);
    });
  } catch (error) {
    logger.error('❌ ÉCHEC Démarrage Serveur:', error);
    process.exit(1);
  }
};

initApp();

module.exports = server; // Export pour controllers