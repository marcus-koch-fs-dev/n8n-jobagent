import type { Job } from '@/types/job'

export const AUSW_SEITE = 30

export interface Segment {
  titel: string
  farbe: string
  trifft: (j: Job) => boolean
}

/** Farbe = Urteil der KI */
export const SEG_URTEIL: Segment[] = [
  { titel: 'passt gut', farbe: 'var(--good)', trifft: (j) => j.bewertung === 'passt gut' },
  { titel: 'teilweise', farbe: 'var(--mid)', trifft: (j) => j.bewertung === 'passt teilweise' },
  { titel: 'passt nicht', farbe: 'var(--bad)', trifft: (j) => j.bewertung === 'passt nicht' },
]

/** Farbe = hast du die Stelle angesehen? */
export const SEG_ANSEHEN: Segment[] = [
  { titel: 'von dir angesehen', farbe: 'var(--info)', trifft: (j) => !!j.tendenz },
  { titel: 'nicht angesehen', farbe: 'var(--bad)', trifft: (j) => !j.tendenz },
]

/** Gruppiert nach einem Feld, größte Gruppe zuerst; ohne Wert landet die Stelle unter „–“. */
export function gruppieren(stellen: Job[], feld: 'bereich' | 'hauptgrund'): [string, Job[]][] {
  const m = new Map<string, Job[]>()
  for (const j of stellen) {
    const k = j[feld] || '–'
    const liste = m.get(k)
    if (liste) liste.push(j)
    else m.set(k, [j])
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
}

/** Bereich / Hauptgrund kommen aus Workflow F („KI ordnet Stellen ein“), alles andere aus der Bewertung. */
export function auswertungsStand(jobs: Job[]) {
  const bewertet = jobs.filter((j) => j.bewertung && j.bewertung !== 'fehler')
  const mitBereich = bewertet.filter((j) => j.bereich)
  const eingeordnet = bewertet.filter((j) => j.hauptgrund)
  const nicht = eingeordnet.filter((j) => j.bewertung === 'passt nicht')
  const duenn = nicht.filter((j) => j.beschreibung === 'dünn')
  return { bewertet, mitBereich, eingeordnet, offen: bewertet.length - eingeordnet.length, nicht, duenn }
}

export const prozent = (n: number, von: number) => (von ? Math.round((100 * n) / von) : 0)

/** Breite der Balken-Spur in %: die größte Gruppe füllt die Zeile, jede andere anteilig (mindestens 4 %). */
export const spurBreite = (n: number, max: number) => Math.max(4, (100 * n) / Math.max(1, max))

/** Karten unter den Balken: beste Passung zuerst. */
export const nachPassung = (stellen: Job[]) => [...stellen].sort((a, b) => (b.passung_score || 0) - (a.passung_score || 0))

export const einordnenKosten = (offen: number) => ({
  anfragen: Math.max(1, Math.round(offen / 25)),
  dollar: (offen * 0.0007).toFixed(2).replace('.', ','),
})
