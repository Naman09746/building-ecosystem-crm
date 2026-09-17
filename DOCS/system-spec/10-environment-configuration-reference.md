# 10. Environment & Configuration Reference — Apex Realty EcosystemRealty

**Config File:** `Frontend/.env.local`  
**Template File:** `Frontend/.env.local.example`

---

## 1. Environment Variables Matrix

| Variable Name | Required? | Scope | Default / Example Value | Description & Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** (Live DB) | Client & Server | `https://your-project.supabase.co` | Supabase Project REST / GraphQL API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| **Yes** (Live DB) | Client & Server | `eyJhbGciOi...` | Supabase Anonymous Client Public Key (carries RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-Only | `eyJhbGciOi...` | Elevated Admin key for background webhook handlers |
| `GEMINI_API_KEY` | Optional | Server-Only | `AIzaSy...` | Google AI Studio key for Gemini 2.5 Flash agent |
| `GOOGLE_GENERATIVE_AI_API_KEY`| Optional | Server-Only | `AIzaSy...` | Fallback alias for Gemini API key |
| `N8N_WEBHOOK_URL` | Optional | Server-Only | `https://n8n.internal.agency.com/webhook/...` | Target URL for outbox domain event dispatching |
| `N8N_INTEGRATION_TOKEN` | Optional | Server-Only | `n8n_tok_sec_...` | Bearer token for n8n API handshake |
| `TELEPHONY_PROVIDER` | Optional | Server-Only | `Exotel` / `Knowlarity` / `Twilio` | Active telephony bridge provider name |
| `TELEPHONY_WEBHOOK_SECRET` | Optional | Server-Only | `tel_whsec_...` | Signature secret for telephony call events |
| `CRON_SECRET` | Optional | Server-Only | `cron_sec_high_entropy_...` | Secret key authenticating background Vercel Crons |
| `WHATSAPP_VERIFY_TOKEN` | Optional | Server-Only | `apex_realty_wh_secret_2026` | Meta Webhook GET challenge verification token |
| `WHATSAPP_APP_SECRET` | Optional | Server-Only | `0123456789abcdef...` | Meta App Secret for HMAC-SHA256 signature check |
| `META_LEAD_ADS_VERIFY_TOKEN` | Optional | Server-Only | `apex_meta_ads_secret_2026` | Meta Lead Ads webhook handshake token |
| `META_APP_SECRET` | Optional | Server-Only | `0123456789abcdef...` | Meta Lead Ads webhook HMAC secret |
| `STRIPE_SECRET_KEY` | Optional | Server-Only | `sk_test_...` | Stripe secret key for payment sessions |
| `STRIPE_WEBHOOK_SECRET` | Optional | Server-Only | `whsec_...` | Stripe webhook signature secret |
| `RAZORPAY_KEY_SECRET` | Optional | Server-Only | `rzp_test_...` | Razorpay payment verification secret |
| `BILLING_WEBHOOK_SECRET` | Optional | Server-Only | `wh_secret_...` | Generic billing webhook HMAC verification secret |
| `NODE_ENV` | System | Runtime | `development` / `production` | Node.js execution environment |

---

## 2. Zero-Setup Local Development Resilience

The application is engineered to be **resilient to missing API keys**:
1. **If Supabase keys are omitted or placeholder:** The application seamlessly operates using its built-in in-memory reactive CRM state and sample luxury inventory (*DLF Camellias*, *Godrej Aristocrat*, *Lodha World Towers*).
2. **If Gemini API keys are omitted:** The Aria conversational bot runs an autonomous conversational simulation engine, extracting buyer parameters, generating lead cards, and allowing complete UI testing without billing external AI APIs.
3. **If Payment keys are omitted:** The checkout workflow initiates simulated test checkout sessions (`cs_simulated_...`) and automatically provisions plan tiers upon completion.
4. **If n8n / Telephony keys are omitted:** The domain outbox logs events locally to `integration_outbox` without breaking core CRM transactions.

---

## 3. Sample Configuration File (`.env.local`)

```bash
# ====================================================================
# APEX REALTY CALLCRM: ENVIRONMENT CONFIGURATION
# ====================================================================

# 1. Supabase Database & Auth (Get from supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. AI Intelligence Engine (Google AI Studio)
GEMINI_API_KEY=AIzaSy...

# 3. Enterprise Integrations & Outbox (n8n & Telephony)
N8N_WEBHOOK_URL=https://n8n.internal.agency.com/webhook/crm-events
N8N_INTEGRATION_TOKEN=n8n_tok_sec_...
TELEPHONY_PROVIDER=Exotel
TELEPHONY_WEBHOOK_SECRET=tel_whsec_...
CRON_SECRET=cron_sec_high_entropy_...

# 4. Meta & WhatsApp Webhooks
WHATSAPP_VERIFY_TOKEN=apex_realty_wh_secret_2026
WHATSAPP_APP_SECRET=your_meta_app_secret_here
META_LEAD_ADS_VERIFY_TOKEN=apex_meta_ads_secret_2026
META_APP_SECRET=your_meta_lead_ads_secret_here

# 5. Payment Gateways (Stripe / Razorpay)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
