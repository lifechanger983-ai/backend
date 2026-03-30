'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test connexion
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Mailer Error:', error);
  } else {
    console.log('✅ Mailer connecté');
  }
});

const sendSecurityAlert = async (subject, message, ip = 'unknown') => {
  const mailOptions = {
    from: `"🚨 MEGA ECOMMERCE Watchdog" <${process.env.EMAIL_USER}>`,
    to: process.env.PERSONAL_EMAIL_FOR_ALERTS,
    subject: `🚨 [URGENT] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626; font-size: 24px;">🚨 ALERTE SÉCURITÉ</h1>
        <div style="background: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <h2 style="color: #dc2626; margin-top: 0;">${subject}</h2>
          <p><strong>📍 IP Suspecte:</strong> <code style="background: #333; color: #fff; padding: 2px 6px; border-radius: 3px;">${ip}</code></p>
          <p><strong>⏰ Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; font-size: 14px;">
${message}
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Alerte sécurité envoyée');
  } catch (error) {
    console.error('❌ Échec envoi alerte:', error);
  }
};

module.exports = { transporter, sendSecurityAlert };