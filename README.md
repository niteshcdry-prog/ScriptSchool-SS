# Script School

Script School is a multi-user learning platform with 73 lessons across five beginner-friendly subject courses: JavaScript, Python, Web Development, Git/GitHub, and SQL. The responsive dashboard supports course-aware prerequisites, learner progress, quizzes, and practice activities.

## Stack

- Next.js App Router and React with strict TypeScript
- Supabase Auth and managed PostgreSQL
- PostgreSQL row-level security for learner-owned data
- Zod validation for API and admin mutations
- Vercel-ready deployment

The curriculum includes a complete JavaScript: Beginner to Advanced course, plus Python Programming, Web Development (HTML/CSS/responsive design), Git & GitHub, and SQL & Database Essentials. Each course includes a description, level, estimated study time, recommended prerequisites, learning outcomes, and ordered topic modules. Lessons include explanations, examples, checks for understanding, and practice prompts, starters, hints, and worked solutions. Correct quiz answers are stored separately and are never returned with lesson data. The in-browser code runner executes JavaScript only; other language exercises show their starter and solution for use in an appropriate local environment. Additional courses can be added through the protected administration console.

The JavaScript course is organized from core syntax and functions through modern JavaScript, asynchronous workflows, browser development, and advanced practice. Python covers syntax, data structures, functions, files, and a study tracker; Web Development covers semantic HTML, CSS, responsive layouts, accessibility, and a page capstone; Git/GitHub covers version control and collaboration; SQL covers querying, joins, safe mutations, schema design, and reporting.

Administrators can create and edit courses, modules, lessons, quizzes, and practice activities. Set lesson prerequisites in the lesson editor. Unpublish a course or lesson to remove it from learners' catalog while keeping its content, completion records, and quiz history. Recent content versions are stored in Supabase and can be restored into the editor before saving. Physical deletion is intentionally not exposed in the admin console because lesson and course deletion can erase learner history through database cascades.

Visitors can view the public welcome page and a high-level overview of the learning experience. They must sign in or create an account before curriculum, lesson, quiz, or progress content is loaded. Curriculum tables and lesson prerequisites are also restricted to authenticated Supabase users. Authenticated learners can edit their display name and change their password from the profile dialog.

## Local development

Use Node.js 22.13 or later and npm.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project. Copy `.env.example` to `.env.local`, then fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   The service-role key is server-only. Never add a `NEXT_PUBLIC_` prefix to it, commit it, or send it to a browser.
   Create a Cloudflare Turnstile widget, put its public site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and set its secret in Supabase Authentication's CAPTCHA settings. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` only after CAPTCHA is enabled in Supabase. Keep `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED=false` while verifying sign-in and password reset; set it to `true` only after verification and after enabling Supabase's “Allow new users to sign up” setting. Never put the secret key in an app environment variable or source control.

3. Apply every SQL file in `supabase/migrations/` in filename order using the Supabase SQL editor. Apply each migration once per environment; do not rerun an already-applied schema migration on a populated database. Existing installations must apply any missing migrations, including [`20261019010000_require_auth_for_curriculum.sql`](./supabase/migrations/20261019010000_require_auth_for_curriculum.sql) and [`20261020000000_multi_course_catalog.sql`](./supabase/migrations/20261020000000_multi_course_catalog.sql). The multi-course migration preserves old course rows as unpublished, consolidates their modules under the JavaScript course, adds course learning metadata, and rebuilds JavaScript prerequisites without deleting lesson IDs or progress.

4. In Supabase Authentication settings, enable email/password sign-in. Set the local site URL and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Configure Cloudflare Turnstile CAPTCHA before enabling new sign-ups in Supabase; keep sign-ups disabled until the site key and secret are configured and verified. Add the production callback URL after deployment.

