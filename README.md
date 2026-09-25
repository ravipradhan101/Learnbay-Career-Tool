# Learnbay Career Studio

An AI-guided career studio for learnbay.co. Learners answer 4 quick questions, then use three tools (Skill Gap
Analysis, Salary Benchmark, Career Roadmap), a guardrailed AI advisor, masterclass material and mentor-session booking.
Every sign-up, tool run, chat, booking and engagement click is a lead signal stored in Postgres.

Stack: Next.js 16 (App Router, server-rendered), React 19, PostgreSQL (`pg`), SMTP (`nodemailer`), Google Gemini 2.5 Flash (REST).

## Setup

1. Install: `npm install`
2. Fill `.env` in the project root (see `.env.example`):
   - `APP_URL`: the public URL, e.g. `https://career.learnbay.co` (links in emails use it; `https://` also turns on secure cookies and HSTS)
   - `DATABASE_URL`: `postgres://USER:PASSWORD@HOST:5432/DBNAME` (create the database first)
   - `SESSION_SECRET`: already generated; keep it secret, and don't change it in production (changing it logs everyone out and invalidates codes)
   - `GEMINI_API_KEY`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `APP_URL` must be the address learners actually open (it is used in every email link). On a local network use the machine's IP, e.g. `http://192.168.1.63:3456`, not `localhost`.
   - Optional: `ADMIN_EMAILS` (extra admin accounts besides admissions@learnbay.co), `COUNSELLOR_NOTIFY_EMAIL`, `DATABASE_SSL=true` for managed Postgres, `TRUST_PROXY=true` behind nginx or a load balancer
3. Create the tables: `npm run db:migrate` (safe to re-run)
4. Develop: `npm run dev` → http://localhost:3000
5. Production: `npm run build` then `npm start` (port 3000; use `-p` to change it)

Without `SMTP_HOST`, development prints login codes and emails to the server console. Production refuses to run without SMTP.

## How it works

| Route | What it is |
|---|---|
| `/` | Landing page with testimonials, proof points, floating Career AI, and mentor booking in the header |
| `/start` | 4 tap questions (role, experience, codes or not, program area) then contact details. `?tool=skill-gap\|salary\|roadmap\|sessions` lands there afterwards |
| `/login` | Email OTP login (6-digit code, 10 min, 5 attempts, rate-limited) |
| `/dashboard` | AI Career Advisor home with a recommended next step, inline AI chat, and a first-visit "what to check first?" pop-up |
| `/dashboard/skill-gap`, `/salary`, `/roadmap` | Each tool asks only its missing questions (2–4), generates once with Gemini, then shows the result, Share / Download PDF, an AI chat about that result, and next-tool options |
| `/dashboard/counselling` | AI counsellor chat, AI voice assistant (when configured), human counselling booking |
| `/dashboard/masterclasses` | Free checked learning resources for the learner's area, plus "notify me" for live masterclasses |
| `/dashboard/sessions` | Book a mentor or counselling session with date and time |
| `/dashboard/profile`, `/dashboard/help` | Locked answers; FAQ |
| `/r/<token>` | Read-only shared tool result (never contact details or current CTC) |
| `/admin/login` | Admin sign-in (email + password). Separate from learner login |
| `/admin` | Analytics overview: visitors, sign-ups, tools, sessions, AI cost, key findings, both funnels |
| `/admin/funnel` | Drop-off per step: quick-start questions, contact-form fields, tool questions, report generation, exit pages |
| `/admin/navigation` | Pages (time on page, scroll depth), common paths, entry pages, traffic sources, devices, what people click |
| `/admin/features` | Used vs avoided: for each feature, who saw it, who used it, who skipped it, who never reached it |
| `/admin/tokens` | Gemini tokens and estimated INR cost per AI tool, per learner (CSV export) and per day |
| `/admin/leads` | Leads with lead score and CSV export; each name opens that learner's full journey (`/admin/users/<id>`) |

Every page shows testimonials and proof points (`src/config/testimonials.ts`). The testimonials are **illustrative placeholders** and labelled as such; replace them with real, consented stories.
The mobile-only green call button opens: AI voice assistant (set `VOICE_ASSISTANT_URL` or `VOICE_ASSISTANT_PHONE`), chat, or book a session.
The exit-intent pop-up (brochure, free material, mentor session) shows once per browser session and never after a session request.

### Career AI guardrails (`src/lib/assistant.ts`)
- Scope limited to careers, skills, salaries, learning, Learnbay programs and app navigation; everything else is refused with a fixed reply
- Obvious prompt-injection phrases are blocked before reaching the model; the user text is treated as data
- Structured output: the model can only send people to routes on an allowlist
- No fees, batch dates, statistics or guarantees are invented; those questions go to a mentor session
- Links and HTML are stripped from replies; replies are rendered as plain text
- Limits: anonymous 20/hour per IP; signed-in 40/day, 150 total, and 8/minute

