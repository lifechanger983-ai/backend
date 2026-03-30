const { Sequelize, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ✅ TOUS LES MODÈLES (définis AVANT import externe)
const SuperAdmin = sequelize.define('SuperAdmin', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  telephone: { type: DataTypes.STRING, allowNull: true },
  photo: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  createdBy: { type: DataTypes.STRING, defaultValue: 'SYSTEM' }
}, { tableName: 'super_admins', timestamps: true });

const LogsSecurite = sequelize.define('LogsSecurite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ip: { type: DataTypes.STRING, allowNull: false },
  typeAttaque: { type: DataTypes.STRING, allowNull: false },
  donneesSuspectes: { type: DataTypes.JSON, allowNull: false },
  userAgent: { type: DataTypes.TEXT },
  blocked: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'logs_securite', timestamps: true });

const ProduitLongrich = sequelize.define('ProduitLongrich', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  pv: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  consignePromo: { type: DataTypes.TEXT, allowNull: true },
  prixPartenaire: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  prixClient: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  prixPromo: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  promoActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  categorie: { 
    type: DataTypes.ENUM('soin_sante', 'cosmetique', 'complement_alimentaire', 'electronique', 'electromenager', 'agroalimentaire', 'usage_quotidien', 'textile'), 
    allowNull: false 
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  modeEmploi: { type: DataTypes.TEXT, allowNull: true },
  photo: { type: DataTypes.STRING, allowNull: false },
  videoDemo: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'produits_longrich', timestamps: true });

const Sante = sequelize.define('Sante', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  categorie: { 
    type: DataTypes.ENUM('soin_sante', 'cosmetique', 'complement_alimentaire', 'electronique', 'electromenager', 'agroalimentaire', 'usage_quotidien', 'textile'), 
    allowNull: false 
  },
  probleme: { type: DataTypes.TEXT, allowNull: false },
  packProduits: { type: DataTypes.JSON, allowNull: false },
  consigneUtilisation: { type: DataTypes.TEXT, allowNull: false },
  videoDemo: { type: DataTypes.STRING, allowNull: true },
  produitId: { type: DataTypes.UUID, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'sante', timestamps: true });

const Proprietaire = sequelize.define('Proprietaire', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  sexe: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  telephone: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: true, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  photo: { type: DataTypes.STRING, allowNull: true },
  quartier: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'proprietaires', timestamps: true });

const Boutique = sequelize.define('Boutique', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('boutique', 'supermarche'), allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  urlPersonnalisee: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { is: /^[a-zA-Z0-9_-]{3,50}$/ } },
  activeProduitsLongrich: { type: DataTypes.BOOLEAN, defaultValue: false },
  activeSante: { type: DataTypes.BOOLEAN, defaultValue: false },
  activeAutresProduits: { type: DataTypes.BOOLEAN, defaultValue: false },
  proprietaireId: { type: DataTypes.UUID, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'boutiques', timestamps: true });

const AdminSecondaire = sequelize.define('AdminSecondaire', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  sexe: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  telephone: { type: DataTypes.STRING, allowNull: false, unique: true },
  photo: { type: DataTypes.STRING, allowNull: true },
  privileges: { type: DataTypes.JSON, defaultValue: [] },
  isDisponible: { type: DataTypes.BOOLEAN, defaultValue: false },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'admins_secondaires', timestamps: true });

const Client = sequelize.define('Client', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  sexe: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  telephone: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
  recu: { type: DataTypes.STRING, allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  quartier: { type: DataTypes.STRING, allowNull: true },
  adresseLivraison: { type: DataTypes.TEXT, allowNull: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'clients', timestamps: true });

const PV = sequelize.define('PV', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  livreurId: { type: DataTypes.UUID, allowNull: false },
  nombreProduits: { type: DataTypes.INTEGER, allowNull: false },
  produitsLivres: { type: DataTypes.JSON, allowNull: false },
  totalPVs: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'pvs', timestamps: true });

