export type Empfehlung = 'unbedingt_bewerben' | 'probier_es' | 'erwarte_nichts'

/** Inhalt von `tc_ergebnis` (JSON-String an der Stelle). Ältere Checks haben nur Teile davon. */
export interface TiefenCheck {
  fehler?: string
  empfehlung?: Empfehlung
  ampel?: string
  kurzfazit?: string
  fazit?: string
  aufgaben_vergleich?: { bezug_suchprompt?: string; urteil?: string; tendenz?: string }
  anforderungen?: { anforderung: string; status: 'erfuellt' | 'teilweise' | 'fehlt' | string; beleg?: string }[]
  klartext?: { begriff: string; bedeutet: string }[]
  remote_einschaetzung?: string
  firma?: string
  warnsignale?: string
  argumente?: string[]
  fragen?: string[]
  unterlagen?: { anschreiben?: string; lebenslauf?: boolean; video?: boolean; portfolio?: boolean; hinweis?: string }
}