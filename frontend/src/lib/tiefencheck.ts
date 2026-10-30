import type { Job } from '@/types/job'
import type { Laeufe } from '@/types/lauf'
import type { Empfehlung, TiefenCheck } from '@/types/tiefencheck'

export const TC_EMPFEHLUNG: Record<Empfehlung, [text: string, farbe: 'good' | 'mid' | 'bad']> = {
  unbedingt_bewerben: ['Unbedingt bewerben', 'good'],
  probier_es: ['Probier es', 'mid'],
  erwarte_nichts: ['Erwarte nichts', 'bad'],
}

// Ältere Checks haben nur Ampel bzw. Tendenz → darauf abbilden
const ALT: Record<string, Empfehlung> = {
  gruen: 'unbedingt_bewerben', trau_dich: 'unbedingt_bewerben',
  gelb: 'probier_es', knapp: 'probier_es',
  rot: 'erwarte_nichts', woanders: 'erwarte_nichts',
}

export function tcEmpfehlung(d: TiefenCheck): [text: string, farbe: 'good' | 'mid' | 'bad' | ''] {
  const e = (d.empfehlung && TC_EMPFEHLUNG[d.empfehlung]) || TC_EMPFEHLUNG[ALT[d.aufgaben_vergleich?.tendenz ?? ''] ?? ALT[d.ampel ?? '']]
  return e ?? ['Geprüft', '']
}

/**
 * Prüf-Anweisungen aus einer Prompt-Datei: alles über „=== ANFRAGE ===“, ohne „# …“-Kommentarzeilen
 * („## …“-Überschriften bleiben) – so, wie der Workflow sie ans Modell schickt.
 */
export function systemTeil(md: string): string {
  return md.split('\n').filter((z) => !/^#(?!#)/.test(z)).join('\n').split('=== ANFRAGE ===')[0].trim()
}

// Job-Objekte bleiben bis zur nächsten Änderung dieselben – so wird das JSON je Stelle nur einmal gelesen.
const gelesen = new WeakMap<Job, TiefenCheck | null>()

/** Liest `tc_ergebnis`; null, wenn es fehlt oder kein gültiges JSON ist. */
export function tcLesen(j: Job): TiefenCheck | null {
  if (!j.tc_ergebnis) return null
  if (gelesen.has(j)) return gelesen.get(j)!
  let d: TiefenCheck | null = null
  try {
    const roh: unknown = JSON.parse(j.tc_ergebnis)
    d = roh && typeof roh === 'object' ? (roh as TiefenCheck) : null
  } catch { /* kein gültiges JSON */ }
  gelesen.set(j, d)
  return d
}

const SECHS_STUNDEN = 6 * 3600e3

/**
 * Stellen, für die gerade ein Tiefen-Check läuft: im Lauf gemerkt, noch ohne neues Ergebnis.
 * Nach 6 h (vor einem Neuladen) bzw. 2 min je Stelle + 5 min wird aufgegeben – große Läufe dauern.
 */
export function tcLaeuft(laeufe: Laeufe, jobs: Job[], jetzt = Date.now()): Set<number> {
  const l = laeufe.tc
  const offen = new Set<number>()
  if (!l || jetzt - l.start > SECHS_STUNDEN || jetzt - l.start > (l.ids.length * 2 + 5) * 60e3) return offen
  for (const id of l.ids) {
    const j = jobs.find((x) => x.id === id)
    if (j && !(j.tc_am && Date.parse(j.tc_am) >= l.start)) offen.add(id)
  }
  return offen
}
/** Symbol je Erfüllungsgrad einer Anforderung (Tiefen-Check). */
export const ANFORDERUNG_ICON: Record<string, string> = { erfuellt: '✅', teilweise: '◐', fehlt: '❌' }
