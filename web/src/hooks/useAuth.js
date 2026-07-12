import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = in caricamento
  const [profile, setProfile] = useState(null)

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u ?? null)), [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => setProfile(snap.data() ?? null))
  }, [user?.uid])

  return {
    user: user ?? null,
    profile,
    loading: user === undefined,
    isAdmin: profile?.isAdmin === true,
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
