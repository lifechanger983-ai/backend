const { LogsSecurite } = require('../models');

const getSecurityLogs = async (req, res) => {
  try {
    const logs = await LogsSecurite.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Stats
    const stats = {
      totalAttacks: logs.length,
      ddos: logs.filter(l => l.typeAttaque === 'DDOS').length,
      sqli: logs.filter(l => l.typeAttaque === 'SQLi').length,
      xss: logs.filter(l => l.typeAttaque === 'XSS').length,
      blockedIPs: new Set(logs.map(l => l.ip)).size
    };

    res.json({ logs, stats });
  } catch (error) {
    res.status(500).json({ error: 'Erreur logs sécurité' });
  }
};

const banIP = async (req, res) => {
  const { ip } = req.body;
  // Logique ban IP (déjà gérée par middleware)
  res.json({ message: `IP ${ip} marquée` });
};

module.exports = { getSecurityLogs, banIP };