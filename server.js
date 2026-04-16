const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { sequelize } = require('./models');

const adminRoutes = require('./routes/adminRoutes');
const clientRoutes = require('./routes/clientRoutes');

const erreursGestion = require('./middleware/erreursGestion');
const authAdmin = require('./middleware/auth');
const detectAttaques = require('./middleware/detectAttaques');
const monitoringRawData = require('./middleware/monitoringRawData');

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_LOCAL_URL || 'http://localhost:5173',
    process.env.FRONTEND_VERCEL_URL || 'https://longrich.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet());
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes' }
});
app.use('/api/', limiter);

app.use(detectAttaques.detectAttaques);
app.use(monitoringRawData);

// ✅ ROUTES ADAPTÉES AU FRONTEND ACTUEL
app.use('/api', clientRoutes);        // ✅ /api/boutique/rita ← Frontend actuel
app.use('/api/admin', adminRoutes);   // Admin inchangé

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(erreursGestion);

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
  console.log('✅ DB connectée');
  app.listen(PORT, () => {
    console.log(`🚀 Serveur ${PORT} ✅`);
    console.log(`🛒 GET http://localhost:${PORT}/api/boutique/rita`);
    console.log(`🛒 POST http://localhost:${PORT}/api/commandes/creer`);
  });
}).catch(err => console.error('❌ DB:', err));