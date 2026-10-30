import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { anschreibenStarten } from '@/api/n8n'
import { anLaeuft, mappenArt, mappenModell } from '@/lib/mappen'
import type { Job } from '@/types/job'
import type { Unterlagen } from '@/lib/unterlagen'
import type { useCountdown } from './useCountdown'
import { kiGesperrt } from './kiGesperrt'
import { zugriffSichern } from './useAblage'
import { useLaeufe } from './useLaeufe'
import { useAnschreiben } from './useLaufStatus'
import { useToast } from './useToast'

interface MappenStelle { job: Job; unterlagen: Unterlagen | null }

export function useMappen() {
  const qc = useQueryClient()
  const melden = useToast()
  const { data } = useAnschreiben()
  const { laeufe, merken } = useLaeufe()
  const anschreiben = data
  const laeuft = useMemo(() => anLaeuft(laeufe, anschreiben ?? {}), [laeufe, anschreiben])

  /** Mappen erstellen (kostet API-Guthaben → 5 s Countdown statt Rückfrage, zweiter Klick bricht ab). */
  const starten = useCallback(async (stellen: MappenStelle[], countdown: ReturnType<typeof useCountdown>) => {
    if (countdown.laeuft) return countdown.abbrechen()
    const neu = stellen.filter((s) => !laeuft.has(s.job.id))
    if (!neu.length) return
    await zugriffSichern() // noch im Klick, sonst darf Chrome nicht nach dem Ordnerzugriff fragen
    if (await kiGesperrt(melden)) return
    if (!(await countdown.bestaetigen())) return
    try {
      await anschreibenStarten(neu.map(({ job, unterlagen }) => {
        const art = mappenArt(unterlagen)
        return { id: job.id, art, modell: mappenModell(job, art), bereich: job.bereich }
      }))
    } catch (e) {
      melden(`Konnte nicht starten: ${(e as Error).message} – ist der Workflow „Anschreiben erstellen“ in n8n veröffentlicht?`, { fehler: true })
      return
    }
    merken('an', neu.map((s) => s.job.id))
    void qc.invalidateQueries({ queryKey: ['pause-status'] })
  }, [laeuft, melden, merken, qc])

  return { anschreiben: anschreiben ?? {}, laeuft, starten }
}