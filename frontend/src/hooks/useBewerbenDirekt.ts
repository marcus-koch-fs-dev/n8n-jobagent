import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bewerbenDirektSetzen, ladeBewerbenDirekt } from '@/api/dienst'

/** Stellen, die du ohne Tiefen-Check nach „4 · Bewerben“ geschickt hast. */
export const useBewerbenDirekt = () => useQuery({ queryKey: ['bewerben-direkt'], queryFn: ladeBewerbenDirekt, staleTime: 60_000 })

/** Stelle nach „4 · Bewerben“ schicken (an) oder zurücknehmen (aus); die Anzeige springt sofort um. */
export function useBewerbenDirektSetzen() {
  const qc = useQueryClient()
  return async (id: number, an: boolean) => {
    qc.setQueryData(['bewerben-direkt'], await bewerbenDirektSetzen(id, an))
  }
}
