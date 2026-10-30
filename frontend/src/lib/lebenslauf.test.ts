import { describe, expect, it } from 'vitest'
import { bereichVergeben, bereichsListe, dateiText, stellenImBereich } from './lebenslauf'
import type { Job } from '@/types/job'

const job = (id: number, bereich?: string | null): Job => ({ id, status: 'aktiv', bereich })

describe('Lebensläufe je Bereich', () => {
  const jobs = [job(1, 'Entwicklung'), job(2, 'Sales'), job(3, 'Sales'), job(4, ' Sales '), job(5, null), job(6, 'Data / KI')]
  it('listet die vergebenen Bereiche, häufigste zuerst', () => {
    expect(bereichsListe(jobs)).toEqual(['Sales', 'Data / KI', 'Entwicklung'])
  })
  it('zählt Stellen je Bereich ohne Groß-/Kleinschreibung', () => {
    expect(stellenImBereich(jobs, 'sales')).toBe(3)
  })
  it('erkennt einen schon vergebenen Bereich bei einer anderen Zeile', () => {
    const z = [{ id: 'a', bereich: 'Entwicklung' }, { id: 'b', bereich: '' }]
    expect(bereichVergeben(z, 'b', 'entwicklung')).toBe(true)
    expect(bereichVergeben(z, 'a', 'Entwicklung')).toBe(false)
    expect(bereichVergeben(z, 'b', '  ')).toBe(false)
  })
  it('beschreibt eine Datei', () => {
    expect(dateiText(undefined)).toBe('')
    expect(dateiText({ datei: 'cv.pdf', zeichen: 2300 })).toBe('cv.pdf · 2.300 Zeichen')
    expect(dateiText({ datei: 'cv.pdf' }, 900)).toBe('cv.pdf · 900 Zeichen')
  })
})
