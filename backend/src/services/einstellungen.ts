import fs from 'node:fs'
import { EINST_DATEI } from '../config.js'
import { jsonLesen, log } from '../lib/util.js'

// Schalter: wo rechnet die KI? (lokal = Ollama/GPU, claude = Anthropic-API)

export interface Einstellungen {
  ki_ort: 'lokal' | 'claude' | string
}

let einstellungen: Einstellungen = { ki_ort: 'claude', ...jsonLesen<Partial<Einstellungen>>(EINST_DATEI, {}) }

export const einstellungenLesen = (): Einstellungen => ({ ...einstellungen })

/** Speichert den KI-Ort. Gibt null zurück, wenn der Wert ungültig ist. */
export function kiOrtSetzen(ort: unknown): Einstellungen | null {
  if (!['lokal', 'claude'].includes(String(ort))) return null
  einstellungen.ki_ort = String(ort)
  fs.writeFileSync(EINST_DATEI, JSON.stringify(einstellungen, null, 2))
  log(`KI-Ort: ${ort}`)
  return { ...einstellungen }
}
