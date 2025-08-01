const crypto = require('crypto');
const nodemailer = require('nodemailer');

// License generation
function generateTrialKey() {
    const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AGM-TRIAL-${part()}-${part()}-${part()}`;
}

// Email setup
function createEmailTransporter() {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'antigoldfish.dev@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    });
}

// Email template
function generateTrialEmail(licenseKey, customerName = 'Developer') {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Your AntiGoldfishMode Trial</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1877f2; color: white; padding: 20px; text-align: center; }
        .content { background: #f8f9fa; padding: 20px; }
        .license { background: white; border: 2px solid #28a745; padding: 15px; text-align: center; font-family: monospace; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🆓 AntiGoldfishMode Trial</h1>
    </div>
    <div class="content">
        <p>Hi ${customerName}!</p>
        <p>Your 7-day trial is ready:</p>
        <div class="license">${licenseKey}</div>
        <p>Install: <code>npm install -g antigoldfishmode</code></p>
        <p>Activate: <code>antigoldfishmode activate ${licenseKey}</code></p>
    </div>
</body>
</html>`;
}

// Send email
async function sendLicenseEmail(licenseKey, customerEmail, customerName) {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: 'AntiGoldfishMode <antigoldfish.dev@gmail.com>',
        to: customerEmail,
        subject: '🆓 Your AntiGoldfishMode Trial License',
        html: generateTrialEmail(licenseKey, customerName)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${customerEmail}`);
    } catch (error) {
        console.error('❌ Email failed:', error);
    }
}

// Handle checkout
async function handleCheckout(session) {
    const email = session.customer_details?.email;
    const name = session.customer_details?.name || 'Developer';
    
    if (email) {
        const licenseKey = generateTrialKey();
        console.log(`Generated license for ${email}: ${licenseKey}`);
        await sendLicenseEmail(licenseKey, email, name);
    }
}

// Main handler
module.exports = async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    if (req.method === 'GET') {
        return res.json({ 
            service: 'AntiGoldfishMode Webhook',
            status: 'running',
            time: new Date().toISOString()
        });
    }
    
    if (req.method === 'POST') {
        try {
            const event = req.body;
            console.log('Event:', event.type);
            
            if (event.type === 'checkout.session.completed') {
                await handleCheckout(event.data.object);
            }
            
            return res.json({ received: true });
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Failed' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};