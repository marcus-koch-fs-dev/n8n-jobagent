export type Tendenz = '' | 'interessant' | 'vielleicht' | 'nein' | 'beworben' | 'weg'

export type Bewertung = 'passt gut' | 'passt teilweise' | 'passt nicht' | 'fehler' | ''

export type JobStatus =
  | 'neu' | 'abgerufen' | 'aktiv' | 'unklar' | 'wartet_auf_freigabe'
  | 'tot' | 'abgelaufen' | 'zu_alt' | 'duplikat' | 'fehler'

/** Eine Stelle, wie `jobs-daten` sie liefert. Felder können fehlen oder null sein. */
export interface Job {
  id: number
  url?: string | null
  firma?: string | null
  jobtitel?: string | null
  ort?: string | null
  domain?: string | null
  linktext?: string | null
  status: JobStatus | string
  bewertung?: Bewertung | string | null
  bewertung_begruendung?: string | null
  passung_score?: number | null
  tendenz?: Tendenz | string | null
  tendenz_geaendert_am?: string | null
  notiz?: string | null
  bereich?: string | null
  hauptgrund?: string | null
  einordnung_kurz?: string | null
  beschreibung?: string | null
  remote?: string | null
  erstmals_gesehen?: string | null
  bewertet_am?: string | null
  kurze_zusammenfassung?: string | null
  tc_ampel?: string | null
  tc_am?: string | null
  tc_modell?: string | null
  /** JSON-String mit dem Tiefen-Check */
  tc_ergebnis?: string | null
  cache_id?: string | null
  gehalt?: string | null
  vertragsform?: string | null
  veroeffentlichungsdatum?: string | null
  alter_tage?: number | null
  pflichtkriterien_erfuellt?: string | null
  hinweis?: string | null
  nicht_mehr_gelistet?: boolean | string | null
  offene_fragen?: string | null
  luecken?: string | null
  warnsignale?: string | null
  bewerbungsweg?: string | null
  modell_bewertung?: string | null
  remote_regel_wortlaut?: string | null
  screenshot?: string | null
  freigabe?: string | null
  duplikat_von?: number | string | null
  /** Nur in der Anzeige: ohne Tiefen-Check nach „4 · Bewerben“ geschickt (kommt nicht aus jobs-daten) */
  direkt?: boolean
}

export interface JobsAntwort {
  jobs: Job[]
  erzeugt_am: string
}