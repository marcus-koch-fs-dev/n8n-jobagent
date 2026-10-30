import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ladeUnterlagen } from '@/api/dienst'
import type { Job } from '@/types/job'

/** Kostenlose Textsuche nach gefragten Unterlagen – für Stellen, die du markiert hast. */
export function useUnterlagen(jobs: Job[], aktiv: boolean) {
  const stellen = jobs
    .filter((j) => j.cache_id && ['interessant', 'vielleicht', 'beworben'].includes(String(j.tendenz)))
    .map((j) => ({ id: j.id, cache_id: j.cache_id! }))
  const key = stellen.map((s) => s.id).join(',')
  return useQuery({
    queryKey: ['unterlagen', key],
    queryFn: () => ladeUnterlagen(stellen),
    enabled: aktiv && stellen.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  }).data
}