### Analytics and admin reports
- **What is tracked** (`src/components/AnalyticsTracker.tsx`, `src/lib/analytics.ts`): page views, visible time and scroll depth per page, clicks on buttons and links, each quick-start and tool question shown, answered or backed out of, contact-field focus, validation errors, login, report generation, AI chat use and session booking. **Typed values are never recorded**, only which option was picked. Share tokens and query strings are stripped from paths; `/admin` is never tracked.
- Events are batched in the browser (every 5 seconds or 25 events, plus on tab hide) and stored in `analytics_events` with an anonymous visitor ID (localStorage) and a 30-minute visit ID. After sign-up, events carry the user ID, so each learner's journey includes what they did before signing up on that browser.
- **AI tokens** (`src/lib/ai-usage.ts`): every Gemini HTTP call, including retries and failures, writes the input, output and thinking token counts reported by Google, plus latency, status, user and feature to `ai_usage`. Cost is estimated at the Gemini 2.5 Flash list price ($0.30/M input, $2.50/M output including thinking, ₹88/$); override with `GEMINI_INPUT_USD_PER_M`, `GEMINI_OUTPUT_USD_PER_M` and `INR_PER_USD`.
- Old events are pruned after `ANALYTICS_RETENTION_DAYS` (default 400).

### Admin login
- Admin accounts live in the `admin_users` table. `admissions@learnbay.co` is created by `npm run db:migrate` **without a password**; add more with `ADMIN_EMAILS`.
- To set or reset a password, go to `/admin/login`, choose **Set or reset password**, then enter the 6-digit code sent to the admin email and a new password. If that mailbox can't receive mail, run `npm run admin:password -- admissions@learnbay.co` on the server and type the password at the hidden prompt.
- Passwords are hashed with scrypt and never stored or logged in plain text. Sessions last 8 hours in a separate httpOnly, SameSite=Strict cookie. Five wrong passwords lock the account for 15 minutes, and sign-in is also rate-limited per IP. Setting a new password signs out every other admin session.

### Sign-up verification
New learners confirm their email with a 6-digit code before the studio opens. Their contact details and answers are saved as a lead as soon as they submit, so unconfirmed leads still appear in Admin → Leads (tagged "Unconfirmed"). An unconfirmed lead can re-submit to fix their details; a confirmed account is never changed without its code.

### Eligibility test (Admin → Eligibility test)
- **Question sets** are managed in the admin area. Each set has:
  - a program area (or "all areas");
  - how questions are picked: **AI-generated** for each learner's profile, with the set's questions as fallback, or **only from the set's questions** (a random draw spread across topics);
  - questions per test, seconds per question (each question can override it), total test time and attempts per learner;
  - an Active or Paused status.
- Admins can add a new set (empty, or as a copy of another), and edit settings, questions, options, the correct answer, topic and per-question time. **There is no delete.** Hide a question, pause a set, or pause the whole test with the switch at the top. A learner gets the newest active set made for their program area, else the newest active "all areas" set; with none, the test is hidden from them. Checks stop an admin from activating, or hiding questions from, a set that would not have enough questions.
- The five starter sets were copied from the original built-in bank (`src/lib/eligibility-bank.ts`, now only used for that first copy).
- Timing is enforced on the server, and each attempt keeps the settings it started with, so edits never affect a test in progress. Correct answers never leave the server. Before a retake the learner is invited to book a counsellor call first, and can continue anyway.
- Questions for the next attempt are prepared in the background while the learner reads the instructions, so Start is instant.
- On completion the learner gets their score by email, and `COUNSELLOR_NOTIFY_EMAIL` gets the learner's details, score and best score.

### Backups and rollback
- **Version history (in the app).** Every change to a question set or an email flow saves a numbered version with who changed what. On the set or flow page you can restore any version (the restore is itself a new version, so it can be undone), download any version as a JSON backup file, or restore from such a file. A deleted email flow keeps its history and can be restored from Admin → Emails → Deleted flows. Question sets cannot be deleted.
- **Content backup file.** `npm run backup` writes everything admins manage (question sets, questions, email flows and emails, their full version history and app settings) to `backups/content-<date>.json`. To rebuild from one, run `npm run restore -- backups/<file>.json` (add `--dry-run` first to check the file without changing anything). Restore only inserts or updates, never deletes. Copy backup files somewhere safe: `backups/` is not committed.
- **Code.** The project is a git repository with a tagged baseline. To go back to an earlier version of the app, run `git log --oneline` or `git tag`, then `git checkout <tag>`, `npm install`, `npm run build`. After any schema change, run `npm run db:migrate` (the schema only adds; it never drops data).
- **Learner data** (leads, results, tokens, analytics) lives in the database. Use your database provider's backups or point-in-time restore for it (Neon keeps a restore window; check your plan).

