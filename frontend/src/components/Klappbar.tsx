import type { ReactNode } from 'react'
import { useOffen } from '@/hooks/useOffen'

/** Aufklappbarer Bereich auf einer Karte; der Zustand bleibt je Stelle gemerkt. Unten ein zweiter „einklappen“-Knopf, damit man bei langem Inhalt nicht hochscrollen muss. */
export function Klappbar({ id, titel, children }: { id: number; titel: string; children: ReactNode }) {
  const [offen, setOffen] = useOffen(id, titel)
  return (
    <details open={offen} onToggle={(e) => setOffen(e.currentTarget.open)} className="text-[13.5px]">
      <summary className="cursor-pointer list-none text-primary [&::-webkit-details-marker]:hidden">
        {offen ? '▾ ' : '▸ '}{titel}
        {offen && <span className="ml-1 text-[12.5px] text-muted-foreground">(einklappen)</span>}
      </summary>
      {children}
      <div className="text-right">
        <button
          className="cursor-pointer rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground hover:bg-soft hover:text-primary"
          onClick={(e) => { const d = e.currentTarget.closest('details'); setOffen(false); d?.scrollIntoView({ block: 'nearest' }) }}
        >
          ▴ einklappen
        </button>
      </div>
    </details>
  )
}