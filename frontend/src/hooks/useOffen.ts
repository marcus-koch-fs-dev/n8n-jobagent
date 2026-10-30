import { useState } from 'react'
import { jsonLesen, speicherSchreiben } from '@/lib/speicher'

// Aufgeklappte Bereiche auf Karten (Schlüssel „Stellen-ID|Überschrift“, wie in neu.html), damit nichts zuklappt.
const OFFEN = new Set<string>(jsonLesen<string[]>('offen', []))

export function useOffen(id: number, titel: string): [boolean, (offen: boolean) => void] {
  const key = `${id}|${titel}`
  const [offen, setOffen] = useState(() => OFFEN.has(key))
  const aendern = (o: boolean) => {
    setOffen(o)
    if (o) OFFEN.add(key)
    else OFFEN.delete(key)
    speicherSchreiben('offen', JSON.stringify([...OFFEN].slice(-300)))
  }
  return [offen, aendern]
}