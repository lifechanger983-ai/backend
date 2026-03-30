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
const clientRoutes = require('./routes/clientRoutes');

const adminRoutes = require('./routes/adminRoutes');


const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middlewares sécurité (ORDRE CRITIQUE)
app.use(detectAttaques);
securityMiddleware.forEach(middleware => app.use(middleware));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/logs', express.static('logs'));
app.use(monitoringRawData);

// Healthcheck Railway
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Routes
app.use('/api', clientRoutes);
app.use('/api/admin', adminRoutes);


// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion erreurs globale
app.use(gestionErreurs);

// Initialiser DB + Sockets
const initApp = async () => {
  try {
    await connect();
    const io = initSockets(server, securityMiddleware);
    server.io = io;
    
    server.listen(PORT, () => {
      console.log(`🚀 Serveur MEGA ECOMMERCE sur PORT ${PORT}`);
      console.log(`🛡️ Sécurité Watchdog ACTIVÉ`);
      console.log(`🔌 Socket /admin-watchdog prêt`);
    });
  } catch (error) {
    logger.error('❌ ÉCHEC démarrage:', error);
    process.exit(1);
  }
};

initApp();

module.exports = server; // Export pour controllers