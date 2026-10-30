import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ladePauseStatus } from '@/api/dienst'
import { neuBewerten } from '@/api/n8n'
import { auswahl as auswahlKlasse } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { kiGesperrt } from '@/hooks/kiGesperrt'
import { useCountdown } from '@/hooks/useCountdown'
import { useJobs } from '@/hooks/useJobs'
import { useLaeufe } from '@/hooks/useLaeufe'
import { useEinstellungen } from '@/hooks/useLaufStatus'
import { ungespeichertJetzt, useProfil } from '@/hooks/useProfil'
import { useToast } from '@/hooks/useToast'
import { kostenText } from '@/lib/kosten'
import { istAktiv } from '@/lib/lauflage'
import { neuBewertenAuswahl, type NeuBewertenArt } from '@/lib/profil'

/** Bestehende Stellen nach geändertem Such-Prompt neu bewerten (Schritt 4 nur für die ausgewählten). */
export function NeuBewerten() {
  const qc = useQueryClient()
  const melden = useToast()
  const { data } = useJobs()
  const { profil } = useProfil()
  const { data: einst } = useEinstellungen()
  const { merken } = useLaeufe()
  const countdown = useCountdown()
  const [art, setArt] = useState<NeuBewertenArt>('unpassend')

  const ids = neuBewertenAuswahl(data?.jobs ?? [], art, profil?.kriterien_am).map((j) => j.id)
  const n = ids.length

  const klick = async () => {
    if (countdown.laeuft) return countdown.abbrechen()
    if (ungespeichertJetzt()) return melden('Erst die Einstellungen speichern – sonst bewertet die KI nach dem alten Such-Prompt.', { fehler: true })
    try {
      if (istAktiv(await ladePauseStatus())) return melden('Gerade läuft schon etwas – bitte warten, bis es fertig ist.', { fehler: true })
    } catch { /* Dienst nicht erreichbar – trotzdem versuchen */ }
    if (!n) return
    if (await kiGesperrt(melden)) return
    if (!(await countdown.bestaetigen())) return
    try {
      await neuBewerten(ids)
    } catch (e) {
      return melden('Konnte nicht starten: ' + (e as Error).message, { fehler: true })
    }
    merken('bw', ids)
    melden(`${ids.length} Stellen werden neu bewertet. Neue Treffer landen in „2 · Sichten“.`)
    void qc.invalidateQueries({ queryKey: ['pause-status'] })
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="text-[14px] text-muted-foreground">Bestehende Stellen neu bewerten:</span>
      <select value={art} onChange={(e) => setArt(e.target.value as NeuBewertenArt)} className={auswahlKlasse}>
        <option value="unpassend">„passt nicht“ ohne verletztes Muss-Kriterium</option>
        <option value="passtnicht">alle „passt nicht“</option>
        <option value="alle">alle bewerteten</option>
      </select>
      <Button variant={countdown.laeuft ? 'destructive' : 'ghost'} disabled={!n && !countdown.laeuft} onClick={klick}>
        {countdown.text('Neu bewerten')}
      </Button>
      <span className="text-[14px] text-muted-foreground">
        {n ? `${n} Stellen noch nach altem Prompt bewertet · ca. ${kostenText(einst, n, 'bewertung')}` : 'alle schon nach dem aktuellen Prompt bewertet'}
      </span>
    </div>
  )
}