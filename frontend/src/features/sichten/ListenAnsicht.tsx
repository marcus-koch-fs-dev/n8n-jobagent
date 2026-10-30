import { useMemo, useState } from 'react'
import { useJobs } from '@/hooks/useJobs'
import { SPALTEN_KLASSE, spaltenSetzen, spaltenStore, type Spalten } from '@/lib/layout'
import { useStore } from '@/lib/store'
import { useGeoeffnet } from '@/hooks/useGeoeffnet'
import { useToast } from '@/hooks/useToast'
import { erweiterung } from '@/lib/erweiterung'
import { sichererLink } from '@/lib/job'
import { LISTEN, STANDARD_LISTE, type Liste } from '@/lib/listen'
import { jsonLesen, speicherLesen, speicherSchreiben } from '@/lib/speicher'
import { istSortKey, SORT_OPTIONEN, sortieren, suchen, type SortKey } from '@/lib/sortieren'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/Karte'
import { useTcUmzug } from '@/hooks/useTcUmzug'
import { useUnterlagen } from '@/hooks/useUnterlagen'
import type { TextSuche } from '@/lib/unterlagen'
import { ZeileRaus } from '@/components/ZeileRaus'
import type { Job } from '@/types/job'
import { Hilfe } from './Hilfe'
import { ListenChips } from './ListenChips'

type ListenHaupt = 'sichten' | 'pruefen' | 'bewerben' | 'beworben'
const SEITE = 60
const eingabe = 'rounded-md border border-border bg-card px-2.5 py-[7px] text-[15px]'

function startSortierung(haupt: ListenHaupt): SortKey {
  if (haupt === 'bewerben') return 'empfehlung'
  if (haupt === 'beworben') return 'geaendert' // zuletzt beworben oben
  const gemerkt = speicherLesen('sort')
  return istSortKey(gemerkt) && gemerkt !== 'empfehlung' ? gemerkt : 'score'
}

