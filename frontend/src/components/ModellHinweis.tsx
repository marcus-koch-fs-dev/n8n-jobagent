import { useEinstellungen } from '@/hooks/useLaufStatus'
import { modellFuer } from '@/lib/modelle'

/** Kleiner Hinweis: „KI: Sonnet · ändern“. */
export function ModellHinweis({ funktionen }: { funktionen: string[] }) {
  const { data } = useEinstellungen()
  const namen = [...new Set(funktionen.map((k) => modellFuer(data, k)).filter(Boolean))]
  if (!namen.length) return null
  return (
    <span className="whitespace-nowrap text-[13.5px] text-muted-foreground">
      KI: {namen.join(' / ')} · <a href="#einstellungen" className="text-primary">ändern</a>
    </span>
  )
}