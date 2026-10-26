# Supabase setup

The app needs a Supabase project for sign-in, all student records, support, notifications, Wisey and admin workflows. Keep service-role and AI keys in Supabase secrets only; never put them in `.env.local` or a `VITE_` variable.

## Connect the web app

1. Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The legacy `anon` key is also accepted as `VITE_SUPABASE_ANON_KEY`.

2. In Supabase Auth, set the public Site URL and allowed redirect URLs for the production website and local development URLs. Enable email confirmation and configure SMTP for production password reset and account confirmation.

3. Apply migrations in order. A new project needs the base migration, opening-balance migration, student-finance migration, and finance-categories migration. For the existing PlanWisely database, do not rerun the base or opening-balance SQL. If the student-finance migration has not been applied yet, apply `20261027000000_student_finance_agent.sql` first; then apply `20261028000000_finance_categories.sql`. If the student-finance migration is already applied, apply only the finance-categories migration. Review SQL Editor history before running either file.

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The student-finance migration creates the extra consent, upcoming-cost, notification, score, streak, challenge, rewards, education, admin and workflow structures. The finance-categories migration adds user-owned active categories, seeds the original category list for current and new accounts, and permits custom category names in transaction, budget, upcoming-cost and challenge records. Category removal archives it so historical transactions remain available.

## Deploy Edge Functions

Deploy from the project root. The function configuration disables gateway JWT verification because functions validate the signed-in user themselves; the agent runner instead checks its private cron header.

```sh
supabase functions deploy wisey-chat
supabase functions deploy challenge-suggest
supabase functions deploy delete-account
supabase functions deploy admin-students
supabase functions deploy agent-runner
```

Required secrets:

- `SUPABASE_SERVICE_ROLE_KEY` for account deletion, account status management and the scheduled agent. Store it as a Supabase Function secret only.
- `AGENT_CRON_SECRET`: a long random value checked by the scheduled agent endpoint.
- Either `GEMINI_API_KEY` (default provider) or `GROQ_API_KEY`; optionally `OPENAI_API_KEY` if choosing OpenAI.
- `WISEY_PROVIDER=gemini|groq|openai`; `WISEY_MODEL` for provider/model selection. Gemini defaults to `gemini-flash-lite-latest`; Groq requires a model name.
- `WISEY_ALLOWED_ORIGIN` and `PLANWISE_ALLOWED_ORIGIN`: set comma-separated allowed origins for production. For a website plus Android WebView, include both values, such as `https://your-domain.example,https://localhost`. The functions default to `*` when not configured; set these values before release.

Example (use your own real values in a secure terminal):

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set AGENT_CRON_SECRET=YOUR_RANDOM_SECRET
supabase secrets set GEMINI_API_KEY=YOUR_PROVIDER_KEY WISEY_PROVIDER=gemini WISEY_ALLOWED_ORIGIN=https://your-domain.example,https://localhost PLANWISE_ALLOWED_ORIGIN=https://your-domain.example,https://localhost
```

Wisey calls are limited to 20 requests per account per hour. Students must opt into Wisey AI data sharing in Settings before the Edge Function sends their question and limited account summary to the configured provider. Provider privacy and data-retention terms still apply.

## Schedule the rule-based agent

The agent creates persistent in-app notifications and weekly score records. It runs independently from the AI provider. Enable `pg_cron`, `pg_net`, and Vault in the Supabase project. Create two Vault secrets named `planwisely_supabase_url` and `planwisely_agent_secret` with your project URL and the same value used for `AGENT_CRON_SECRET`.

Then run this in the Supabase SQL Editor (replace the placeholders before execution):

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'planwisely-agent-runner';

select cron.schedule(
  'planwisely-agent-runner',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'planwisely_supabase_url') || '/functions/v1/agent-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'planwisely_agent_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

The 15-minute schedule handles threshold checks, 72-hour reminders and 12-hour streak-risk reminders. Sunday 09:00 SAST generates the weekly summary and tip; Monday 09:00 SAST records the weekly score and verifies expired challenges. Without this schedule, those background features do not run. Notifications are in-app only; web push, SMS and email notifications are not included.

## Create the first admin

1. Create and email-confirm the intended admin account.
2. In the SQL Editor, find the account ID and add that ID to the admin roster:

```sql
select id, email from auth.users where email = 'ADMIN_EMAIL';

insert into public.admin_users(user_id)
select id from auth.users where email = 'ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

3. Sign in with that account and open Admin dashboard. Set up or verify a TOTP authenticator. Admin policies and functions require Supabase Auth assurance level `aal2`. Admin access to student contact information, support requests, content and workflow records is audited; student financial records are not exposed in the dashboard.

## Account and consent notes

- Student data is scoped by Supabase RLS. Run two-account RLS checks before launch.
- Sign-up records the selected privacy and optional Wisey consent, with purpose, version and timestamp. Wisey consent can be withdrawn in Settings.
- Under-18 registration currently records a guardian email and self-attested consent. It does not send a verification email or confirm the guardian’s identity; configure a guardian-verification email provider and workflow before allowing those accounts in production.
- Account deletion removes the Supabase Auth account, linked database records and avatar files. SMTP, provider retention, database backup retention and other service-level retention remain governed by their respective project settings.
- The privacy page is an in-app summary. Have the service operator review the final privacy policy, terms, POPIA disclosures and retention requirements before release.

## Local checks

```sh
npm install
npm run build
npm run lint
npm test
```
