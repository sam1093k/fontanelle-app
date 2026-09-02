import { useEffect, useState } from 'react'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = in caricamento
  const [profile, setProfile] = useState(undefined) // undefined = in caricamento

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u ?? null)), [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    setProfile(undefined)
    return onSnapshot(doc(db, 'users', user.uid), (snap) => setProfile(snap.data() ?? null))
  }, [user?.uid])

  // L'owner ha sempre tutti i poteri da admin, anche senza il flag isAdmin
  // sul proprio documento (stessa logica replicata in firestore.rules).
  const owner = profile?.isOwner === true
  return {
    user: user ?? null,
    profile: profile ?? null,
    loading: user === undefined || (!!user && profile === undefined),
    isAdmin: profile?.isAdmin === true || owner,
    isOwner: owner,
    approved: profile?.approved === true || profile?.isAdmin === true || owner,
  }
}

export async function signup(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName,
    createdAt: serverTimestamp(),
  })
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const logout = () => signOut(auth)

// Recupero password: Firebase invia l'email col link di reset (gratis su
// Spark). Il template si personalizza in Console Firebase > Authentication.
export const resetPassword = (email) => sendPasswordResetEmail(auth, email)

// Diritto alla cancellazione (GDPR art. 17). Ordine voluto: prima i dati
// Firestore (mentre la sessione è ancora valida per le rules), poi l'account
// Auth per ultimo. Se Firebase richiede un login recente, chiamare di nuovo
// con la password: le cancellazioni Firestore sono idempotenti (ripeterle
// su documenti già cancellati non ha effetto), quindi il retry è sicuro.
export async function deleteAccount(password) {
  const u = auth.currentUser
  if (!u) throw new Error('Nessun utente autenticato')

  const pendingSnap = await getDocs(
    query(collection(db, 'suggestions'), where('authorUid', '==', u.uid), where('status', '==', 'pending'))
  )
  const batch = writeBatch(db)
  pendingSnap.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'users', u.uid))
  await batch.commit()

  if (password) {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password))
  }
  await deleteUser(u)
}
