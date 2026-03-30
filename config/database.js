const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

const databaseUrl = process.env.DATABASE_URL || process.env.RAILWAY_DB_URL;

if (databaseUrl && !databaseUrl.startsWith('#')) {
  // POSTGRES (Railway)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  // MYSQL (Local)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false, // ✅ CORRIGÉ
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    }
  );
}

const connect = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');
    
    // ✅ CRITIQUE : CHARGER TOUS LES MODÈLES AVANT SYNC
    await require('../models/index.js'); // Force chargement SuperAdmin, etc.
    
    // Créer les tables (USE_ALTER_MODE=true dans .env)
    await sequelize.sync({ 
      alter: process.env.USE_ALTER_MODE === 'true', // ✅ Plus sûr que force: true
      logging: console.log 
    });
    
    console.log('✅ TOUTES LES TABLES CRÉÉES/SYNCHRONISÉES');
    return sequelize;
  } catch (error) {
    console.error('❌ Erreur connexion DB:', error.message);
    throw error;
  }
};

module.exports = { sequelize, connect };