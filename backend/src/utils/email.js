const nodemailer = require('nodemailer');
const logger = require('./logger');
const { getSiteName } = require('./settings');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send email
 * @param {Object} options - Email options
 */
async function sendEmail({ to, subject, html, text, attachments = [] }) {
  try {
    const siteName = await getSiteName();
    const mailOptions = {
      from: `"${siteName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(user) {
  const siteName = await getSiteName();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37, #C5A028); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #D4AF37; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💍 ${siteName}</h1>
        </div>
        <div class="content">
          <h2>Bienvenue ${user.firstName} !</h2>
          <p>Nous sommes ravis de vous accueillir sur ${siteName}, la plateforme premium pour créer des invitations de mariage digitales uniques.</p>
          <p>Avec ${siteName}, vous pouvez :</p>
          <ul>
            <li>Créer des invitations personnalisées</li>
            <li>Générer des QR codes uniques pour chaque invité</li>
            <li>Suivre les confirmations en temps réel</li>
            <li>Exporter vos invitations en PDF</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Commencer maintenant</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Bienvenue sur ${siteName} ! 💍`,
    html
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
  const siteName = await getSiteName();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #D4AF37; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #D4AF37; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Réinitialisation du mot de passe</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${user.firstName},</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          <div class="warning">
            <strong>⚠️ Important :</strong> Ce lien expire dans 1 heure.
          </div>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Réinitialisation de votre mot de passe - ${siteName}`,
    html
  });
}

/**
 * Send invitation email to guest
 */
async function sendInvitationEmail(guest, wedding, invitationUrl, qrCodeDataUrl) {
  const siteName = await getSiteName();
  const weddingDate = new Date(wedding.weddingDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 40px; text-align: center; color: white; }
        .header h1 { font-size: 32px; margin: 0; }
        .header p { opacity: 0.9; margin: 10px 0 0; }
        .content { padding: 40px; text-align: center; }
        .couple-names { font-size: 28px; color: #333; margin: 20px 0; }
        .couple-names span { color: #D4AF37; }
        .details { background: #FDF8F0; padding: 25px; border-radius: 10px; margin: 25px 0; }
        .details p { margin: 10px 0; }
        .details strong { color: #D4AF37; }
        .guest-name { font-size: 18px; color: #666; margin: 20px 0; }
        .qr-section { margin: 30px 0; }
        .qr-section img { width: 150px; height: 150px; }
        .qr-section p { font-size: 12px; color: #999; margin-top: 10px; }
        .button { display: inline-block; padding: 15px 40px; background: #D4AF37; color: white; text-decoration: none; border-radius: 30px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <p>💍 Vous êtes invité(e) au mariage de</p>
            <h1>${wedding.brideName} & ${wedding.groomName}</h1>
          </div>
          <div class="content">
            <p class="guest-name">Cher(e) ${guest.firstName} ${guest.lastName},</p>
            <p>Nous serions honorés de votre présence pour célébrer notre union.</p>
            
            <div class="details">
              <p><strong>📅 Date :</strong> ${weddingDate}</p>
              ${wedding.ceremonyTime ? `<p><strong>⏰ Heure :</strong> ${wedding.ceremonyTime}</p>` : ''}
              ${wedding.venueName ? `<p><strong>📍 Lieu :</strong> ${wedding.venueName}</p>` : ''}
              ${wedding.venueAddress ? `<p>${wedding.venueAddress}</p>` : ''}
              ${guest.tableNumber ? `<p><strong>🪑 Table :</strong> N° ${guest.tableNumber}</p>` : ''}
            </div>
            
            ${wedding.customMessage ? `<p style="font-style: italic; color: #666;">"${wedding.customMessage}"</p>` : ''}
            
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" />
              <p>Scannez ce QR code pour confirmer votre présence</p>
            </div>
            
            <a href="${invitationUrl}" class="button">Voir mon invitation</a>
          </div>
          <div class="footer">
            <p>Créé avec ❤️ par ${siteName}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: guest.email,
    subject: `💍 Invitation au mariage de ${wedding.brideName} & ${wedding.groomName}`,
    html
  });
}

/**
 * Send payment approved notification
 */
async function sendPaymentApprovedEmail(user, wedding) {
  const siteName = await getSiteName();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .highlight { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #D4AF37; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Paiement Approuvé !</h1>
        </div>
        <div class="content">
          <h2>Félicitations ${user.firstName} !</h2>
          <p>Votre paiement a été validé et votre projet de mariage est maintenant actif.</p>
          <div class="highlight">
            <h3>🎊 ${wedding.brideName} & ${wedding.groomName}</h3>
            <p>Vous pouvez maintenant :</p>
            <ul>
              <li>Générer vos invitations</li>
              <li>Envoyer vos QR codes</li>
              <li>Suivre les confirmations</li>
            </ul>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/weddings/${wedding.id}" class="button">Accéder à mon projet</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '✅ Paiement approuvé - Votre projet est actif !',
    html
  });
}

/**
 * Send an email-address confirmation link to a freshly-registered user.
 */
async function sendVerificationEmail(user, token) {
  const siteName = await getSiteName();
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff7a38, #ff5c00); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 14px 34px; background: #ff5c00; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
        .muted { color: #6b7280; font-size: 13px; word-break: break-all; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Confirmez votre email</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${user.firstName},</h2>
          <p>Merci de votre inscription sur ${siteName}. Pour activer pleinement votre compte, confirmez votre adresse email en cliquant sur le bouton ci-dessous :</p>
          <a href="${verifyUrl}" class="button">Confirmer mon adresse email</a>
          <p style="margin-top:24px;" class="muted">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${verifyUrl}</p>
          <p style="margin-top:20px;">Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Confirmez votre adresse email - ${siteName}`,
    html
  });
}

