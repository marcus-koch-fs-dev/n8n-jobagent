import type { Job } from '@/types/job'
import type { DateiInfo, LebenslaufZeile } from '@/types/profil'

/** Bereiche, die die KI vergeben hat – häufigste zuerst. Neue Bereiche tauchen von selbst auf. */
export function bereichsListe(jobs: Job[]): string[] {
  const n = new Map<string, number>()
  for (const j of jobs) {
    const b = (j.bereich ?? '').trim()
    if (b) n.set(b, (n.get(b) ?? 0) + 1)
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).map(([b]) => b)
}

const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Hat eine andere Zeile schon diesen Bereich? (Jeder Bereich gehört zu höchstens einem Lebenslauf.) */
export const bereichVergeben = (zeilen: LebenslaufZeile[], id: string, bereich: string) =>
  Boolean(bereich.trim()) && zeilen.some((z) => z.id !== id && gleich(z.bereich, bereich))

/** Wie viele Stellen haben diesen Bereich? */
export const stellenImBereich = (jobs: Job[], bereich: string) => jobs.filter((j) => gleich(j.bereich ?? '', bereich)).length

export const dateiText = (d: DateiInfo | undefined, zeichen = d?.zeichen) =>
  d ? `${d.datei}${zeichen ? ` · ${zeichen.toLocaleString('de-DE')} Zeichen` : ''}` : ''
