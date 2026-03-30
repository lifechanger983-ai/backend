const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const securityMiddleware = [
  // Helmet AVANT CORS (important)
  helmet({
    contentSecurityPolicy: false, // Désactivé temporairement pour debug
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }),

  // ✅ CORS ULTRA-PERMISSIF (LOCAL DEV)
  cors({
    origin: true, // ✅ * TOUT AUTORISÉ localhost
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-register-secret',     // ✅ FIX CORS
      'X-Requested-With'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),

  // Rate limit APRÈS CORS
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Trop de requêtes !',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip
  })
];

module.exports = securityMiddleware;