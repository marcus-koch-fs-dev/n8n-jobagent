export type LaufArt = 'tc' | 'an' | 'bw'
/** Ein Lauf über mehrere Stellen: welche Stellen, ab wann (ms). Fertig = Ergebnis jünger als der Start. */
export interface Lauf { ids: number[]; start: number }
export type Laeufe = Partial<Record<LaufArt, Lauf>>

/** Antwort von GET /pause-status (Browser-Dienst). */
export interface PauseStatus {
  pausiert: boolean
  gesetztAm?: string | null
  letzteAbfrage?: string | null
  letzterSchritt?: string
  grund?: string
  fehlertext?: string
  anbieter?: string
  sekundenSeitLetzterAktivitaet: number | null
  laeufe?: Laeufe
}

export interface ModellWahl { anbieter?: string; modell?: string }
/** Antwort von GET /einstellungen (nur das, was die Oberfläche hier braucht). */
export interface Einstellungen { modelle?: Record<string, ModellWahl> }

/** Eine Bewerbungsmappe (Anschreiben, Kurznachricht, Lebenslauf-Kopie) aus GET /anschreiben/liste. */
export interface Mappe {
  pfad?: string
  ordner?: string
  extra?: string[]
  art?: 'voll' | 'kurz' | 'keins' | string
  sprache?: string
  kurznachricht?: string
  betreff?: string
  text?: string
  am?: string
  fehler?: string
}

/** Stellen-ID → Mappe. */
export type AnschreibenListe = Record<string, Mappe>