import { useId, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { entferneDatei, ladeDateiHoch, ladeLebenslaufHoch, lvBereich, lvDatei, lvDateiEntfernen, lvLoeschen, lvNeu } from '@/api/dienst'
import { Panel, Sub, feld } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import { useJobs } from '@/hooks/useJobs'
import { useProfil } from '@/hooks/useProfil'
import { bereichVergeben, bereichsListe, dateiText, stellenImBereich } from '@/lib/lebenslauf'
import type { DateiInfo, LebenslaufZeile, Profil } from '@/types/profil'

const ENDUNGEN = '.pdf,.docx,.txt,.md'
const zeileKlasse = 'grid items-start gap-2.5 rounded-lg border border-border bg-background p-2.5 md:grid-cols-2 lg:grid-cols-[minmax(170px,1fr)_1fr_1fr_auto]'

/** Eine Datei: Status, „Datei wählen“ (lädt sofort hoch) und – wenn erlaubt – „✕“. */
function Slot({ titel, info, onDatei, onWeg }: { titel: string; info?: string; onDatei: (f: File) => Promise<void>; onWeg?: () => Promise<void> }) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState('')
  const los = async (tun: () => Promise<void>, text: string) => {
    setMeldung(text)
    try { await tun(); setMeldung('') } catch (e) { setMeldung('⚠ ' + (e as Error).message) }
  }
  return (
    <div className="grid gap-1 text-[14px]">
      <span className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">{titel}</span>
      <span className={info && !meldung ? '' : 'text-muted-foreground'}>{meldung || (info ? `✅ ${info}` : '– noch keine Datei')}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={eingabe} type="file" accept={ENDUNGEN} hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void los(() => onDatei(f), 'lädt hoch …')
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => eingabe.current?.click()}>{info ? 'Ersetzen …' : 'Datei wählen …'}</Button>
        {info && onWeg && (
          <button onClick={() => void los(onWeg, 'entfernt …')} title="Datei entfernen" className="cursor-pointer rounded-md px-1 py-0.5 text-[13px] text-muted-foreground hover:bg-soft hover:text-primary">✕</button>
        )}
      </div>
    </div>
  )
}

function StandardZeile() {
  const qc = useQueryClient()
  const { profil } = useProfil()
  const neuLaden = () => qc.invalidateQueries({ queryKey: ['profil'] })
  const de: DateiInfo | undefined = profil?.lebenslauf_datei ? { datei: profil.lebenslauf_datei, zeichen: (profil.lebenslauf_text ?? '').length } : undefined
  return (
    <div className={zeileKlasse}>
      <div>
        <b>Standard</b>
        <div className="text-[13.5px] text-muted-foreground">gilt für alle Bereiche ohne eigene Zeile</div>
      </div>
      <Slot titel="Muttersprache" info={dateiText(de)} onDatei={async (f) => { await ladeLebenslaufHoch(f); await neuLaden() }} />
      <Slot
        titel="Englisch (optional)" info={dateiText(profil?.anschreiben_dateien?.lebenslauf_en)}
        onDatei={async (f) => { await ladeDateiHoch('lebenslauf_en', f); await neuLaden() }}
        onWeg={async () => { await entferneDatei('lebenslauf_en'); await neuLaden() }}
      />
      <span />
    </div>
  )
}

