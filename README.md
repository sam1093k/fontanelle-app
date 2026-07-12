# Fontanelle

App privata (PWA) per mappare punti di interesse con stato, categorie, foto e flusso di proposta → approvazione admin. Zero costi ricorrenti: Firebase piano Spark + Cloudflare Worker free + foto archiviate via bot Telegram.

## Architettura

- **web/** — PWA React (Vite + Leaflet/OpenStreetMap), deploy su Firebase Hosting
- **worker/** — Cloudflare Worker: upload/proxy foto verso Telegram (il token del bot vive solo qui)
- **Firestore** — dati e autorizzazione (tutte le regole in `firestore.rules`); nessuna Cloud Function (richiederebbe il piano Blaze)

## Setup iniziale (una tantum)

### 1. Firebase

1. [Console Firebase](https://console.firebase.google.com) → crea progetto (disattiva Analytics, non serve).
2. **Authentication** → Sign-in method → abilita **Email/Password**.
3. **Firestore Database** → crea database (regione `europe-west`, modalità production).
4. Impostazioni progetto → Le tue app → aggiungi **app Web** → copia la config.
5. `cd web && copy .env.example .env.local` e incolla i valori della config.
6. Metti il project ID in `.firebaserc`.
7. Deploy di regole e indici:
   ```
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```

### 2. Bot Telegram (archivio foto)

1. Su Telegram parla con **@BotFather** → `/newbot` → copia il **token**.
2. Crea un **gruppo privato** (sarà l'archivio foto), aggiungi il bot.
3. Manda un messaggio qualsiasi nel gruppo, poi apri
   `https://api.telegram.org/bot<TOKEN>/getUpdates` nel browser e copia il
   `chat.id` (numero negativo per i gruppi).

### 3. Cloudflare Worker

1. Account gratuito su [cloudflare.com](https://dash.cloudflare.com/sign-up) (non serve carta).
2. In `worker/wrangler.toml` imposta `FIREBASE_PROJECT_ID` e `ALLOWED_ORIGINS`.
3. Deploy:
   ```
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put TELEGRAM_BOT_TOKEN   # incolla il token del bot
   npx wrangler secret put TELEGRAM_CHAT_ID     # incolla il chat id
   npx wrangler deploy
   ```
4. Copia l'URL del worker in `web/.env.local` → `VITE_WORKER_URL`.

### 4. Primo admin (bootstrap)

1. Avvia l'app (`cd web && npm install && npm run dev`), registrati.
2. Console Firebase → Firestore → collezione `users` → il tuo documento →
   aggiungi campo `isAdmin` (boolean) = `true`.
3. Da questo momento promuovi/degradi altri admin dall'app (tab Altro).
4. Tab Altro → **Crea le categorie di base**.

## Comandi

| Cosa | Comando |
|---|---|
| Dev locale | `cd web && npm run dev` |
| Build | `cd web && npm run build` |
| Deploy app | `cd web && npm run deploy` (build + hosting) |
| Deploy regole Firestore | `firebase deploy --only firestore` |
| Deploy worker | `cd worker && npx wrangler deploy` |
| Emulatori (test regole) | `firebase emulators:start` |

## Installazione sui telefoni

- **iPhone**: Safari → apri l'URL → Condividi → **Aggiungi alla schermata Home**.
- **Android**: Chrome → apri l'URL → menu → **Installa app**.

Gli aggiornamenti sono automatici: alla pubblicazione di una nuova versione gli utenti vedono il banner "Nuova versione disponibile → Aggiorna".

## Cose da sapere

- Le icone PWA usano un SVG placeholder: per compatibilità massima (icona home iOS) genera dei PNG 192/512 e apple-touch-icon (es. con [favicon.io](https://favicon.io)) in `web/public/icons/` e aggiorna manifest/index.html.
- Limiti gratuiti rilevanti: Firestore 50k letture/giorno e 20k scritture/giorno; Hosting 360MB/giorno; Worker 100k richieste/giorno. Ampiamente sufficienti per una cerchia ristretta.
- Le foto vivono nel gruppo Telegram: non cancellare i messaggi del bot, o i `file_id` salvati non saranno più risolvibili.
