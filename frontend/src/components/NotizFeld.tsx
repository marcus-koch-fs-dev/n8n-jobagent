import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { jobsAktion } from '@/api/n8n'
import { patchJob } from '@/lib/cache'

interface Props { id: number; notiz: string; sichtbar: boolean; onStatus: (text: string) => void }

/** Notiz mit automatischem Speichern (800 ms nach dem Tippen). Das Feld wächst mit dem Text. */
export function NotizFeld({ id, notiz, sichtbar, onStatus }: Props) {
  const qc = useQueryClient()
  const [text, setText] = useState(notiz)
  const feld = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const f = feld.current
    if (!f || !sichtbar) return
    f.style.height = 'auto'
    f.style.height = f.scrollHeight + 2 + 'px'
  }, [text, sichtbar])

  useEffect(() => { if (sichtbar && !notiz) feld.current?.focus() }, [sichtbar, notiz])
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!sichtbar) return null
  return (
    <textarea
      ref={feld}
      value={text}
      placeholder="Notiz (z. B. Kontakt, nächster Schritt, Gehaltswunsch …)"
      className="min-h-[38px] w-full resize-none overflow-hidden rounded-md border border-border bg-background px-2 py-1.5 text-[13.5px]"
      onChange={(e) => {
        const neu = e.target.value
        setText(neu)
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
          onStatus('speichert …')
          try {
            await jobsAktion(id, 'notiz', neu)
            patchJob(qc, id, { notiz: neu })
            onStatus('✓ gespeichert')
          } catch (err) {
            onStatus('⚠ ' + (err as Error).message)
          }
        }, 800)
      }}
    />
  )
}