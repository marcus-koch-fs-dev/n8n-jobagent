import fs from 'node:fs'
import { PAUSE_DATEI } from '../config.js'
import type { LaufArt, LaufEintrag, Pause } from '../types.js'
import { jsonLesen } from '../lib/util.js'

// Pause-Schalter für den Komplettlauf. Die Schleifen in n8n fragen nach jeder Stelle GET /pause ab; ist
// „pausiert“ gesetzt, hören sie sauber auf. Dazu die laufenden Knopf-Läufe (Tiefen-Check, Anschreiben, Bewertung).

let pause: Pause = jsonLesen<Pause>(PAUSE_DATEI, { pausiert: false, gesetztAm: null, letzteAbfrage: null, letzterSchritt: '' })
const laeufe: Partial<Record<LaufArt, LaufEintrag>> = {}

const speichern = (): void => fs.writeFileSync(PAUSE_DATEI, JSON.stringify(pause, null, 2))

/** Wird von den n8n-Schleifen bei jeder Stelle aufgerufen: merkt sich, wann zuletzt gearbeitet wurde. */
export function pauseAbfragen(schritt?: string): boolean {
  pause.letzteAbfrage = new Date().toISOString()
  if (schritt) pause.letzterSchritt = schritt.slice(0, 80)
  return pause.pausiert
}

/** Pause an oder aus. Beim Fortsetzen gelten Grund und Fehlertext als behoben. */
export function pauseSetzen(pausiert: boolean): Pause {
  pause.pausiert = pausiert
  pause.gesetztAm = new Date().toISOString()
  if (!pause.pausiert) { pause.grund = ''; pause.fehlertext = '' }
  speichern()
  return { ...pause }
}

/** Vom KI-Aufruf in n8n: Guthaben leer / API-Schlüssel ungültig → alles anhalten. */
export function kiProblemMelden(art: string, anbieter: string, fehler: string): void {
  pause.pausiert = true
  pause.grund = art
  pause.anbieter = anbieter.slice(0, 20)
  pause.fehlertext = fehler.slice(0, 400)
  pause.gesetztAm = new Date().toISOString()
  speichern()
}

/** Lebenszeichen eines Schritts ohne Pause-Punkt (z. B. „Schritt 1 · Links holen“). */
export function schrittMelden(schritt: string): void {
  pause.letzteAbfrage = new Date().toISOString()
  pause.letzterSchritt = schritt
  speichern()
}

/** Laufender Knopf-Lauf: welche Stellen, ab wann. Für den Fortschrittsbalken auf jeder geöffneten Seite. */
export function laufMelden(art: LaufArt, ids: number[], ersetzen: boolean): LaufEintrag {
  const neu = ids.map(Number).filter(Number.isInteger)
  const alt = laeufe[art]
  laeufe[art] = ersetzen || !alt
    ? { ids: neu, start: Date.now() - 5000 }
    : { ...alt, ids: [...new Set([...alt.ids, ...neu])] }
  return laeufe[art]!
}

export const laufLoeschen = (art: LaufArt): void => { delete laeufe[art] }

/** Pause-Stand plus Sekunden seit der letzten Abfrage und die laufenden Läufe (für /pause-status). */
export function pauseStatus() {
  const seit = pause.letzteAbfrage ? Math.round((Date.now() - Date.parse(pause.letzteAbfrage)) / 1000) : null
  return { ...pause, sekundenSeitLetzterAktivitaet: seit, laeufe }
}
