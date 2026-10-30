import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cacheManuell } from '@/api/dienst'
import { jobsAktion } from '@/api/n8n'
import { patchJob } from '@/lib/cache'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import type { Job } from '@/types/job'

/** Für gesperrte Seiten: Anzeigentext von Hand einfügen, die KI wertet ihn danach aus. */
export function TextEinfuegen({ job }: { job: Job }) {
  const qc = useQueryClient()
  const melden = useToast()
  const [offen, setOffen] = useState(false)
  const [text, setText] = useState('')
  const [info, setInfo] = useState('')

  const uebernehmen = async () => {
    setInfo('speichert …')
    try {
      const { cacheId, textHash } = await cacheManuell(job.url ?? '', text)
      await jobsAktion(job.id, 'manuell', cacheId, { text_hash: textHash })
      patchJob(qc, job.id, { status: 'abgerufen', cache_id: cacheId, hinweis: 'Text manuell eingefügt – KI-Auswertung folgt' })
      // Die Karte verlässt jetzt „gesperrt“: Sie geht zurück in die Pipeline und kommt nach der Auswertung neu in 2 · Sichten.
      melden('✓ Text gespeichert – die Stelle wartet jetzt in 1 · Sammeln auf die KI-Auswertung und kommt danach neu in 2 · Sichten.', {
        aktion: { label: 'Zu 1 · Sammeln', onClick: () => { location.hash = 'sammeln' } },
      })
    } catch (e) {
      setInfo('⚠ ' + (e as Error).message)
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOffen(!offen)}>Text einfügen</Button>
      {offen && (
        <div className="grid basis-full gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Anzeige im Browser öffnen → Strg+A → Strg+C → hier Strg+V"
            className="min-h-[110px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-[13.5px]"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={uebernehmen}>Text übernehmen</Button>
            <span className="text-[12.5px] text-good">{info}</span>
          </div>
        </div>
      )}
    </>
  )
}