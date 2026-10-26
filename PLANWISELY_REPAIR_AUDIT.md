# PlanWisely implementation summary

## Requested changes

- Added a full-screen logout confirmation with close, Log Out, and Cancel actions. Confirming logout revokes the Supabase session and returns to sign-in.
- Reworked Profile into an editable account form and added private profile photo upload.
- Connected Help & Support to create authenticated support request records in Supabase. No support administration UI is included.
- Replaced local demo sign-in, registration, and password recovery with Supabase Auth.
- Removed seeded account details, financial transactions, balances, budgets, and chat messages. User records load from Supabase and empty accounts start with no financial history.
- Added per-user database tables and RLS policies for profiles, transactions, budgets, savings goals, contributions, support requests, and Wisey conversation storage.
- Added private avatar storage policies and an authenticated Wisey Edge Function that keeps the model key server-side.
- Added `.env.example`, Supabase CLI config, and setup instructions.

## Validation

- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- `npm run lint` — passed with 8 Fast Refresh warnings in existing component export patterns.

## Connection requirements

No Supabase project URL or publishable key was supplied. The app is wired and the schema/function setup is included, but an actual project connection requires the project values in `.env.local`, applying the migration, configuring Auth email delivery and redirects, and deploying the Edge Function with `OPENAI_API_KEY`.
