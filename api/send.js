const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, group, day, comment } = req.body || {};

  if (!name || !phone || !group || !day) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.yandex.ru',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1D2A4A;border-bottom:2px solid #A3382D;padding-bottom:10px;">
        Новая заявка на тренировку
      </h2>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px;font-weight:bold;color:#666;">Имя</td><td style="padding:10px;">${name}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#666;">Телефон</td><td style="padding:10px;">${phone}</td></tr>
        <tr><td style="padding:10px;font-weight:bold;color:#666;">Группа</td><td style="padding:10px;">${group}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:10px;font-weight:bold;color:#666;">День</td><td style="padding:10px;">${day}</td></tr>
        <tr><td style="padding:10px;font-weight:bold;color:#666;">Комментарий</td><td style="padding:10px;">${comment || 'Не указан'}</td></tr>
      </table>
      <p style="color:#999;font-size:12px;">
        Заявка с сайта katsuro.vercel.app — ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"KATSURO Заявки" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: process.env.SMTP_USER,
      subject: `🥋 Заявка: ${name} — ${group} (${day})`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SMTP error:', err);
    return res.status(500).json({ error: 'Ошибка отправки. Попробуйте позже.' });
  }
};
