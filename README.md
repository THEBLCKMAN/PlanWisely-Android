# PlanWisely

PlanWisely is a mobile-first React, TypeScript, Vite and TanStack Start app for South African students. It keeps the original visual design and adds payday budgeting, scheduled expenses, a rule-based notification agent, Wisey AI, weekly financial health scores, activity streaks, savings challenges, data controls, protected admin tools and a Capacitor Android project.

## Run locally

1. Install Node.js 22 or newer and npm.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
3. Install and start the app:

```sh
npm install
npm run dev
```

4. Complete the Supabase steps in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before signing in or saving data.

## Build and checks

```sh
npm run build
npm run lint
npm test
```

`npm run build` creates the web server build and a static SPA shell at `.output/public/index.html`. The static shell is used by Capacitor and static web hosting; account data and server functions remain in Supabase.

## Android

The Android project is included in `android/`. Install Android Studio and an Android SDK, then run:

```sh
npm run android:sync
npm run android:open
```

In Android Studio, build a debug APK from **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The project scaffold is prepared; an APK build and device test still require an Android SDK and were not run in this workspace. See [ANDROID_BUILD.md](ANDROID_BUILD.md).

## Backend and deployment

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md): migrations, Auth, secrets, Edge Functions, admin provisioning and scheduled jobs.
- [WISEY_DEPLOY_GUIDE.md](WISEY_DEPLOY_GUIDE.md): AI provider choice, consent, usage limit and privacy notes.
- [WEB_DEPLOY.md](WEB_DEPLOY.md): static SPA deployment to Netlify or Vercel.
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md): requirement checklist, test results and manual steps.

No credentials, `.env.local`, `node_modules`, build output or real student records are included in the project ZIP.
