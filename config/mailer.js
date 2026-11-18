/**
 * Ereto Namunyak CBO - Email Notification Service (Nodemailer)
 * Sends branded transaction receipts, password reset links, and application confirmations.
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  } else {
    // Development fallback using JSON transport or Ethereal
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });
    console.log('[Mailer] Operating in safe development mode (emails logged to console/buffer)');
  }
  return transporter;
}

const BRAND_HEADER = `
  <div style="background-color: #176B45; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.5px;">
      ERETO NAMUNYAK CBO
    </h1>
    <p style="color: #F4B942; margin: 5px 0 0; font-size: 14px; font-weight: bold;">
      Empowering Communities &bull; Restoring Hope &bull; Building Resilient Futures
    </p>
  </div>
`;

const BRAND_FOOTER = `
  <div style="background-color: #F8FAF9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; border-top: 1px solid #E8F5E9;">
    <p style="margin: 0 0 6px;">Ereto Namunyak Community-Based Organization</p>
    <p style="margin: 0 0 6px;">P.O. Box 128 - 01100, Kajiado Central, Kenya &bull; Tel: +254 722 000 000</p>
    <p style="margin: 0; color: #999;">Official Reg: CBO/KJD/2022/0488</p>
  </div>
`;

/**
 * Send Donation Confirmation Receipt
 */
async function sendDonationReceipt({ donorName, donorEmail, amount, currency, merchantReference, receiptNumber, projectTitle, date }) {
  const mail = getTransporter();
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; border: 1px solid #e1e7e4; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      ${BRAND_HEADER}
      <div style="padding: 30px; color: #2d3748; line-height: 1.6;">
        <h2 style="color: #176B45; margin-top: 0;">Official Donation Receipt</h2>
        <p>Dear <strong>${donorName}</strong>,</p>
        <p>Aheg (Thank you)! On behalf of Ereto Namunyak CBO and the pastoralist communities we serve, we gratefully acknowledge your generous donation.</p>
        
        <div style="background: #E8F5E9; border-left: 4px solid #176B45; padding: 18px; margin: 25px 0; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #555;">Receipt Number:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #176B45;">${receiptNumber || merchantReference}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #555;">Amount Contributed:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; font-size: 16px; color: #176B45;">${currency} ${Number(amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #555;">Designated Cause:</td>
              <td style="padding: 6px 0; text-align: right;">${projectTitle || 'General Community Development Fund'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #555;">Date:</td>
              <td style="padding: 6px 0; text-align: right;">${date || new Date().toLocaleDateString('en-KE')}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #555;">Payment Gateway:</td>
              <td style="padding: 6px 0; text-align: right;">Pesapal Secure Payment</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #4a5568;">Your contribution directly funds education scholarships, indigenous tree planting, women economic empowerment, and mobility support for persons with special needs.</p>
        <p style="margin-top: 25px;">With deepest gratitude,<br><strong>Peter Shuel</strong><br>Founder & Executive Patron, Ereto Namunyak CBO</p>
      </div>
      ${BRAND_FOOTER}
    </div>
  `;

  try {
    const info = await mail.sendMail({
      from: process.env.SMTP_FROM || '"Ereto Namunyak CBO" <donations@eretonamunyak.org>',
      to: donorEmail,
      subject: `Donation Receipt - ${receiptNumber || merchantReference} | Ereto Namunyak CBO`,
      html
    });
    console.log(`[Mailer] Sent donation receipt to ${donorEmail}`);
    return info;
  } catch (err) {
    console.error('[Mailer Error - Receipt]', err.message);
  }
}

/**
 * Send Password Reset Link to Administrator
 */
async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const mail = getTransporter();
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; border: 1px solid #e1e7e4; border-radius: 8px; overflow: hidden;">
      ${BRAND_HEADER}
      <div style="padding: 30px; color: #2d3748; line-height: 1.6;">
        <h2 style="color: #176B45; margin-top: 0;">Admin Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>A request was received to reset the password for your administrator account on the Ereto Namunyak Management System.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #176B45; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        
        <p style="font-size: 13px; color: #718096;">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #176B45; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="font-size: 13px; color: #e53e3e;">
          This link will expire in 1 hour. If you did not request this password reset, please notify the Super Administrator immediately.
        </p>
      </div>
      ${BRAND_FOOTER}
    </div>
  `;

  try {
    const info = await mail.sendMail({
      from: process.env.SMTP_FROM || '"Ereto Namunyak Admin" <admin@eretonamunyak.org>',
      to: email,
      subject: `Password Reset Request - Ereto Namunyak Admin Portal`,
      html
    });
    console.log(`[Mailer] Password reset email dispatched to ${email}`);
    return info;
  } catch (err) {
    console.error('[Mailer Error - Reset]', err.message);
  }
}

/**
 * Send Application Confirmation (Volunteer or Member)
 */
async function sendApplicationConfirmation({ type, fullName, email }) {
  const mail = getTransporter();
  const isVol = type === 'volunteer';
  const roleTitle = isVol ? 'Volunteer' : 'Member';
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; background: #ffffff; border: 1px solid #e1e7e4; border-radius: 8px; overflow: hidden;">
      ${BRAND_HEADER}
      <div style="padding: 30px; color: #2d3748; line-height: 1.6;">
        <h2 style="color: #176B45; margin-top: 0;">Application Received</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>Thank you for your application to join Ereto Namunyak CBO as a <strong>${roleTitle}</strong>!</p>
        <p>Our coordination team is currently reviewing your submission. One of our community coordinators will contact you via email or phone shortly with the next steps.</p>
        
        <div style="background-color: #E8F5E9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #176B45;">
            <strong>"Ereto Namunyak"</strong> is a Maasai expression signifying mutual assistance, blessing, and uplifting one another. We are thrilled to welcome your energy to our mission.
          </p>
        </div>

        <p>Warm regards,<br><strong>Felix Siatoi</strong><br>Executive Coordinator, Ereto Namunyak CBO</p>
      </div>
      ${BRAND_FOOTER}
    </div>
  `;

  try {
    await mail.sendMail({
      from: process.env.SMTP_FROM || '"Ereto Namunyak CBO" <join@eretonamunyak.org>',
      to: email,
      subject: `Application Confirmation - ${roleTitle} | Ereto Namunyak CBO`,
      html
    });
  } catch (err) {
    console.error('[Mailer Error - App]', err.message);
  }
}

module.exports = {
  sendDonationReceipt,
  sendPasswordResetEmail,
  sendApplicationConfirmation
};