const Livraison = sequelize.define('Livraison', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  commandeId: { type: DataTypes.UUID, allowNull: false },
  livreurId: { type: DataTypes.UUID, allowNull: false },
  statut: { type: DataTypes.ENUM('en_attente', 'en_cours', 'livree', 'annulee'), defaultValue: 'en_attente' },
  dateLivraison: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'livraisons', timestamps: true });

const Commande = sequelize.define('Commande', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  boutiqueId: { type: DataTypes.UUID, allowNull: false },
  typeService: { type: DataTypes.ENUM('produit_simple', 'pack_sante'), allowNull: false },
  produits: { type: DataTypes.JSON, allowNull: false },
  prixTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  recuCommande: { type: DataTypes.STRING, allowNull: true },
  livraisonGratuite: { type: DataTypes.BOOLEAN, defaultValue: false },
  statut: { type: DataTypes.ENUM('en_attente', 'confirmee', 'payee', 'livree', 'annulee'), defaultValue: 'en_attente' }
}, { tableName: 'commandes', timestamps: true });

const AutreProduitBoutique = sequelize.define('AutreProduitBoutique', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  categorie: { type: DataTypes.STRING, allowNull: false },
  photo: { type: DataTypes.STRING, allowNull: false },
  videoDemo: { type: DataTypes.STRING, allowNull: true },
  prix: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  boutiqueId: { type: DataTypes.UUID, allowNull: false }
}, { tableName: 'autres_produits_boutiques', timestamps: true });


// AJOUTEZ à la fin des modèles existants, AVANT les associations :
const Service = sequelize.define('Service', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: { 
      isIn: [['SERVICE_PRODUITS_LONG RICH', 'SERVICE_PACK_PRODUITS_SANTE_LONGRICH', 'SERVICE_AUTRE_PRODUITS']] 
    }
  },
  photo: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'services', timestamps: true });


// ✅ ASSOCIATIONS
Proprietaire.hasMany(Boutique, { foreignKey: 'proprietaireId', as: 'mesBoutiques' });
Boutique.belongsTo(Proprietaire, { foreignKey: 'proprietaireId', as: 'monProprietaire' });

Boutique.hasMany(AutreProduitBoutique, { foreignKey: 'boutiqueId', as: 'listeProduits' });
AutreProduitBoutique.belongsTo(Boutique, { foreignKey: 'boutiqueId', as: 'maBoutique' });

ProduitLongrich.hasMany(Sante, { foreignKey: 'produitId', as: 'mesPacksSante' });
Sante.belongsTo(ProduitLongrich, { foreignKey: 'produitId', as: 'monProduit' });

Client.hasMany(Commande, { foreignKey: 'clientId', as: 'mesCommandes' });
Commande.belongsTo(Client, { foreignKey: 'clientId', as: 'monClient' });

Boutique.hasMany(Commande, { foreignKey: 'boutiqueId', as: 'commandesBoutique' });
Commande.belongsTo(Boutique, { foreignKey: 'boutiqueId', as: 'maBoutique' });

Commande.hasOne(Livraison, { foreignKey: 'commandeId', as: 'saLivraison' });
Livraison.belongsTo(Commande, { foreignKey: 'commandeId', as: 'saCommande' });

AdminSecondaire.hasMany(Livraison, { foreignKey: 'livreurId', as: 'mesLivraisons' });
Livraison.belongsTo(AdminSecondaire, { foreignKey: 'livreurId', as: 'monLivreur' });

// AJOUTEZ dans module.exports :
module.exports = { 
  SuperAdmin, LogsSecurite, ProduitLongrich, Sante, Proprietaire, Boutique, 
  AdminSecondaire, Client, PV, Livraison, Commande, AutreProduitBoutique,
  Service,  // ✅ AJOUTÉ
  sequelize, Op 
};