import { describe, expect, it } from 'vitest'
import { dateiStatus, entwurfAus, firmenAusPrompt, kriterienText, neuBewertenAuswahl, speicherBody } from './profil'
import { anbieterVerfuegbar, modellListe, modelleVerarbeiten, modellStatusText, startWahl } from './modellwahl'
import { ANSCHREIBEN_PROMPT_VORSCHLAG, SUCHPROMPT_VORLAGE } from './vorlagen'
import type { Job } from '@/types/job'

const job = (o: Partial<Job>): Job => ({ id: 1, status: 'aktiv', bewertung: 'passt nicht', ...o })

describe('Such-Prompt', () => {
  const prompt = '# Profil\n\n## Bereits bearbeitet (Firmen)\n- Acme\n- Foo GmbH, Bar\n\n## Weiteres\nx'
  it('liest die Firmen aus dem Abschnitt', () => {
    expect(firmenAusPrompt(prompt)).toBe('Acme, Foo GmbH, Bar')
    expect(firmenAusPrompt('# nur Profil')).toBeNull()
  })
  it('liest auch einen Abschnitt am Textende', () => {
    expect(firmenAusPrompt('## Bereits beworben\nA, B')).toBe('A, B')
  })
  it('hängt fehlende Firmenliste als Abschnitt an', () => {
    const t = kriterienText({ kriterien: '# Profil', bereits_bearbeitet: 'Acme, Foo' })
    expect(firmenAusPrompt(t)).toBe('Acme, Foo')
    expect(kriterienText({ kriterien: prompt, bereits_bearbeitet: 'egal' })).toBe(prompt)
  })
  it('Vorlagen sind komplett übernommen', () => {
    expect(SUCHPROMPT_VORLAGE).toContain('## Bereits bearbeitet')
    expect(ANSCHREIBEN_PROMPT_VORSCHLAG.startsWith('## Ton')).toBe(true)
  })
  it('baut Entwurf und Speicher-Body', () => {
    const e = entwurfAus({ kriterien: prompt }, startWahl())
    expect(e.anschreiben_prompt).toBe(ANSCHREIBEN_PROMPT_VORSCHLAG)
    expect(speicherBody(e).bereits_bearbeitet).toBe('Acme, Foo GmbH, Bar')
    expect(Object.keys(speicherBody(e).modelle)).toHaveLength(6)
    expect(e.anschreiben_prompt_standard).toBe('')
    const mitStandard = entwurfAus({ anschreiben_prompt_standard: 'Mein Stil' }, startWahl())
    expect(speicherBody(mitStandard).anschreiben_prompt_standard).toBe('Mein Stil')
  })
})

describe('neuBewertenAuswahl', () => {
  const jobs = [
    job({ id: 1, pflichtkriterien_erfuellt: 'ja' }),
    job({ id: 2, pflichtkriterien_erfuellt: 'nein' }),
    job({ id: 3, bewertung: 'passt gut' }),
    job({ id: 4, bewertet_am: '2026-10-10T00:00:00Z' }),
    job({ id: 5, status: 'tot' }),
    job({ id: 6, duplikat_von: 1 }),
  ]
  const ids = (a: 'unpassend' | 'passtnicht' | 'alle', am?: string) => neuBewertenAuswahl(jobs, a, am).map((j) => j.id)
  it('„unpassend“ lässt verletzte Muss-Kriterien aus', () => expect(ids('unpassend', '2026-10-20T00:00:00Z')).toEqual([1, 4]))
  it('„alle passt nicht“ nimmt auch diese', () => expect(ids('passtnicht', '2026-10-20T00:00:00Z')).toEqual([1, 2, 4]))
  it('„alle bewerteten“ nimmt auch Treffer, nie Tote oder Duplikate', () => expect(ids('alle', '2026-10-20T00:00:00Z')).toEqual([1, 2, 3, 4]))
  it('überspringt, was nach dem letzten Prompt-Stand bewertet wurde', () => expect(ids('alle', '2026-10-01T00:00:00Z')).toEqual([1, 2, 3]))
  it('ohne Prompt-Datum gilt alles Bewertete als aktuell', () => expect(ids('alle')).toEqual([1, 2, 3]))
})

describe('dateiStatus', () => {
  it('beschreibt Vorlagen und Texte', () => {
    expect(dateiStatus(undefined)).toBe('❌ noch nichts hochgeladen')
    expect(dateiStatus({ datei: 'b.pdf', zeichen: 900 })).toBe('✅ b.pdf (900 Zeichen Text erkannt)')
    expect(dateiStatus({ datei: 'v.docx', platzhalter: ['FIRMA'] })).toContain('⚠ {{ANSCHREIBEN}} fehlt')
    expect(dateiStatus({ datei: 'v.docx', platzhalter: ['ANSCHREIBEN'] })).toBe('✅ v.docx · Platzhalter: {{ANSCHREIBEN}}')
    expect(dateiStatus({ datei: 'v.docx', platzhalter: [] })).toContain('keine Platzhalter')
  })
})

describe('Modelle', () => {
  const antwort = {
    anbieter: {
      claude: { ok: true, modelle: [{ id: 'claude-opus-5-5', name: 'Claude Opus 5.5' }, { id: 'claude-opus-4-1', name: 'Claude Opus 4.1' }, { id: 'claude-haiku-5-5' }] },
      openai: { ok: false, fehler: 'kein Schlüssel' },
      gemini: { ok: true, modelle: [{ id: 'g1', name: 'Gem 1' }] },
    },
  }
  const stand = modelleVerarbeiten(antwort)
  it('gruppiert Claude nach Familie und nimmt andere Anbieter 1:1', () => {
    expect(stand.anbieter.claude.modelle[0]).toEqual(['claude-opus-5-5', 'Opus 5.5 💰💰💰', 'aktuell'])
    expect(stand.anbieter.claude.modelle[1][2]).toBe('ältere Versionen')
    expect(stand.anbieter.gemini.modelle).toEqual([['g1', 'Gem 1']])
  })
  it('kennt verfügbare Anbieter', () => {
    expect(anbieterVerfuegbar(stand, 'claude')).toBe(true)
    expect(anbieterVerfuegbar(stand, 'openai')).toBe(false)
    expect(anbieterVerfuegbar({ anbieter: stand.anbieter, status: null }, 'claude')).toBe(true)
    expect(anbieterVerfuegbar({ anbieter: stand.anbieter, status: null }, 'gemini')).toBe(false)
  })
  it('zeigt Status und warnt vor verschwundenen Modellen', () => {
    expect(modellStatusText(stand, '2026-10-18T10:00:00Z')).toContain('✓ Claude (Anthropic): 3 Modelle')
    expect(modellStatusText(stand)).toContain('ohne Schlüssel: GPT')
    expect(modellListe(stand, 'claude', { anbieter: 'claude', modell: 'claude-alt' })[0][1]).toContain('nicht mehr verfügbar')
  })
  it('„Einordnen“ übernimmt ohne eigene Wahl das Modell von „Fakten“', () => {
    const w = startWahl({ fakten: { anbieter: 'claude', modell: 'claude-haiku-5-5' } }, stand)
    expect(w.einordnung).toEqual({ anbieter: 'claude', modell: 'claude-haiku-5-5' })
    expect(w.tiefencheck.modell).toBe('claude-opus-5-5')
  })
})