import type { ModellWahl } from './lauf'

export interface DateiInfo {
  datei: string
  /** Zeichen erkannten Textes (Beispiel, Lebenslauf) */
  zeichen?: number
  /** Platzhalter in einer Word-Vorlage */
  platzhalter?: string[]
}

/** Zusätzlicher Lebenslauf für einen Bereich (deutsch, optional englisch). */
export interface LebenslaufZeile {
  id: string
  bereich: string
  de?: DateiInfo
  en?: DateiInfo
}

/** Antwort von GET /profil (nur die Felder, die die Oberfläche braucht). */
export interface Profil {
  kriterien?: string
  bereits_bearbeitet?: string
  /** wann der Such-Prompt zuletzt geändert wurde – danach bewertete Stellen müssen nicht neu bewertet werden */
  kriterien_am?: string
  lebenslauf_datei?: string
  lebenslauf_text?: string
  beispiel_text?: string
  anschreiben_prompt?: string
  /** dein gemerkter eigener Standard für den Schreibstil (leer = keiner) */
  anschreiben_prompt_standard?: string
  /** eigene Prüf-Anweisungen für den Tiefen-Check (leer = Standard aus prompts/tiefencheck.md) */
  tiefencheck_prompt?: string
  modelle?: Record<string, ModellWahl>
  anschreiben_dateien?: Record<string, DateiInfo>
  lebenslaeufe?: LebenslaufZeile[]
}