function BereichsZeile({ zeile, alle, vorschlaege, anzahl }: { zeile: LebenslaufZeile; alle: LebenslaufZeile[]; vorschlaege: string[]; anzahl: number }) {
  const qc = useQueryClient()
  const liste = useId()
  const [text, setText] = useState(zeile.bereich)
  const [fehler, setFehler] = useState('')
  const countdown = useCountdown()
  const setzen = (z: LebenslaufZeile[]): void => { qc.setQueryData<Profil>(['profil'], (p) => (p ? { ...p, lebenslaeufe: z } : p)) }
  const hatDatei = Boolean(zeile.de || zeile.en)

  const bereichSpeichern = async () => {
    const neu = text.trim()
    if (neu === zeile.bereich) return setFehler('')
    if (bereichVergeben(alle, zeile.id, neu)) return setFehler('Für diesen Bereich gibt es schon eine Zeile.')
    setFehler('')
    try { setzen(await lvBereich(zeile.id, neu)) } catch (e) { setFehler('⚠ ' + (e as Error).message) }
  }

  const loeschen = async () => {
    if (countdown.laeuft) return countdown.abbrechen()
    if (hatDatei && !(await countdown.bestaetigen())) return
    try { setzen(await lvLoeschen(zeile.id)) } catch (e) { setFehler('⚠ ' + (e as Error).message) }
  }

  return (
    <div className={zeileKlasse}>
      <div className="grid gap-1">
        <span className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">Bereich</span>
        <input
          list={liste} value={text} placeholder="wählen oder eintippen"
          onChange={(e) => setText(e.target.value)} onBlur={() => void bereichSpeichern()}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={feld}
        />
        <datalist id={liste}>{vorschlaege.filter((b) => !bereichVergeben(alle, zeile.id, b)).map((b) => <option key={b} value={b} />)}</datalist>
        <span className="text-[13px] text-muted-foreground">
          {fehler || (zeile.bereich ? `${anzahl} Stellen in diesem Bereich` : 'ohne Bereich wird die Zeile nicht benutzt')}
        </span>
      </div>
      <Slot titel="Muttersprache" info={dateiText(zeile.de)} onDatei={async (f) => setzen(await lvDatei(zeile.id, 'de', f))} onWeg={async () => setzen(await lvDateiEntfernen(zeile.id, 'de'))} />
      <Slot titel="Englisch (optional)" info={dateiText(zeile.en)} onDatei={async (f) => setzen(await lvDatei(zeile.id, 'en', f))} onWeg={async () => setzen(await lvDateiEntfernen(zeile.id, 'en'))} />
      <Button variant={countdown.laeuft ? 'destructive' : 'ghost'} size="sm" onClick={() => void loeschen()} title="Zeile samt Dateien löschen" className="lg:mt-5">
        {countdown.text('🗑 Zeile')}
      </Button>
    </div>
  )
}

/** Lebensläufe: eine Standard-Zeile plus je eine Zeile pro Bereich. Fehlt etwas, springt der Standard ein. */
export function LebenslaufKarte() {
  const qc = useQueryClient()
  const { profil } = useProfil()
  const { data } = useJobs()
  const jobs = data?.jobs ?? []
  const zeilen = profil?.lebenslaeufe ?? []
  const vorschlaege = bereichsListe(jobs)
  const [fehler, setFehler] = useState('')

  const hinzufuegen = async () => {
    setFehler('')
    try {
      const z = await lvNeu()
      qc.setQueryData<Profil>(['profil'], (p) => (p ? { ...p, lebenslaeufe: z } : p))
    } catch (e) { setFehler('⚠ ' + (e as Error).message) }
  }

  return (
    <Panel titel="📄 Lebensläufe">
      <Sub>
        Pro Bereich ein passender Lebenslauf – Tiefen-Check, Anschreiben und Mappe nehmen den Lebenslauf des Bereichs der Stelle.
        Fehlt dort eine Sprache, gilt der Standard. Bereiche vergibt die KI in „📊 Auswertung“, neue erscheinen hier von selbst.
      </Sub>
      <div className="grid gap-2">
        <StandardZeile />
        {zeilen.map((z) => (
          <BereichsZeile key={z.id} zeile={z} alle={zeilen} vorschlaege={vorschlaege} anzahl={stellenImBereich(jobs, z.bereich)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => void hinzufuegen()}>＋ Bereich hinzufügen</Button>
        {fehler && <span className="text-[14px] text-bad">{fehler}</span>}
      </div>
    </Panel>
  )
}
