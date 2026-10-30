import { LangerText } from '@/components/LangerText'
import { Panel, Sub, Trenner } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { KopierKnopf } from '@/features/bewerben/KopierKnopf'
import { useProfil } from '@/hooks/useProfil'
import { SUCHPROMPT_CHAT_ANLEITUNG, SUCHPROMPT_VORLAGE } from '@/lib/vorlagen'
import { NeuBewerten } from './NeuBewerten'

export const kopieren = (text: string) => async () => { await navigator.clipboard.writeText(text); return true }

export function SuchPromptKarte() {
  const { entwurf, aendern, vorlageEinsetzen } = useProfil()
  return (
    <Panel titel="🎯 Dein Such-Prompt">
      <Sub>
        Ein Text mit allem: wer du bist, was du suchst, was ausgeschlossen ist. Die KI bewertet jede Stelle danach.
        Firmen unter der Überschrift <b>„## Bereits bearbeitet“</b> (durch Komma oder neue Zeile getrennt) bekommen automatisch „passt nicht“.
      </Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => vorlageEinsetzen('kriterien', SUCHPROMPT_VORLAGE)}>Standard wiederherstellen</Button>
        <KopierKnopf titel="Vorlage mit Anleitung für einen KI-Chat" kopieren={kopieren(SUCHPROMPT_CHAT_ANLEITUNG + SUCHPROMPT_VORLAGE)}>In Zwischenablage kopieren</KopierKnopf>
      </div>
      <LangerText value={entwurf?.kriterien ?? ''} onChange={(v) => aendern({ kriterien: v })} minHoehe={420} />
      <Trenner />
      <NeuBewerten />
    </Panel>
  )
}