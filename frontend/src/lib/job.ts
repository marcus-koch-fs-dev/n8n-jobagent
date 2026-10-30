import type { Job } from '@/types/job'

export const sichererLink = (u?: string | null) => (/^https?:\/\//i.test(String(u ?? '')) ? String(u) : null)
export const leer = (v: unknown) => v === null || v === undefined || String(v).trim() === ''
export const jobName = (j: Job) => j.firma || j.jobtitel || 'Stelle'

export const TENDENZ_NAME: Record<string, string> = {
  interessant: '👍 interessant', vielleicht: '🤔 vielleicht', nein: '👎 abgelehnt',
  beworben: '✉️ beworben', weg: '🚫 nicht mehr verfügbar', '': 'offen',
}

export const STATUS_TEXT: Record<string, string> = {
  neu: 'noch nicht geprüft', tot: 'tot', abgelaufen: 'abgelaufen', zu_alt: 'zu alt', duplikat: 'Duplikat',
  fehler: 'Fehler', abgerufen: 'abgerufen', wartet_auf_freigabe: 'Freigabe nötig', aktiv: 'aktiv', unklar: 'unklar',
}

const DEV_RANG: Record<string, number> = { hoch: 0, mittel: 1, gering: 2, keiner: 3 }

export const devRang = (j: Job) =>
  DEV_RANG[(String(j.bewertung_begruendung ?? '').match(/\[Dev-Skills: (\w+)/) ?? [])[1]] ?? 4

/** Die Begründung trägt Zusatzinfos in [eckigen Klammern]; gebraucht werden nur die Minus-Signale und der frühere lokale Wert. */
export function begruendung(j: Job) {
  const roh = String(j.bewertung_begruendung ?? '')
  // Format: [Signalwörter + a, b | − c, d] – hinter dem Strich stehen die Minus-Signale
  const minus = roh.match(/\[Signalwörter[^\]]*\|\s*[−–-]\s*([^\]]*)\]/)?.[1]?.trim()
  return {
    vorher: roh.match(/\[Vorher lokal: (\d)\]/)?.[1],
    signaleMinus: minus && minus !== '–' ? minus : undefined,
  }
}

/**
 * Die KI hängt an die Kurz-Zusammenfassung eine Zeile „Anforderungen: a · b · c“ (siehe prompts/extraktion.md).
 * Hier wird sie vom Beschreibungstext getrennt; ältere Stellen haben sie nicht.
 */
export function zusammenfassung(j: Job) {
  const roh = String(j.kurze_zusammenfassung ?? '')
  const treffer = roh.match(/(?:^|\n)\s*Anforderungen:\s*([^\n]*)\s*$/)
  return {
    text: (treffer ? roh.slice(0, treffer.index) : roh).trim(),
    anforderungen: (treffer?.[1] ?? '').split('·').map((a) => a.trim()).filter(Boolean),
  }
}

export interface Ausfuehrung { art: 'weltweit' | 'region' | 'hybrid' | 'ort' | 'unklar'; text: string }

const WELTWEIT = /worldwide|world-wide|anywhere|globally|weltweit|überall|every corner|any country|where you live|wherever you|arbeitsort frei|wo du willst/i
const BESCHRAENKT = /\b(only|nur|within|innerhalb|must be|based in)\b/i
const REGIONEN = /\b(EMEA|EU|EEA|Europe|Europa|LATAM|DACH|APAC|Americas|North America|Nordics|UK|USA|US|Germany|Deutschland|Austria|Switzerland)\b/g
const ZEITZONE = /\b(?:UTC|GMT|CET|CEST|EET|EST|PST|CST)\s*[+±-]?\s*[0-9]*/i

/** Wo man arbeiten darf – aus `remote` und dem Wortlaut der Remote-Regel (keine KI nötig). */
export function ausfuehrung(j: Job): Ausfuehrung | null {
  const ort = String(j.ort ?? '').trim()
  const mitOrt = (t: string) => (ort && !/remote/i.test(ort) ? `${t} · ${ort}` : t)
  switch (j.remote) {
    case 'nein': return { art: 'ort', text: mitOrt('vor Ort') }
    case 'hybrid': return { art: 'hybrid', text: mitOrt('hybrid') }
    case 'ja': {
      const z = String(j.remote_regel_wortlaut ?? '').trim()
      if (WELTWEIT.test(z) && !BESCHRAENKT.test(z)) return { art: 'weltweit', text: 'weltweit' }
      const gefunden = [...new Map((z.match(REGIONEN) ?? []).map((r) => [r.toLowerCase(), r])).values()]
      const zeit = z.match(ZEITZONE)?.[0].trim()
      const teile = zeit ? [...gefunden, zeit] : gefunden
      if (teile.length) return { art: 'region', text: `Region: ${teile.slice(0, 3).join(', ')}` }
      return { art: 'unklar', text: 'remote, Region unklar' }
    }
    case 'unklar': return { art: 'unklar', text: 'Ausführung unklar' }
    default: return null
  }
}
