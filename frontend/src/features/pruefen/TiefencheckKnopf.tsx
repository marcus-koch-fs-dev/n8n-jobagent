import { useCountdown } from '@/hooks/useCountdown'
import { useEinstellungen } from '@/hooks/useLaufStatus'
import { useTiefencheck } from '@/hooks/useTiefencheck'
import { kostenText, muenzen } from '@/lib/kosten'
import type { Job } from '@/types/job'

/** „Tiefen-Check“ auf der Karte (kostet API-Guthaben, deshalb 5 s Countdown statt Rückfrage). */
export function TiefencheckKnopf({ job }: { job: Job }) {
  const { data: einst } = useEinstellungen()
  const { laeuft, starten } = useTiefencheck()
  const countdown = useCountdown()
  const l = laeuft.has(job.id)
  const text = countdown.text(l ? 'läuft …' : (job.tc_ampel ? 'Tiefen-Check wiederholen' : 'Tiefen-Check') + muenzen(einst, 'tiefencheck'))
  return (
    <button
      disabled={l}
      title={`KI vergleicht Anzeige und Lebenslauf gründlich – kostet API-Guthaben (ca. ${kostenText(einst, 1)})`}
      onClick={() => starten([job], countdown)}
      className="cursor-pointer whitespace-nowrap rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground hover:bg-soft hover:text-primary disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {text}
    </button>
  )
}