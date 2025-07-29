/**
 * AntiGoldfishMode Stripe Webhook - Vercel Serverless Function
 * Replaces Zapier completely - saves $240/year!
 */

const nodemailer = require('nodemailer');

// License generation function (same as Zapier!)
function makeLicenseKey() {
  const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AGM-EARLY-${part()}-${part()}-${part()}`;
}

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send license email
async function sendLicenseEmail(customerEmail, customerName, licenseKey) {
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
        .features { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .features ul { margin: 10px 0; padding-left: 20px; }
        .features li { margin: 8px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Welcome to AntiGoldfishMode!</h1>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Thank you for purchasing the <strong>Early Adopter</strong> plan ($69/year)!</p>
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
            <li><strong>Recall memories:</strong>
                <div class="command-box">antigoldfishmode recall "memory search"</div>
            </li>
        </ol>

        <div class="features">
            <h3>✅ Your Early Adopter Plan Includes:</h3>
            <ul>
                <li>🧠 <strong>Unlimited AI memory storage</strong> - Never lose context again</li>
                <li>🔒 <strong>100% local & encrypted</strong> - Your data never leaves your machine</li>
                <li>🐳 <strong>Secure code execution sandbox</strong> - Test code safely with Docker</li>
                <li>📝 <strong>Conversation recording</strong> - All AI interactions remembered</li>
                <li>💻 <strong>1 machine license</strong> - Perfect for your main dev setup</li>
                <li>📧 <strong>Priority developer support</strong> - Direct access to our team</li>
                <li>🚀 <strong>All future updates included</strong> - No additional charges</li>
                <li>⏰ <strong>7-day offline grace period</strong> - Works without internet</li>
            </ul>
        </div>

        <h3>💡 Pro Tips:</h3>
        <ul>
            <li><strong>Remember project patterns:</strong> <code>antigoldfishmode remember "This project uses React + TypeScript"</code></li>
            <li><strong>Store code snippets:</strong> <code>antigoldfishmode remember "Auth middleware: [code here]"</code></li>
            <li><strong>Track decisions:</strong> <code>antigoldfishmode remember "Chose MongoDB over PostgreSQL"</code></li>
            <li><strong>Check status anytime:</strong> <code>antigoldfishmode status</code></li>
        </ul>

        <h3>🛠️ Need Help?</h3>
        <p>
            • <strong>Documentation:</strong> Full setup guide and examples<br>
            • <strong>Support:</strong> Reply to this email for technical assistance<br>
            • <strong>Community:</strong> Join other developers using AntiGoldfishMode
        </p>

        <div class="footer">
            <p><strong>🎉 Welcome to the future of AI-assisted development!</strong></p>
            <p>Best regards,<br>The AntiGoldfishMode Team</p>
            <p style="font-size: 12px; margin-top: 20px;">
                This email was sent because you purchased AntiGoldfishMode. Your license is bound to your machine and can be transferred using the deactivate/activate commands.
            </p>
        </div>
    </div>
</body>
</html>`;

  const transporter = createTransporter();
  
  const mailOptions = {
    from: 'AntiGoldfish Team <antigoldfish.dev@gmail.com>',
    to: customerEmail,
    subject: 'Your AntiGoldfishMode License Key and Activation Instructions',
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

// Main serverless function handler
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    
    console.log('📦 Received Stripe webhook:', event.type);
    
    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Extract customer info
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || 'Customer';
      
      if (!customerEmail) {
        console.error('❌ No customer email found in session');
        return res.status(400).json({ error: 'No customer email' });
      }
      
      console.log(`🎯 Processing license for: ${customerEmail}`);
      
      // Generate license key (replaces Zapier!)
      const licenseKey = makeLicenseKey();
      
      console.log(`🔑 Generated license: ${licenseKey}`);
      
      // Send email (replaces Zapier!)
      const emailSent = await sendLicenseEmail(customerEmail, customerName, licenseKey);
      
      if (emailSent) {
        console.log(`✅ Complete! License ${licenseKey} sent to ${customerEmail}`);
      }
    }
    
    // Always respond with 200
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}