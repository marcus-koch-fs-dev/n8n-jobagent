import { describe, expect, it } from 'vitest'
import { systemTeil, tcEmpfehlung, tcLaeuft, tcLesen } from './tiefencheck'
import { kostenText, muenzen } from './kosten'
import { unterlagen } from './unterlagen'
import type { Job } from '@/types/job'

const JETZT = Date.parse('2026-10-18T12:00:00Z')
const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })

describe('systemTeil', () => {
  it('nimmt nur die Anweisungen über „=== ANFRAGE ===“, ohne #-Kommentare', () => {
    const md = '# Kommentar\n#   Platzhalter\nDu bist Berater.\n## Abschnitt\nSei ehrlich.\n\n=== ANFRAGE ===\n{{KRITERIEN}}'
    expect(systemTeil(md)).toBe('Du bist Berater.\n## Abschnitt\nSei ehrlich.')
  })
})

describe('tcLesen / tcEmpfehlung', () => {
  it('liest JSON und überlebt kaputte Daten', () => {
    expect(tcLesen(job({ tc_ergebnis: '{"empfehlung":"probier_es"}' }))).toEqual({ empfehlung: 'probier_es' })
    expect(tcLesen(job({ tc_ergebnis: 'kein json' }))).toBeNull()
    expect(tcLesen(job({}))).toBeNull()
  })
  it('bildet alte Ampeln auf Empfehlungen ab', () => {
    expect(tcEmpfehlung({ empfehlung: 'unbedingt_bewerben' })).toEqual(['Unbedingt bewerben', 'good'])
    expect(tcEmpfehlung({ ampel: 'rot' })).toEqual(['Erwarte nichts', 'bad'])
    expect(tcEmpfehlung({ aufgaben_vergleich: { tendenz: 'knapp' } })).toEqual(['Probier es', 'mid'])
    expect(tcEmpfehlung({})).toEqual(['Geprüft', ''])
  })
})

describe('tcLaeuft', () => {
  const start = JETZT - 60_000
  it('zählt Stellen ohne neues Ergebnis', () => {
    const jobs = [job({ id: 1, tc_am: new Date(JETZT - 1000).toISOString() }), job({ id: 2, tc_am: new Date(start - 5000).toISOString() }), job({ id: 3 })]
    expect([...tcLaeuft({ tc: { ids: [1, 2, 3], start } }, jobs, JETZT)]).toEqual([2, 3])
  })
  it('gibt nach 2 min je Stelle + 5 min auf', () => {
    const l = { tc: { ids: [1], start: JETZT - 8 * 60e3 } }
    expect(tcLaeuft(l, [job({ id: 1 })], JETZT).size).toBe(0)
    expect(tcLaeuft({ tc: { ids: [1], start: JETZT - 6 * 60e3 } }, [job({ id: 1 })], JETZT).size).toBe(1)
  })
  it('ohne Lauf nichts', () => expect(tcLaeuft({}, [job({})], JETZT).size).toBe(0))
})

describe('Kosten', () => {
  it('schätzt je Modell', () => {
    const einst = { modelle: { tiefencheck: { modell: 'claude-haiku-5-5' }, anschreiben: { anbieter: 'lokal' } } }
    expect(kostenText(einst, 10, 'tiefencheck')).toBe('15 ct')
    expect(kostenText(einst, 1, 'anschreiben')).toBe('kostenlos, lokal')
    expect(kostenText(undefined, 30, 'tiefencheck')).toBe('1,35 $')
    expect(muenzen(undefined, 'anschreiben')).toBe(' 💰💰💰')
  })
})

describe('unterlagen', () => {
  it('bevorzugt den Tiefen-Check vor der Textsuche', () => {
    const j = job({ id: 5, tc_ergebnis: JSON.stringify({ unterlagen: { anschreiben: 'unklar', lebenslauf: true } }) })
    expect(unterlagen(j, { 5: { video: true } })).toEqual({ anschreiben: '', lebenslauf: true })
    expect(unterlagen(job({ id: 5 }), { 5: { video: true } })).toEqual({ video: true })
    expect(unterlagen(job({ id: 6 }))).toBeNull()
  })
})