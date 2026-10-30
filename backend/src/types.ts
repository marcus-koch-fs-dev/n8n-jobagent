// Gemeinsame Typen. Antworten an n8n und die Seite bleiben wie bisher (Feldnamen unverändert).

export type LaufArt = 'tc' | 'an' | 'bw'

export interface LaufEintrag {
  ids: number[]
  start: number
}

export interface Pause {
  pausiert: boolean
  gesetztAm: string | null
  letzteAbfrage: string | null
  letzterSchritt: string
  grund?: string
  anbieter?: string
  fehlertext?: string
}

/** Eine Datei, die im Profil hinterlegt ist (Vorlage, Beispiel, Lebenslauf). */
export interface DateiInfo {
  datei: string
  zeichen?: number
  platzhalter?: string[]
}

/** Lebenslauf für einen Bereich (deutsch, optional englisch). */
export interface LebenslaufZeile {
  id: string
  bereich: string
  de?: DateiInfo
  en?: DateiInfo
}

/** Inhalt von profil/profil.json (die Felder, die die Seite und n8n brauchen). */
export interface ProfilDatei {
  bereits_bearbeitet?: string
  signal_plus?: string
  signal_minus?: string
  modelle?: Record<string, { anbieter: string; modell: string }>
  anschreiben_dateien?: Record<string, DateiInfo>
  anschreiben_weg?: 'api' | 'chat' | 'beide'
  lebenslaeufe?: LebenslaufZeile[]
}

/** Eintrag im Mappen-Index (anschreiben.json), je Stelle. */
export interface MappenEintrag {
  pfad?: string
  extra?: string[]
  ordner?: string
  datei?: string
  art?: string
  sprache?: string
  vorlage?: string
  betreff?: string
  text?: string
  kurznachricht?: string
  modell?: string
  am?: string
  fehler?: string
}
