# Ethio Acers

MVP web app for Ethiopian high school students (Grade 9–12) to practice national exam questions and track daily study streaks.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI:** Shadcn-style components (Radix + Tailwind)
- **Backend + Auth:** Supabase
- **Deployment:** Vercel

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.local.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key

3. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL editor, run the schema and RLS from the PRD (tables: `profiles`, `subjects`, `questions`, `sessions`, `attempts`).
   - Add RLS for `subjects` if you use it:

     ```sql
     alter table subjects enable row level security;
     create policy "Authenticated read" on subjects
       for select using (auth.role() = 'authenticated');
     ```

   - Run the seed SQL to create subjects and sample questions.
   - Create test users in Authentication (or seed via SQL) — no signup flow in MVP.

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Log in with a test account, then use Dashboard and Practice.

## Pages

- **/** — Home (link to login)
- **/login** — Email + password login (Supabase Auth)
- **/dashboard** — Streak, today’s status, 7-day calendar, “Start Practice”
- **/practice** — Subject + grade, 10 questions, score summary, “Log Session”

## Deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel → Settings → Environment Variables.
