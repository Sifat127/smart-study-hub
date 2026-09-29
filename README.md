# DIU StudyBank

An academic resource platform for Daffodil International University students. Study
materials are organized by department, semester, course and chapter, so students can
find the right notes fast and contributors get credit for what they share.

**Live site:** https://diu-study-bank.vercel.app

## What it does

- **Public catalogs** — departments, semesters, courses and chapters are browsable by anyone.
- **Protected files** — viewing or downloading a PDF requires a signed-in account.
- **Upload notes** — students upload their own PDFs and can attach them to a specific chapter.
- **Ratings and discussion** — like/dislike on every material, comments on each chapter, all updating live.
- **Contribution leaderboard** — contributor profiles show uploads, likes, views and avatars.
- **Report a problem** — students flag broken or outdated PDFs; admins triage them under Admin → PDF Reports.
- **Admin console** — `/admin` manages departments, courses, chapters, users and roles, with an audit log.
- **Onboarding guard** — verified users with missing roll number, department or batch are sent to `/complete-profile` before reaching the dashboard.

## Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS v3 with shadcn/ui components
- Lovable Cloud (Supabase): Postgres, auth, storage, Row Level Security, edge functions
- Realtime subscriptions for live like/view/upload counts
- Vitest for unit tests, Playwright for end-to-end tests

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:8080.

## Scripts

```bash
npm run build          # production build
npm run test           # Vitest unit tests
npx playwright test    # end-to-end tests
```

## Project layout

```text
src/
  components/     shared UI (cards, stats, report button, admin widgets)
  components/dashboard/  modular student dashboard sections
  hooks/          data + realtime hooks
  lib/            helpers (storage, profile rules, stats consistency)
  pages/          routes: public catalog, student area, admin console
supabase/
  functions/      edge functions (upload, download, avatars, contact email, MCP)
e2e/              Playwright specs
```

## Notes

- Access control lives in Row Level Security policies plus the `public.*_public`
  views; the browser never reads private storage paths directly.
- Contributor identity is exposed through `public.contributor_stats` and
  `public.profiles_public` so avatars and names render for other users.
- Auth redirects and email links point at the production URL defined in
  `src/lib/siteUrl.ts`.
