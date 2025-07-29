/**
 * Simple Express.js Webhook Server for AntiGoldfishMode
 * Alternative to Vercel - can be deployed on any Node.js hosting
 */

const express = require('express');
const { generateEarlyAdopterKey, generateTrialKey, sendLicenseEmail } = require('./license-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'AntiGoldfishMode Webhook Server',
    timestamp: new Date().toISOString()
  });
});

// Stripe webhook endpoint
app.post('/webhook/stripe', async (req, res) => {
  try {
    console.log('📦 Received Stripe webhook:', req.body?.type || 'unknown');
    
    const event = req.body;
    
    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Extract customer info
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || 'Customer';
      
      if (!customerEmail) {
        console.error('❌ No customer email found');
        return res.status(400).json({ error: 'No customer email' });
      }
      
      console.log(`🎯 Processing license for: ${customerEmail}`);
      
      // Determine license type
      let licenseKey;
      let licenseType;
      const amount = session.amount_total || 0;
      
      if (amount === 0) {
        // Free trial
        licenseKey = generateTrialKey();
        licenseType = '7-Day Trial';
        console.log(`🆓 Generated TRIAL license: ${licenseKey}`);
      } else {
        // Paid license
        licenseKey = generateEarlyAdopterKey();
        licenseType = 'Early Adopter';
        console.log(`💰 Generated EARLY license: ${licenseKey}`);
      }
      
      // Send email
      const emailSent = await sendLicenseEmail(customerEmail, customerName, licenseKey, licenseType);
      
      if (emailSent) {
        console.log(`✅ License ${licenseKey} sent to ${customerEmail}`);
      } else {
        console.error(`❌ Failed to send license to ${customerEmail}`);
      }
    }
    
    // Always respond with 200 to Stripe
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual license generation endpoint (for testing/backup)
app.post('/generate-license', async (req, res) => {
  try {
    const { email, name, type = 'early' } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name required' });
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
      default:
        return res.status(400).json({ error: 'Invalid license type' });
    }
    
    console.log(`🔑 Manual license generation: ${licenseKey} for ${email}`);
    
    const emailSent = await sendLicenseEmail(email, name, licenseKey, licenseType);
    
    if (emailSent) {
      res.json({ 
        success: true, 
        licenseKey, 
        message: `License sent to ${email}` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        licenseKey, 
        message: 'Failed to send email' 
      });
    }
    
  } catch (error) {
    console.error('❌ License generation error:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AntiGoldfishMode Webhook Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Stripe webhook: http://localhost:${PORT}/webhook/stripe`);
  console.log(`🔑 Manual license: http://localhost:${PORT}/generate-license`);
  
  // Environment check
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Warning: EMAIL_USER and EMAIL_PASS environment variables not set');
  }
});

module.exports = app;
