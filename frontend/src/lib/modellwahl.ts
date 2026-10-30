import type { ModellWahl } from '@/types/lauf'
import { muenzenModell } from './modelle'

/** Welche KI-Aufgabe in welchem Tab läuft: [Schlüssel, Tab, Aufgabe, wofür, Bedarf]. */
export const FUNKTIONEN: [key: string, tab: string, titel: string, info: string, bedarf: 'einfach' | 'mittel' | 'stark'][] = [
  ['fakten', '1 · Sammeln', 'Fakten auslesen', 'Titel, Gehalt, Remote … aus jeder Anzeige', 'einfach'],
  ['bewertung', '1 · Sammeln', 'Bewertung', 'jede Stelle gegen deinen Such-Prompt (sehr viele Stellen)', 'einfach'],
  ['zweitmeinung', '1 · Sammeln', 'Zweitmeinung', 'nur Stellen mit Score ≥ 3 noch einmal genauer', 'mittel'],
  ['tiefencheck', '3 · Prüfen', 'Tiefen-Check', 'Anzeige gegen Lebenslauf – auf Knopfdruck', 'stark'],
  ['einordnung', '📊 Auswertung', 'Einordnen', 'Bereich + Absage-Grund', 'einfach'],
  ['anschreiben', '4 · Bewerben', 'Anschreiben', 'kommt noch', 'stark'],
]
export const BEDARF = {
  einfach: 'Einfache Aufgabe – ein kleines Modell (Haiku) reicht',
  mittel: 'Mittleres Modell (Sonnet) ist ein guter Kompromiss',
  stark: 'Hier lohnt sich ein besseres Modell (Sonnet / Opus)',
}

/** [id, Beschriftung, Gruppe] */
type ModellEintrag = [id: string, text: string, gruppe?: string]
interface AnbieterListe { name: string; modelle: ModellEintrag[] }
type Anbieter = Record<string, AnbieterListe>

/** Notfall-Stand, falls n8n nicht antwortet. */
const ANBIETER_STANDARD: Anbieter = {
  claude: { name: 'Claude (Anthropic)', modelle: [['claude-haiku-5-5', 'Haiku 5.5 💰'], ['claude-sonnet-5-5', 'Sonnet 5.5 💰💰'], ['claude-opus-5-5', 'Opus 5.5 💰💰💰']] },
  openai: { name: 'GPT (OpenAI)', modelle: [] },
  gemini: { name: 'Gemini (Google)', modelle: [] },
  mistral: { name: 'Mistral', modelle: [] },
}

/** Antwort von GET /webhook/modelle. */
export interface ModelleAntwort {
  abgefragt_am?: string
  anbieter?: Record<string, { ok: boolean; fehler?: string; modelle?: { id: string; name?: string }[] }>
}

export interface ModellStand {
  anbieter: Anbieter
  /** null = nicht abgefragt / nicht erreichbar */
  status: Record<string, { ok: boolean; fehler?: string; anzahl: number }> | null
}

export const STAND_NOTFALL: ModellStand = { anbieter: ANBIETER_STANDARD, status: null }

/** Nur Anbieter mit gültigem Schlüssel in n8n; ohne Abfrage-Ergebnis nur Claude. */
export const anbieterVerfuegbar = (s: ModellStand, k: string) => (s.status ? Boolean(s.status[k]?.ok) : k === 'claude')

export function modelleVerarbeiten(d: ModelleAntwort): ModellStand {
  const anbieter: Anbieter = structuredClone(ANBIETER_STANDARD)
  const status: NonNullable<ModellStand['status']> = {}
  for (const k of Object.keys(anbieter)) {
    const x = d.anbieter?.[k]
    if (!x) continue
    status[k] = { ok: x.ok, fehler: x.fehler, anzahl: (x.modelle ?? []).length }
    if (!x.ok) continue
    if (k === 'claude') {
      // Neuestes Modell je Familie oben („aktuell“), alle anderen unter „ältere Versionen“
      const gesehen = new Set<string>()
      anbieter.claude.modelle = (x.modelle ?? []).map((m) => {
        const fam = String(m.id).match(/claude-(\w+)/)?.[1] ?? ''
        const neu = !gesehen.has(fam)
        gesehen.add(fam)
        return [m.id, String(m.name || m.id).replace(/^Claude /, '') + muenzenModell(m.id), neu ? 'aktuell' : 'ältere Versionen']
      })
    } else {
      anbieter[k].modelle = (x.modelle ?? []).map((m) => [m.id, m.name || m.id])
    }
  }
  return { anbieter, status }
}

export function modellStatusText(s: ModellStand, abgefragtAm?: string): string {
  if (!s.status) return '⚠ Modellliste nicht abrufbar (läuft n8n?) – zeige die eingebaute Liste.'
  const keys = Object.keys(s.anbieter)
  const da = keys.filter((k) => anbieterVerfuegbar(s, k)).map((k) => `✓ ${s.anbieter[k].name}: ${s.status![k].anzahl} Modelle`)
  const fehlt = keys.filter((k) => !anbieterVerfuegbar(s, k)).map((k) => s.anbieter[k].name.replace(/ \(.*\)/, ''))
  const zeit = new Date(abgefragtAm ?? Date.now()).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return [...da, fehlt.length ? `ohne Schlüssel: ${fehlt.join(', ')}` : ''].filter(Boolean).join(' · ') + ` (abgefragt ${zeit})`
}

/** Modellliste eines Anbieters; ein gespeichertes Modell, das es nicht mehr gibt, bleibt mit Warnung sichtbar. */
export function modellListe(s: ModellStand, anbieter: string, gespeichert: ModellWahl): ModellEintrag[] {
  const liste = [...(s.anbieter[anbieter] ?? s.anbieter.claude).modelle]
  if (gespeichert.modell && anbieter === (gespeichert.anbieter || 'claude') && !liste.some(([m]) => m === gespeichert.modell)) {
    liste.unshift([gespeichert.modell, `⚠ ${gespeichert.modell} (nicht mehr verfügbar – bitte neu wählen)`, 'aktuell'])
  }
  return liste
}

/** Gespeicherte Modellwahl je Funktion; „Einordnen“ nimmt ohne eigene Wahl die von „Fakten“. */
export function startWahl(gespeichert: Record<string, ModellWahl> = {}, s: ModellStand = STAND_NOTFALL): Record<string, ModellWahl> {
  const wahl: Record<string, ModellWahl> = {}
  for (const [key] of FUNKTIONEN) {
    const w = gespeichert[key] ?? (key === 'einordnung' ? gespeichert.fakten : undefined) ?? {}
    const anbieter = w.anbieter || 'claude'
    wahl[key] = { anbieter, modell: w.modell || modellListe(s, anbieter, w)[0]?.[0] || '' }
  }
  return wahl
}