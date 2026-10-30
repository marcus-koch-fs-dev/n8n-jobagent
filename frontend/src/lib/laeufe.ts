import type { Job } from '@/types/job'
import type { AnschreibenListe, Laeufe, LaufArt } from '@/types/lauf'
import { jsonLesen, speicherSchreiben } from './speicher'

export const laeufeLesen = () => jsonLesen<Laeufe>('laeufe', {})
export const laeufeSchreiben = (l: Laeufe) => speicherSchreiben('laeufe', JSON.stringify(l))

export interface Zahlen { fertig: number; gesamt: number }

/** Wann die Stelle für diese Art von Lauf fertig wurde (ISO-String) – sonst undefined. */
function fertigZeit(art: LaufArt, id: number, jobs: Job[], anschreiben: AnschreibenListe): string | null | undefined {
  const j = jobs.find((x) => x.id === id)
  return art === 'tc' ? j?.tc_am : art === 'bw' ? j?.bewertet_am : anschreiben[id]?.am
}

export function laufStand(laeufe: Laeufe, art: LaufArt, jobs: Job[], anschreiben: AnschreibenListe): Zahlen {
  const l = laeufe[art]
  if (!l) return { fertig: 0, gesamt: 0 }
  const fertig = l.ids.filter((id) => {
    const z = fertigZeit(art, id, jobs, anschreiben)
    return z && Date.parse(z) >= l.start
  }).length
  return { fertig, gesamt: l.ids.length }
}

/**
 * Wie laufStand, schätzt aber den Tiefen-Check aus den Daten, wenn der Lauf nicht von dieser Seite kam
 * (anderer Browser): fertig = Checks, die dicht hintereinander kamen (Abstand < 5 min), offen = ungeprüfte 👍-Stellen.
 */
export function laufZahlen(laeufe: Laeufe, art: LaufArt, jobs: Job[], anschreiben: AnschreibenListe, jetzt = Date.now()): Zahlen {
  const z = laufStand(laeufe, art, jobs, anschreiben)
  if (art !== 'tc' || z.gesamt) return z
  const zeiten = jobs.map((j) => Date.parse(j.tc_am ?? '') || 0).filter((t) => jetzt - t < 3 * 3600e3).sort((a, b) => b - a)
  let n = 0
  for (let i = 0, letzte = jetzt; i < zeiten.length && letzte - zeiten[i] < 5 * 60e3; i++) { n++; letzte = zeiten[i] }
  const offen = jobs.filter((j) => j.tendenz === 'interessant' && !j.tc_am).length
  return { fertig: n, gesamt: n + offen }
}

/** Neuer Lauf oder, wenn der alte noch läuft, ergänzt um die neuen Stellen. `ersetzen` geht an den Browser-Dienst. */
export function laufErgaenzen(laeufe: Laeufe, art: LaufArt, ids: number[], jobs: Job[], anschreiben: AnschreibenListe, jetzt = Date.now()) {
  const alt = laeufe[art]
  const laeuftNoch = alt && laufStand(laeufe, art, jobs, anschreiben).fertig < alt.ids.length ? alt : null
  return {
    laeufe: { ...laeufe, [art]: { ids: [...new Set([...(laeuftNoch?.ids ?? []), ...ids])], start: laeuftNoch ? laeuftNoch.start : jetzt - 5000 } },
    ersetzen: !laeuftNoch,
  }
}

/** Der Browser-Dienst kennt die laufenden Läufe (auch aus anderen Browsern) – er gilt. */
export const laeufeZusammenfuehren = (lokal: Laeufe, server?: Laeufe): Laeufe => ({ ...lokal, ...(server ?? {}) })