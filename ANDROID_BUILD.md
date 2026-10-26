# Android build

The project includes a Capacitor 8 Android application under `android/`, with app ID `za.co.planwisely.app`. The native app loads the same static web shell and connects to the configured Supabase backend.

## Requirements

- Node.js 22 or newer and npm.
- Android Studio and an Android SDK (API 24 or newer).
- A working Android SDK/JDK installation managed by Android Studio.

## Build the app

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
2. From the project root run:

```sh
npm install
npm run android:sync
npm run android:open
```

3. In Android Studio, wait for Gradle sync. Choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Android Studio shows the generated APK location when the task finishes.
4. Install it on an emulator or test device and verify email sign-in, registration, password reset, direct navigation, transaction persistence, profile-photo upload, notifications, Wisey consent, and account deletion.

`npm run android:sync` rebuilds the static app and copies its assets into the Android project. Run it after web-code or dependency changes.

## Notes

- Change the package ID in both `capacitor.config.ts` and the Android Gradle application ID before publishing under a different identity.
- Set `PLANWISE_ALLOWED_ORIGIN` and `WISEY_ALLOWED_ORIGIN` to a comma-separated list containing the production website and `https://localhost` for the Android WebView.
- Supabase email confirmation and password reset currently use the configured website redirect flow. Native deep links back into an installed APK have not been configured or tested.
- The Android project has been generated and synced, but no APK was built or installed in this workspace because Android Studio and an SDK are not available here.
