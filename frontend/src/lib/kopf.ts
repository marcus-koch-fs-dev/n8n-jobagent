import type { Job } from '@/types/job'
import { kandidat } from './listen'

const zeit = (v?: string | null) => Date.parse(v ?? '') || 0
const offen = (j: Job) =>
  ['neu', 'abgerufen'].includes(j.status) || (['aktiv', 'unklar'].includes(j.status) && (!j.bewertung || j.bewertung === 'fehler'))

/**
 * Text unter dem Titel: wann zuletzt gesucht wurde, wie viele Stellen dabei neu waren, wie viele davon noch
 * in Bearbeitung sind (laden, Fakten lesen, bewerten) und wie viele passen (passt gut oder teilweise).
 * Die „Runde“ sind alle Stellen bis 30 min vor dem neuesten Fund.
 */
export function statistikText(jobs: Job[], stand: string): string {
  const neueste = jobs.reduce((m, j) => Math.max(m, zeit(j.erstmals_gesehen)), 0)
  const runde = jobs.filter((j) => zeit(j.erstmals_gesehen) >= neueste - 30 * 60 * 1000)
  const wann = neueste
    ? new Date(neueste).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''
  const nOffen = runde.filter(offen).length
  const treffer = runde.filter(kandidat).length
  if (!runde.length) return `Noch keine Suche · aktualisiert ${stand}`
  const arbeit = nOffen ? `${nOffen} in Bearbeitung` : 'alle ausgewertet'
  return `Letzte Suche ${wann} · ${runde.length} neu gefunden · ${arbeit} · ${treffer} passend${nOffen ? ' bisher' : ''} · aktualisiert ${stand}`
}