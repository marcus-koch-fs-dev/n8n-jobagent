import { createStore, useStore } from './store'
import { speicherLesen, speicherSchreiben } from './speicher'

/** Wie viele Karten nebeneinander stehen. Gemerkt im Browser; bei 3 nutzt die Seite die volle Breite. */
export type Spalten = 1 | 2 | 3

const gemerkt = Number(speicherLesen('spalten'))
export const spaltenStore = createStore<Spalten>(gemerkt === 1 || gemerkt === 3 ? gemerkt : 2)
export const spaltenSetzen = (s: Spalten) => {
  spaltenStore.set(s)
  speicherSchreiben('spalten', String(s))
}

export const SPALTEN_KLASSE: Record<Spalten, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
}

/** Bei 3 Spalten braucht die Seite die ganze Breite, sonst bleibt sie schmal. */
export const useVolleBreite = () => useStore(spaltenStore) === 3
