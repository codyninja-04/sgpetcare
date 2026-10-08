# SGPetCare

Pet health records and reminders for pet owners in Singapore.

Vaccination dates live in a paper booklet, deworming lives in your memory, and the AVS licence email is somewhere in your inbox. SGPetCare keeps all of it in one place per pet, reminds you before anything is due, and uses Claude to turn vet notes into plain English and answer everyday pet care questions with Singapore in mind (the heat, ticks and heartworm, HDB pet rules, what things roughly cost).

> SGPetCare is a record keeping tool, not veterinary advice. Always consult a licensed veterinarian for your pet's health concerns.

## What is in it

- **Pets**: photo, species, breed, sex, birthday, weight, microchip, sterilisation and notes. Free plan covers one pet, Pro covers the household.
- **Health timeline**: vaccinations, deworming, vet visits, surgery, medication and grooming, grouped by month with filters. Each record can carry a cost, clinic, notes and a photo or PDF of the invoice or certificate.
- **Vaccination tracker**: latest dose per vaccine with up to date, due soon or overdue status, and a gentle note if the core vaccine for the species (DHPPi for dogs, FVRCP for cats) has not been logged.
- **Reminders**: any record with a next due date creates a reminder. Logging the next dose of the same vaccine closes the old one. Next due dates are suggested (12 months for vaccines, 3 for deworming, 1 for monthly preventives) with quick +2 wks to +3 yrs buttons.
- **AVS licensing**: valid, expiring soon or expired at a glance, a ring showing days left, a "just renewed" helper that rolls the expiry forward 1 or 3 years, a checklist and HDB notes for dogs and cats.
- **Vet note interpreter**: paste the notes or photograph the discharge sheet. Claude transcribes it, explains the shorthand, lists what to do, and flags anything to follow up with an urgency level.
- **Pet care Q&A**: streaming answers with a Singapore specific system prompt. Pick a pet and the answer takes its age, breed and recent records into account. Emergencies get pointed to a vet first.
- **Daily digest**: one email (Resend) and one push notification per owner covering everything inside their lead window (3, 7, 14 or 30 days). Each reminder is sent once.
- **PWA**: installable, with a small service worker for push.

## Stack

Next.js 14 (App Router), TypeScript strict, Tailwind CSS, Supabase (Postgres with RLS, Google OAuth, private Storage buckets), Claude via `@anthropic-ai/sdk`, Resend, `web-push`, Vercel Cron.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill it in, see below
npm run dev
```

### Supabase

1. Create a project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor. It creates the tables, RLS policies, the new user trigger and the two private storage buckets (`pet-photos`, `vet-documents`) with per user folder policies.
2. Enable the Google provider under Authentication and add `http://localhost:3000/auth/callback` (and your production URL) as redirect URLs.

### Environment

| Variable | What it is for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Reminder cron and account deletion only |
| `ANTHROPIC_API_KEY` | Vet note interpreter and Q&A |
| `CLAUDE_MODEL` | Optional, defaults to `claude-sonnet-5-5` |
| `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` | Reminder emails. The sender must be on a verified domain |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push. Generate with `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | Vercel sends it as a bearer token to the cron route |
| `NEXT_PUBLIC_APP_URL` | Links in emails and metadata |
| `ENFORCE_PRO` | Free plan limits are shown but only enforced when this is `true` |

### Reminders

`vercel.json` runs `/api/cron/reminder-check` daily at 01:00 UTC (9am in Singapore). To try it locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminder-check
```

## Notes on decisions

- **All dates are Singapore calendar days.** Vaccination and licence dates have no time, so the maths runs on UTC midnights from a Singapore "today" and "due tomorrow" stays right wherever the server is.
- **Files are stored as paths, not URLs.** Both buckets are private and every render signs fresh URLs. API routes only accept paths inside the caller's own folder.
- **Claude returns structured output through a forced tool call** for the interpreter, so there is no JSON parsing of prose. The Q&A streams plain text and is cleaned before it is saved.
- **Past due dates typed in from an old booklet do not fire emails.** They still show as overdue in the app.
- **Billing is not wired up yet.** Every gate goes through `lib/plan.ts`, so turning limits on is one env var once payments exist.

## Not in scope

No vet appointment booking, no insurance marketplace, and no AVS licence submission. Renewals are done with AVS on the NParks website.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```
