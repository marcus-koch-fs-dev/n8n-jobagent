import { useEffect, useRef, useState } from 'react'
import { jobName } from '@/lib/job'
import { tcFertig } from '@/lib/listen'
import type { Job } from '@/types/job'

/**
 * 👍-Stellen ziehen nach dem Check von „3 · Prüfen“ nach „4 · Bewerben“ – kurz sagen, wohin.
 * Gibt den Hinweistext zurück, sobald ein Ergebnis neu hereinkam.
 */
export function useTcUmzug(jobs: Job[]): [string | null, () => void] {
  const vorher = useRef<Map<number, { am?: string | null; fertig: boolean }>>(new Map())
  const [hinweis, setHinweis] = useState<string | null>(null)

  useEffect(() => {
    const alt = vorher.current
    const umgezogen: string[] = []
    for (const j of jobs) {
      const v = alt.get(j.id)
      if (alt.size && v && j.tc_am && j.tc_am !== v.am && !v.fertig && tcFertig(j) && j.tendenz === 'interessant') umgezogen.push(jobName(j))
    }
    vorher.current = new Map(jobs.map((j) => [j.id, { am: j.tc_am, fertig: tcFertig(j) }]))
    if (umgezogen.length) setHinweis(`✓ Tiefen-Check fertig: ${umgezogen.join(', ')} → jetzt in „4 · Bewerben“ (📝 bereit).`)
  }, [jobs])

  return [hinweis, () => setHinweis(null)]
}