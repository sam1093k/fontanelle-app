# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Fontanelle" — private PWA for a restricted circle: map/search of points of interest (fountains, dog zones, custom categories) with a status field, photos, and a suggestion → admin-approval workflow. Hard constraint: **zero recurring costs** — Firebase Spark plan only (no Blaze, no card), free third-party services preferred over paid Firebase features (guiding principle set by the owner).

## Stack & structure

- `web/` — React PWA (Vite, vite-plugin-pwa, Leaflet + OpenStreetMap tiles, plain JS/JSX, no router — tab state in `App.jsx`). Deployed to Firebase Hosting.
- `worker/` — Cloudflare Worker (free tier): photo upload/proxy against the Telegram Bot API. Photos are stored as Telegram `file_id`s; the bot token exists **only** as a Worker secret.
- Firestore + Firebase Auth (email/password). **No Cloud Functions** — deploying them requires the Blaze plan, which is intentionally avoided.

## Commands

| Task | Command |
|---|---|
| Dev server | `cd web && npm run dev` |
| Build | `cd web && npm run build` |
| Deploy app | `cd web && npm run deploy` |
| Deploy Firestore rules/indexes | `firebase deploy --only firestore` |
| Deploy worker | `cd worker && npx wrangler deploy` |
| Rules emulator | `firebase emulators:start` |

There are no tests or linters configured yet. Local config lives in `web/.env.local`, `.firebaserc`, and `worker/wrangler.toml` — all three are gitignored (never committed, real project ID and Worker name stay local-only) and have `.example` counterparts checked into the repo as templates.

## Architecture — the parts that span files

**Authorization lives entirely in `firestore.rules`; there is no server-side application code.** The security model:

- `users/{uid}.isAdmin` is the role flag that gates admin actions (points/categories writes, suggestion review, admin-only point comments). `users/{uid}.isOwner` is a second, higher flag: only the owner can change anyone's `isAdmin` (regular admins can no longer promote/demote each other), and not even the owner can touch their own `isAdmin` or another owner's. `isOwner` never appears in any rules `affectedKeys()` allowlist, so it's unsettable from the app at all — both roles are bootstrapped the same way, manually in the Firebase console.
- **Whitelist**: `users/{uid}.approved` gates all data access (points/categories reads, suggestion creation, and the photo Worker, which re-checks it via Firestore REST using the caller's own idToken). It cannot exist at signup and only admins can set it; new signups see a realtime "pending approval" screen until accepted (admin UI with name search in `MoreTab.jsx`). `rejected: true` shows a rejection screen.
- Normal users can only **create** documents in `suggestions` (shape strictly validated in rules: exact key sets via `hasAll`/`hasOnly`, string lengths, coordinate ranges, category must exist, max 5 photos).
- Only admins write to `points`/`categories`. Approving a suggestion is a **client-side batch write** performed by an admin (`SuggestionsTab.jsx`): apply payload to `points` + flip suggestion status atomically. Rules only allow the `pending → approved/rejected` transition.
- Any change to the data model must be reflected in three places: the form (`SuggestionForm.jsx`), the payload validation in `firestore.rules`, and the approval write (`SuggestionsTab.jsx`).

**Photo pipeline**: client compresses to JPEG (`web/src/lib/photos.js`) → Worker `/upload` (verifies the Firebase ID token via Google JWKS, `jose`) → Telegram `sendPhoto` → `file_id` stored in Firestore. Display goes through Worker `/photo/<fileId>` which resolves `getFile` server-side and streams bytes; the client fetches with an Authorization header into an object URL (never a bare `<img src>` — auth wouldn't be attached).

**Data flow**: all points load in a single realtime `onSnapshot` listener and nearest-point sorting is client-side haversine (`web/src/lib/geo.js`) — deliberate: for a few hundred points this is cheaper in reads and far simpler than geohash queries. Don't introduce geo-indexing without need.

**Update notice requirement**: `vite-plugin-pwa` is configured with `registerType: 'prompt'` — users get an explicit "Aggiorna" banner (`UpdateBanner.jsx`) instead of silent refresh. Keep it that way; it's an owner requirement.

**Anti-bot**: Firebase App Check (`web/src/firebase.js`, `ReCaptchaV3Provider`) is optional and off by default — it only activates when `VITE_RECAPTCHA_SITE_KEY` is set, so the app never breaks for lack of it. Enforcement (Firebase Console, and `REQUIRE_APP_CHECK` in `worker/wrangler.toml` for the photo Worker, verified there against the App Check JWKS the same way the ID token is) must only be turned on **after** every client has updated to a build that sends the token — flipping it early locks out anyone on an older cached version. Never enable enforcement without the owner's explicit go-ahead.

## Conventions

- UI copy is Italian; code identifiers/comments English or Italian as fits.
- **Never use native `confirm()`/`prompt()`/`alert()`** — they frequently don't render in installed iOS PWAs (buttons appear to do nothing). All confirmations and errors are inline UI elements.
- Worker secrets must be set via `wrangler secret bulk <json-file>`, never by piping stdin on Windows (PowerShell appends CRLF and corrupts the value — this broke the Telegram token once).
- Status values are fixed keys (`active | inactive | maintenance | unknown`) defined in `web/src/constants.js` and duplicated in `firestore.rules` (`validStatus`) — change both together.
- Categories are Firestore documents (admin-managed at runtime), not code constants; `SEED_CATEGORIES` is only the one-time seed.

## Working method for this repository

For substantive feature requests, structure the response as a short internal consultation before writing code: **[ARCHITETTO]** (steps/assignment) → **[BACKEND]** (data/security/API) → **[FRONTEND]** (UI/state) → **[QA/SECURITY]** (critical review) → **[CODICE FINALE]** (the actual implementation). Trivial or informational questions don't need it. Keep code modular, secure, optimized.
