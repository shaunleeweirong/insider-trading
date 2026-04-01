# Deploy Checklist

## 1. Environment Variables

Set all values from `.env.production.example` in Vercel:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Data: `FMP_API_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- App: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`

## 2. Stripe Production Setup

Run:

```bash
bun run scripts/setup-stripe-production.ts
```

Copy the logged price ID into `STRIPE_PRICE_ID`.

## 3. Stripe Dashboard

- Configure webhook endpoint for `/api/stripe/webhook`
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`
- Verify Customer Portal settings if you want custom branding

## 4. Vercel Project

- Deploy to Vercel in region `iad1`
- Confirm `vercel.json` cron and security headers are applied
- Confirm `/api/cron/sync-trades` requires `Authorization: Bearer $CRON_SECRET`

## 5. Post-deploy Checks

- Visit `/`
- Visit `/pricing`
- Run a test checkout in Stripe test mode first
- Trigger `/api/admin/trigger-sync` as an admin
- Verify alert emails send through Resend
