import type { Job } from '@/types/job'

export type Haupt = 'sammeln' | 'sichten' | 'pruefen' | 'auswertung' | 'bewerben' | 'beworben' | 'einstellungen'
export const HAUPT_TABS: { key: Haupt; label: string }[] = [
  { key: 'sammeln', label: '1 · Sammeln' },
  { key: 'sichten', label: '2 · Sichten' },
  { key: 'pruefen', label: '3 · Prüfen' },
  { key: 'bewerben', label: '4 · Bewerben' },
  { key: 'beworben', label: '5 · Beworben' },
  { key: 'auswertung', label: '📊 Auswertung' },
  { key: 'einstellungen', label: '⚙️ Einstellungen' },
]
export const istHaupt = (h: string): h is Haupt => HAUPT_TABS.some((t) => t.key === h)

const AUSSORTIERT_STATUS = ['tot', 'abgelaufen', 'zu_alt', 'duplikat', 'fehler']
export const aussortiert = (j: Job) => AUSSORTIERT_STATUS.includes(j.status)
export const kandidat = (j: Job) => ['passt gut', 'passt teilweise'].includes(String(j.bewertung))
const ohneTendenz = (j: Job) => !j.tendenz
export const tcFertig = (j: Job) => Boolean(j.tc_ampel) && j.tc_ampel !== 'fehler'
/** Bereit für Ordner und Dokumente: Tiefen-Check ist fertig, oder du hast die Stelle in 3 · Prüfen ohne Check nach 4 geschickt. */
export const bereitFuerMappe = (j: Job) => tcFertig(j) || Boolean(j.direkt)
/** Text ist da, die KI hat aber noch nicht ausgelesen oder bewertet (z. B. nach „Text einfügen“). */
export const wartetAufKi = (j: Job) =>
  j.status === 'abgerufen' || (['aktiv', 'unklar'].includes(j.status) && (!j.bewertung || j.bewertung === 'fehler'))

export interface Liste {
  haupt: Haupt
  gruppe: 'system' | 'ich'
  key: string
  label: string
  hint: string
  filter: (j: Job) => boolean
}

// Jede Stelle steht in genau EINER Liste je Gruppe. Definitionen wie in neu.html.
export const LISTEN: Liste[] = [
  { haupt: 'sichten', gruppe: 'system', key: 'gut', label: '⭐ passt gut', hint: 'KI: Score 4–5. Hier zuerst schauen – dann 👍 / 🤔 / 👎 setzen, die Karte wandert nach „Meine Auswahl“.', filter: (j) => ohneTendenz(j) && j.bewertung === 'passt gut' },
  { haupt: 'sichten', gruppe: 'system', key: 'teil', label: '◐ teilweise', hint: 'KI: Score 3 – meist ist eine Frage offen (siehe „Details“).', filter: (j) => ohneTendenz(j) && j.bewertung === 'passt teilweise' },
  { haupt: 'sichten', gruppe: 'system', key: 'gesperrt', label: '🔐 gesperrt', hint: 'Seite war für den Browser gesperrt – selbst öffnen, dann markieren oder „📋 Text einfügen“.', filter: (j) => ohneTendenz(j) && j.status === 'wartet_auf_freigabe' },
  { haupt: 'sichten', gruppe: 'system', key: 'nicht', label: '✗ passt nicht', hint: 'KI: Score 1–2. Wenn du anderer Meinung bist: 👍 oder 🤔 setzen.', filter: (j) => ohneTendenz(j) && j.bewertung === 'passt nicht' && !aussortiert(j) },
  { haupt: 'sichten', gruppe: 'system', key: 'raus', label: '🗑 tot / alt / doppelt', hint: 'Seite weg, abgelaufen, zu alt, Duplikat, Fehler oder von dir als nicht mehr verfügbar markiert.', filter: (j) => (ohneTendenz(j) && aussortiert(j)) || j.tendenz === 'weg' },
  { haupt: 'pruefen', gruppe: 'ich', key: 'interessant', label: '👍 interessant', hint: 'Deine 👍 ohne Tiefen-Check. Nach dem Check – oder mit 📝 – wandert die Stelle nach „4 · Bewerben“.', filter: (j) => j.tendenz === 'interessant' && !bereitFuerMappe(j) },
  { haupt: 'pruefen', gruppe: 'ich', key: 'vielleicht', label: '🤔 vielleicht', hint: '', filter: (j) => j.tendenz === 'vielleicht' },
  { haupt: 'bewerben', gruppe: 'ich', key: 'bereit', label: '📝 bereit', hint: '', filter: (j) => j.tendenz === 'interessant' && bereitFuerMappe(j) },
  { haupt: 'beworben', gruppe: 'ich', key: 'beworben', label: '✉️ beworben', hint: 'Notizfeld für Datum, Kontakt und nächsten Schritt nutzen.', filter: (j) => j.tendenz === 'beworben' },
  { haupt: 'sichten', gruppe: 'ich', key: 'm_interessant', label: '👍 interessant', hint: '', filter: (j) => j.tendenz === 'interessant' },
  { haupt: 'sichten', gruppe: 'ich', key: 'm_vielleicht', label: '🤔 vielleicht', hint: '', filter: (j) => j.tendenz === 'vielleicht' },
  { haupt: 'sichten', gruppe: 'ich', key: 'm_beworben', label: '✉️ beworben', hint: 'Deine beworbenen Stellen – dieselben wie in „5 · Beworben“.', filter: (j) => j.tendenz === 'beworben' },
  { haupt: 'sichten', gruppe: 'ich', key: 'nein', label: '👎 abgelehnt', hint: 'Von dir abgelehnt, zuletzt abgelehnte oben. Verklickt? Nochmal 👎 klicken.', filter: (j) => j.tendenz === 'nein' },
]

export const STANDARD_LISTE: Partial<Record<Haupt, string>> = { sichten: 'gut', pruefen: 'interessant', bewerben: 'bereit', beworben: 'beworben' }

const NICHT_GEZAEHLT = (key: string) => key.startsWith('m_') || ['nein', 'nicht', 'raus'].includes(key)

/** Zahl hinter „2 · Sichten (n)“: Summe der Listen dieses Tabs ohne Vergleichs- und Ablehnungslisten. */
export function tabAnzahl(haupt: Haupt, jobs: Job[]): number {
  return LISTEN.filter((l) => l.haupt === haupt && !NICHT_GEZAEHLT(l.key)).reduce((s, l) => s + jobs.filter(l.filter).length, 0)
}