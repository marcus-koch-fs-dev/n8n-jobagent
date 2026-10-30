import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { laufLoeschen, laufMelden } from '@/api/dienst'
import { laeufeLesen, laeufeSchreiben, laeufeZusammenfuehren, laufErgaenzen } from '@/lib/laeufe'
import { createStore, useStore } from '@/lib/store'
import type { JobsAntwort } from '@/types/job'
import type { AnschreibenListe, Laeufe, LaufArt } from '@/types/lauf'

// Laufende Tiefen-Check-/Anschreiben-/Neu-bewerten-Läufe. Liegen in localStorage („laeufe“), damit ein Neuladen sie übersteht.
const stand = createStore<Laeufe>(laeufeLesen())
const setzen = (neu: Laeufe) => { laeufeSchreiben(neu); stand.set(neu) }

export const laeufeAktuell = stand.get

/** Läufe vom Browser-Dienst übernehmen (er kennt auch die aus anderen Browsern). */
export function laeufeVomDienst(server?: Laeufe) {
  if (!server || !Object.keys(server).length) return
  const neu = laeufeZusammenfuehren(stand.get(), server)
  if (JSON.stringify(neu) !== JSON.stringify(stand.get())) setzen(neu)
}

export function useLaeufe() {
  const laeufe = useStore(stand)
  const qc = useQueryClient()

  /** Merkt einen Lauf (oder ergänzt den laufenden) und meldet ihn dem Browser-Dienst. */
  const merken = useCallback((art: LaufArt, ids: number[]) => {
    const jobs = qc.getQueryData<JobsAntwort>(['jobs'])?.jobs ?? []
    const anschreiben = qc.getQueryData<AnschreibenListe>(['anschreiben']) ?? {}
    const { laeufe: neu, ersetzen } = laufErgaenzen(stand.get(), art, ids, jobs, anschreiben)
    setzen(neu)
    void laufMelden(art, ids, ersetzen)
  }, [qc])

  const vergessen = useCallback((art: LaufArt) => {
    const { [art]: _weg, ...rest } = stand.get()
    setzen(rest)
    void laufLoeschen(art)
  }, [])

  return { laeufe, merken, vergessen }
}
