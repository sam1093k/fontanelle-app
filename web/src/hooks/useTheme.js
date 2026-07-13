import { useEffect, useState } from 'react'

const KEY = 'fontanelle-theme' // valori salvati: 'system' | 'light' | 'dark'

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Preferenza scelta dall'utente ('system'/'light'/'dark') + tema effettivo
// risolto (sempre 'light' o 'dark'), usato per i tile della mappa e per
// impostare data-theme sull'<html> (la CSS reagisce a quell'attributo).
export function useTheme() {
  const [theme, setTheme] = useState(readStored)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // storage non disponibile (es. modalità privata): la preferenza non persiste, non è bloccante
    }
  }, [theme])

  const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  return { theme, effective, setTheme }
}
