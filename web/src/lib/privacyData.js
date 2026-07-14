import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

// Diritto di accesso/portabilità (GDPR art. 15/20): tutto ciò che l'utente
// può leggere di sé stesso via rules (profilo + proprie proposte, incluse
// quelle già valutate), impacchettato come download JSON.
export async function exportUserData(user) {
  const profileSnap = await getDoc(doc(db, 'users', user.uid))
  const suggestionsSnap = await getDocs(
    query(collection(db, 'suggestions'), where('authorUid', '==', user.uid))
  )

  const data = {
    esportatoIl: new Date().toISOString(),
    account: { uid: user.uid, email: user.email },
    profilo: profileSnap.exists() ? profileSnap.data() : null,
    proposte: suggestionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fontanelle-dati-${user.uid}.json`
  a.click()
  URL.revokeObjectURL(url)
}
