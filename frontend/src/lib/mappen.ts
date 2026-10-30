import type { Job } from '@/types/job'
import type { AnschreibenListe, Einstellungen, Laeufe } from '@/types/lauf'
import { geldText, kostenProStelle, modellPreis } from './kosten'
import type { Unterlagen } from './unterlagen'

// Bewerbungsmappe: was kommt in den Ordner, welches Modell schreibt?
// Anschreiben ausdrücklich gefragt → volles Anschreiben · unklar → Kurzfassung · „kein Anschreiben“ → nur Kurznachricht.
// Immer dabei: Kurznachricht (fürs Formular) + Lebenslauf-Kopie.
type MappenArt = 'voll' | 'kurz' | 'keins'
export const MAPPEN_ART_TEXT: Record<MappenArt, string> = { voll: 'Anschreiben', kurz: 'kurzes Anschreiben', keins: 'kein Anschreiben gewünscht' }

export function mappenArt(u: Unterlagen | null): MappenArt {
  const a = u?.anschreiben
  return a === 'gefragt' ? 'voll' : a === 'nicht_noetig' ? 'keins' : 'kurz'
}

/** Grün = Modell aus den Einstellungen (leer), sonst Sonnet, ohne Brief Haiku. */
export function mappenModell(j: Job, art: MappenArt): string {
  if (art === 'keins') return 'claude-haiku-5-5'
  return j.tc_ampel === 'gruen' ? '' : 'claude-sonnet-5-5'
}

export function mappenKosten(einst: Einstellungen | undefined, stellen: { job: Job; art: MappenArt }[]): string {
  // Leeres Modell = das aus den Einstellungen
  const proModell = (m: string) => (m ? modellPreis(m) : kostenProStelle(einst, 'anschreiben'))
  return geldText(stellen.reduce((s, { job, art }) => s + proModell(mappenModell(job, art)), 0))
}

export const hatMappe = (a: AnschreibenListe, id: number) => Boolean(a[id]?.pfad)

/** Unterordner der Mappe im Zielordner („Obi - München“). Ältere Einträge haben nur „pfad“ = Anschreiben. */
export const mappenOrdner = (a: { ordner?: string; pfad?: string }) => a.ordner || (a.pfad ?? '').split('/').slice(0, -1).join('/')

/** Stellen, für die gerade ein Anschreiben geschrieben wird (noch ohne neue Mappe). Gibt nach 30 min auf. */
export function anLaeuft(laeufe: Laeufe, a: AnschreibenListe, jetzt = Date.now()): Set<number> {
  const l = laeufe.an
  const offen = new Set<number>()
  if (!l || jetzt - l.start > 30 * 60e3) return offen
  for (const id of l.ids) if (!(a[id]?.am && Date.parse(a[id].am!) >= l.start)) offen.add(id)
  return offen
}