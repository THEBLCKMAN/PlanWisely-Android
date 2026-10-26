# Web deployment

The project build creates a static TanStack Start SPA shell at `.output/public/index.html`. The application uses Supabase directly for account and data operations, so the static web deployment does not contain a service-role key or AI provider key.

## Netlify

1. Import the project repository in Netlify or run the Netlify CLI from the project root.
2. Use `npm run build` as the build command and `.output/public` as the publish directory. `netlify.toml` contains these values.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables.
4. Add the deployed domain to Supabase Auth’s Site URL/redirect URLs and set it in the Edge Function origin allow-lists.

## Vercel

1. Import the project and use `vercel.json` or set the build command to `npm run build` and output directory to `.output/public`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables.
3. Add the deployed domain to Supabase Auth redirect URLs and the Edge Function origin allow-lists.

## Verify the deployed site

Open the deployed URL and check registration, email confirmation, password reset, sign-in, all user routes, direct refresh of nested routes, Supabase persistence and the Edge Functions. Test with separate student accounts and an admin account after applying the migration. Do not place `SUPABASE_SERVICE_ROLE_KEY`, provider API keys or the cron secret in web-host environment variables prefixed with `VITE_`.

The static deployment setup is included; a public web deployment and production account-flow test have not been performed from this workspace.
