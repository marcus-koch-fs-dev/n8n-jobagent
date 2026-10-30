import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ladeJobs } from '@/api/n8n'
import { direktMarkieren, duplikateZusammenfuehren } from '@/lib/duplikate'
import { queryClient } from '@/lib/queryClient'
import { istAktiv } from '@/lib/lauflage'
import type { JobsAntwort } from '@/types/job'
import type { PauseStatus } from '@/types/lauf'
import { mockAktiv, mockAnwenden } from '@/lib/mock'
import { tcLaeuft } from '@/lib/tiefencheck'
import { useBewerbenDirekt } from './useBewerbenDirekt'
import { laeufeAktuell } from './useLaeufe'

// Vorschau mit Beispieldaten nur in der Entwicklung (?mock); in der gebauten Seite nicht enthalten.
const mitMock = import.meta.env.DEV && mockAktiv() ? mockAnwenden : undefined

/** Eine Quelle für alle Stellen. Zähler im Kopf aktualisieren sich höchstens alle 25 s, bei laufendem Tiefen-Check alle 10 s. */
export function useJobs() {
  const { data: direkt } = useBewerbenDirekt()
  // Nur die Anzeige: erkannte Duplikate zusammenführen, „ohne Tiefen-Check nach 4“ markieren
  const select = useCallback(
    (d: JobsAntwort) => direktMarkieren(duplikateZusammenfuehren(mitMock ? mitMock(d) : d), direkt),
    [direkt],
  )
  return useQuery({
    queryKey: ['jobs'],
    queryFn: ladeJobs,
    select,
    staleTime: 10_000, // Tab-Wechsel und neue Beobachter laden nicht jedes Mal die ganze Liste neu
    // Schneller, solange ein Tiefen-Check oder ein Lauf der Pipeline aktiv ist – sonst stehen die Zähler in „1 · Sammeln“ still.
    refetchInterval: (q) => {
      const status = queryClient.getQueryData<PauseStatus>(['pause-status'])
      const lauf = Boolean(status && istAktiv(status))
      return lauf || tcLaeuft(laeufeAktuell(), q.state.data?.jobs ?? []).size ? 10_000 : 25_000
    },
  })
}