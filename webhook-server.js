#!/usr/bin/env node

/**
 * AntiGoldfishMode Stripe Webhook Server
 * Handles Stripe checkout completion and license delivery
 * 
 * Usage:
 * - Development: node webhook-server.js
 * - Production: Deploy to Vercel/Railway/etc.
 */

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for raw body (required for Stripe webhook signature verification)
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// License generation functions (from license-generator.js)
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

// Generate license email HTML
function generateLicenseEmail(licenseKey, customerEmail, customerName = 'Developer') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your AntiGoldfishMode License Key</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .license-box { background: #fff; border: 2px solid #4ecdc4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .license-key { font-family: 'Courier New', monospace; font-size: 1.4rem; font-weight: bold; color: #2c3e50; background: #ecf0f1; padding: 15px; border-radius: 5px; letter-spacing: 2px; }
        .command-box { background: #2c3e50; color: #ecf0f1; padding: 12px; border-radius: 5px; font-family: 'Courier New', monospace; margin: 10px 0; }
        .feature-list { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #4ecdc4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 Welcome to AntiGoldfishMode!</h1>
        <p>Your AI Memory Engine License is Ready</p>
    </div>
    
    <div class="content">
        <h2>Hi ${customerName}! 👋</h2>
        <p><strong>Thank you for purchasing AntiGoldfishMode!</strong> You're now part of an exclusive group of developers who are revolutionizing AI-assisted coding.</p>
        
        <div class="license-box">
            <h3>🔑 Your License Key:</h3>
            <div class="license-key">${licenseKey}</div>
            <p><em>Keep this key safe - you'll need it to activate AntiGoldfishMode</em></p>
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

        <div class="feature-list">
            <h3>✨ What You Get:</h3>
            <ul>
                <li>🧠 <strong>Unlimited AI Memory</strong> - Never lose context again</li>
                <li>💾 <strong>Local Data Storage</strong> - Your data stays private</li>
                <li>🔍 <strong>Smart Memory Search</strong> - Find past insights instantly</li>
                <li>📝 <strong>Conversation Recording</strong> - Track all AI interactions</li>
                <li>🔒 <strong>Machine-Bound License</strong> - Secure and portable</li>
                <li>🚀 <strong>Early Access to v2.0</strong> - Code execution sandbox (Q4 2025)</li>
            </ul>
        </div>

        <h3>💡 Pro Tips:</h3>
        <ul>
            <li>Use <code>antigoldfishmode status</code> to check your license</li>
            <li>Use <code>antigoldfishmode recall "keyword"</code> to search memories</li>
            <li>Your license works on one machine - use <code>deactivate</code> to move it</li>
        </ul>

        <p><strong>🎉 Welcome to the future of AI-assisted development!</strong></p>
        <p>Best regards,<br>The AntiGoldfishMode Team</p>
        
        <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
            Need help? Reply to this email or contact us at <a href="mailto:antigoldfish.dev@gmail.com">antigoldfish.dev@gmail.com</a>
        </p>
    </div>
</body>
</html>`;
}

// Send license email
async function sendLicenseEmail(licenseKey, customerEmail, customerName) {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: process.env.EMAIL_USER || 'antigoldfish.dev@gmail.com',
        to: customerEmail,
        subject: '🧠 Your AntiGoldfishMode License Key - Ready to Use!',
        html: generateLicenseEmail(licenseKey, customerEmail, customerName)
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ License email sent to ${customerEmail}:`, result.messageId);
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

    try {
        const elements = signature.split(',');
        const signatureHash = elements.find(el => el.startsWith('v1=')).split('=')[1];
        const timestamp = elements.find(el => el.startsWith('t=')).split('=')[1];
        
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

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'AntiGoldfishMode Webhook Server',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main Stripe webhook endpoint
app.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;
    
    console.log('📨 Webhook received:', {
        signature: signature ? 'present' : 'missing',
        payloadSize: payload.length
    });

    // Verify webhook signature
    if (!verifyStripeSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).send('Invalid signature');
    }

    let event;
    try {
        event = JSON.parse(payload.toString());
    } catch (error) {
        console.error('❌ Invalid JSON payload:', error);
        return res.status(400).send('Invalid JSON');
    }

    console.log(`🎯 Processing event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true, processed: event.type });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

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

    // Generate appropriate license key based on amount
    let licenseKey;
    const amount = session.amount_total; // Amount in cents
    
    if (amount >= 6900) { // $69.00 or more
        licenseKey = generateEarlyAdopterKey();
        console.log(`🎉 Generated Early Adopter license: ${licenseKey}`);
    } else {
        licenseKey = generateTrialKey();
        console.log(`🆓 Generated Trial license: ${licenseKey}`);
    }

    // Send license email
    try {
        await sendLicenseEmail(licenseKey, customerEmail, customerName);
        console.log(`✅ License delivered successfully to ${customerEmail}`);
    } catch (error) {
        console.error(`❌ Failed to deliver license to ${customerEmail}:`, error);
        // TODO: Add to retry queue or alert system
    }
}

// Handle successful payment (backup/additional processing)
async function handlePaymentSucceeded(paymentIntent) {
    console.log('💰 Payment succeeded:', {
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
    });
    
    // Additional processing if needed
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AntiGoldfishMode Webhook Server running on port ${PORT}`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Webhook secret: ${process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'not configured (dev mode)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    process.exit(0);
});
