import { describe, expect, it } from 'vitest'
import { LISTEN, STANDARD_LISTE, tabAnzahl, wartetAufKi } from './listen'
import { statistikText } from './kopf'
import type { Job } from '@/types/job'

const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })

describe('Listen', () => {
  it('ordnet jede Stelle ohne Tendenz genau einer Systemliste zu', () => {
    const jobs = [
      job({ id: 1, bewertung: 'passt gut' }),
      job({ id: 2, bewertung: 'passt teilweise' }),
      job({ id: 3, bewertung: 'passt nicht' }),
      job({ id: 4, status: 'tot', bewertung: 'passt nicht' }),
      job({ id: 5, status: 'wartet_auf_freigabe' }),
    ]
    for (const j of jobs) {
      const n = LISTEN.filter((l) => l.gruppe === 'system' && l.filter(j)).length
      expect(n).toBe(1)
    }
  })

  it('zählt Tab-Zahlen ohne Vergleichslisten', () => {
    const jobs = [job({ id: 1, bewertung: 'passt gut' }), job({ id: 2, tendenz: 'interessant' }), job({ id: 3, tendenz: 'nein' })]
    expect(tabAnzahl('sichten', jobs)).toBe(1)
    expect(tabAnzahl('pruefen', jobs)).toBe(1)
    expect(tabAnzahl('bewerben', jobs)).toBe(0)
  })
})

describe('statistikText', () => {
  it('meldet leere Daten', () => {
    expect(statistikText([], '12:00')).toBe('Noch keine Suche · aktualisiert 12:00')
  })
  it('fertig: neu gefunden, alle ausgewertet, passend', () => {
    const jobs = [job({ erstmals_gesehen: '2026-10-01T10:00:00Z', bewertung: 'passt gut' }), job({ id: 2, erstmals_gesehen: '2026-10-01T10:05:00Z', bewertung: 'passt nicht' })]
    expect(statistikText(jobs, '12:00')).toMatch(/· 2 neu gefunden · alle ausgewertet · 1 passend · aktualisiert 12:00$/)
  })
  it('in Arbeit: zeigt, wie viele noch bearbeitet werden', () => {
    const jobs = [job({ erstmals_gesehen: '2026-10-01T10:00:00Z', bewertung: 'passt gut' }), job({ id: 2, erstmals_gesehen: '2026-10-01T10:05:00Z', status: 'neu' })]
    expect(statistikText(jobs, '12:00')).toContain('2 neu gefunden · 1 in Bearbeitung · 1 passend bisher')
  })
})
describe('wartetAufKi', () => {
  const j = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })
  it('eingefügter Text (geladen) und unbewertete Stellen warten auf die KI', () => {
    expect(wartetAufKi(j({ status: 'abgerufen' }))).toBe(true)
    expect(wartetAufKi(j({ status: 'unklar' }))).toBe(true)
    expect(wartetAufKi(j({ status: 'aktiv', bewertung: 'fehler' }))).toBe(true)
  })
  it('bewertete, gesperrte und neue Stellen nicht', () => {
    expect(wartetAufKi(j({ bewertung: 'passt gut' }))).toBe(false)
    expect(wartetAufKi(j({ status: 'wartet_auf_freigabe' }))).toBe(false)
    expect(wartetAufKi(j({ status: 'neu' }))).toBe(false)
  })
})

describe('bereitFuerMappe', () => {
  const ohneCheck: Job = { id: 1, status: 'aktiv', tendenz: 'interessant' }
  const liste = (key: string) => LISTEN.find((l) => l.key === key)!
  it('👍 ohne Tiefen-Check bleibt in 3 · Prüfen', () => {
    expect(liste('interessant').filter(ohneCheck)).toBe(true)
    expect(liste('bereit').filter(ohneCheck)).toBe(false)
  })
  it('mit 📝 (direkt) wandert die Stelle nach 4 · Bewerben, auch ohne Check', () => {
    const direkt = { ...ohneCheck, direkt: true }
    expect(liste('interessant').filter(direkt)).toBe(false)
    expect(liste('bereit').filter(direkt)).toBe(true)
  })
  it('🤔 bleibt in 3 · Prüfen, auch mit Merker', () => {
    expect(liste('vielleicht').filter({ ...ohneCheck, tendenz: 'vielleicht', direkt: true })).toBe(true)
  })
})

describe('Tab 5 · Beworben', () => {
  const stellen = [
    job({ id: 1, tendenz: 'interessant', direkt: true }),
    job({ id: 2, tendenz: 'beworben' }),
    job({ id: 3, tendenz: 'beworben' }),
    job({ id: 4, tendenz: 'vielleicht' }),
  ]
  it('4 · Bewerben zählt nur „bereit“, 5 · Beworben nur die Beworbenen', () => {
    expect(tabAnzahl('bewerben', stellen)).toBe(1)
    expect(tabAnzahl('beworben', stellen)).toBe(2)
  })
  it('jeder der beiden Tabs hat genau eine Liste, und die Standard-Liste gibt es', () => {
    for (const tab of ['bewerben', 'beworben'] as const) {
      const listen = LISTEN.filter((l) => l.haupt === tab)
      expect(listen).toHaveLength(1)
      expect(listen[0].key).toBe(STANDARD_LISTE[tab])
    }
  })
  it('keine Stelle steht in 4 und 5 gleichzeitig', () => {
    const bereit = LISTEN.find((l) => l.key === 'bereit')!
    const beworben = LISTEN.find((l) => l.key === 'beworben')!
    for (const s of stellen) expect(bereit.filter(s) && beworben.filter(s)).toBe(false)
  })
})
