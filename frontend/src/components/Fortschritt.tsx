import type { Zahlen } from '@/lib/laeufe'

/** Zeile „12 von 29 fertig“ mit Balken. */
export function Fortschritt({ zahlen }: { zahlen: Zahlen }) {
  if (!zahlen.gesamt) return null
  const prozent = Math.round((zahlen.fertig / zahlen.gesamt) * 100)
  return (
    <div className="my-1 flex items-center gap-2.5">
      <div className="h-2 max-w-[360px] flex-1 overflow-hidden rounded-full bg-card">
        <span className="block h-full rounded-full bg-info transition-[width] duration-500" style={{ width: `${prozent}%` }} />
      </div>
      <span className="text-[13.5px] text-muted-foreground">{zahlen.fertig} von {zahlen.gesamt} fertig</span>
    </div>
  )
}