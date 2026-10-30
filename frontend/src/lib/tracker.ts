import type { Worksheet } from 'exceljs'
import type { Job } from '@/types/job'

// Bewerbungs-Tracker (deine Excel-Liste): neue Zeilen für Stellen, auf die du dich beworben hast.
// Die Spalten werden über die Kopfzeile gefunden (Datum, Firma, Position, Link, Quelle, Status) –
// Reihenfolge und weitere Spalten (Follow-up, Notizen …) sind egal und bleiben unberührt.

interface TrackerZeile { datum: Date; firma: string; position: string; link: string; quelle: string; status: string }
type Spalte = keyof TrackerZeile
const SPALTEN: Spalte[] = ['datum', 'firma', 'position', 'link', 'quelle', 'status']

const text = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'object') {
    const o = v as { text?: unknown; richText?: { text: string }[]; hyperlink?: string; result?: unknown }
    if (o.richText) return o.richText.map((r) => r.text).join('')
    if (o.text != null) return text(o.text)
    if (o.hyperlink) return o.hyperlink
    if (o.result != null) return text(o.result)
  }
  return String(v).trim()
}
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const linkNorm = (s: string) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/\/+$/, '')

/** Kopfzeile in den ersten 20 Zeilen: die Zeile mit „Firma“ und „Position“. */
export function kopfFinden(ws: Worksheet): { zeile: number; spalten: Partial<Record<Spalte, number>> } | null {
  for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
    const spalten: Partial<Record<Spalte, number>> = {}
    ws.getRow(r).eachCell((zelle, c) => {
      const t = norm(text(zelle.value))
      const s = SPALTEN.find((k) => t.startsWith(k))
      if (s && !spalten[s]) spalten[s] = c
    })
    if (spalten.firma && spalten.position) return { zeile: r, spalten }
  }
  return null
}

/** Trägt neue Zeilen ein: in die erste freie Zeile unter der Kopfzeile (Firma und Position leer), Format der Zeile darüber.
 *  Schon vorhandene Stellen (gleicher Link oder gleiche Firma + Position) werden übersprungen. */
export function eintragen(ws: Worksheet, zeilen: TrackerZeile[]): { neu: number; schon: number } {
  const kopf = kopfFinden(ws)
  if (!kopf) throw new Error('Keine Kopfzeile mit „Firma“ und „Position“ gefunden.')
  const sp = kopf.spalten
  const wert = (r: number, s: Spalte) => (sp[s] ? text(ws.getRow(r).getCell(sp[s]!).value) : '')

  const links = new Set<string>()
  const namen = new Set<string>()
  for (let r = kopf.zeile + 1; r <= ws.rowCount; r++) {
    if (wert(r, 'link')) links.add(linkNorm(wert(r, 'link')))
    if (wert(r, 'firma')) namen.add(norm(wert(r, 'firma') + '|' + wert(r, 'position')))
  }

  let neu = 0
  let schon = 0
  let r = kopf.zeile + 1
  for (const z of zeilen) {
    if ((z.link && links.has(linkNorm(z.link))) || namen.has(norm(z.firma + '|' + z.position))) { schon++; continue }
    while (wert(r, 'firma') || wert(r, 'position')) r++
    const zeile = ws.getRow(r)
    const vorher = ws.getRow(r - 1)
    for (const s of SPALTEN) {
      const c = sp[s]
      if (!c) continue
      const zelle = zeile.getCell(c)
      // unterhalb des vorformatierten Bereichs: Format der Zeile darüber übernehmen (nicht von der Kopfzeile)
      if (!zelle.style?.fill && r - 1 > kopf.zeile) zelle.style = { ...vorher.getCell(c).style }
      zelle.value = z[s]
      if (s === 'datum' && !zelle.numFmt) zelle.numFmt = 'dd.mm.yyyy'
    }
    zeile.commit()
    links.add(linkNorm(z.link))
    namen.add(norm(z.firma + '|' + z.position))
    neu++
    r++
  }
  return { neu, schon }
}

/** Zeile für eine Stelle: Datum = wann du sie als beworben markiert hast (sonst heute). */
export const trackerZeile = (j: Job, quelle = 'Missionfrei Board'): TrackerZeile => ({
  datum: j.tendenz_geaendert_am ? new Date(j.tendenz_geaendert_am) : new Date(),
  firma: String(j.firma || j.domain || ''),
  position: String(j.jobtitel || j.linktext || ''),
  link: String(j.url || ''),
  quelle,
  status: 'Beworben',
})

/** Ein Eintrag, der auf die Excel-Liste wartet (z. B. weil die Datei gerade in Excel offen ist). */
export interface WartendeZeile { job_id: number; zeile: TrackerZeile }

/** Neue Einträge in die Warteschlange; je Stelle nur einer – der neuere ersetzt den alten. */
export const warteschlangeAufnehmen = (alt: WartendeZeile[], neu: WartendeZeile[]): WartendeZeile[] =>
  [...alt.filter((a) => !neu.some((n) => n.job_id === a.job_id)), ...neu]

/** Eintrag einer Stelle zurücknehmen (z. B. wenn „beworben“ wieder ausgeschaltet wird). */
export const warteschlangeEntfernen = (alt: WartendeZeile[], jobId: number): WartendeZeile[] =>
  alt.filter((a) => a.job_id !== jobId)
