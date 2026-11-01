# Staging validation and deployment checklist

## 1. Environment readiness

- Confirm Node.js 22.13+ is installed.
- Copy `.env.example` to `.env.local` and fill in the required values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Public sign-up requires Cloudflare Turnstile:
  - Put the widget's public site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the deployed app.
  - Add the Turnstile secret in Supabase Authentication's CAPTCHA settings; never put it in app variables or source control.
  - Keep `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` until the Supabase CAPTCHA setting is enabled and verified, then set it to `true`.
  - Keep `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED=false` while testing existing-account sign-in and password reset.
- Keep Supabase's “Allow new users to sign up” setting disabled until CAPTCHA is configured and verified. Enable both Supabase sign-ups and `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED=true` only after the staging auth flows pass.
- Validate the file before launching the app:

```sh
npm run check:env
```

- Never expose the service-role key to the browser or commit it to source control.

## 2. Staging Supabase setup

- Create a dedicated staging project in Supabase.
- Apply all migrations in filename order from `supabase/migrations/`.
- Enable email/password sign-in in Authentication settings.
- Configure and enable Cloudflare Turnstile in the Supabase CAPTCHA settings before enabling public sign-up.
- Set the local site URL and allowed redirect URL for the staging app:
  - `http://localhost:3000/auth/callback`
  - staging callback URL for the deployed environment
- Seed the curriculum after migrations are applied:

```sh
npm run seed
```

## 3. Release validation checklist

Use a learner account and a separate admin account against the staging deployment.

### Learner checks

- [ ] With CAPTCHA enabled in both Supabase and the app environment, verify existing-account sign-in and password reset while public sign-up remains disabled.
- [ ] After those checks pass, enable Supabase sign-ups and `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED=true`, then sign up and verify email.
- [ ] Confirm the app hides account creation while `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED` is false.
- [ ] Sign out and confirm the home page hides curriculum and quiz content.
- [ ] Confirm anonymous reads of curriculum are denied.
- [ ] Load all five subject courses and verify course metadata, module order, and lesson visibility.
- [ ] Complete a lesson, sign out, sign in again, and confirm progress persists.
- [ ] Submit both correct and incorrect quiz answers and confirm attempts are recorded.
- [ ] Verify learner analytics show only the signed-in account’s data.
- [ ] Confirm premium course access is denied for Free accounts and granted for Pro accounts.
- [ ] Confirm direct client mutation attempts are rejected and only the app route can check quiz answers.
- [ ] Verify rate limiting returns HTTP 429 for repeated quiz checks.

### Admin checks

- [ ] Sign in using an admin account and open `/admin`.
- [ ] Create, update, publish, and unpublish a course, module, and lesson.
- [ ] Verify content changes are reflected in the audit trail.
- [ ] Grant and revoke Pro access for a learner and verify it is recorded in audit history.
- [ ] Reset learner progress and confirm it is recorded in the admin log.
- [ ] Confirm the final admin cannot be demoted and self-demotion is blocked.

## 4. Operational readiness

- [ ] Confirm `GET /api/health` returns HTTP 200 when the database is available and 503 when it is down.
- [ ] Configure backup retention and a restore drill for the staging environment.
- [ ] Configure monitoring and alerting for the production build.
- [ ] Confirm DB backups, email settings, and auth bot protection are enabled before public sign-up.
- [ ] Keep Supabase sign-ups and `NEXT_PUBLIC_AUTH_SIGNUP_ENABLED` disabled until the Turnstile secret, app site key, and CAPTCHA verification are complete.

## 5. Production deployment pass

Before public launch:

- [ ] Deploy to Vercel or the target provider.
- [ ] Add the production environment variables in the correct environment scope.
- [ ] Apply migrations before deploying the matching app version.
- [ ] Add the production callback URL to Supabase Auth.
- [ ] Run the staging and deployment validation checklist again against the production-like environment.
- [ ] Confirm a staged rollback path and restore drill are documented and owned.

## 6. Launch approval gate

Only proceed with public launch when:

- all audit, auth, and access checks are green,
- the health route is healthy,
- the recovery policy is documented,
- billing or admin access decisions are verified,
- the app has been checked in a non-production environment first.
