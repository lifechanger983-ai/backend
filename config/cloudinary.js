const cloudinary = require('cloudinary').v2;
// const fs = require('fs'); // ✅ FS n'est plus nécessaire ici
// const path = require('path'); // ✅ Path n'est plus nécessaire ici
const multer = require('multer');
const { Readable } = require('stream'); // ✅ Nécessaire pour transformer le buffer en stream
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// ✅ FONCTION getPublicId (Inchangée, reste parfaite)
const getPublicIdFromUrl = (url) => {
    try {
        console.log('🔍 EXTRACTING FROM:', url);
        const parts = url.split('/');
        const filename = parts[parts.length - 1]; 
        // ✅ APRÈS (correct)
const publicId = filename.replace(/\.[^/.]+$/, "");

        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return publicId;

        let pathStart = uploadIndex + 1;
        if (parts[pathStart]?.startsWith('v') && !isNaN(parts[pathStart].slice(1))) {
            pathStart++;
        }

        const folder = parts[pathStart]; 
        const subfolder = parts[pathStart + 1];

        if (folder === 'mega_ecommerce' && subfolder === 'images') {
            const fullPublicId = `${folder}/${subfolder}/${publicId}`;
            console.log('✅ PUBLIC_ID CLOUDINARY:', fullPublicId);
            return fullPublicId;
        }

        console.log('✅ PUBLIC_ID SIMPLE:', publicId);
        return publicId;
    } catch (error) {
        console.error('❌ getPublicId ERROR:', error);
        return null;
    }
};

// ✅ SUPPRESSION Cloudinary (Inchangée, reste parfaite)
const deleteCloudinaryFile = async (url, type = 'image') => {
    if (!url) return { success: false, message: "Pas d'URL" };
    
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return { success: false, message: 'Public ID invalide' };
    
    console.log(`🗑️ DELETE ${type.toUpperCase()}:`, publicId);
    
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: type === 'video' ? 'video' : 'image',
            invalidate: true
        });
        
        console.log(`✅ DELETE ${type.toUpperCase()}:`, result.result);
        return { success: true, result: result.result };
    } catch (error) {
        console.log(`⚠️ DELETE ÉCHOUÉ:`, error.message);
        return { success: false, error: error.message };
    }
};

// ============================================================
// ✅ NOUVELLE CONFIGURATION MULTER - MEMORY STORAGE
// Objectif : Zéro stockage local, flux direct de la RAM vers Cloudinary
// ============================================================

// ✅ Utilisation de memoryStorage au lieu de diskStorage
// Le fichier sera accessible temporairement dans req.files[fieldName].buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Liste plus restreinte et sécurisée pour la prod
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/jpg', 'image/gif', 'image/webp',
        // ✅ VIDÉOS COMPLÈTES
    'video/mp4', 'video/mpeg', 'video/mpg', 'video/mov', 'video/avi', 
    'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/quicktime',
    'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'
    ];
    
if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('✅ MIME ACCEPTÉ:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ MIME REJETÉ:', file.mimetype);
    cb(new Error(`Format non supporté: ${file.mimetype}`), false);
  }
};

// ✅ Middleware Multer (Inchangé dans l'utilisation, mais utilise memoryStorage en coulisse)
const uploadFiles = multer({ 
    storage,
    limits: { 
        fileSize: 150 * 1024 * 1024, // 150MB
    fieldSize: 50 * 1024 * 1024, // ✅ 50MB pour JSON packProduits
    files: 2 // Sécurité : max 2 fichiers par requête
    }, 
    fileFilter
}).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'videoDemoFile', maxCount: 1 }
]);

// ============================================================
// ✅ NOUVELLE FONCTION UPLOAD Cloudinary - VERSION MEMORY STREAM
// Cette fonction transforme le buffer Multer en stream Cloudinary
// ============================================================
const uploadToCloudinary = (fileBuffer, resourceType = 'image') => {
    return new Promise((resolve, reject) => {
        console.log('🖼️ MEMORY UPLOAD START');

        // Configuration de l'upload stream
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'mega_ecommerce/images',
                resource_type: resourceType,
                quality: 'auto',
                fetch_format: 'auto',
                overwrite: true
                // ✅ Pas besoin de nettoyer de fichier local ici
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary ERROR:', error.message);
                    return reject(new Error(`Cloudinary Upload Failed: ${error.message}`));
                }
                console.log(`✅ ${resourceType.toUpperCase()} STREAMÉ:`, result.secure_url);
                resolve(result.secure_url);
            }
        );

        // Créer un stream lisible à partir du buffer et le piper vers Cloudinary
        const stream = new Readable();
        stream.push(fileBuffer);
        stream.push(null); // Marquer la fin du stream
        stream.pipe(uploadStream);
    });
};

module.exports = {
    cloudinary,
    uploadFiles,           // Middleware MULTER (memory)
    uploadToCloudinary,    // Fonction UPLOAD Cloudinary (stream)
    deleteCloudinaryFile,
    getPublicIdFromUrl
};