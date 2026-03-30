const logger = require('../config/logger');
const { sendSecurityAlert } = require('../config/mailer');
const { LogsSecurite } = require('../models');
const { blockedIPs } = require('../middleware/detectAttaques');

const handleSecurityAlert = async (typeAttaque, ip, donneesSuspectes, userAgent) => {
  try {
    // Log en DB
    await LogsSecurite.create({
      ip,
      typeAttaque,
      donneesSuspectes,
      userAgent,
      blocked: true
    });

    // Émettre temps réel vers admin-watchdog
    const adminWatchdog = require('../server').adminWatchdog;
    if (adminWatchdog) {
      adminWatchdog.emit('new_security_log', {
        ip, typeAttaque, createdAt: new Date()
      });
    }

    // Alerte email pour attaques critiques
    if (['DDOS', 'SQLi'].includes(typeAttaque)) {
      await sendSecurityAlert(
        `🚨 ATTAQUE ${typeAttaque}`,
        `IP bloquée: ${ip}\nDonnées: ${JSON.stringify(donneesSuspectes).slice(0, 1000)}`,
        ip
      );
    }

    logger.error(`🚨 ${typeAttaque} bloquée: ${ip}`);
  } catch (error) {
    logger.error('❌ Erreur handler alerte:', error);
  }
};

module.exports = handleSecurityAlert;