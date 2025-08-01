/**
 * AntiGoldfishMode Stripe Webhook - Vercel Serverless Function
 * Handles Stripe checkout completion and license delivery
 */

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

function generateEarlyAdopterKey() {
    return generateLicenseKey('EARLY');
}

function generateStandardKey() {
    return generateLicenseKey('STD');
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your AntiGoldfishMode 7-Day Trial</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { text-align: center; background: linear-gradient(135deg, #1877f2 0%, #42a5f5 100%); color: white; padding: 40px 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 30px; }
        .trial-badge { background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .license-key { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-align: center; border: 3px solid #28a745; margin: 25px 0; letter-spacing: 1px; }
        .instructions { background: #e7f3ff; padding: 25px; border-radius: 12px; border-left: 5px solid #667eea; margin: 25px 0; }
        .instructions h3 { margin-top: 0; color: #667eea; }
        .instructions ol { margin: 15px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; }
        .instructions code { background: #f8f9fa; padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #e83e8c; }
        .upgrade-cta { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0; }
        .upgrade-cta h3 { margin: 0 0 10px 0; }
        .btn { display: inline-block; background: white; color: #ee5a24; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🆓 Welcome to Your AntiGoldfishMode Trial!</h1>
            <p>7 Days of Unlimited AI Memory</p>
            <span class="trial-badge">FREE TRIAL</span>
        </div>

        <div class="content">
            <p>Hi ${customerName}!</p>

            <p>🎉 <strong>Welcome to AntiGoldfishMode!</strong> Your 7-day free trial is ready to start. Experience the power of persistent AI memory and never lose context again!</p>

            <div class="license-key">
                ${licenseKey}
            </div>

            <div class="instructions">
                <h3>🚀 Quick Setup (2 minutes):</h3>
                <ol>
                    <li><strong>Install:</strong> <code>npm install -g antigoldfishmode</code></li>
                    <li><strong>Activate:</strong> <code>antigoldfishmode activate ${licenseKey}</code></li>
                    <li><strong>Start using:</strong> <code>antigoldfishmode remember "My first memory"</code></li>
                    <li><strong>Search memories:</strong> <code>antigoldfishmode recall "search term"</code></li>
                </ol>
            </div>

            <h3>✨ What You Get During Your Trial:</h3>
            <ul>
                <li>🧠 <strong>Unlimited AI Memory Storage</strong></li>
                <li>🔍 <strong>Smart Memory Search</strong></li>
                <li>📝 <strong>Conversation Recording</strong></li>
                <li>💾 <strong>Local Data Storage</strong> (your data stays private)</li>
                <li>🚀 <strong>All features unlocked</strong> for 7 days</li>
            </ul>

            <div class="upgrade-cta">
                <h3>🎯 Love AntiGoldfishMode? Get Early Adopter Pricing!</h3>
                <p>After your trial, upgrade to Early Adopter for just <strong>$69/year</strong> (save $80/year!)</p>
                <p><em>Limited to first 20,000 licenses - then price goes to $149/year</em></p>
            </div>

            <p><strong>Questions?</strong> Reply to this email - we're here to help!</p>

            <p>Happy coding!<br>The AntiGoldfishMode Team 🧠</p>
        </div>
    </div>
</body>
</html>`;
}

// Generate monthly license email HTML
function generateMonthlyLicenseEmail(licenseKey, customerEmail, customerName = 'Developer') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your AntiGoldfishMode Monthly License</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { text-align: center; background: linear-gradient(135deg, #1877f2 0%, #42a5f5 100%); color: white; padding: 40px 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 30px; }
        .monthly-badge { background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .license-key { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-align: center; border: 3px solid #667eea; margin: 25px 0; letter-spacing: 1px; }
        .instructions { background: #e7f3ff; padding: 25px; border-radius: 12px; border-left: 5px solid #667eea; margin: 25px 0; }
        .instructions h3 { margin-top: 0; color: #667eea; }
        .instructions ol { margin: 15px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; }
        .instructions code { background: #f8f9fa; padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #e83e8c; }
        .upgrade-cta { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0; }
        .upgrade-cta h3 { margin: 0 0 10px 0; }
        .btn { display: inline-block; background: white; color: #ee5a24; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📅 Welcome to Monthly!</h1>
            <p>Your AntiGoldfishMode License is Ready</p>
            <span class="monthly-badge">MONTHLY - $10/MONTH</span>
        </div>

        <div class="content">
            <p>Hi ${customerName}!</p>

            <p>🎉 <strong>Welcome to AntiGoldfishMode!</strong> Your monthly subscription is active and you have full access to all features.</p>

            <div class="license-key">
                ${licenseKey}
            </div>

            <div class="instructions">
                <h3>🚀 Quick Setup:</h3>
                <ol>
                    <li><strong>Install:</strong> <code>npm install -g antigoldfishmode</code></li>
                    <li><strong>Activate:</strong> <code>antigoldfishmode activate ${licenseKey}</code></li>
                    <li><strong>Start using:</strong> <code>antigoldfishmode remember "My first memory"</code></li>
                    <li><strong>Pro tip:</strong> <code>antigoldfishmode recall "search term"</code></li>
                </ol>
            </div>

            <h3>✨ What You Get:</h3>
            <ul>
                <li>🧠 <strong>Unlimited AI Memory Storage</strong></li>
                <li>🔍 <strong>Smart Memory Search</strong></li>
                <li>📝 <strong>Conversation Recording</strong></li>
                <li>💾 <strong>Local Data Storage</strong> (your data stays private)</li>
                <li>📅 <strong>Monthly Billing</strong> - Cancel anytime</li>
            </ul>

            <div class="upgrade-cta">
                <h3>💰 Want to Save $51/Year?</h3>
                <p>Upgrade to Early Adopter Annual and lock in <strong>$69/year forever</strong></p>
                <p><em>Save vs monthly: $120/year → $69/year</em></p>
                <a href="https://buy.stripe.com/test_8x26oHeb6gi814WepD4Ja09" class="btn">Upgrade & Lock in $69/Year</a>
            </div>

            <p><strong>Questions?</strong> Reply to this email - we're here to help!</p>

            <p>Happy coding!<br>The AntiGoldfishMode Team 🧠</p>
        </div>
    </div>
</body>
</html>`;
}

// Generate early adopter license email HTML
function generateEarlyAdopterLicenseEmail(licenseKey, customerEmail, customerName = 'Developer') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your AntiGoldfishMode Early Adopter License</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { text-align: center; background: linear-gradient(135deg, #1877f2 0%, #42a5f5 100%); color: white; padding: 40px 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 30px; }
        .early-adopter-badge { background: #ff6b6b; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .license-key { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-align: center; border: 3px solid #667eea; margin: 25px 0; letter-spacing: 1px; }
        .instructions { background: #e7f3ff; padding: 25px; border-radius: 12px; border-left: 5px solid #667eea; margin: 25px 0; }
        .instructions h3 { margin-top: 0; color: #667eea; }
        .instructions ol { margin: 15px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; }
        .instructions code { background: #f8f9fa; padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #e83e8c; }
        .savings-highlight { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Welcome, Early Adopter!</h1>
            <p>Your AntiGoldfishMode License is Ready</p>
            <span class="early-adopter-badge">EARLY ADOPTER - $69/YEAR</span>
        </div>

        <div class="content">
            <p>Hi ${customerName}!</p>

            <p>🚀 <strong>Congratulations!</strong> You're now one of the first 20,000 Early Adopters of AntiGoldfishMode. You've secured lifetime Early Adopter pricing and priority support!</p>

            <div class="license-key">
                ${licenseKey}
            </div>

            <div class="savings-highlight">
                <h3>💰 You Saved $80/Year!</h3>
                <p>Early Adopter: $69/year | Standard: $149/year</p>
                <p><strong>Your Early Adopter status is permanent!</strong></p>
            </div>

            <div class="instructions">
                <h3>🚀 Quick Setup:</h3>
                <ol>
                    <li><strong>Install:</strong> <code>npm install -g antigoldfishmode</code></li>
                    <li><strong>Activate:</strong> <code>antigoldfishmode activate ${licenseKey}</code></li>
                    <li><strong>Start using:</strong> <code>antigoldfishmode remember "My first memory"</code></li>
                    <li><strong>Pro tip:</strong> <code>antigoldfishmode --secure-mode</code> for encrypted storage</li>
                </ol>
            </div>

            <h3>🎯 Early Adopter Benefits:</h3>
            <ul>
                <li>🧠 <strong>Unlimited AI Memory Storage</strong></li>
                <li>🔍 <strong>Smart Memory Search</strong></li>
                <li>📝 <strong>Conversation Recording</strong></li>
                <li>💾 <strong>Local Data Storage</strong> (your data stays private)</li>
                <li>⚡ <strong>Priority Support</strong></li>
                <li>🚀 <strong>Early Access to v2.0</strong> (code execution sandbox)</li>
                <li>💰 <strong>Lifetime Early Adopter Pricing</strong></li>
            </ul>

            <p><strong>Thank you for believing in AntiGoldfishMode!</strong> You're helping shape the future of AI-assisted development.</p>

            <p>Best regards,<br>The AntiGoldfishMode Team 🧠</p>
        </div>
    </div>
</body>
</html>`;
}

// Send license email
async function sendLicenseEmail(licenseKey, customerEmail, customerName, licenseType = 'TRIAL') {
    const transporter = createEmailTransporter();

    // Customize subject and content based on license type
    let subject, emailContent;

    switch (licenseType) {
        case 'TRIAL':
            subject = '🆓 Your AntiGoldfishMode 7-Day Trial License - Start Now!';
            emailContent = generateTrialLicenseEmail(licenseKey, customerEmail, customerName);
            break;
        case 'EARLY_ADOPTER':
            subject = '🎉 Your AntiGoldfishMode Early Adopter License - Welcome!';
            emailContent = generateEarlyAdopterLicenseEmail(licenseKey, customerEmail, customerName);
            break;
        case 'MONTHLY':
            subject = '📅 Your AntiGoldfishMode Monthly License - Ready to Use!';
            emailContent = generateMonthlyLicenseEmail(licenseKey, customerEmail, customerName);
            break;
        default:
            subject = '🧠 Your AntiGoldfishMode License Key - Ready to Use!';
            emailContent = generateTrialLicenseEmail(licenseKey, customerEmail, customerName);
    }

    const mailOptions = {
        from: `"AntiGoldfishMode" <${process.env.EMAIL_USER || 'antigoldfish.dev@gmail.com'}>`,
        to: customerEmail,
        subject: subject,
        html: emailContent
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ ${licenseType} license email sent to ${customerEmail}:`, result.messageId);
        return result;
    } catch (error) {
        console.error(`❌ Failed to send license email to ${customerEmail}:`, error);
        throw error;
    }
}

// Verify Stripe webhook signature
function verifyStripeSignature(payload, signature, secret) {
    if (!secret) {
        console.warn('⚠️ No webhook secret configured - skipping signature verification');
        return true; // Allow in development
    }

    // Allow test signatures in development
    if (signature === 'test_signature') {
        console.warn('⚠️ Test signature detected - allowing for development');
        return true;
    }

    try {
        const elements = signature.split(',');
        const signatureHash = elements.find(el => el.startsWith('v1='))?.split('=')[1];
        const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];

        if (!signatureHash || !timestamp) {
            console.error('❌ Invalid signature format');
            return false;
        }

        const payloadString = timestamp + '.' + payload;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payloadString, 'utf8')
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signatureHash, 'hex')
        );
    } catch (error) {
        console.error('❌ Signature verification failed:', error);
        return false;
    }
}

// Handle successful checkout
async function handleCheckoutCompleted(session) {
    console.log('💳 Checkout completed:', {
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        amount: session.amount_total
    });

    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name || 'Developer';
    
    if (!customerEmail) {
        console.error('❌ No customer email found in checkout session');
        return;
    }

    // Generate appropriate license key based on amount and mode
    let licenseKey;
    let licenseType;
    const amount = session.amount_total; // Amount in cents
    const mode = session.mode; // 'payment' or 'subscription'

    console.log(`💰 Checkout details:`, {
        amount: amount,
        mode: mode,
        currency: session.currency,
        paymentStatus: session.payment_status
    });

    if (amount === 0 || session.payment_status === 'no_payment_required') {
        // Free trial signup
        licenseKey = generateTrialKey();
        licenseType = 'TRIAL';
        console.log(`🆓 Generated Trial license: ${licenseKey}`);
    } else if (amount >= 14900) { // $149.00 or more - Standard
        licenseKey = generateStandardKey();
        licenseType = 'STANDARD';
        console.log(`💼 Generated Standard license: ${licenseKey}`);
    } else if (amount >= 6900) { // $69.00 - Early Adopter
        licenseKey = generateEarlyAdopterKey();
        licenseType = 'EARLY_ADOPTER';
        console.log(`🎉 Generated Early Adopter license: ${licenseKey}`);
    } else if (amount >= 1000) { // $10.00 - Monthly subscription
        licenseKey = generateEarlyAdopterKey(); // Monthly gets same license as Early Adopter
        licenseType = 'MONTHLY';
        console.log(`📅 Generated Monthly license: ${licenseKey}`);
    } else {
        // Fallback to trial for any other case
        licenseKey = generateTrialKey();
        licenseType = 'TRIAL';
        console.log(`🆓 Generated Trial license (fallback): ${licenseKey}`);
    }

    // Send license email
    try {
        await sendLicenseEmail(licenseKey, customerEmail, customerName, licenseType);
        console.log(`✅ ${licenseType} license delivered successfully to ${customerEmail}`);
    } catch (error) {
        console.error(`❌ Failed to deliver license to ${customerEmail}:`, error);
        // TODO: Add to retry queue or alert system
    }
}

// Main Vercel serverless function
module.exports = async (req, res) => {
    // Handle CORS
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
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const signature = req.headers['stripe-signature'];
    const payload = req.body;
    
    console.log('📨 Webhook received:', {
        signature: signature ? 'present' : 'missing',
        payloadSize: typeof payload === 'string' ? payload.length : JSON.stringify(payload).length
    });

    // Convert payload to string if it's not already
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Verify webhook signature
    if (!verifyStripeSignature(payloadString, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
        event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (error) {
        console.error('❌ Invalid JSON payload:', error);
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.log(`🎯 Processing event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true, processed: event.type });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};