/**
 * Send a payment receipt after an invitation-quota order is paid/approved.
 */
async function sendInvitationOrderReceiptEmail(user, order, wedding) {
  const siteName = await getSiteName();
  const amount = `${Number(order.totalAmount || 0).toLocaleString('fr-FR')} FC`;
  const dateStr = new Date(order.processedAt || Date.now()).toLocaleString('fr-FR');
  const ref = order.transactionId || order.id;
  const eventName = wedding ? `${wedding.brideName || ''}${wedding.groomName ? ` & ${wedding.groomName}` : ''}`.trim() : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background: #f9f9f9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; border-radius: 8px; overflow: hidden; }
        td { padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 14px; }
        td.k { color: #6b7280; }
        td.v { text-align: right; font-weight: 600; }
        .total td { font-size: 16px; background: #f0fdf4; }
        .button { display: inline-block; padding: 12px 30px; background: #ff5c00; color: white; text-decoration: none; border-radius: 8px; margin-top: 10px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧾 Reçu de paiement</h1>
        </div>
        <div class="content">
          <h2>Merci ${user.firstName} !</h2>
          <p>Votre paiement a bien été reçu. Voici votre reçu :</p>
          <table>
            ${eventName ? `<tr><td class="k">Événement</td><td class="v">${eventName}</td></tr>` : ''}
            <tr><td class="k">Quantité d'invitations</td><td class="v">${order.quantity}</td></tr>
            <tr><td class="k">Référence transaction</td><td class="v">${ref}</td></tr>
            <tr><td class="k">Date</td><td class="v">${dateStr}</td></tr>
            <tr class="total"><td class="k">Montant payé</td><td class="v">${amount}</td></tr>
          </table>
          <p>Vos crédits d'invitations ont été ajoutés à votre compte.</p>
          ${wedding ? `<a href="${process.env.FRONTEND_URL}/weddings/${wedding.id}/invitations" class="button">Voir mes invitations</a>` : ''}
        </div>
        <div class="footer">
          <p>Conservez ce reçu. © ${new Date().getFullYear()} ${siteName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Reçu de paiement (${amount}) - ${siteName}`,
    html
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendPaymentApprovedEmail,
  sendVerificationEmail,
  sendInvitationOrderReceiptEmail
};
