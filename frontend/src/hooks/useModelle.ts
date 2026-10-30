import { useQuery } from '@tanstack/react-query'
import { ladeModelle } from '@/api/n8n'
import { modelleVerarbeiten, modellStatusText, STAND_NOTFALL, type ModellStand } from '@/lib/modellwahl'

/** Verfügbare Modelle je Anbieter – live aus n8n (Workflow H, mit den Schlüsseln dort). Ohne Antwort: eingebaute Liste. */
export function useModelle() {
  const q = useQuery({
    queryKey: ['modelle'],
    queryFn: async () => { const d = await ladeModelle(); return { stand: modelleVerarbeiten(d), abgefragt: d.abgefragt_am } },
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const stand: ModellStand = q.data?.stand ?? STAND_NOTFALL
  const text = q.isFetching ? 'Frage verfügbare Modelle ab …' : q.isError ? modellStatusText(STAND_NOTFALL) : q.data ? modellStatusText(stand, q.data.abgefragt) : ''
  return { stand, text, neuAbfragen: () => void q.refetch() }
}