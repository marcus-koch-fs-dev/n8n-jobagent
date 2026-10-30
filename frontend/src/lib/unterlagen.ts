import type { Job } from '@/types/job'
import { tcLesen } from './tiefencheck'

export interface Unterlagen {
  anschreiben?: string
  lebenslauf?: boolean
  video?: boolean
  portfolio?: boolean
}
export type TextSuche = Record<string, Unterlagen>

/** Was will die Firma haben? Vorrang hat der Tiefen-Check, sonst die kostenlose Textsuche in der Anzeige. */
export function unterlagen(j: Job, textSuche: TextSuche = {}): Unterlagen | null {
  const k = tcLesen(j)?.unterlagen
  if (k) return { ...k, anschreiben: k.anschreiben === 'unklar' ? '' : k.anschreiben }
  return textSuche[j.id] ?? null
}