5. Seed all five courses, 18 modules, 73 lessons, and quizzes. On an existing database, run the seed after applying the new migration so the additional subjects are added and existing JavaScript lessons are assigned to the unified course:

   ```sh
   npm run seed
   ```

   Seeding is safe to rerun for the bundled catalog. The script reads `.env.local`; it exits with an error if the database is not configured or any write fails. It upserts courses, modules, lessons, questions, and quiz options in place, preserving existing JavaScript lesson IDs and quiz-option IDs where possible. It also resets prerequisites for bundled lessons to the packaged course sequence; run it before making custom prerequisite edits in the admin console.

6. Start the development server:

   ```sh
   npm run dev
   ```

   A configured Supabase project and signed-in account are required to access course content. Without Supabase credentials, the sign-in page explains that accounts are unavailable and curriculum content stays hidden.

### Staging and production setup

Create a staging Supabase project before production. Set the three Supabase environment variables in the Vercel **Preview** environment, and configure Turnstile's public site key and `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` only after adding the Turnstile secret to Supabase Auth and enabling CAPTCHA there. Keep `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED=false` until sign-in and password-reset flows are verified; then enable Supabase sign-ups and set this app flag to `true`. Apply every migration in filename order, configure Auth URLs for that deployment, seed the curriculum, then verify the flows in [Launch verification](#launch-verification). Keep the staging project and test accounts separate from production. The access migration resets existing Pro flags to Free because earlier plan selection was client-controlled and cannot be treated as a verified purchase.

A concrete staging and deployment checklist is maintained in [docs/staging-deployment-checklist.md](docs/staging-deployment-checklist.md). Validate environment variables before any staging session:

```sh
npm run check:env
```

Configure Supabase Auth's built-in email rate limits and CAPTCHA/bot protection before enabling public sign-up. The app's quiz answer endpoint is additionally limited to 30 checks per client IP per fixed one-minute window; the counter is stored in PostgreSQL so it works across application instances. The deployed platform must provide a trustworthy `x-forwarded-for` or `x-real-ip` header. Do not expose the service-role key.

### Launch verification

Run this checklist against staging using a learner account and a separate administrator account:

- Sign up, verify email, sign in, request a password reset, and set a new password.
- While signed out, confirm the home page shows sign-in/account-creation links and does not render course or quiz content. Confirm anonymous Supabase reads of curriculum tables are denied after applying the authentication migration.
- As a learner, verify all five subject courses and their outcomes, estimated time, topic modules, lessons, and per-course progress. Confirm lessons in one course do not require completion of a different course.
- Complete a lesson, sign out/in, and confirm progress remains. Import legacy browser progress and confirm it is only cleared after a successful import.
- Submit correct and incorrect quiz answers; verify an authenticated quiz attempt is recorded with its selected option.
- Confirm learner analytics show only the signed-in account's completion totals and quiz history.
- Confirm `GET /api/health` returns HTTP 200 when the database is available and HTTP 503 when it is unavailable.
- As a learner, confirm admin routes are denied and only that learner's progress is readable.
- With a Free account, confirm premium course lesson bodies and quiz content are unavailable through both Supabase reads and API requests; confirm Pro accounts can access them.
- Confirm learners cannot grant or modify their own plan. As an administrator, grant and revoke Pro access and verify each change appears in the audit history.
- Confirm direct learner inserts to `quiz_attempts` and direct client calls to the quiz-answer RPC are denied; quiz checks must go through the rate-limited app endpoint.
- As an administrator, create/update a course, module, lesson and quiz; verify each change appears in the audit log.
- Change a test account role and reset its progress; verify audit entries appear, self-demotion is rejected, and the final admin cannot be demoted.
- Make more than 30 quiz checks in one minute and confirm the endpoint returns HTTP 429 with `Retry-After`.
- Restore a recent database backup into a non-production project and verify that the app can read its curriculum and progress.

## Recommended phased rollout

The current platform is production-ready in structure, but it should be expanded in controlled stages to reach a reliable public launch and long-term growth path.

