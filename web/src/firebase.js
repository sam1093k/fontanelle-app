import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { ReCaptchaV3Provider, getToken, initializeAppCheck } from 'firebase/app-check'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
})

export const auth = getAuth(app)

// Cache locale persistente: l'app resta consultabile offline.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Anti-bot (App Check + reCAPTCHA v3, invisibile): protegge tutte le
// richieste a Firestore/Auth a livello di infrastruttura Firebase, non
// solo lato client. Opzionale finché VITE_RECAPTCHA_SITE_KEY non è
// configurata, così l'app non si rompe prima del setup in console.
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
export const appCheck = siteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null

// Usato dal Worker foto (fuori da Firebase, va verificato a parte).
// Ritorna null se App Check non è configurata: il chiamante decide se
// procedere comunque o no.
export async function getAppCheckToken() {
  if (!appCheck) return null
  try {
    return (await getToken(appCheck)).token
  } catch {
    return null
  }
}