### Learnbay USPs in reports
The "How Learnbay approaches this" notes inside reports, the closing sections of emailed and PDF reports, the public share page and the "How Learnbay is different" popup all read from `src/config/usps.ts`. That file holds only facts published on learnbay.co; update it when the website changes.

### Email automation (Admin → Emails)
- Flows start on a trigger (sign-up, returning login, tool report finished, 1:1 booked, eligibility test finished) and send their emails in order, each with a delay and optional "only send if…" conditions. A flow can stop early when its goal is reached (e.g. the learner booked a session).
- Five starter flows are created once on first start; after that you can edit, pause, reorder, test or delete any email or flow, and create new ones. Personalise with `{{first_name}}`, `{{next_tool_name}}`, `{{next_step_label}}` and similar fields (the editor lists them all).
- **Inbox placement guard rails** (always on): at most one nurture email per learner every 20 hours; delayed emails only between 9am and 8pm IST; plain, single-button emails with a text version; one-click unsubscribe headers (`List-Unsubscribe`, RFC 8058) and an unsubscribe page; no tracking pixels or link shorteners; and sending is paced (`EMAIL_MAX_PER_TICK` per minute).
- **Before launch, set up email authentication for the sending domain**, or Gmail and Yahoo will send bulk mail to spam: SPF and DKIM for the SMTP provider, plus a DMARC record (start with `p=none`). Send from a real mailbox on your own domain (not a personal Gmail) and set `EMAIL_REPLY_TO` to an address someone reads. Warm up gradually if you are sending more than a few hundred emails a day.
- The sender runs inside the Node server every minute. On serverless hosts, set `EMAIL_WORKER=off` and `CRON_SECRET`, then call `POST /api/cron/emails` every minute with `Authorization: Bearer <CRON_SECRET>`.

## Security

- Email OTP codes are HMAC-hashed; sessions are random 256-bit tokens stored as SHA-256 hashes, in httpOnly SameSite=Lax cookies (Secure on https)
- Every state-changing API checks the request Origin (CSRF); JSON bodies are size-capped; all SQL is parameterised
- Rate limits are stored in Postgres (OTP, verify, onboarding, tool generation, resume, assistant, sessions, events)
- Answers are validated against the known option IDs; free text is stripped of control characters and `<>`
- Model output is sanitised and clamped before it is stored; chat replies are rendered as text (no HTML injection)
- A per-request nonce CSP is set in `src/proxy.ts`, plus X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and HSTS (on https); private pages are `noindex`
- An existing email can't be reused to open a report without its OTP code
- CSV export neutralises spreadsheet formulas

## Editing content

- Questions and options: `src/lib/questions.ts`
- Programs: `src/config/programs.ts`
- Learning resources: `src/config/resources.ts`
- Tool prompts and schemas: `src/lib/tools.ts`; tool list and their questions: `src/lib/tools-meta.ts`
- Assistant rules: `src/lib/assistant.ts`
- Testimonials and proof points: `src/config/testimonials.ts`
- The previous one-report version is kept in `.archive-v1/` (excluded from the build); delete it once you no longer need it
- Hero photo: put a square image at `public/hero.webp` and the landing page shows it instead of the robot

## Production & scaling (read before launch)

Load-tested on a single instance with the database in US East and the app in India (every query ≈ 250 ms round trip):
0 errors across ~12,000 requests up to 500 concurrent users; public pages ≈ 200 req/s, dashboard ≈ 36 req/s, sign-ups ≈ 24/s.
Response time is dominated by the database round trip, not by the app. For thousands of simultaneous users:

1. **Put the app and the database in the same region.** Host the app next to Neon (or move Neon close to the app/users). This alone cuts page time from seconds to tens of milliseconds.
2. **Run several app instances** behind a load balancer (e.g. 4–8 × `next start`, or PM2 cluster mode, one per CPU core). The app is stateless — sessions, rate limits and data are all in Postgres.
3. **Use Neon's pooler URL** (`-pooler` host, already in use) and set `DB_POOL_MAX` per instance so `instances × DB_POOL_MAX` stays well under the database connection limit.
4. **Set `GEMINI_MAX_CONCURRENCY`** to match your Gemini quota per instance (default 40). Excess requests queue for up to 60 s and are retried with backoff on 429/5xx.
5. **Serve over HTTPS** and set `APP_URL=https://…` (turns on Secure cookies, HSTS and COOP).
6. **Behind nginx / a load balancer set `TRUST_PROXY=true`** and make the proxy set `X-Real-IP` (nginx: `proxy_set_header X-Real-IP $remote_addr;`). Without a trusted proxy, client IPs can be spoofed; per-account and global limits still apply.
7. Keep `MAIL_LOG_ONLY=false` in production (it exists only for load tests with fake addresses).
