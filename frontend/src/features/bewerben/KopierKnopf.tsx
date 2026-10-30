import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Knopf, der etwas in die Zwischenablage legt und kurz „✓ kopiert“ zeigt. `kopieren` liefert true bei Erfolg. */
export function KopierKnopf({ kopieren, children, fertig = '✓ kopiert', titel, mini = false }: {
  kopieren: () => Promise<boolean>
  children: ReactNode
  fertig?: string
  titel?: string
  mini?: boolean
}) {
  const [ok, setOk] = useState(false)
  const klick = async () => {
    if (!(await kopieren())) return
    setOk(true)
    setTimeout(() => setOk(false), 2500)
  }
  if (mini) {
    return <button title={titel} onClick={klick} className="cursor-pointer rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground hover:bg-soft hover:text-primary">{ok ? fertig : children}</button>
  }
  return <Button variant="ghost" size="sm" title={titel} className={cn('h-7 text-[13px]')} onClick={klick}>{ok ? fertig : children}</Button>
}