import { useEffect, useState } from 'react'
import { istHaupt, type Haupt } from '@/lib/listen'

const lesen = (): Haupt => {
  const h = location.hash.slice(1)
  return istHaupt(h) ? h : 'sichten'
}

/** Haupt-Tab liegt in der Adresse (#pruefen …), wie in neu.html. */
export function useHauptTab(): [Haupt, (h: Haupt) => void] {
  const [haupt, setHaupt] = useState<Haupt>(lesen)
  useEffect(() => {
    const f = () => setHaupt(lesen())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return [haupt, (h) => { location.hash = h }]
}