# MTG Commander

Companion mobile/web app for Magic: The Gathering Commander games. It provides a multiplayer life tracker, Commander damage, counters and shared statuses, turn and chess clocks, game history, statistics, card search, and secure Firebase Realtime Database rooms for remote play.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- Java 21 for the Firebase Realtime Database rules emulator (`.java-version` documents the project version)

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web-app configuration and the reCAPTCHA Enterprise site key before using multiplayer. Firebase Authentication must have the Anonymous provider enabled, and the project must have a Realtime Database instance.

The Firebase client configuration identifies the Firebase project; access control is enforced by [`database.rules.json`](./database.rules.json). Never put service-account credentials or private server keys in a Vite environment file.

## Firebase App Check

Multiplayer fails closed when App Check cannot attest the client.

- Web uses reCAPTCHA Enterprise through `VITE_FIREBASE_APPCHECK_SITE_KEY`.
- Android uses Play Integrity through `@capacitor-firebase/app-check` and `android/app/google-services.json`.
- Local web and Android debug builds require debug tokens registered in the Firebase App Check console. Never enable a debug provider in a production build.
- Register every release-signing SHA-256 certificate, including the Play App Signing certificate, before distributing Android builds.

For an Android emulator or local test APK, build the synchronized project with the explicit debug provider flag:

```sh
npm run android:deploy -- --app-check-debug
```

The normal `npm run android:deploy` command explicitly disables that provider. Never distribute an APK produced with `--app-check-debug`.

Enable App Check enforcement for Realtime Database and Authentication only after both registered clients produce valid requests. This avoids locking out a platform during rollout.

## Firebase rules

Run the complete rules suite locally:

```sh
npm run test:rules
```

Select the intended Firebase project with `firebase use --add`, review the target, then deploy only the database rules:

```sh
npx firebase deploy --only database
```

Rules are not deployed by `npm run build`. Deployment remains an explicit production operation so a local build cannot modify remote access control accidentally.

## Quality commands

```sh
npm run lint
npm run type-check
npm run test:unit -- --run
npm run test:rules
npm run build
npm audit --omit=dev
```

The multiplayer architecture and authorization model are recorded in [`docs/adr/0001-secure-multiplayer-sync.md`](./docs/adr/0001-secure-multiplayer-sync.md).
