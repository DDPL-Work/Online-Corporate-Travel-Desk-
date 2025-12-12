require('dotenv').config();
const emailService = require('./src/services/email.service');

async function testEmail() {
  try {
    const info = await emailService.sendEmail({
      to: process.env.SMTP_USER, // send to yourself for testing
      subject: 'Test Email from Corporate Travel Desk',
      html: '<h1>This is a test email</h1><p>If you see this, SMTP is working!</p>',
    });

    console.log('Email sent successfully:', info);
  } catch (err) {
    console.error('Error sending test email:', err);
  }
}

testEmail();
