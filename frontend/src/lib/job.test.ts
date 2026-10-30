import { describe, expect, it } from 'vitest'
import { ausfuehrung, begruendung, zusammenfassung } from './job'
import type { Job } from '@/types/job'

const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })

describe('ausfuehrung', () => {
  it('weltweit, wenn der Wortlaut von überall spricht', () => {
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Work from anywhere' }))).toEqual({ art: 'weltweit', text: 'weltweit' })
  })
  it('„only“ macht aus weltweit eine Region', () => {
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Remote anywhere in the EU only' }))?.text).toBe('Region: EU')
  })
  it('nennt Regionen und Zeitzonen', () => {
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Remote – EMEA / LATAM' }))?.text).toBe('Region: EMEA, LATAM')
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Overlap with UTC+2 required' }))?.text).toBe('Region: UTC+2')
  })
  it('freie Ortswahl zählt als weltweit', () => {
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Fully remote team - choose where you live' }))?.art).toBe('weltweit')
  })
  it('ohne erkennbare Region: remote, Region unklar', () => {
    expect(ausfuehrung(job({ remote: 'ja', remote_regel_wortlaut: 'Remote (Berlin area)' }))).toEqual({ art: 'unklar', text: 'remote, Region unklar' })
    expect(ausfuehrung(job({ remote: 'ja' }))?.text).toBe('remote, Region unklar')
  })
  it('vor Ort und hybrid zeigen die Stadt, aber nie „Remote“ als Ort', () => {
    expect(ausfuehrung(job({ remote: 'nein', ort: 'Berlin' }))).toEqual({ art: 'ort', text: 'vor Ort · Berlin' })
    expect(ausfuehrung(job({ remote: 'hybrid', ort: 'Remote (Germany)' }))).toEqual({ art: 'hybrid', text: 'hybrid' })
  })
  it('unklar oder fehlt', () => {
    expect(ausfuehrung(job({ remote: 'unklar' }))?.art).toBe('unklar')
    expect(ausfuehrung(job({}))).toBeNull()
  })
})

describe('zusammenfassung', () => {
  it('trennt die Anforderungs-Zeile vom Text', () => {
    const z = zusammenfassung(job({ kurze_zusammenfassung: 'Support für Kunden.\nAnforderungen: React · TypeScript · 3+ Jahre' }))
    expect(z).toEqual({ text: 'Support für Kunden.', anforderungen: ['React', 'TypeScript', '3+ Jahre'] })
  })
  it('ältere Stellen: nur Text', () => {
    expect(zusammenfassung(job({ kurze_zusammenfassung: 'Nur Text.' }))).toEqual({ text: 'Nur Text.', anforderungen: [] })
    expect(zusammenfassung(job({}))).toEqual({ text: '', anforderungen: [] })
  })
})

describe('begruendung: Minus-Signale', () => {
  it('liest den Teil hinter dem Strich', () => {
    const b = begruendung(job({ bewertung_begruendung: 'Gut. [Signalwörter + remote, weltweit | − Büro, Präsenz]' }))
    expect(b.signaleMinus).toBe('Büro, Präsenz')
  })
  it('„–“ heißt keine', () => {
    expect(begruendung(job({ bewertung_begruendung: 'x [Signalwörter + a | − –]' })).signaleMinus).toBeUndefined()
    expect(begruendung(job({})).signaleMinus).toBeUndefined()
  })
})
