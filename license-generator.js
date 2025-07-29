#!/usr/bin/env node

/**
 * AntiGoldfishMode License Generator
 * Standalone tool for generating license keys in the correct format
 * Can be used as backup if Vercel webhook fails
 */

const nodemailer = require('nodemailer');

// License generation functions
function generateLicenseKey(type = 'EARLY') {
  const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AGM-${type}-${part()}-${part()}-${part()}`;
}

function generateTrialKey() {
  return generateLicenseKey('TRIAL');
}

function generateEarlyAdopterKey() {
  return generateLicenseKey('EARLY');
}

function generateStandardKey() {
  return generateLicenseKey('STD');
}

// Email configuration
function createEmailTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
}

// Send license email
async function sendLicenseEmail(customerEmail, customerName, licenseKey, licenseType = 'Early Adopter') {
  const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .license-key { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .license-key-text { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 18px; font-weight: bold; color: #0066cc; letter-spacing: 1px; }
        .command-box { background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Welcome to AntiGoldfishMode!</h1>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Thank you for your ${licenseType} purchase!</p>
        </div>

        <div class="license-key">
            <h2>Your License Key:</h2>
            <div class="license-key-text">${licenseKey}</div>
        </div>

        <h3>🚀 Quick Start Guide:</h3>
        <ol>
            <li><strong>Install AntiGoldfishMode:</strong>
                <div class="command-box">npm install -g antigoldfishmode</div>
            </li>
            <li><strong>Activate your license:</strong>
                <div class="command-box">antigoldfishmode activate ${licenseKey}</div>
            </li>
            <li><strong>Start using immediately:</strong>
                <div class="command-box">antigoldfishmode remember "My first persistent memory"</div>
            </li>
        </ol>

        <p><strong>🎉 Welcome to the future of AI-assisted development!</strong></p>
        <p>Best regards,<br>The AntiGoldfishMode Team</p>
    </div>
</body>
</html>`;

  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: 'AntiGoldfish Team <antigoldfish.dev@gmail.com>',
    to: customerEmail,
    subject: `Your AntiGoldfishMode ${licenseType} License Key`,
    html: emailHTML
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ License email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return false;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🧠 AntiGoldfishMode License Generator

Usage:
  node license-generator.js generate [type]     - Generate license key
  node license-generator.js send <email> <name> [type] - Generate and send license

Types:
  trial    - 7-day trial license (AGM-TRIAL-...)
  early    - Early adopter license (AGM-EARLY-...)  [default]
  standard - Standard license (AGM-STD-...)

Examples:
  node license-generator.js generate
  node license-generator.js generate trial
  node license-generator.js send user@example.com "John Doe"
  node license-generator.js send user@example.com "Jane Smith" trial

Environment Variables:
  EMAIL_USER - Gmail address for sending emails
  EMAIL_PASS - Gmail app password for authentication
`);
    return;
  }

  const command = args[0];
  
  if (command === 'generate') {
    const type = args[1] || 'early';
    let licenseKey;
    
    switch (type.toLowerCase()) {
      case 'trial':
        licenseKey = generateTrialKey();
        break;
      case 'early':
        licenseKey = generateEarlyAdopterKey();
        break;
      case 'standard':
        licenseKey = generateStandardKey();
        break;
      default:
        console.error('❌ Invalid license type. Use: trial, early, or standard');
        return;
    }
    
    console.log(`🔑 Generated ${type.toUpperCase()} license: ${licenseKey}`);
    
  } else if (command === 'send') {
    const email = args[1];
    const name = args[2];
    const type = args[3] || 'early';
    
    if (!email || !name) {
      console.error('❌ Email and name are required');
      console.log('Usage: node license-generator.js send <email> <name> [type]');
      return;
    }
    
    let licenseKey;
    let licenseType;
    
    switch (type.toLowerCase()) {
      case 'trial':
        licenseKey = generateTrialKey();
        licenseType = '7-Day Trial';
        break;
      case 'early':
        licenseKey = generateEarlyAdopterKey();
        licenseType = 'Early Adopter';
        break;
      case 'standard':
        licenseKey = generateStandardKey();
        licenseType = 'Standard';
        break;
      default:
        console.error('❌ Invalid license type. Use: trial, early, or standard');
        return;
    }
    
    console.log(`🔑 Generated ${type.toUpperCase()} license: ${licenseKey}`);
    console.log(`📧 Sending to: ${email}`);
    
    const emailSent = await sendLicenseEmail(email, name, licenseKey, licenseType);
    
    if (emailSent) {
      console.log(`✅ License successfully sent to ${email}`);
    } else {
      console.log(`❌ Failed to send email. License key: ${licenseKey}`);
    }
    
  } else {
    console.error('❌ Unknown command. Use "generate" or "send"');
  }
}

// Export functions for use as module
module.exports = {
  generateLicenseKey,
  generateTrialKey,
  generateEarlyAdopterKey,
  generateStandardKey,
  sendLicenseEmail
};

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}
