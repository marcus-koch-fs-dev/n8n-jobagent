import { cacheTextLesen, idBereinigen } from './cache.js'

// Welche Unterlagen will die Firma? Kostenlose Textsuche in der gespeicherten Anzeige (ohne KI).

export interface Unterlagen {
  anschreiben: 'gefragt' | 'nicht_noetig' | ''
  video: boolean
  portfolio: boolean
  lebenslauf: boolean
}

function unterlagenAusText(text: unknown): Unterlagen {
  const t = String(text || '')
  const nichtNoetig = /(kein(e|en)?|ohne)\s+(langes?\s+|klassisches?\s+)?(Anschreiben|Motivationsschreiben)|(Anschreiben|Motivationsschreiben)\s+(ist\s+)?(bei uns\s+)?(nicht|kein)\s*(nötig|notwendig|erforderlich|gebraucht)|no (need for a )?cover letter|cover letter(s)?\s+(is|are)\s+(not required|optional|not necessary)/i.test(t)
  const gefragt = !nichtNoetig && /Anschreiben|Motivationsschreiben|cover letter|motivation letter|letter of motivation/i.test(t)
  return {
    anschreiben: nichtNoetig ? 'nicht_noetig' : gefragt ? 'gefragt' : '',
    video: /Bewerbungsvideo|Vorstellungsvideo|Videobewerbung|Video-?Bewerbung|kurzes? Video (von dir|über dich|in dem du)|(send|record)( us)? a (short )?video|video (introduction|application)|loom\.com|Loom-Video/i.test(t),
    portfolio: /GitHub-?Profil|GitHub profile|Link zu deinem GitHub|Portfolio|Arbeitsproben|work samples|Referenzprojekte/i.test(t),
    lebenslauf: /Lebenslauf|\bCV\b|Resume|Résumé/i.test(t),
  }
}

/** Für mehrere Stellen auf einmal: nur Stellen mit gespeichertem Text bekommen ein Ergebnis. */
export function unterlagenFuer(stellen: { id: number; cache_id: string }[]): Record<number, Unterlagen> {
  const out: Record<number, Unterlagen> = {}
  for (const { id, cache_id } of stellen) {
    const cacheId = idBereinigen(String(cache_id || ''))
    const text = cacheId ? cacheTextLesen(cacheId) : null
    if (text !== null) out[id] = unterlagenAusText(text)
  }
  return out
}
