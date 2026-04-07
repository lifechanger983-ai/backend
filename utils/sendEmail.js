const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({  // ← FIXED HERE
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

const sendProprietaireCredentials = async (email, nom, telephone, password, urlLogin) => {
  // 🔍 DEBUG COMPLET
  console.log('🚀 EMAIL DEBUG:', { 
    email, 
    nom, 
    typeof_email: typeof email, 
    emailLength: email?.length,
    emailTrimmed: email?.trim(),
    urlLogin 
  });
  
  // VALIDATION STRICTE
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.log('❌ EMAIL INVALID, skip');
    return { skipped: true, reason: 'Email vide ou invalide' };
  }

  const cleanEmail = email.trim();
  
  const mailOptions = {
    from: `"Mega Ecommerce" <${process.env.EMAIL_USER}>`,
    to: cleanEmail,
    subject: '✅ Vos identifiants Boutique Mega Ecommerce',
    html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; text-align: center; border-radius: 20px 20px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 2.5rem;">Mega Ecommerce</h1>
      </div>
      <div style="background: white; padding: 2rem; border-radius: 0 0 20px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        <h2 style="color: #333; font-size: 1.5rem; margin-bottom: 1rem;">Bonjour ${nom},</h2>
        <p style="color: #666; line-height: 1.6;">Votre compte propriétaire a été créé avec succès !</p>
        
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin: 2rem 0;">
          <h3 style="color: #333; margin: 0 0 1rem 0;">📱 Vos identifiants :</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 0.5rem 0; font-weight: bold;">Téléphone:</td><td style="padding: 0.5rem 0; color: #28a745;">${telephone}</td></tr>
            <tr><td style="padding: 0.5rem 0; font-weight: bold;">Mot de passe:</td><td style="padding: 0.5rem 0; color: #007bff; font-family: monospace;">${password}</td></tr>
          </table>
        </div>
        
        <a href="${urlLogin}" style="display: inline-block; background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 1rem 0;">🚀 Se connecter</a>
        
        <div style="background: #e9ecef; padding: 1rem; border-radius: 8px; margin-top: 2rem;">
          <p style="color: #6c757d; font-size: 0.9rem; margin: 0;"><strong>⚠️ Important:</strong> Changez votre mot de passe lors de votre première connexion.</p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 2rem; color: #999; font-size: 0.8rem;">
        <p>© 2026 Mega Ecommerce. Tous droits réservés.</p>
      </div>
    </div>
    `
  };

  // 🔍 LOG FINAL AVANT ENVOI
  console.log('📧 MAILOPTIONS.to:', mailOptions.to);
  console.log('📧 MAILOPTIONS.from:', mailOptions.from);
  console.log('📧 SMTP CONFIG:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER ? 'OK' : 'MISSING'
  });

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL ENVOYÉ:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ EMAIL ERROR:', error.code, error.message);
    return { error: error.message, code: error.code };
  }
};

module.exports = { sendProprietaireCredentials, transporter };
