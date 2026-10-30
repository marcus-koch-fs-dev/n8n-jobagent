import { describe, expect, it } from 'vitest'
import { auswertungsStand, einordnenKosten, gruppieren, nachPassung, prozent, spurBreite } from './auswertung'
import type { Job } from '@/types/job'

const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', bewertung: 'passt nicht', ...o })

describe('Auswertung', () => {
  const jobs = [
    job({ id: 1, bereich: 'Entwicklung', hauptgrund: 'Info fehlt', beschreibung: 'dünn' }),
    job({ id: 2, bereich: 'Entwicklung', hauptgrund: 'Ort', tendenz: 'nein' }),
    job({ id: 3, bewertung: 'passt gut', bereich: 'Support' }),
    job({ id: 4, bewertung: 'fehler', hauptgrund: 'x' }),
    job({ id: 5, bewertung: null }),
  ]
  it('zählt bewertete, eingeordnete und offene Stellen', () => {
    const s = auswertungsStand(jobs)
    expect(s.bewertet.map((j) => j.id)).toEqual([1, 2, 3])
    expect(s.mitBereich).toHaveLength(3)
    expect(s.eingeordnet.map((j) => j.id)).toEqual([1, 2])
    expect(s.offen).toBe(1)
    expect(s.nicht.map((j) => j.id)).toEqual([1, 2])
    expect(s.duenn.map((j) => j.id)).toEqual([1])
  })
  it('gruppiert, größte Gruppe zuerst, ohne Wert unter „–“', () => {
    const g = gruppieren([...jobs, job({ id: 9, bereich: null })], 'bereich')
    expect(g.map(([n, s]) => [n, s.length])).toEqual([['–', 3], ['Entwicklung', 2], ['Support', 1]])
  })
  it('rechnet Prozent, Spurbreite und Kosten', () => {
    expect(prozent(1, 3)).toBe(33)
    expect(prozent(1, 0)).toBe(0)
    expect(spurBreite(0, 10)).toBe(4)
    expect(spurBreite(5, 10)).toBe(50)
    expect(einordnenKosten(100)).toEqual({ anfragen: 4, dollar: '0,07' })
    expect(einordnenKosten(3).anfragen).toBe(1)
  })
  it('sortiert nach Passung absteigend, ohne die Liste zu verändern', () => {
    const l = [job({ id: 1, passung_score: 2 }), job({ id: 2, passung_score: 5 }), job({ id: 3 })]
    expect(nachPassung(l).map((j) => j.id)).toEqual([2, 1, 3])
    expect(l.map((j) => j.id)).toEqual([1, 2, 3])
  })
})
