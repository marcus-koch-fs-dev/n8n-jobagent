import type { Einstellungen } from '@/types/lauf'
import { muenzenModell } from './modelle'

type Funktion = 'tiefencheck' | 'anschreiben' | 'bewertung' | string
const standardModell = (f: Funktion) => (f === 'anschreiben' ? 'claude-opus-5-5' : 'claude-sonnet-5-5')

export const muenzen = (einst: Einstellungen | undefined, funktion: Funktion) =>
  muenzenModell(einst?.modelle?.[funktion]?.modell || standardModell(funktion))

/** Grobe Kosten pro Stelle in $ für ein Modell (ca. 8.000 Tokens rein, 1.500 raus) – nur zur Orientierung. */
export const modellPreis = (modell: string) => (/haiku/.test(modell) ? 0.015 : /opus/.test(modell) ? 0.08 : 0.045)

export function kostenProStelle(einst: Einstellungen | undefined, funktion: Funktion = 'tiefencheck'): number {
  const w = einst?.modelle?.[funktion]
  if (w?.anbieter === 'lokal') return 0
  const k = modellPreis(String(w?.modell || standardModell(funktion)))
  return funktion === 'bewertung' ? k * 0.3 : k // Bewerten liest weniger und schreibt kürzer
}

/** „12 ct“ unter einem Dollar, sonst „1,23 $“. */
export const geldText = (k: number) => (k < 1 ? `${Math.max(1, Math.round(k * 100))} ct` : `${k.toFixed(2).replace('.', ',')} $`)

export function kostenText(einst: Einstellungen | undefined, n: number, funktion?: Funktion): string {
  const k = kostenProStelle(einst, funktion) * n
  return k ? geldText(k) : 'kostenlos, lokal'
}