import { describe, expect, it } from 'vitest'
import { anLaeuft, mappenArt, mappenKosten, mappenModell } from './mappen'
import { chatAnweisungText, chatStelleText } from './chat'
import { createStore } from './store'
import type { Job } from '@/types/job'

const JETZT = Date.parse('2026-10-18T12:00:00Z')
const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', ...o })

describe('Mappen', () => {
  it('leitet die Art aus den gefragten Unterlagen ab', () => {
    expect(mappenArt({ anschreiben: 'gefragt' })).toBe('voll')
    expect(mappenArt({ anschreiben: 'nicht_noetig' })).toBe('keins')
    expect(mappenArt({ anschreiben: '' })).toBe('kurz')
    expect(mappenArt(null)).toBe('kurz')
  })
  it('wählt das Modell nach Ampel und Art', () => {
    expect(mappenModell(job({ tc_ampel: 'gruen' }), 'voll')).toBe('')
    expect(mappenModell(job({ tc_ampel: 'gelb' }), 'voll')).toBe('claude-sonnet-5-5')
    expect(mappenModell(job({ tc_ampel: 'gruen' }), 'keins')).toBe('claude-haiku-5-5')
  })
  it('schätzt Kosten je Modell', () => {
    const einst = { modelle: { anschreiben: { modell: 'claude-opus-5-5' } } }
    expect(mappenKosten(einst, [{ job: job({ tc_ampel: 'gelb' }), art: 'voll' }, { job: job({ id: 2, tc_ampel: 'gruen' }), art: 'voll' }])).toBe('13 ct')
  })
  it('anLaeuft: offen bis die Mappe neuer ist als der Start, nach 30 min Schluss', () => {
    const start = JETZT - 60_000
    const a = { 1: { pfad: 'x', am: new Date(JETZT - 1000).toISOString() }, 2: { pfad: 'y', am: new Date(start - 9999).toISOString() } }
    expect([...anLaeuft({ an: { ids: [1, 2, 3], start } }, a, JETZT)]).toEqual([2, 3])
    expect(anLaeuft({ an: { ids: [1], start: JETZT - 31 * 60e3 } }, {}, JETZT).size).toBe(0)
  })
})

describe('Chat-Texte', () => {
  const j = job({ jobtitel: 'Support Engineer', firma: 'Acme', notiz: ' Kontakt Anna ', tc_ergebnis: JSON.stringify({ empfehlung: 'probier_es', kurzfazit: 'Kann passen.', argumente: ['n8n gebaut'], anforderungen: [{ anforderung: 'REST', status: 'erfuellt', beleg: 'CV' }] }) })
  it('baut die Anweisung mit Stil, Beispiel und Lebenslauf', () => {
    const t = chatAnweisungText({ anschreiben_prompt: 'kurz', lebenslauf_text: 'CV-Text' })
    expect(t).toContain('## Meine Stil-Vorgaben\nkurz')
    expect(t).toContain('(keins)')
    expect(t).toContain('CV-Text')
    expect(chatAnweisungText({}, 'Entwurf')).toContain('Entwurf')
    expect(chatAnweisungText({})).toContain('(keine – knapp, konkret, ohne Floskeln)')
  })
  it('baut den Stellen-Text mit Tiefen-Check und Notiz', () => {
    const t = chatStelleText(j, 'Anzeige hier', 'ANWEISUNG')
    expect(t.startsWith('ANWEISUNG\n\n---\n\nSchreib das Anschreiben für diese Stelle (nach den Anweisungen oben).')).toBe(true)
    expect(t).toContain('Empfehlung: Probier es – Kann passen.')
    expect(t).toContain('- REST: erfuellt (CV)')
    expect(t).toContain('Kontakt Anna')
    expect(t).toContain('Anzeige hier')
    expect(chatStelleText(job({ url: 'https://x.de' }), '')).toContain('(nicht gespeichert – siehe Link) https://x.de')
  })
})

describe('Store', () => {
  it('benachrichtigt Hörer', () => {
    const s = createStore(1)
    let n = 0
    const weg = s.subscribe(() => n++)
    s.set(2); weg(); s.set(3)
    expect([s.get(), n]).toEqual([3, 1])
  })
})