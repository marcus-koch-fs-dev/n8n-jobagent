import type { ReactNode } from 'react'

export const feld = 'rounded-md border border-border bg-background px-2.5 py-1.5 text-[14px]'
export const auswahl = 'rounded-md border border-border bg-card px-2 py-1.5 text-[14px]'
export const mono = 'w-full resize-y font-mono text-[13.5px]'

export const Sub = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`m-0 text-[14px] text-muted-foreground ${className}`}>{children}</p>
)

/** Waagerechte Linie zwischen zwei Abschnitten einer Karte. */
export const Trenner = () => <hr className="my-1.5 border-0 border-t border-border" />

/** Karte mit Überschrift in den Einstellungen und auf „1 · Sammeln“. */
export function Panel({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="mb-3 grid gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
      <h2 className="m-0 text-[1.05rem] font-semibold">{titel}</h2>
      {children}
    </section>
  )
}
