import type { QueryClient } from '@tanstack/react-query'
import type { Job, JobsAntwort } from '@/types/job'

/** Ändert eine Stelle im Query-Cache (optimistisches Update). */
export function patchJob(qc: QueryClient, id: number, teil: Partial<Job>) {
  qc.setQueryData<JobsAntwort>(['jobs'], (alt) =>
    alt ? { ...alt, jobs: alt.jobs.map((j) => (j.id === id ? { ...j, ...teil } : j)) } : alt,
  )
}

export const jobAusCache = (qc: QueryClient, id: number) =>
  qc.getQueryData<JobsAntwort>(['jobs'])?.jobs.find((j) => j.id === id)