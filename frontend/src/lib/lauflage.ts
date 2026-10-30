import type { Job } from '@/types/job'
import type { AnschreibenListe, Einstellungen, Laeufe, PauseStatus } from '@/types/lauf'
import { laufStand, laufZahlen, type Zahlen } from './laeufe'
import { modellKurz } from './modelle'

type KnopfName = 'Tiefen-Check' | 'Anschreiben'
const lauf = (n: KnopfName) => (n === 'Tiefen-Check' ? 'tc' : 'an') as 'tc' | 'an'

type Lage =
  | { art: 'problem'; anbieter: string; grund: string; fehlertext?: string }
  | { art: 'startet'; sek: number }
  | { art: 'aus' }
  | { art: 'haeltAn'; name: KnopfName; zuruecksetzen: boolean }
  | { art: 'fertig'; lauf: 'tc' | 'an'; name: KnopfName; zahlen: Zahlen; schluessel: string }
  | { art: 'auswertung'; rest: number; aktivVor: number | null; modell: string }
  | { art: 'knopfLauf'; lauf: 'tc' | 'an'; name: KnopfName; aktivVor: number | null; zahlen: Zahlen; modell: string }
  | { art: 'schritt'; nr: number; pausiert: boolean; aktiv: boolean; rest: string | null; erklaerung: string; schritte: string[]; neuBewertung: Zahlen | null; aktivVor: number | null }

export interface LageEingabe {
  status: PauseStatus
  startZeit: number
  einst?: Einstellungen
  jobs: Job[]
  laeufe: Laeufe
  anschreiben: AnschreibenListe
  jetzt: number
}

/** „Aktiv“ = der Browser-Dienst hat sich in den letzten 150 s gemeldet. */
export const istAktiv = (s: PauseStatus) => s.sekundenSeitLetzterAktivitaet !== null && s.sekundenSeitLetzterAktivitaet < 150
/** Start läuft noch: nach dem Klick hat sich die Pipeline noch nicht gemeldet (max. 3 min warten). */
export function startLaeuft(s: PauseStatus, startZeit: number, jetzt: number) {
  if (!startZeit || (jetzt - startZeit) / 1000 > 180) return false
  return !(s.letzteAbfrage && Date.parse(s.letzteAbfrage) > startZeit)
}

const zaehle = (jobs: Job[], f: (j: Job) => boolean) => jobs.filter(f).length
const offenBewerten = (j: Job) => ['aktiv', 'unklar'].includes(j.status) && (!j.bewertung || j.bewertung === 'fehler')

/** Entscheidet, was der blaue Lauf-Kasten zeigt. Reine Funktion – Seiteneffekte stehen in useLaufLage. */
export function lauflage({ status: s, startZeit, einst, jobs, laeufe, anschreiben, jetzt }: LageEingabe): Lage {
  const aktiv = istAktiv(s)
  const modelle = einst?.modelle ?? {}
  const schritt = s.letzterSchritt ?? ''

  // KI-Problem (Guthaben leer / Schlüssel ungültig): alles steht, bis es behoben ist
  if (s.pausiert && s.grund) return { art: 'problem', anbieter: s.anbieter || 'claude', grund: s.grund, fehlertext: s.fehlertext }

  if (startLaeuft(s, startZeit, jetzt)) return { art: 'startet', sek: Math.round((jetzt - startZeit) / 1000) }
  if (!aktiv && !s.pausiert) return { art: 'aus' }

  // Tiefen-Check / Anschreiben angehalten: Diese Läufe startet man per Knopf neu (kein „Fortsetzen“).
  const knopf = schritt.match(/Tiefen-Check|Anschreiben/)?.[0] as KnopfName | undefined
  if (s.pausiert && !s.grund && knopf) {
    const gesehen = Boolean(s.letzteAbfrage && s.gesetztAm && Date.parse(s.letzteAbfrage) > Date.parse(s.gesetztAm))
    return { art: 'haeltAn', name: knopf, zuruecksetzen: gesehen || !aktiv }
  }
  // Alle Stellen durch → sofort „fertig“ zeigen (nicht erst 2,5 min warten)
  if (knopf && !s.pausiert && aktiv) {
    const zahlen = laufZahlen(laeufe, lauf(knopf), jobs, anschreiben, jetzt)
    if (zahlen.gesamt && zahlen.fertig >= zahlen.gesamt) {
      return { art: 'fertig', lauf: lauf(knopf), name: knopf, zahlen, schluessel: `${lauf(knopf)}:${s.letzteAbfrage}` }
    }
  }
  if (/Auswertung/.test(schritt) && !s.pausiert) {
    return { art: 'auswertung', rest: zaehle(jobs, (j) => Boolean(j.bewertung) && j.bewertung !== 'fehler' && !j.hauptgrund), aktivVor: s.sekundenSeitLetzterAktivitaet, modell: modellKurz(modelle.fakten ?? modelle.einordnung) }
  }
  if (knopf && !s.pausiert) {
    return { art: 'knopfLauf', lauf: lauf(knopf), name: knopf, aktivVor: s.sekundenSeitLetzterAktivitaet, zahlen: laufZahlen(laeufe, lauf(knopf), jobs, anschreiben, jetzt), modell: modellKurz(knopf === 'Tiefen-Check' ? modelle.tiefencheck : modelle.anschreiben) }
  }

  const nr = Number(schritt.match(/Schritt (\d)/)?.[1]) || 1
  const SCHRITTE: [string, string, string | null][] = [
    ['1 Links holen', 'Liest die Missionfrei-Liste und trägt neue Links ein (keine KI).', null],
    ['2 Seiten laden', 'Der Browser öffnet jede neue Anzeige und speichert den Text (keine KI, ca. 4 s pro Seite).', zaehle(jobs, (j) => j.status === 'neu') + ' Seiten noch zu laden'],
    ['3 Fakten lesen', `KI ${modellKurz(modelle.fakten)} liest Titel, Firma, Datum, Remote-Regel aus dem Text.`, zaehle(jobs, (j) => j.status === 'abgerufen') + ' Stellen noch zu lesen'],
    ['4 Bewerten', `KI ${modellKurz(modelle.bewertung)} bewertet nach deinem Prompt, bei Score ≥ 3 prüft ${modellKurz(modelle.zweitmeinung)} nach.`, zaehle(jobs, offenBewerten) + ' Stellen noch zu bewerten'],
  ]
  // Neu bewerten (Knopf in den Einstellungen): eigener Fortschritt statt „0 Stellen noch zu bewerten“
  const bw = nr === 4 ? laufStand(laeufe, 'bw', jobs, anschreiben) : null
  const neuBewertung = bw && bw.gesamt && bw.fertig < bw.gesamt ? bw : null
  return {
    art: 'schritt', nr, pausiert: s.pausiert, aktiv, aktivVor: s.sekundenSeitLetzterAktivitaet,
    rest: neuBewertung ? 'Neu bewerten nach geändertem Such-Prompt' : SCHRITTE[nr - 1][2],
    erklaerung: SCHRITTE[nr - 1][1],
    schritte: SCHRITTE.map(([t]) => t),
    neuBewertung,
  }
}