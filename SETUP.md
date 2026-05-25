# XP Wiz — Setup Guide

## Prerequisites

- Node.js 20+ (`nvm use 20`)
- A [Neon](https://neon.tech) account (free tier works)
- A Google Cloud project with OAuth credentials

---

## 1. Neon Database

1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string (Postgres URL with `?sslmode=require`)
3. Run the schema migration:

```bash
npm run db:push
```

---

## 2. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
4. Copy the Client ID and Client Secret

---

## 3. Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

---

## 4. Run locally

```bash
nvm use 20
npm install
npm run db:push    # push schema to Neon
npm run dev        # http://localhost:3000
```

---

## 5. Deploy to Vercel

```bash
npx vercel --prod
```

Add all four environment variables in the Vercel dashboard (Project Settings → Environment Variables).

---

## Flying Blue Tiers (2024+)

| Tier     | XP Required |
|----------|------------|
| Silver   | 100 XP     |
| Gold     | 180 XP     |
| Platinum | 300 XP     |
| Ultimate | 600 XP     |
