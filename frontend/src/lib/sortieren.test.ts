import { describe, expect, it } from 'vitest'
import { sortieren, suchen } from './sortieren'
import { devRang } from './job'
import type { Job } from '@/types/job'

const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })
const ids = (l: Job[]) => l.map((j) => j.id)

describe('sortieren', () => {
  it('score: beste zuerst, bei Gleichstand neueres Datum', () => {
    const l = [
      job({ id: 1, passung_score: 3 }),
      job({ id: 2, passung_score: 5, veroeffentlichungsdatum: '2026-01-01' }),
      job({ id: 3, passung_score: 5, veroeffentlichungsdatum: '2026-02-01' }),
    ]
    expect(ids(sortieren(l, 'score'))).toEqual([3, 2, 1])
  })
  it('empfehlung: grün vor gelb vor rot vor ohne Check', () => {
    const l = [job({ id: 1 }), job({ id: 2, tc_ampel: 'rot' }), job({ id: 3, tc_ampel: 'gruen' }), job({ id: 4, tc_ampel: 'gelb' })]
    expect(ids(sortieren(l, 'empfehlung'))).toEqual([3, 4, 2, 1])
  })
  it('geaendert: zuletzt markierte oben', () => {
    const l = [job({ id: 1, tendenz_geaendert_am: '2026-01-01' }), job({ id: 2, tendenz_geaendert_am: '2026-03-01' }), job({ id: 3 })]
    expect(ids(sortieren(l, 'geaendert'))).toEqual([2, 1, 3])
  })
  it('firma: A–Z, verändert die Eingabe nicht', () => {
    const l = [job({ id: 1, firma: 'Zeta' }), job({ id: 2, domain: 'alpha.de' })]
    expect(ids(sortieren(l, 'firma'))).toEqual([2, 1])
    expect(ids(l)).toEqual([1, 2])
  })
  it('nr: neueste Nummer zuerst', () => {
    expect(ids(sortieren([job({ id: 1 }), job({ id: 3 }), job({ id: 2 })], 'nr'))).toEqual([3, 2, 1])
  })
  it('dev: hoch vor mittel vor unbekannt', () => {
    const l = [job({ id: 1 }), job({ id: 2, bewertung_begruendung: 'x [Dev-Skills: mittel]' }), job({ id: 3, bewertung_begruendung: 'x [Dev-Skills: hoch]' })]
    expect(ids(sortieren(l, 'dev'))).toEqual([3, 2, 1])
  })
})

describe('suchen', () => {
  const l = [job({ id: 1, firma: 'Acme', notiz: 'Kontakt Anna' }), job({ id: 2, jobtitel: 'Support Engineer' })]
  it('findet in Firma und Notiz, ohne Groß/Klein', () => {
    expect(ids(suchen(l, 'anna'))).toEqual([1])
    expect(ids(suchen(l, 'ENGINEER'))).toEqual([2])
  })
  it('leere Suche liefert alles', () => expect(suchen(l, '  ')).toHaveLength(2))
  it('alle Wörter müssen passen, Umlaute zählen gleich', () => {
    const m = [job({ id: 1, firma: 'Müller GmbH', ort: 'Berlin' }), job({ id: 2, firma: 'Müller', ort: 'München' })]
    expect(ids(suchen(m, 'müller berlin'))).toEqual([1])
    expect(ids(suchen(m, 'MULLER'))).toEqual([1, 2])
  })
  it('#Nummer findet genau diese Stelle, blanke Zahl auch die Nummer', () => {
    const m = [job({ id: 1188, firma: 'Amplemarket' }), job({ id: 12 })]
    expect(ids(suchen(m, '#1188'))).toEqual([1188])
    expect(ids(suchen(m, '12'))).toEqual([12])
  })
  it('KI-Zusammenfassung wird nicht durchsucht', () => {
    expect(suchen([job({ id: 1, kurze_zusammenfassung: 'React Frontend' })], 'react')).toEqual([])
  })
})

describe('devRang', () => {
  it('sortiert Dev-Skills hoch vor unbekannt', () => {
    expect(devRang(job({ bewertung_begruendung: 'x [Dev-Skills: hoch]' }))).toBe(0)
    expect(devRang(job({}))).toBe(4)
  })
})
