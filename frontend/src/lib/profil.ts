import type { Job } from '@/types/job'
import type { ModellWahl } from '@/types/lauf'
import type { Profil } from '@/types/profil'
import { ANSCHREIBEN_PROMPT_VORSCHLAG } from './vorlagen'

const ABSCHNITT_BEARBEITET = /^##[^\n]*bereits (bearbeitet|beworben)[^\n]*$/im

/** Firmen aus dem Abschnitt „## Bereits bearbeitet“ des Prompts lesen; null, wenn es den Abschnitt nicht gibt. */
export function firmenAusPrompt(text: string): string | null {
  const m = text.match(/^##[^\n]*bereits (?:bearbeitet|beworben)[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im)
  if (!m) return null
  return m[1].split(/[,\n]/).map((s) => s.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).join(', ')
}

/** Was in den Einstellungen bearbeitet wird – bleibt auch beim Tab-Wechsel erhalten, bis gespeichert ist. */
export interface Entwurf {
  kriterien: string
  anschreiben_prompt: string
  anschreiben_prompt_standard: string
  /** leer = Standard-Anweisungen aus prompts/tiefencheck.md */
  tiefencheck_prompt: string
  modelle: Record<string, ModellWahl>
}

/** Die Firmenliste gehört in den Prompt (Abschnitt „## Bereits bearbeitet“) – fehlt er, wird er angehängt. */
export function kriterienText(p: Profil): string {
  const text = p.kriterien ?? ''
  if (!ABSCHNITT_BEARBEITET.test(text) && p.bereits_bearbeitet?.trim()) {
    return text.trimEnd() + '\n\n## Bereits bearbeitet (diese Firmen → automatisch „passt nicht“)\n' + p.bereits_bearbeitet + '\n'
  }
  return text
}

export const entwurfAus = (p: Profil, modelle: Record<string, ModellWahl>): Entwurf => ({
  kriterien: kriterienText(p),
  anschreiben_prompt: p.anschreiben_prompt || ANSCHREIBEN_PROMPT_VORSCHLAG,
  anschreiben_prompt_standard: p.anschreiben_prompt_standard ?? '',
  tiefencheck_prompt: p.tiefencheck_prompt ?? '',
  modelle,
})

/** Body für POST /profil. */
export const speicherBody = (e: Entwurf) => ({
  kriterien: e.kriterien,
  bereits_bearbeitet: firmenAusPrompt(e.kriterien) ?? '',
  modelle: e.modelle,
  anschreiben_prompt: e.anschreiben_prompt,
  anschreiben_prompt_standard: e.anschreiben_prompt_standard,
  tiefencheck_prompt: e.tiefencheck_prompt,
})

export type NeuBewertenArt = 'unpassend' | 'passtnicht' | 'alle'

/**
 * Stellen, die nach dem aktuellen Such-Prompt neu bewertet werden könnten.
 * Schon nach dem letzten Prompt-Stand bewertete Stellen bleiben außen vor – dafür zahlt man nicht nochmal.
 */
export function neuBewertenAuswahl(jobs: Job[], art: NeuBewertenArt, kriterienAm?: string): Job[] {
  const stand = Date.parse(kriterienAm ?? '') || 0
  return jobs.filter((j) =>
    ['aktiv', 'unklar'].includes(j.status) && j.bewertung && j.bewertung !== 'fehler' && !j.duplikat_von
    && !(Date.parse(j.bewertet_am ?? '') >= stand)
    && (art === 'alle' || (j.bewertung === 'passt nicht' && (art === 'passtnicht' || j.pflichtkriterien_erfuellt !== 'nein'))))
}

/** Platzhalter einer Word-Vorlage als Statuszeile. */
export function dateiStatus(d?: { datei: string; zeichen?: number; platzhalter?: string[] }): string {
  if (!d) return '❌ noch nichts hochgeladen'
  if (d.zeichen) return `✅ ${d.datei} (${d.zeichen} Zeichen Text erkannt)`
  const p = d.platzhalter ?? []
  return `✅ ${d.datei} · ` + (p.length
    ? 'Platzhalter: ' + p.map((x) => '{{' + x + '}}').join(', ') + (p.includes('ANSCHREIBEN') ? '' : ' – ⚠ {{ANSCHREIBEN}} fehlt (dort kommt der Brieftext hin)')
    : '⚠ keine Platzhalter gefunden – mindestens {{ANSCHREIBEN}} in die Vorlage schreiben')
}