import { cn } from '@/lib/utils'
import type { Liste } from '@/lib/listen'
import type { Job } from '@/types/job'

const GRUPPEN_TITEL = { system: '🤖 KI hat vorsortiert (noch offen):', ich: '🙋 Meine Auswahl:' } as const

function Zeile({ titel, listen, gewaehlt, jobs, onWahl }: { titel?: string; listen: Liste[]; gewaehlt: string; jobs: Job[]; onWahl: (key: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pb-0.5">
      {titel && <span className="mr-1 text-[13.5px] text-muted-foreground">{titel}</span>}
      {listen.map((l) => (
        <button
          key={l.key}
          onClick={() => onWahl(l.key)}
          className={cn(
            'cursor-pointer rounded-full border border-border bg-card px-2.5 py-1 text-[13.5px]',
            l.key === gewaehlt && 'border-primary bg-primary text-primary-foreground',
          )}
        >
          {l.label} · {jobs.filter(l.filter).length}
        </button>
      ))}
    </div>
  )
}

/** Listen-Knöpfe: in Sichten zwei Zeilen (System / Meine Auswahl), sonst eine. */
export function ListenChips({ listen, gewaehlt, jobs, onWahl, gruppiert }: { listen: Liste[]; gewaehlt: string; jobs: Job[]; onWahl: (key: string) => void; gruppiert: boolean }) {
  if (!gruppiert) return <Zeile listen={listen} gewaehlt={gewaehlt} jobs={jobs} onWahl={onWahl} />
  return (
    <>
      <Zeile titel={GRUPPEN_TITEL.system} listen={listen.filter((l) => l.gruppe === 'system')} gewaehlt={gewaehlt} jobs={jobs} onWahl={onWahl} />
      <Zeile titel={GRUPPEN_TITEL.ich} listen={listen.filter((l) => l.gruppe === 'ich')} gewaehlt={gewaehlt} jobs={jobs} onWahl={onWahl} />
    </>
  )
}