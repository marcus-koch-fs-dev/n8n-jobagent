import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { HAUPT_TABS, tabAnzahl, wartetAufKi, type Haupt } from '@/lib/listen'
import { statistikText } from '@/lib/kopf'
import { useJobs } from '@/hooks/useJobs'
import { useTheme } from '@/hooks/useTheme'
import { useTendenz } from '@/hooks/useTendenz'
import { useTracker, useTrackerWaechter } from '@/hooks/useTracker'
import { useVolleBreite } from '@/lib/layout'
import { LaufBox } from './LaufBox'

export function Kopf({ haupt, onTab }: { haupt: Haupt; onTab: (h: Haupt) => void }) {
  const { data, error, isFetching, refetch } = useJobs()
  const { rueckgaengig, undoText } = useTendenz()
  const { theme, weiter } = useTheme()
  const volleBreite = useVolleBreite()
  const tracker = useTracker()
  useTrackerWaechter() // wartende Excel-Einträge von selbst nachtragen
  const jobs = data?.jobs ?? []
  const stand = data ? new Date(data.erzeugt_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''
  const meta = error ? 'keine Verbindung zu n8n' : !data ? 'lädt …' : statistikText(jobs, stand)

  return (
    <header className="sticky top-0 z-5 border-b border-border bg-background">
      <div className={cn('mx-auto px-4', volleBreite ? 'max-w-none' : 'max-w-[1100px]')}>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 pb-2.5">
          <div>
            <h1 className="m-0 text-[1.35rem] font-semibold tracking-tight">Meine Stellen</h1>
            <div className="text-[13.5px] text-muted-foreground">{meta}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tracker.wartend > 0 && (
              <Button variant="ghost" onClick={() => void tracker.jetztNachtragen()} title="Diese Bewerbungen konnten noch nicht in die Excel-Liste geschrieben werden (z. B. weil sie offen ist). Klick = jetzt versuchen.">
                ✉️ {tracker.wartend} warten auf Excel
              </Button>
            )}
            <Button variant="ghost" disabled={!undoText} onClick={() => void rueckgaengig()} title={undoText ?? 'Nichts rückgängig zu machen'}>↶ Rückgängig</Button>
            <Button variant="ghost" onClick={weiter} title="Darstellung wechseln: System → Hell → Dunkel">{theme === 'auto' ? '🖥 System' : theme === 'hell' ? '☀️ Hell' : '🌙 Dunkel'}</Button>
            <Button variant="ghost" onClick={() => refetch()} disabled={isFetching} title="Daten neu laden">↻ Aktualisieren</Button>
          </div>
        </div>
        <LaufBox />
        <nav className="mt-1 flex gap-0.5 overflow-x-auto border-b border-border" aria-label="Bereiche">
          {HAUPT_TABS.map((t) => {
            // 1 · Sammeln: nur wenn Stellen auf die KI warten (z. B. nach „Text einfügen“), sonst keine Zahl
            const warten = t.key === 'sammeln' ? jobs.filter(wartetAufKi).length : 0
            const zahl = ['sichten', 'pruefen', 'bewerben', 'beworben'].includes(t.key) ? tabAnzahl(t.key, jobs) : warten || null
            return (
              <button
                key={t.key}
                onClick={() => onTab(t.key)}
                aria-current={haupt === t.key ? 'page' : undefined}
                className={cn(
                  'cursor-pointer whitespace-nowrap border-b-[3px] border-transparent px-3.5 py-2.5 text-[15px] text-muted-foreground',
                  t.key === 'auswertung' && 'ml-auto',
                  haupt === t.key && 'border-primary font-semibold text-foreground',
                )}
              >
                {t.label}
                {zahl !== null && data ? <Badge className="ml-1.5" title={warten ? `${warten} Stellen warten auf die KI-Auswertung` : undefined}>{zahl}</Badge> : null}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}