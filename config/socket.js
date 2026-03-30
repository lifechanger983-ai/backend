const socketIo = require('socket.io');

const initSockets = (server, securityMiddleware) => {
  const io = socketIo(server, {
    cors: {
      origin: [process.env.FRONTEND_LOCAL_URL, process.env.FRONTEND_VERCEL_URL],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Namespace sécurité Super Admin
  const adminWatchdog = io.of('/admin-watchdog');
  adminWatchdog.on('connection', (socket) => {
    console.log('🛡️ Admin Watchdog connecté:', socket.id);
    
    // Émettre stats sécurité (sera utilisé par frontend)
    socket.emit('security_stats', {
      totalAttacks: 0,
      blockedIPs: []
    });

    socket.on('disconnect', () => {
      console.log('🔌 Admin Watchdog déconnecté');
    });
  });

  // Sauvegarder io pour middleware monitoring
  server.io = io;
  server.adminWatchdog = adminWatchdog;

  console.log('✅ Sockets initialisés (admin-watchdog)');
  return io;
};

module.exports = initSockets;