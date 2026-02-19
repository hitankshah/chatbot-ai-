// backend/services/email.js

const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendDailySummaryEmail({ to, chatbotName, summary }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const html = `
    <h2>Daily Summary - ${chatbotName}</h2>
    <p>Date: <strong>${summary.summary_date}</strong></p>
    <ul>
      <li>Total conversations: ${summary.total_conversations}</li>
      <li>Total messages: ${summary.total_messages}</li>
      <li>Total leads: ${summary.total_leads}</li>
      <li>Total escalations: ${summary.total_escalations}</li>
      <li>Unresolved escalations: ${summary.unresolved_escalations}</li>
    </ul>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || userFallback(),
    to,
    subject: `Daily Support Summary - ${chatbotName}`,
    html,
  });

  return { sent: true };
}

function userFallback() {
  return process.env.SMTP_USER || 'noreply@example.com';
}

module.exports = {
  sendDailySummaryEmail,
};
