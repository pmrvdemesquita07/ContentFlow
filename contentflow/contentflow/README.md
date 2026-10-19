# SocialFlow

A content operations platform for creators and small agencies: Ideas Bank, Posts, and
Calendar are three views over one `Content` table, so nothing gets lost moving between
them. Tasks and Media attach directly to a content item; Brand Voice tunes future AI
Assistants.

## Stack

Next.js (App Router, TypeScript) - Tailwind CSS + a hand-built shadcn/ui-style component
library - Prisma (Postgres) - Supabase (Auth + Storage).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables** - copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` - from your Supabase project's
     **Project Settings -> Database -> Connection string** (pooled for `DATABASE_URL`,
     direct for `DIRECT_URL`)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
     `SUPABASE_SERVICE_ROLE_KEY` - from **Project Settings -> API**

3. **Create a Storage bucket** in your Supabase project called `media` (public), used for
   file attachments on content items. Project dashboard -> Storage -> New bucket.

4. **Run migrations**

   ```bash
   npx prisma migrate deploy
   ```

5. **(Optional) Seed demo data** - creates a demo workspace/brand/content so there's
   something to look at immediately:

   ```bash
   npx prisma db seed
   ```

6. **Run the app**

   ```bash
   npm run dev
   ```

## Project layout

- `app/(app)/` - the authenticated app shell (every module below), gated by
  `app/(app)/layout.tsx`
- `app/login`, `app/signup`, `app/onboarding` - Supabase Auth + first Workspace/Brand setup
- `app/actions/` - server actions (mutations)
- `lib/` - Prisma client, Supabase client helpers, and query helpers
- `prisma/schema.prisma` - the full data model
- `proxy.ts` - session-refresh gate for the authenticated routes (Next.js 16 renamed
  Middleware to Proxy)

## What's built

| Area | Modules |
|---|---|
| Content | Ideas Bank, Posts, Calendar, Tasks, Media, Brand Voice |
| Performance | Dashboard, Analytics, Social Hub (Instagram + TikTok OAuth, daily sync), Trends |
| Monetisation | Opportunities marketplace + threads, Media Kit, Contracts & payments |
| Campaigns | Campaigns + ROI, Creators, Competitors, shareable Reports (scheduled email) |
| Agency | Agency roster, Brands, Discover creators, Mailbox |
| AI | Assistants (brand-context aware, monthly usage limits per plan) |

Billing runs through Stripe (`STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO`).

## Plans

| Plan | Price | Unlocks |
|---|---|---|
| Starter | 0€/month | 1 workspace, Dashboard, Ideas/Posts/Calendar, Media, Reports, 20 AI requests/month |
| Pro | 29€/month | Multiple workspaces, Campaigns + ROI, Contracts, Opportunities, Mailbox, Competitors, Trends, Tasks, 100 AI requests/month |
| Studio | 79€/month | Everything in Pro, Agency roster, all-brands Calendar, Discover, reply/briefing AI Assistants, niche Trends, 500 AI requests/month |

Gating lives in `lib/plan.ts` (`planAtLeast`) and `lib/nav-links.ts`; the public copy in
`components/marketing/landing-page.tsx` must stay in sync with it, and the Stripe prices
behind `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STUDIO` must be set to 29€ and 79€.
