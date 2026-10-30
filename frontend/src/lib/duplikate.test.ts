import { describe, expect, it } from 'vitest'
import type { Job, JobsAntwort } from '@/types/job'
import { direktMarkieren, duplikateZusammenfuehren } from './duplikate'

const antwort = (...jobs: Job[]): JobsAntwort => ({ jobs, erzeugt_am: '' })
const original: Job = { id: 1, status: 'aktiv', url: 'https://join.com/companies/x/123-job?utm=a' }
const kopie: Job = { id: 2, status: 'duplikat', url: 'https://adzuna.de/9', duplikat_von: 'https://join.com/companies/x/123-job/', tendenz: 'vielleicht', notiz: 'später', tendenz_geaendert_am: '2026-10-01' }
const stand = (d: JobsAntwort, id: number) => d.jobs.find((j) => j.id === id)!

describe('duplikateZusammenfuehren', () => {
  it('überträgt Tendenz und Notiz der Kopie aufs Original und nimmt sie der Kopie', () => {
    const d = duplikateZusammenfuehren(antwort(original, kopie))
    expect(stand(d, 1)).toMatchObject({ tendenz: 'vielleicht', notiz: 'später', tendenz_geaendert_am: '2026-10-01' })
    expect(stand(d, 2).tendenz).toBe('')
  })
  it('das Original behält sein eigenes Urteil', () => {
    const d = duplikateZusammenfuehren(antwort({ ...original, tendenz: 'nein' }, kopie))
    expect(stand(d, 1).tendenz).toBe('nein')
    expect(stand(d, 2).tendenz).toBe('vielleicht')
  })
  it('findet das Original auch über die Nummer', () => {
    const d = duplikateZusammenfuehren(antwort(original, { ...kopie, duplikat_von: 1 }))
    expect(stand(d, 1).tendenz).toBe('vielleicht')
  })
  it('ohne Original oder ohne Tendenz bleibt alles, wie es ist', () => {
    const a = antwort(original, { ...kopie, duplikat_von: 'https://gibt-es-nicht.de' })
    expect(duplikateZusammenfuehren(a)).toBe(a)
    const b = antwort(original, { ...kopie, tendenz: '' })
    expect(duplikateZusammenfuehren(b)).toBe(b)
  })
  it('zwei Kopien: nur die erste wird übertragen', () => {
    const d = duplikateZusammenfuehren(antwort(original, kopie, { ...kopie, id: 3, tendenz: 'nein' }))
    expect(stand(d, 1).tendenz).toBe('vielleicht')
    expect(stand(d, 3).tendenz).toBe('nein')
  })
})

describe('direktMarkieren', () => {
  it('setzt das Merkmal nur bei den gemerkten Stellen', () => {
    const d = direktMarkieren(antwort(original, kopie), [2])
    expect(stand(d, 2).direkt).toBe(true)
    expect(stand(d, 1).direkt).toBeUndefined()
  })
  it('ohne Liste kommt dieselbe Antwort zurück', () => {
    const a = antwort(original)
    expect(direktMarkieren(a, undefined)).toBe(a)
    expect(direktMarkieren(a, [])).toBe(a)
  })
})