/** Listen-Tab (2 · Sichten, 3 · Prüfen, 4 · Bewerben, 5 · Beworben): Listen-Knöpfe, Suche, Sortierung, Karten. */
export function ListenAnsicht({ haupt }: { haupt: ListenHaupt }) {
  const { data } = useJobs()
  const melden = useToast()
  const geo = useGeoeffnet()
  const jobs = data?.jobs ?? []
  const textSuche = useUnterlagen(jobs, haupt === 'bewerben')
  const [umzug, umzugLoeschen] = useTcUmzug(jobs)

  const meine = LISTEN.filter((l) => l.haupt === haupt)
  const [tabJe, setTabJe] = useState(() => jsonLesen<Record<string, string>>('tabJeHaupt', {}))
  const liste = meine.find((l) => l.key === tabJe[haupt]) ?? meine.find((l) => l.key === STANDARD_LISTE[haupt]) ?? meine[0]

  const [frage, setFrage] = useState('')
  const [sort, setSort] = useState<SortKey>(() => startSortierung(haupt))
  const [anzahl, setAnzahl] = useState(SEITE)
  const [nurGruppe, setNurGruppe] = useState(false)
  const [batch, setBatch] = useState(10)
  const [batchHinweis, setBatchHinweis] = useState('')
  const spalten = useStore(spaltenStore)

  // „👎 abgelehnt“: immer zuletzt abgelehnte oben, zum schnellen Wiederfinden von Verklickern.
  const wirksamSort: SortKey = liste.key === 'nein' ? 'geaendert' : sort

  const basis = useMemo(() => sortieren(suchen(jobs.filter(liste.filter), frage), wirksamSort), [jobs, liste, frage, wirksamSort])
  const angezeigt = nurGruppe
    ? suchen(geo.gruppe.map((id) => jobs.find((j) => j.id === id)).filter((j) => j !== undefined), frage)
    : basis

  const listeWaehlen = (key: string) => {
    const neu = { ...tabJe, [haupt]: key }
    setTabJe(neu)
    speicherSchreiben('tabJeHaupt', JSON.stringify(neu))
    setAnzahl(SEITE)
    setNurGruppe(false)
    setBatchHinweis('')
    umzugLoeschen()
  }

  const oeffnen = async () => {
    setNurGruppe(false)
    // die obersten N Karten, die noch nicht markiert sind (Reihenfolge wie angezeigt)
    const naechste = basis.filter((j) => sichererLink(j.url) && !j.tendenz).slice(0, batch)
    if (!naechste.length) return melden('In dieser Liste ist nichts mehr offen.')
    const name = liste.label.replace(/^[^\p{L}]+/u, '')
    const schonOffen = basis.filter((j) => geo.geoeffnet.has(j.id)).length
    const titel = `${name} ${schonOffen + 1}–${schonOffen + naechste.length}`
    const antwort = await erweiterung({ typ: 'oeffnen', modus: 'gruppe', titel, urls: naechste.map((j) => j.url) })
    if (antwort?.ok) {
      setBatchHinweis(`${naechste.length} Anzeigen als Tab-Gruppe „${titel}“ geöffnet.`)
    } else {
      // Ohne Erweiterung: einzelne Tabs (Browser-Standard)
      for (const j of naechste) window.open(j.url!, '_blank', 'noopener')
      setBatchHinweis(`${naechste.length} Anzeigen als einzelne Tabs geöffnet. Für Tab-Gruppen die Erweiterung aus dem Ordner „browser-erweiterung“ installieren (siehe Anleitung). Öffnet sich nur ein Tab? Pop-ups für localhost:3000 erlauben.`)
    }
    geo.gruppeSetzen(naechste.map((j) => j.id))
  }

  const hinweis = nurGruppe
    ? `Letzte geöffnete Gruppe in Tab-Reihenfolge (${angezeigt.length} Stellen). Tab für Tab durchgehen und hier markieren.`
    : (haupt === 'pruefen' && umzug) || batchHinweis || liste.hint

  return (
    <>
      <Hilfe haupt={haupt} />
      {/* Eine einzige Liste (4 · Bewerben, 5 · Beworben) braucht keine Knöpfe – die Zahl steht am Tab */}
      {meine.length > 1 && <ListenChips listen={meine} gewaehlt={liste.key} jobs={jobs} onWahl={listeWaehlen} gruppiert={haupt === 'sichten'} />}

      <div className="flex flex-wrap gap-2 pt-3.5 pb-1.5">
        <input
          type="search" value={frage} placeholder="Suchen: Nr., Titel, Firma, Ort …"
          onChange={(e) => { setFrage(e.target.value); setAnzahl(SEITE) }}
          className={cn(eingabe, 'min-w-[220px] flex-[1_1_220px]')}
        />
        <select
          title="Sortierung" value={wirksamSort} className={eingabe}
          onChange={(e) => { const s = e.target.value as SortKey; setSort(s); speicherSchreiben('sort', s) }}
        >
          {SORT_OPTIONEN.filter((o) => (haupt === 'bewerben' || haupt === 'beworben' ? o.key !== 'dev' : o.key !== 'empfehlung')).map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <span className="flex items-center gap-1.5" role="group" aria-label="Spalten">
          {([1, 2, 3] as Spalten[]).map((n) => (
            <button
              key={n} title={n + (n === 1 ? ' Spalte' : ' Spalten') + ' nebeneinander'} onClick={() => spaltenSetzen(n)}
              className={cn('cursor-pointer rounded-full border border-border bg-card px-2.5 py-1 text-[13.5px]', spalten === n && 'border-primary bg-primary text-primary-foreground')}
            >
              ▦ {n}
            </button>
          ))}
        </span>
        {haupt !== 'bewerben' && haupt !== 'beworben' && (
          <span className="flex items-center gap-1.5">
            <Button onClick={oeffnen} title="Öffnet die nächsten Anzeigen dieser Liste, die du noch nicht markiert hast, als Tab-Gruppe im Browser">↗ Anzeigen öffnen</Button>
            <select title="Wie viele auf einmal" value={batch} onChange={(e) => setBatch(Number(e.target.value))} className={eingabe}>
              <option value={5}>5 Stück</option><option value={10}>10 Stück</option><option value={20}>20 Stück</option>
            </select>
            <button
              title="Zeigt hier nur die Stellen, die du gerade als Tabs geöffnet hast – in derselben Reihenfolge wie die Tabs. Nochmal klicken = wieder alle."
              onClick={() => (geo.gruppe.length ? setNurGruppe(!nurGruppe) : melden('Noch nichts geöffnet.'))}
              className={cn('cursor-pointer rounded-full border border-border bg-card px-2.5 py-1 text-[13.5px]', nurGruppe && 'border-primary bg-primary text-primary-foreground')}
            >
              📑 nur die geöffneten
            </button>
          </span>
        )}
      </div>

      {hinweis && <p className="mt-1 mb-3 text-[14px] text-muted-foreground">{hinweis}</p>}


      <Inhalt jobs={jobs} liste={liste} angezeigt={angezeigt} anzahl={anzahl} onMehr={() => setAnzahl(anzahl + SEITE)} haupt={haupt} geladen={Boolean(data)} textSuche={textSuche} spalten={spalten} />
    </>
  )
}

function Inhalt({ jobs, liste, angezeigt, anzahl, onMehr, haupt, geladen, textSuche, spalten }: {
  jobs: Job[]
  liste: Liste; angezeigt: Job[]; anzahl: number; onMehr: () => void; haupt: ListenHaupt; geladen: boolean; textSuche?: TextSuche
  spalten: Spalten
}) {
  if (!geladen) return <div className="py-10 text-center text-muted-foreground">lädt …</div>
  if (!angezeigt.length) {
    const neu = jobs.filter((j) => j.status === 'neu').length
    const offen = jobs.filter((j) => ['aktiv', 'unklar'].includes(j.status) && !j.bewertung).length
    const abgerufen = jobs.filter((j) => j.status === 'abgerufen').length
    const tipp = abgerufen && !offen ? `${abgerufen} Seiten sind gespeichert → in n8n Workflow „A2 Fakten auslesen“ starten, danach „C Bewertung“.`
      : offen ? `${offen} Stellen warten auf die Bewertung → in n8n Workflow „C Bewertung“ starten.`
      : neu ? `${neu} Stellen sind noch nicht geprüft → in n8n Workflow „A Stellen prüfen“ starten, danach „C Bewertung“.`
      : ''
    const fertig = haupt === 'sichten' && ['gut', 'teil'].includes(liste.key) && !tipp
    return (
      <div className="py-10 text-center text-muted-foreground">
        {fertig ? '🎉 Alles gesichtet! Deine Favoriten findest du in „3 · Prüfen“.' : <>Hier ist (noch) nichts.{tipp && <><br />{tipp}</>}</>}
      </div>
    )
  }
  const sichtbar = angezeigt.slice(0, anzahl)
  return (
    <>
      {liste.key === 'raus' ? (
        <div className="rounded-xl border border-border bg-card px-3.5 py-1.5">{sichtbar.map((j) => <ZeileRaus key={j.id} job={j} />)}</div>
      ) : (
        <div className={cn('grid items-stretch gap-3 pb-10', SPALTEN_KLASSE[spalten])}>
          {sichtbar.map((j) => <Karte key={j.id} job={j} haupt={haupt} textSuche={textSuche} />)}
        </div>
      )}
      {angezeigt.length > anzahl && (
        <div className="p-2.5 text-center">
          <Button variant="ghost" onClick={onMehr}>Weitere {Math.min(SEITE, angezeigt.length - anzahl)} von {angezeigt.length - anzahl} anzeigen</Button>
        </div>
      )}
    </>
  )
}