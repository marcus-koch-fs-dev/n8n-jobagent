import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tiefencheckStarten } from '@/api/n8n'
import { tcLaeuft } from '@/lib/tiefencheck'
import type { Job } from '@/types/job'
import type { useCountdown } from './useCountdown'
import { kiGesperrt } from './kiGesperrt'
import { useJobs } from './useJobs'
import { useLaeufe } from './useLaeufe'
import { useToast } from './useToast'

export function useTiefencheck() {
  const qc = useQueryClient()
  const melden = useToast()
  const { data } = useJobs()
  const { laeufe, merken } = useLaeufe()
  const jobs = data?.jobs
  const laeuft = useMemo(() => tcLaeuft(laeufe, jobs ?? []), [laeufe, jobs])

  /**
   * Tiefen-Check für diese Stellen. Statt einer Rückfrage: 5 s Countdown auf dem Knopf gegen Fehlklicks
   * (hier wird Geld ausgegeben), ein zweiter Klick bricht ab.
   */
  const starten = useCallback(async (stellen: Job[], countdown: ReturnType<typeof useCountdown>) => {
    if (countdown.laeuft) return countdown.abbrechen()
    const dran = stellen.filter((j) => !laeuft.has(j.id))
    const ids = dran.map((j) => j.id)
    if (!ids.length) return
    if (await kiGesperrt(melden)) return
    if (!(await countdown.bestaetigen())) return
    try {
      await tiefencheckStarten(dran)
    } catch (e) {
      melden(`Konnte nicht starten: ${(e as Error).message} – ist der Workflow „Tiefen-Check“ in n8n veröffentlicht?`, { fehler: true })
      return
    }
    merken('tc', ids)
    void qc.invalidateQueries({ queryKey: ['pause-status'] })
  }, [laeuft, melden, merken, qc])

  return { laeuft, starten }
}