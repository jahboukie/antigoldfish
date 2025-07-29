# 🎯 AntiGoldfishMode Webhook Setup Guide

Complete guide for setting up Stripe webhooks with license delivery automation.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env` and fill in your actual values:
```bash
# Required: Gmail credentials for license delivery
EMAIL_USER=antigoldfish.dev@gmail.com
EMAIL_PASS=your-gmail-app-password

# Required: Stripe webhook secret (from stripe listen)
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...

# Optional: Server port (defaults to 3000)
PORT=3000
```

### 3. Start Webhook Server
```bash
# Development (with auto-restart)
npm run webhook:dev

# Production
npm run webhook
```

### 4. Set Up Stripe CLI Listener
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Listen for webhook events
stripe listen --events checkout.session.completed,payment_intent.succeeded --forward-to localhost:3000/webhook
```

## 📧 Gmail App Password Setup

1. **Enable 2FA** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

## 🔧 Webhook Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check & service info |
| `/health` | GET | Simple health check |
| `/webhook` | POST | Stripe webhook handler |

## 🎯 Supported Stripe Events

- **`checkout.session.completed`** - Main license delivery trigger
- **`payment_intent.succeeded`** - Backup/additional processing

## 💰 License Generation Logic

| Payment Amount | License Type | Key Format |
|----------------|--------------|------------|
| ≥ $69.00 | Early Adopter | `AGM-EARLY-XXXXXX-XXXXXX-XXXXXX` |
| < $69.00 | Trial | `AGM-TRIAL-XXXXXX-XXXXXX-XXXXXX` |

## 🧪 Testing

### Test Webhook Locally
```bash
# 1. Start webhook server
npm run webhook

# 2. In another terminal, start Stripe listener
stripe listen --forward-to localhost:3000/webhook

# 3. Trigger test event
stripe trigger checkout.session.completed
```

### Test Email Delivery
```bash
# Use the standalone license generator
node license-generator.js test@example.com "Test User"
```

## 🚀 Production Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

## 🔐 Security Features

- **Webhook signature verification** - Validates requests from Stripe
- **Environment variable protection** - Sensitive data in env vars
- **Graceful error handling** - Prevents crashes on invalid requests
- **Request logging** - Tracks all webhook events

## 📊 Monitoring

The webhook server logs:
- ✅ Successful license deliveries
- ❌ Failed email sends
- 📨 Webhook events received
- 🔐 Signature verification results

## 🛠️ Troubleshooting

### Common Issues

**"Invalid signature" errors:**
- Check `STRIPE_WEBHOOK_SECRET` matches output from `stripe listen`
- Ensure webhook endpoint uses raw body parsing

**Email delivery fails:**
- Verify Gmail app password is correct
- Check Gmail account has 2FA enabled
- Ensure `EMAIL_USER` and `EMAIL_PASS` are set

**Webhook not receiving events:**
- Confirm Stripe CLI is forwarding to correct port
- Check firewall/network settings
- Verify webhook server is running

### Debug Mode
Set `NODE_ENV=development` for additional logging and relaxed signature verification.

## 📞 Support

Need help? Contact us at antigoldfish.dev@gmail.com
