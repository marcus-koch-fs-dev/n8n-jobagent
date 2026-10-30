import { useLayoutEffect, useRef, useState } from 'react'
import { mono } from '@/components/Panel'
import { cn } from '@/lib/utils'

/** Großes Textfeld mit „Aufklappen“: aufgeklappt wächst es mit dem Text, ohne eigenen Scrollbalken. */
export function LangerText({ value, onChange, minHoehe = 200 }: { value: string; onChange: (v: string) => void; minHoehe?: number }) {
  const [auf, setAuf] = useState(false)
  const feld = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = feld.current
    if (!el) return
    el.style.height = ''
    if (auf) el.style.height = `${el.scrollHeight + 2}px`
  }, [auf, value])

  return (
    <div className="grid gap-1">
      <button onClick={() => setAuf(!auf)} className="cursor-pointer justify-self-end text-[13px] text-primary">
        {auf ? '▴ Zuklappen' : '▾ Ganzen Text aufklappen'}
      </button>
      <textarea
        ref={feld} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ minHeight: minHoehe }}
        className={cn(mono, 'rounded-md border border-border bg-background px-2.5 py-1.5', auf && 'resize-none overflow-hidden')}
      />
    </div>
  )
}
