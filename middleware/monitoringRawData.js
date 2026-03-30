const logger = require('../config/logger');

const monitoringRawData = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms
    
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Math.round(duration * 100) / 100,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      responseSize: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString()
    };

    // Log erreurs 5xx et lenteurs
    if (res.statusCode >= 500 || duration > 1000) {
      logger.warn('PERF ISSUE:', logData);
    }

    // Émettre via socket pour dashboard temps réel
    const io = req.app.get('io');
    if (io) {
      io.of('/admin-watchdog').emit('perf_metrics', logData);
    }
  });

  next();
};

module.exports = monitoringRawData;