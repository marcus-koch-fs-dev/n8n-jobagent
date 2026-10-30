import type { Job } from '@/types/job'
import { devRang } from './job'

export type SortKey = 'empfehlung' | 'score' | 'datum' | 'geaendert' | 'dev' | 'firma' | 'nr'
export const SORT_OPTIONEN: { key: SortKey; label: string }[] = [
  { key: 'empfehlung', label: 'Beste Empfehlung zuerst' },
  { key: 'score', label: 'Beste Bewertung zuerst' },
  { key: 'datum', label: 'Neueste zuerst' },
  { key: 'geaendert', label: 'Zuletzt von mir markiert' },
  { key: 'dev', label: 'Dev-Skills zuerst' },
  { key: 'firma', label: 'Firma A–Z' },
  { key: 'nr', label: 'Nr. (neueste zuerst)' },
]
export const istSortKey = (s: string | null): s is SortKey => SORT_OPTIONEN.some((o) => o.key === s)

const AMPEL_RANG: Record<string, number> = { gruen: 0, gelb: 1, rot: 2 }
const s = (v: unknown) => String(v ?? '')
const score = (j: Job) => j.passung_score || 0
const deutsch = new Intl.Collator('de').compare // einmal angelegt statt bei jedem Vergleich

const VERGLEICH: Record<SortKey, (a: Job, b: Job) => number> = {
  score: (a, b) => score(b) - score(a) || s(b.veroeffentlichungsdatum).localeCompare(s(a.veroeffentlichungsdatum)),
  datum: (a, b) => s(b.veroeffentlichungsdatum || b.erstmals_gesehen).localeCompare(s(a.veroeffentlichungsdatum || a.erstmals_gesehen)),
  geaendert: (a, b) => s(b.tendenz_geaendert_am).localeCompare(s(a.tendenz_geaendert_am)),
  firma: (a, b) => deutsch(s(a.firma || a.domain), s(b.firma || b.domain)),
  nr: (a, b) => b.id - a.id,
  // Tiefen-Check-Empfehlung: grün vor gelb vor rot, dann nach Bewertung
  empfehlung: (a, b) => (AMPEL_RANG[s(a.tc_ampel)] ?? 3) - (AMPEL_RANG[s(b.tc_ampel)] ?? 3) || score(b) - score(a),
  dev: (a, b) => devRang(a) - devRang(b) || score(b) - score(a),
}

export const sortieren = (jobs: Job[], key: SortKey) => [...jobs].sort(VERGLEICH[key])

// Groß/Klein und Umlaute gleich behandeln: Müller, müller und muller treffen dasselbe.
const norm = (t: unknown) => s(t).toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
const NUMMER = /^#?[0-9]+$/

/**
 * Jedes Wort muss passen (UND). „#1188“ findet genau die Stelle mit dieser Nummer; eine blanke Zahl
 * auch die Nummer, sonst den Text. Durchsucht Titel, Firma, Domain, Ort, Linktext und Notiz – nicht die
 * KI-Zusammenfassung, sonst kommen zufällige Treffer.
 */
export function suchen(jobs: Job[], frage: string) {
  const woerter = norm(frage).split(' ').filter(Boolean)
  if (!woerter.length) return jobs
  return jobs.filter((j) => {
    const text = norm([j.jobtitel, j.firma, j.ort, j.domain, j.linktext, j.notiz].join(' '))
    return woerter.every((w) =>
      (NUMMER.test(w) && String(j.id) === w.replace('#', '')) || (!w.startsWith('#') && text.includes(w)),
    )
  })
}
