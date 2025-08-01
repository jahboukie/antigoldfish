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
    console.log(`📧 Attempting to send license ${licenseKey} to ${customerEmail}`);
    
    try {
        const transporter = createEmailTransporter();
        
        const mailOptions = {
            from: 'AntiGoldfishMode <antigoldfish.dev@gmail.com>',
            to: customerEmail,
            subject: '🆓 Your AntiGoldfishMode Trial License - Start Now!',
            html: generateTrialEmail(licenseKey, customerName)
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${customerEmail}:`, result.messageId);
        return result;
    } catch (error) {
        console.error(`❌ Email failed for ${customerEmail}:`, error.message);
        // Don't throw error - webhook should still return success
        return null;
    }
}

// Handle checkout
async function handleCheckout(session) {
    console.log('Checkout session details:', {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email
    });
    
    const email = session.customer_details?.email;
    const name = session.customer_details?.name || 'Developer';
    
    if (email) {
        const licenseKey = generateTrialKey();
        console.log(`Generated license for ${email}: ${licenseKey}`);
        await sendLicenseEmail(licenseKey, email, name);
    } else {
        console.error('No customer email found in checkout session');
    }
}

// Handle subscription created (for trial subscriptions)
async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', {
        id: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        trial_end: subscription.trial_end
    });
    
    // For subscriptions, we need to get customer details from Stripe
    // For now, log that we received the event
    console.log('Subscription created - customer details may need separate API call');
}

// Handle invoice payment (for subscription billing)
async function handleInvoicePayment(invoice) {
    console.log('Invoice payment succeeded:', {
        id: invoice.id,
        customer: invoice.customer,
        amount_paid: invoice.amount_paid,
        subscription: invoice.subscription
    });
    
    // This handles successful subscription payments
    // Customer details may need separate API call
    console.log('Invoice payment - customer details may need separate API call');
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
            console.log('Event received:', event.type);
            
            // Handle different subscription events
            switch (event.type) {
                case 'checkout.session.completed':
                    console.log('Processing checkout.session.completed');
                    await handleCheckout(event.data.object);
                    break;
                    
                case 'customer.subscription.created':
                    console.log('Processing customer.subscription.created');
                    await handleSubscriptionCreated(event.data.object);
                    break;
                    
                case 'invoice.payment_succeeded':
                    console.log('Processing invoice.payment_succeeded');
                    await handleInvoicePayment(event.data.object);
                    break;
                    
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            
            return res.json({ received: true, processed: event.type });
        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ error: 'Failed', message: error.message });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};