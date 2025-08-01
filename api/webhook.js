const crypto = require('crypto');
const nodemailer = require('nodemailer');

// License generation functions
function generateLicenseKey(type = 'EARLY') {
    const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AGM-${type}-${part()}-${part()}-${part()}`;
}

function generateTrialKey() {
    return generateLicenseKey('TRIAL');
}

// Email transporter setup
function createEmailTransporter() {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'antigoldfish.dev@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    });
}

// Generate trial license email HTML
function generateTrialLicenseEmail(licenseKey, customerEmail, customerName = 'Developer') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your AntiGoldfishMode 7-Day Trial</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1877f2; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .license-key { background: #fff; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; }
        .instructions { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🆓 Welcome to AntiGoldfishMode Trial!</h1>
        <p>7 Days of Unlimited AI Memory</p>
    </div>
    
    <div class="content">
        <p>Hi ${customerName}!</p>
        
        <p>🎉 <strong>Welcome to AntiGoldfishMode!</strong> Your 7-day free trial is ready.</p>
        
        <div class="license-key">
            ${licenseKey}
        </div>
        
        <div class="instructions">
            <h3>🚀 Quick Setup:</h3>
            <ol>
                <li><strong>Install:</strong> <code>npm install -g antigoldfishmode</code></li>
                <li><strong>Activate:</strong> <code>antigoldfishmode activate ${licenseKey}</code></li>
                <li><strong>Start using:</strong> <code>antigoldfishmode remember "My first memory"</code></li>
            </ol>
        </div>
        
        <p>Happy coding!<br>The AntiGoldfishMode Team 🧠</p>
    </div>
</body>
</html>`;
}

// Send license email
async function sendLicenseEmail(licenseKey, customerEmail, customerName) {
    const transporter = createEmailTransporter();

    const mailOptions = {
        from: `"AntiGoldfishMode" <${process.env.EMAIL_USER || 'antigoldfish.dev@gmail.com'}>`,
        to: customerEmail,
        subject: '🆓 Your AntiGoldfishMode Trial License - Start Now!',
        html: generateTrialLicenseEmail(licenseKey, customerEmail, customerName)
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ License email sent to ${customerEmail}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to send email:`, error);
        throw error;
    }
}

// Handle checkout completed
async function handleCheckoutCompleted(session) {
    console.log('💳 Checkout completed for:', session.customer_details?.email);

    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name || 'Developer';
    
    if (!customerEmail) {
        console.error('❌ No customer email found');
        return;
    }

    // Generate license key
    const licenseKey = generateTrialKey();
    console.log(`🆓 Generated license: ${licenseKey}`);

    // Send license email
    try {
        await sendLicenseEmail(licenseKey, customerEmail, customerName);
        console.log(`✅ License delivered to ${customerEmail}`);
    } catch (error) {
        console.error(`❌ Failed to deliver license:`, error);
    }
}

// Vercel serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.json({
            service: 'AntiGoldfishMode Webhook Server',
            status: 'running',
            timestamp: new Date().toISOString()
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Process webhook
    console.log('📨 Webhook received');

    try {
        const event = req.body;
        console.log(`🎯 Processing event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            await handleCheckoutCompleted(event.data.object);
        }
        
        res.json({ received: true, processed: event.type });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};