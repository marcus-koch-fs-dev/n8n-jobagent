import fs from 'node:fs'
import { BEWERBEN_DIREKT } from '../config.js'
import { jsonLesen } from '../lib/util.js'

// Stellen, die du aus „3 · Prüfen“ ohne Tiefen-Check nach „4 · Bewerben“ geschickt hast.
// Eigene kleine Datei, weil die n8n-Tabelle keine neuen Spalten bekommt.

/** Alle gemerkten Stellen-IDs. Fehlt die Datei oder ist sie kaputt, ist die Liste leer. */
export function bewerbenDirektLesen(): number[] {
  const ids = jsonLesen<unknown>(BEWERBEN_DIREKT, [])
  return Array.isArray(ids) ? ids.filter((x): x is number => Number.isInteger(x) && x > 0) : []
}

/** Eine Stelle merken (an) oder wieder freigeben (aus). Gibt die neue Liste zurück, oder null bei ungültiger ID. */
export function bewerbenDirektSetzen(id: unknown, an: unknown): number[] | null {
  const nummer = Number(id)
  if (!Number.isInteger(nummer) || nummer <= 0) return null
  const rest = bewerbenDirektLesen().filter((x) => x !== nummer)
  const neu = an ? [...rest, nummer] : rest
  fs.writeFileSync(BEWERBEN_DIREKT, JSON.stringify(neu))
  return neu
}
