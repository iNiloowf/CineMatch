# Google Play publishing — CineMatch (Capacitor Android)

Use this note alongside `docs/MANUAL_QA.md` (on-device testing) and `NEXT_TASKS.md` (general backlog). Nothing here replaces Google’s official Play Console help.

---

## 1. Before you open Play Console

| Item | Why |
|------|-----|
| **Developer account** | One-time registration fee; use a stable Google account you control. |
| **Package name locked** | The app id is `ca.cinematch.app` (`capacitor.config.ts` + Android `applicationId`). **You cannot change it** after the first production release without shipping a new listing. |
| **Production web app** | `capacitor.config.ts` points the WebView at `https://cinematch.ca`. That site must serve the built Next.js app reliably (HTTPS, correct API env, auth). A broken or slow site = broken native shell. |
| **Signing key plan** | Play uses **Play App Signing**. You create an **upload key**, sign release builds with it, and Google re-signs for distribution. Back up the upload keystore and passwords outside the repo. **Never commit keystores.** |

---

## 2. Android project checks (repo)

These are the usual fixes before the first **production** upload:

| Check | Current / action |
|--------|-------------------|
| **`versionCode` / `versionName`** | In `android/app/build.gradle`, `versionCode` must **increase by at least 1** for every Play upload (`versionName` is user-visible, e.g. `1.0.1`). |
| **Target / compile SDK** | `targetSdkVersion` / `compileSdkVersion` are **36** (`android/variables.gradle`) — keep aligned with Play requirements as Google updates policy. |
| **Min SDK** | **24** — acceptable; document if you ever raise it. |
| **Permissions** | Only `INTERNET` in `AndroidManifest.xml` — minimal; if you add Capacitor plugins (camera, notifications, etc.), declare only what you use and fill **Data safety** accordingly. |
| **Release build** | Generate a **release** `.aab` (Android App Bundle), not a debug APK, for new listings. Debug builds are not for Play. |
| **ProGuard / R8** | Release has `minifyEnabled false` today — fine for launch; revisit if you add heavy native deps or need obfuscation. |

---

## 3. Play Console (store listing & policy)

Complete these in the Play Console; missing pieces block review or cause takedowns.

| Area | What to prepare |
|------|------------------|
| **App name, short description, full description** | English (or localized) copy; no misleading claims. |
| **Graphics** | **Feature graphic**, **phone screenshots** (and tablet if you claim tablet support). Use real UI from the app. |
| **Privacy policy URL** | **Required** for apps that handle user data (accounts, email, etc.). Your web app already has `/privacy` — use the **HTTPS** production URL in the listing. |
| **Data safety form** | Declare what you collect (e.g. account, email, usage if analytics), whether data is encrypted in transit, optional deletion, etc. Match your Privacy Policy and the app’s real behavior. |
| **Content rating** | Questionnaire (IARC / similar); answer honestly for social / user-generated content if applicable. |
| **Target audience & ads** | Declare children’s presence if relevant; declare if the app contains ads. |
| **News / COVID / Financial** | Only if your app category triggers extra declarations. |

---

## 4. Technical items that are *not* “fixes” in code but block launch

- **Closed testing track** (recommended): internal → closed → production, so you catch policy or crash issues early.
- **App access** for reviewers: if login is required, provide a **demo account** or clear steps in Play Console (otherwise review can fail).
- **Deep links / OAuth**: if sign-in relies on redirects to `cinematch.ca`, ensure those flows work inside the WebView and match **allowed redirect URLs** in Supabase (and any custom URL schemes if you add them later).

---

## 5. Commands you will use often

```bash
npm run build
npx cap sync android
```

Then open Android Studio → **Build > Generate Signed Bundle / APK** → **Android App Bundle** for release, or use your CI once signing is set up.

---

## 6. After launch

- Bump **`versionCode`** (and usually **`versionName`**) for every new release.
- Re-run **`npm run cap:sync`** after web changes that affect the embedded site (or rely on live URL if you never ship assets in the bundle — your config loads remote URL).
- Monitor **Play vitals** (ANRs, crashes) and **policy** emails from Google.

---

_Last updated: Apr 2026 — aligned with Capacitor 8, `ca.cinematch.app`, remote `https://cinematch.ca`._