1. Phase 1 — Launch hardening: complete staging verification, database backups, production monitoring, and operational guardrails. Use the health route and deployment verification checklist to confirm the app behaves correctly before public sign-up.
2. Phase 2 — Retention and engagement: add personalized learning recommendations, stronger streak/reward flows, and product analytics for completion patterns and at-risk learners.
3. Phase 3 — Monetization and access: support plan tiers, premium course access, and subscription management behind a secure admin and billing layer.
4. Phase 4 — Adaptive AI support: provide coaching hints, adaptive practice, and guided next-step recommendations using mistakes and mastery patterns.
5. Phase 5 — Community and growth: add cohort and peer learning, discussion threads, leaderboards, and deeper learner engagement features.

This repository already contains the foundation for Phase 1 and beyond; each phase should be shipped incrementally rather than all at once to keep the rollout stable and measurable. The app also surfaces a launch-readiness checklist in the dashboard so the remaining operational guardrails stay visible during staging and rollout.

## First administrator

Create an account through `/login`, verify the email, and then promote that account from the Supabase SQL editor. Replace the email with the exact address you registered:

```sql
update public.profiles
set role = 'admin'
from auth.users
where profiles.id = auth.users.id
  and auth.users.email = 'admin@example.com';
```

The administrator sign-in page is available at `/admin/login`; successful sign-in requires the account to already have the `admin` role. The protected console is available at `/admin` and supports creating and publishing/unpublishing courses, organizing modules, editing lesson content and quizzes, previewing unpublished lesson drafts, configuring lesson prerequisites, restoring recent content versions, cohort analytics, paginated account review, learner/admin role and plan changes, learner progress resets, and recent audit history. Plan grants made in the console are audited and should be treated as manual access overrides until the payment provider is configured. Unpublishing is the safe archive action; physical deletion is intentionally not exposed. Administrators cannot change their own role, and the final administrator cannot be demoted.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

GitHub Actions runs these checks for pull requests and pushes to any branch. CI does not connect to Supabase; live auth, RLS, migration, and recovery checks must be completed against staging.

## Deployment

Deploy the repository to Vercel and configure the three Supabase environment variables in the project settings for each environment. Apply database migrations before seeding/deploying the corresponding app version. Add the deployed `/auth/callback` URL to Supabase's allowed redirect URLs and set the production site URL in Supabase Auth settings.

Before public launch, configure custom email templates/delivery, database backups, monitoring and alerting, and a production-specific account recovery policy. Set a backup retention period, schedule a restore drill, and assign an owner for security/dependency advisories. Subscription checkout and provider webhooks are not connected yet; Pro access is server-enforced and can currently be granted only by an administrator. Do not represent manual plan changes as a completed purchase.

## Security and data notes

- The `anon` key is intended for browser-facing Supabase access; row-level security denies anonymous reads of curriculum and quiz content.
- The service-role key is used only by protected server routes, the health database check, and the curriculum seed script.
- Quiz checking is available only to signed-in learners and returns whether a selected option is correct. The answer key is a separate table and is not readable by learners.
- Quiz answer validation is callable only with the server-side service-role credential, after the app rate-limit check; authenticated attempts are inserted by the same database function that checks the answer.
- Lesson/progress writes validate requests and are scoped to the signed-in user. Administrator requests verify the role server-side before using elevated database access.
- Admin lesson + quiz edits use a single database function so content and the correct answer update atomically.
- Each administrator mutation and its audit record are committed in one database transaction. If audit recording fails, the mutation rolls back.
- Authenticated quiz checks and quiz-attempt recording occur in one database transaction.
- Quiz checks fail closed if the database rate-limit service is unavailable.
- Existing `script-school-progress-v1` browser completions are imported once per signed-in account by an authenticated database function. Unknown lesson IDs are ignored, and the local copy is removed only after a successful import. Each account's import is idempotent.
- Signed-in learners see private quiz accuracy and recent quiz attempts; the database analytics function derives identity from the authenticated Supabase session and returns only that account's data.
- Course learning outcomes, language, level, estimates, and recommended prerequisites are stored with course records; the seed task updates the bundled catalog without replacing stable learner lesson IDs.
- User passwords are handled by Supabase Auth and are never visible in the admin console.
- `GET /api/health` provides a minimal database-readiness signal for uptime monitoring. It does not expose secrets or database details.
