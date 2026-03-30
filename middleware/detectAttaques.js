const logger = require('../config/logger');
const { sendSecurityAlert } = require('../config/mailer');

const blockedIPs = new Set();
const ATTACK_PATTERNS = {
  SQLi: /'(?:AND|OR)\s+(?:[a-zA-Z0-9_]+)\s*=|UNION\s+SELECT|(?:\b(?:SELECT|INSERT|UPDATE|DELETE)\b\s+\w+\s*\()/i,
  XSS: /<script\b/i,
  DDOS: /\b(?:GET|POST|HEAD|OPTIONS)\s+\/[^\s]*\s+HTTP\/1\.[01]/i,
  PATH_TRAVERSAL: /\.\.[\/\\]/i
};

const detectAttaques = async (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Vérifier IP bloquée
  if (blockedIPs.has(clientIP)) {
    logger.warn(`🚫 IP BLOQUÉE: ${clientIP}`);
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const url = req.originalUrl;
  const body = JSON.stringify(req.body);
  const headers = JSON.stringify(req.headers);

  let attackDetected = null;

  // Détection patterns
  for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(headers)) {
      attackDetected = type;
      
      // Log et alerte pour attaques majeures
      logger.error(`🚨 ATTAQUE ${type}: IP=${clientIP}, URL=${url}`);
      
      blockedIPs.add(clientIP);
      
      if (['SQLi', 'DDOS'].includes(type)) {
        await sendSecurityAlert(
          `🚨 ATTAQUE ${type} DÉTECTÉE`,
          `IP: ${clientIP}\nURL: ${url}\nUser-Agent: ${req.get('User-Agent')}\nBody: ${body.substring(0, 500)}`,
          clientIP
        );
      }
      
      return res.status(403).json({ 
        error: `Attaque ${type} détectée` 
      });
    }
  }

  // Rate limiting par endpoint sensible
  if (/\/admin|\/socket\.io/.test(url)) {
    const now = Date.now();
    req.attackCheck = { ip: clientIP, timestamp: now, userAgent: req.get('User-Agent') };
  }

  next();
};

module.exports = { detectAttaques, blockedIPs };