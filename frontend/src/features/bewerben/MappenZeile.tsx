import { Button } from '@/components/ui/button'
import { useAblage } from '@/hooks/useAblage'
import { useCountdown } from '@/hooks/useCountdown'
import { useEinstellungen } from '@/hooks/useLaufStatus'
import { useMappen } from '@/hooks/useMappen'
import { bereitFuerMappe, tcFertig } from '@/lib/listen'
import { hatMappe, mappenArt, mappenKosten, mappenModell, MAPPEN_ART_TEXT } from '@/lib/mappen'
import { muenzenModell } from '@/lib/modelle'
import type { Unterlagen } from '@/lib/unterlagen'
import type { Job } from '@/types/job'

const knopf = 'h-7 px-2 text-[14px]'

/** Pro Karte in 4 · Bewerben: zwei Icons, die Erklärung steht beim Darüberfahren – 📁 nur Ordner anlegen (kostenlos), 📄 Dokumente generieren (API). */
export function MappenZeile({ job, unterlagen }: { job: Job; unterlagen: Unterlagen | null }) {
  const { data: einst } = useEinstellungen()
  const { anschreiben, laeuft, starten } = useMappen()
  const countdown = useCountdown()
  const ablage = useAblage()

  if (!['interessant', 'beworben'].includes(String(job.tendenz))) return null
  if (!bereitFuerMappe(job)) {
    return <span className="text-[12.5px] text-muted-foreground">Für Dokumente erst den Tiefen-Check (3 · Prüfen)</span>
  }

  const art = mappenArt(unterlagen)
  const modell = mappenModell(job, art) || einst?.modelle?.anschreiben?.modell || 'claude-opus-5-5'
  const aktion = hatMappe(anschreiben, job.id) ? 'Dokumente neu generieren' : 'Dokumente generieren'
  // Läuft gerade etwas (Countdown oder Erstellung), steht dort der Text, sonst nur das Icon
  const aktiv = countdown.laeuft || laeuft.has(job.id)
  const text = countdown.text(laeuft.has(job.id) ? 'schreibt …' : aktion)

  return (
    <div role="group" aria-label="Mappe" className="flex items-center gap-1">
      {!tcFertig(job) && <span className="mr-1 text-[12.5px] text-muted-foreground" title="Ohne Tiefen-Check: die KI schreibt nur nach der Anzeige und deinem Lebenslauf">ohne Tiefen-Check</span>}
      <Button variant="ghost" size="sm" className={knopf} aria-label="Nur Ordner anlegen"
        title="Nur Ordner anlegen – legt den Ordner „Firma - Stadt“ mit einem Anschreiben-Entwurf zum Selbstschreiben an (Name, Firma, Datum, Betreff, Gruß), ohne KI, kostenlos"
        onClick={() => void ablage.ordnerAnlegen(job)}>
        📁
      </Button>
      <Button variant={countdown.laeuft ? 'destructive' : 'ghost'} size="sm" className={knopf} aria-label={aktion} disabled={laeuft.has(job.id)}
        title={`${aktion}${muenzenModell(modell)} – Ordner mit ${MAPPEN_ART_TEXT[art]}, Kurznachricht und Lebenslauf, ca. ${mappenKosten(einst, [{ job, art }])}`}
        onClick={() => starten([{ job, unterlagen }], countdown)}>
        {aktiv ? text : '📄'}
      </Button>
    </div>
  )
}
