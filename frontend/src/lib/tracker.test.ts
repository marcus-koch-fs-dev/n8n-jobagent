import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { eintragen, kopfFinden, trackerZeile, warteschlangeAufnehmen, warteschlangeEntfernen, type WartendeZeile } from './tracker'
import type { Job } from '@/types/job'

/** Nachbau deiner Liste: Titel, Hinweis, Leerzeile, Kopf in Zeile 4, gelb vorformatierte Zeilen bis 17. */
function liste() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Tracker')
  ws.getCell('A1').value = 'MISSIONFREI · BEWERBUNGS-TRACKER'
  ws.getCell('A2').value = 'So nutzt du ihn: Firma oder Position eintragen …'
  ;['Datum', 'Firma', 'Position', 'Link zur Stelle', 'Quelle', 'Status', 'Follow-up am', 'Notizen'].forEach((t, i) => { ws.getRow(4).getCell(i + 1).value = t })
  const gelb = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } } as const
  for (let r = 5; r <= 17; r++) for (let c = 1; c <= 8; c++) ws.getRow(r).getCell(c).fill = gelb
  ws.getRow(5).values = [new Date('2026-08-16'), 'SupportYourApp', 'Customer Care Consultant', 'https://apply.workable.com/supportyourapp/', 'Missionfrei Board', 'Beworben']
  ws.getRow(6).values = [new Date('2026-09-29'), 'netshake GmbH', 'Sales Opener als VA', { text: 'https://www.stepstone.de/x', hyperlink: 'https://www.stepstone.de/x' }, 'Missionfrei Board', 'Absage']
  return ws
}
const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })

describe('Bewerbungs-Tracker', () => {
  it('findet die Kopfzeile und die Spalten über ihre Namen', () => {
    expect(kopfFinden(liste())).toEqual({ zeile: 4, spalten: { datum: 1, firma: 2, position: 3, link: 4, quelle: 5, status: 6 } })
  })
  it('trägt in die erste freie Zeile ein und behält Notizen-Spalten und Format', () => {
    const ws = liste()
    const r = eintragen(ws, [trackerZeile(job({ firma: 'ZIRKEL8', jobtitel: 'AI Developer', url: 'https://zirkel8.de/job', tendenz_geaendert_am: '2026-10-19T08:00:00Z' }))])
    expect(r).toEqual({ neu: 1, schon: 0 })
    expect(ws.getCell('B7').value).toBe('ZIRKEL8')
    expect(ws.getCell('F7').value).toBe('Beworben')
    expect(ws.getCell('E7').value).toBe('Missionfrei Board')
    expect((ws.getCell('A7').value as Date).toISOString().slice(0, 10)).toBe('2026-10-19')
    expect((ws.getCell('B7').fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FFFFF2CC')
  })
  it('überspringt Stellen, die schon in der Liste stehen (Link oder Firma + Position)', () => {
    const ws = liste()
    const r = eintragen(ws, [
      trackerZeile(job({ firma: 'Anders', jobtitel: 'X', url: 'https://www.stepstone.de/x?utm=1' })),
      trackerZeile(job({ firma: 'SupportYourApp', jobtitel: 'Customer Care Consultant', url: 'https://neu' })),
      trackerZeile(job({ firma: 'Neu GmbH', jobtitel: 'Dev', url: 'https://neu.de/a' })),
      trackerZeile(job({ firma: 'Neu GmbH', jobtitel: 'Dev', url: 'https://neu.de/a' })),
    ])
    expect(r).toEqual({ neu: 1, schon: 3 })
    expect(ws.getCell('B7').value).toBe('Neu GmbH')
  })
  it('schreibt unterhalb des vorformatierten Bereichs mit dem Format der Zeile darüber weiter', () => {
    const ws = liste()
    for (let r = 7; r <= 17; r++) ws.getCell(`B${r}`).value = 'voll ' + r
    eintragen(ws, [trackerZeile(job({ firma: 'Letzte', jobtitel: 'Stelle', url: 'https://l' }))])
    expect(ws.getCell('B18').value).toBe('Letzte')
    expect((ws.getCell('B18').fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FFFFF2CC')
  })
  it('meldet eine Liste ohne passende Kopfzeile', () => {
    const wb = new ExcelJS.Workbook()
    expect(() => eintragen(wb.addWorksheet('leer'), [])).toThrow('Kopfzeile')
  })
})

describe('Warteschlange', () => {
  const w = (id: number, firma = 'F' + id): WartendeZeile => ({ job_id: id, zeile: trackerZeile(job({ id, firma, jobtitel: 'T', url: 'https://x/' + id })) })

  it('nimmt neue Einträge hinten auf und behält die alten', () => {
    expect(warteschlangeAufnehmen([w(1), w(2)], [w(3)]).map((x) => x.job_id)).toEqual([1, 2, 3])
  })
  it('hat je Stelle nur einen Eintrag, der neuere ersetzt den alten', () => {
    const q = warteschlangeAufnehmen([w(1, 'alt'), w(2)], [w(1, 'neu')])
    expect(q.map((x) => x.job_id)).toEqual([2, 1])
    expect(q[1].zeile.firma).toBe('neu')
  })
  it('nimmt eine Stelle wieder heraus und lässt die anderen stehen', () => {
    expect(warteschlangeEntfernen([w(1), w(2)], 1).map((x) => x.job_id)).toEqual([2])
    expect(warteschlangeEntfernen([w(1)], 9)).toHaveLength(1)
  })
  it('ein zweiter Versuch mit denselben Einträgen verdoppelt nichts', () => {
    const q = warteschlangeAufnehmen([w(1)], [w(1)])
    expect(q).toHaveLength(1)
  })
})
