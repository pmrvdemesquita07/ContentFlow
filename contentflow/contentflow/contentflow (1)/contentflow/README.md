# ContentFlow

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

- `app/(app)/` - the authenticated app shell (Ideas Bank, Posts, Calendar, Tasks, Media,
  Settings), gated by `app/(app)/layout.tsx`
- `app/login`, `app/signup`, `app/onboarding` - Supabase Auth + first Workspace/Brand setup
- `app/actions/` - server actions (mutations)
- `lib/` - Prisma client, Supabase client helpers, and query helpers
- `prisma/schema.prisma` - the full data model (some tables - Metric, SocialAccount,
  Message, AssistantLog - are defined for later phases but have no UI yet)
- `proxy.ts` - session-refresh gate for the authenticated routes (Next.js 16 renamed
  Middleware to Proxy)

## What's built vs. what's next

Built: auth + onboarding, Content core (Ideas Bank / Posts / Calendar), Tasks, Media,
Settings + Brand Voice.

Not yet built (tables already exist in the schema for when you get there): Dashboard,
Social Hub (real OAuth), Analytics, the six AI Assistants, Mailbox.
