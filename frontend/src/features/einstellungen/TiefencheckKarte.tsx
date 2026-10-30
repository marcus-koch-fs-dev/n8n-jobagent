import { useQuery } from '@tanstack/react-query'
import { LangerText } from '@/components/LangerText'
import { Panel, Sub } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { ladePrompt } from '@/api/dienst'
import { useProfil } from '@/hooks/useProfil'
import { systemTeil } from '@/lib/tiefencheck'

/** Prüf-Anweisungen des Tiefen-Checks. Leer gespeichert = mitgelieferter Standard (prompts/tiefencheck.md). */
export function TiefencheckKarte() {
  const { entwurf, aendern, vorlageEinsetzen } = useProfil()
  const standard = useQuery({ queryKey: ['prompt', 'tiefencheck.md'], queryFn: async () => systemTeil(await ladePrompt('tiefencheck.md')) })
  const eigen = entwurf?.tiefencheck_prompt ?? ''
  const std = standard.data ?? ''
  // Unveränderter Standard wird nicht als eigener Text gespeichert – so wirken spätere Verbesserungen am Standard weiter
  const setzen = (v: string) => aendern({ tiefencheck_prompt: v.trim() === std ? '' : v })

  return (
    <Panel titel="🔍 Tiefen-Check">
      <Sub>
        <b>Wonach</b> du suchst, steht im 🎯 Such-Prompt – den bekommt der Tiefen-Check automatisch mit, dazu deinen Lebenslauf und die Anzeige.
        Hier steht, <b>wie</b> die KI prüft: wie streng, worauf sie bei Remote achtet, was ein Warnsignal ist, welche Fragen sie vorschlägt.
        Die Abschnitte auf der Karte (Kurzfazit, Empfehlung, Anforderungen …) bleiben immer dieselben.
      </Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" disabled={!eigen} title="Zurück zu den mitgelieferten Anweisungen – gilt nach dem Speichern (Leiste unten)"
          onClick={() => vorlageEinsetzen('tiefencheck_prompt', '')}>
          Standard wiederherstellen
        </Button>
        <span className="text-[13.5px] text-muted-foreground">
          {standard.isError ? '⚠ Standard konnte nicht geladen werden' : eigen ? '✏️ eigene Anweisungen' : '✓ mitgelieferter Standard'}
        </span>
      </div>
      <LangerText value={eigen || std} onChange={setzen} minHoehe={420} />
    </Panel>
  )
}
