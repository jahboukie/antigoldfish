# AntiGoldfishMode Webhook Deployment Guide

## 🚨 Troubleshooting Vercel 400 Errors

### Common Causes:
1. **Missing Environment Variables**
2. **Incorrect Stripe Webhook Configuration**
3. **Request Body Parsing Issues**
4. **Timeout Problems**

### Quick Fixes:

#### 1. Check Environment Variables in Vercel
```bash
# Required variables:
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
STRIPE_WEBHOOK_SECRET=whsec_... (optional but recommended)
```

#### 2. Verify Stripe Webhook Settings
- **Endpoint URL**: `https://your-domain.vercel.app/api/stripe-webhook`
- **Events**: `checkout.session.completed`
- **API Version**: Latest (2023-10-16 or newer)

#### 3. Test the Webhook
```bash
# Test with curl:
curl -X POST https://your-domain.vercel.app/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"customer_details":{"email":"test@example.com","name":"Test User"}}}}'
```

## 🔄 Alternative Deployment Options

### Option 1: Fixed Vercel Webhook (Recommended)
The updated `api/stripe-webhook.js` includes:
- ✅ Proper error handling
- ✅ Environment variable validation
- ✅ CORS headers
- ✅ Better request parsing

### Option 2: Standalone License Generator
Use `license-generator.js` for manual license creation:

```bash
# Install dependencies
npm install nodemailer

# Set environment variables
export EMAIL_USER="your-gmail@gmail.com"
export EMAIL_PASS="your-gmail-app-password"

# Generate and send license
node license-generator.js send customer@example.com "Customer Name" early
```

### Option 3: Simple Express Server
Deploy `webhook-server-simple.js` on any Node.js hosting:

```bash
# Install dependencies
npm install express

# Start server
EMAIL_USER=your-gmail@gmail.com EMAIL_PASS=your-app-password node webhook-server-simple.js
```

**Deploy on:**
- Railway: `railway deploy`
- Render: Connect GitHub repo
- DigitalOcean App Platform
- AWS Lambda with Express
- Google Cloud Run

### Option 4: Zapier Alternative (No Code)
1. **Trigger**: Stripe "New Payment" 
2. **Action**: Gmail "Send Email"
3. **License Generation**: Use Zapier Code step:

```javascript
// Zapier Code Step
const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const licenseKey = `AGM-EARLY-${part()}-${part()}-${part()}`;

output = [{
  licenseKey: licenseKey,
  customerEmail: inputData.customer_email,
  customerName: inputData.customer_name || 'Customer'
}];
```

## 🔧 License Key Format Reference

### Correct Format:
```
AGM-{TYPE}-{HASH}-{HASH}-{HASH}
```

### Examples:
- **Trial**: `AGM-TRIAL-5D5GFH-SBILQC-M6Y24Q`
- **Early Adopter**: `AGM-EARLY-5D5GFH-SBILQC-M6Y24Q`
- **Standard**: `AGM-STD-5D5GFH-SBILQC-M6Y24Q`

### CLI Parsing:
The CLI only checks the second part (`TYPE`) and ignores the hash parts, so any format with `AGM-{TYPE}-*` will work.

## 🧪 Testing License Keys

```bash
# Test license activation
antigoldfishmode activate AGM-EARLY-5D5GFH-SBILQC-M6Y24Q

# Check status
antigoldfishmode status

# Test trial license
antigoldfishmode activate AGM-TRIAL-ABC123-DEF456-GHI789
```

## 📧 Email Configuration

### Gmail App Password Setup:
1. Enable 2FA on Gmail
2. Go to Google Account Settings
3. Security → App passwords
4. Generate password for "Mail"
5. Use this password (not your regular Gmail password)

### Environment Variables:
```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # 16-character app password
```

## 🚀 Quick Deployment Commands

### Vercel:
```bash
# Deploy current webhook
vercel --prod

# Set environment variables
vercel env add EMAIL_USER
vercel env add EMAIL_PASS
```

### Railway:
```bash
# Deploy Express server
railway login
railway new
railway deploy
```

### Manual Testing:
```bash
# Generate license manually
node license-generator.js generate early

# Send license email
node license-generator.js send test@example.com "Test User" early
```

## 🔍 Debugging Tips

### Check Vercel Logs:
```bash
vercel logs --follow
```

### Test Webhook Locally:
```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev

# Test endpoint
curl -X POST http://localhost:3000/api/stripe-webhook -H "Content-Type: application/json" -d '{"type":"test"}'
```

### Stripe Webhook Testing:
1. Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
2. Trigger test events: `stripe trigger checkout.session.completed`
3. Check webhook logs in Stripe Dashboard

## 🎯 Recommended Solution

For immediate deployment:
1. **Fix Vercel webhook** with updated code
2. **Set environment variables** in Vercel dashboard
3. **Keep `license-generator.js`** as backup for manual licenses
4. **Test thoroughly** before going live

The license key format is already correct - the issue is likely in the webhook configuration or environment setup.
