import { describe, expect, it } from 'vitest'
import { lauflage, type LageEingabe } from './lauflage'
import { laufErgaenzen, laufZahlen } from './laeufe'
import { modellFuer, modellKurz, muenzenModell } from './modelle'
import type { Job } from '@/types/job'

const JETZT = Date.parse('2026-10-18T12:00:00Z')
const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })
const eingabe = (o: Partial<Omit<LageEingabe, 'status'>> & { status?: Partial<LageEingabe['status']> }): LageEingabe => ({
  startZeit: 0, jobs: [], laeufe: {}, anschreiben: {}, jetzt: JETZT, ...o,
  status: { pausiert: false, sekundenSeitLetzterAktivitaet: 10, ...o.status },
})

describe('lauflage', () => {
  it('zeigt „aus“, wenn lange nichts passiert ist', () => {
    expect(lauflage(eingabe({ status: { sekundenSeitLetzterAktivitaet: 6000 } })).art).toBe('aus')
    expect(lauflage(eingabe({ status: { sekundenSeitLetzterAktivitaet: null } })).art).toBe('aus')
  })
  it('KI-Problem hat Vorrang', () => {
    const l = lauflage(eingabe({ status: { pausiert: true, grund: 'guthaben', anbieter: 'openai', sekundenSeitLetzterAktivitaet: 5000 } }))
    expect(l).toMatchObject({ art: 'problem', grund: 'guthaben', anbieter: 'openai' })
  })
  it('„startet“, bis sich die Pipeline nach dem Klick meldet – nach 3 min nicht mehr', () => {
    const start = JETZT - 20_000
    expect(lauflage(eingabe({ startZeit: start }))).toMatchObject({ art: 'startet', sek: 20 })
    expect(lauflage(eingabe({ startZeit: start, status: { letzteAbfrage: new Date(JETZT - 1000).toISOString() } })).art).toBe('schritt')
    expect(lauflage(eingabe({ startZeit: JETZT - 200_000 })).art).toBe('schritt')
  })
  it('liest den Schritt aus letzterSchritt und zählt offene Stellen', () => {
    const l = lauflage(eingabe({ status: { letzterSchritt: 'Schritt 2' }, jobs: [job({ status: 'neu' }), job({ id: 2, status: 'neu' })] }))
    expect(l).toMatchObject({ art: 'schritt', nr: 2, rest: '2 Seiten noch zu laden' })
  })
  it('Tiefen-Check angehalten: zurücksetzen, sobald n8n die Pause gesehen hat', () => {
    const s = { pausiert: true, letzterSchritt: 'Prüfen · Tiefen-Check', gesetztAm: '2026-10-18T11:59:00Z', letzteAbfrage: '2026-10-18T11:59:30Z' }
    expect(lauflage(eingabe({ status: s }))).toMatchObject({ art: 'haeltAn', name: 'Tiefen-Check', zuruecksetzen: true })
    expect(lauflage(eingabe({ status: { ...s, letzteAbfrage: '2026-10-18T11:58:00Z' } }))).toMatchObject({ zuruecksetzen: false })
  })
  it('Tiefen-Check fertig, sobald alle Stellen ein neues Ergebnis haben', () => {
    const start = JETZT - 60_000
    const l = lauflage(eingabe({
      status: { letzterSchritt: 'Prüfen · Tiefen-Check', letzteAbfrage: '2026-10-18T11:59:50Z' },
      laeufe: { tc: { ids: [1, 2], start } },
      jobs: [job({ id: 1, tc_am: new Date(JETZT - 1000).toISOString() }), job({ id: 2, tc_am: new Date(JETZT - 2000).toISOString() })],
    }))
    expect(l).toMatchObject({ art: 'fertig', lauf: 'tc', zahlen: { fertig: 2, gesamt: 2 } })
  })
  it('Tiefen-Check läuft: Zahlen aus dem Lauf', () => {
    const l = lauflage(eingabe({
      status: { letzterSchritt: 'Prüfen · Tiefen-Check' },
      laeufe: { tc: { ids: [1, 2, 3], start: JETZT - 60_000 } },
      jobs: [job({ id: 1, tc_am: new Date(JETZT - 1000).toISOString() })],
    }))
    expect(l).toMatchObject({ art: 'knopfLauf', zahlen: { fertig: 1, gesamt: 3 } })
  })
  it('Neu bewerten zeigt eigenen Fortschritt in Schritt 4', () => {
    const l = lauflage(eingabe({ status: { letzterSchritt: 'Schritt 4' }, laeufe: { bw: { ids: [1, 2], start: JETZT - 1000 } }, jobs: [job({ id: 1 }), job({ id: 2 })] }))
    expect(l).toMatchObject({ art: 'schritt', nr: 4, neuBewertung: { fertig: 0, gesamt: 2 } })
  })
})

describe('Läufe', () => {
  it('schätzt einen fremden Tiefen-Check aus den Daten', () => {
    const jobs = [
      job({ id: 1, tc_am: new Date(JETZT - 60_000).toISOString() }),
      job({ id: 2, tc_am: new Date(JETZT - 120_000).toISOString() }),
      job({ id: 3, tendenz: 'interessant' }),
    ]
    expect(laufZahlen({}, 'tc', jobs, {}, JETZT)).toEqual({ fertig: 2, gesamt: 3 })
  })
  it('ergänzt einen laufenden Lauf, ersetzt einen fertigen', () => {
    const laeuft = { tc: { ids: [1], start: 1000 } }
    const r1 = laufErgaenzen(laeuft, 'tc', [2], [job({ id: 1 })], {}, JETZT)
    expect(r1.laeufe.tc).toEqual({ ids: [1, 2], start: 1000 })
    expect(r1.ersetzen).toBe(false)
    const r2 = laufErgaenzen(laeuft, 'tc', [2], [job({ id: 1, tc_am: new Date(JETZT).toISOString() })], {}, JETZT)
    expect(r2.laeufe.tc).toEqual({ ids: [2], start: JETZT - 5000 })
    expect(r2.ersetzen).toBe(true)
  })
})

describe('Modelle', () => {
  it('kürzt Modellnamen', () => {
    expect(modellKurz({ modell: 'claude-haiku-5-5' })).toBe('Haiku (Claude online)')
    expect(modellKurz({ anbieter: 'lokal', modell: 'qwen3:8b' })).toBe('qwen3:8b (lokal, Grafikkarte)')
    expect(modellFuer({ modelle: { fakten: { modell: 'claude-sonnet-5-5' } } }, 'einordnung')).toBe('Sonnet')
    expect(muenzenModell('claude-opus-5-5')).toBe(' 💰💰💰')
  })
})