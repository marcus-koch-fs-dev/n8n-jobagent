import { sichererLink, STATUS_TEXT } from '@/lib/job'
import { useTendenz } from '@/hooks/useTendenz'
import type { Job } from '@/types/job'

/** Zeile in „🗑 tot / alt / doppelt“. Von dir als „nicht mehr verfügbar“ Markiertes lässt sich zurücknehmen. */
export function ZeileRaus({ job: j }: { job: Job }) {
  const { setzen } = useTendenz()
  const url = sichererLink(j.url)
  const weg = j.tendenz === 'weg'
  return (
    <div className="flex flex-wrap items-baseline gap-2.5 border-t border-border py-2 text-[14px] first:border-t-0 sm:flex-nowrap">
      <span className="basis-full rounded-full bg-soft px-2 py-0.5 text-[12.5px] sm:basis-[120px] sm:flex-none">
        {weg ? 'nicht mehr verfügbar' : STATUS_TEXT[j.status] || j.status}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">{j.jobtitel || j.linktext || j.url}</a> : j.url}
        {j.firma ? ' · ' + j.firma : ''}
      </span>
      <span className="min-w-0 flex-1 text-muted-foreground">
        {weg
          ? <a href="#" className="text-primary" onClick={(e) => { e.preventDefault(); void setzen(j, '') }}>rückgängig</a>
          : j.duplikat_von ? 'Duplikat von ' + j.duplikat_von : j.hinweis || ''}
      </span>
    </div>
  )
}