import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { einordnungStarten } from '@/api/n8n'
import { Karte } from '@/components/Karte'
import { ModellHinweis } from '@/components/ModellHinweis'
import { Panel, Sub } from '@/components/Panel'
import { Vergleich } from './Vergleich'
import { Button } from '@/components/ui/button'
import { kiGesperrt } from '@/hooks/kiGesperrt'
import { useJobs } from '@/hooks/useJobs'
import { useToast } from '@/hooks/useToast'
import { AUSW_SEITE, SEG_ANSEHEN, SEG_URTEIL, auswertungsStand, einordnenKosten, gruppieren, nachPassung, prozent, spurBreite, type Segment } from '@/lib/auswertung'
import { cn } from '@/lib/utils'
import type { Job } from '@/types/job'

interface Filter { key: string; titel: string; stellen: Job[] }

function Legende({ segmente }: { segmente: Segment[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.8px] text-muted-foreground">
      {segmente.map((s) => (
        <span key={s.titel}><span className="mr-1 inline-block size-2.5 rounded-full align-middle" style={{ background: s.farbe }} />{s.titel}</span>
      ))}
    </div>
  )
}

function Balken({ gruppen, segmente, praefix, aktiv, onWahl }: {
  gruppen: [string, Job[]][]; segmente: Segment[]; praefix: string; aktiv?: string; onWahl: (f: Filter) => void
}) {
  const max = Math.max(1, ...gruppen.map(([, s]) => s.length))
  return (
    <div className="mt-1.5 grid gap-1">
      {gruppen.map(([name, stellen]) => {
        const key = praefix + name
        return (
          <div
            key={key}
            title={segmente.map((s) => `${s.titel}: ${stellen.filter(s.trifft).length}`).join(' · ')}
            onClick={() => onWahl({ key, titel: name, stellen })}
            className={cn(
              'grid cursor-pointer grid-cols-[1fr_44px] items-center gap-x-2.5 gap-y-1 rounded-md px-1 py-0.5 text-[13.8px] hover:bg-soft sm:grid-cols-[minmax(130px,220px)_1fr_48px]',
              aktiv === key && 'bg-soft',
            )}
          >
            <span>{name}</span>
            <span className="order-last col-span-full flex h-3.5 overflow-hidden rounded bg-soft sm:order-none sm:col-span-1" style={{ width: `${spurBreite(stellen.length, max)}%` }}>
              {segmente.map((s) => {
                const n = stellen.filter(s.trifft).length
                return n ? <span key={s.titel} className="block h-full" style={{ width: `${(100 * n) / stellen.length}%`, background: s.farbe }} /> : null
              })}
            </span>
            <span className="text-right tabular-nums text-muted-foreground">{stellen.length}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 📊 Auswertung: Verteilungen nach Bereich und Absage-Grund; Klick auf einen Balken zeigt die Stellen darunter. */
export function Auswertung() {
  const qc = useQueryClient()
  const melden = useToast()
  const { data } = useJobs()
  const jobs = data?.jobs ?? []
  const s = auswertungsStand(jobs)
  const [filter, setFilter] = useState<Filter | null>(null)
  const [anzahl, setAnzahl] = useState(AUSW_SEITE)
  const [info, setInfo] = useState('')
  const liste = useRef<HTMLDivElement>(null)

  const waehlen = (f: Filter) => {
    const zu = filter?.key === f.key
    setFilter(zu ? null : f)
    setAnzahl(AUSW_SEITE)
    if (!zu) setTimeout(() => liste.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const einordnen = async () => {
    if (await kiGesperrt(melden)) return
    setInfo('startet …')
    try {
      await einordnungStarten()
      setInfo('✓ läuft im Hintergrund (ca. 1 Minute pro 100 Stellen) – Fortschritt oben im Statuskasten.')
      void qc.invalidateQueries({ queryKey: ['pause-status'] })
    } catch (e) {
      setInfo(`⚠ ${(e as Error).message} – ist der Workflow „Auswertung · KI ordnet Stellen ein“ in n8n veröffentlicht?`)
    }
  }

  // Der Filter hält die Stellen von damals fest – für die Anzeige immer die frischen Daten nehmen (Tendenz-Änderungen).
  const frisch = filter ? nachPassung(filter.stellen.map((j) => jobs.find((x) => x.id === j.id) ?? j)) : []
  const k = einordnenKosten(s.offen)

  return (
    <>
      <div className="pt-3.5 pb-2.5">
        <Panel titel="📊 Was ist angefallen – und wie hast du entschieden?">
          <Sub>{s.eingeordnet.length} von {s.bewertet.length} bewerteten Stellen sind eingeordnet (Bereich + Hauptgrund). Klick auf einen Balken zeigt die Stellen darunter.</Sub>
          {s.offen ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={einordnen}>🔄 {s.offen} Stellen einordnen lassen</Button>
              <Sub>{info || `Günstiges Modell, liest nur Titel + Begründung (ca. ${k.anfragen} KI-Anfragen, grob ${k.dollar} $).`}</Sub>
            </div>
          ) : <Sub>{info || '✓ Alles eingeordnet. Neue Stellen werden nach jedem Komplettlauf automatisch eingeordnet.'}</Sub>}
          <div><ModellHinweis funktionen={['einordnung']} /></div>
        </Panel>

        <Vergleich jobs={jobs} />

        <Panel titel="🧭 Bereiche: welche Art Stellen gab es?">
          {s.mitBereich.length ? (
            <>
              <Sub>{s.mitBereich.length} Stellen. Farbe = Urteil der KI.</Sub>
              <Balken gruppen={gruppieren(s.mitBereich, 'bereich')} segmente={SEG_URTEIL} praefix="b:" aktiv={filter?.key} onWahl={waehlen} />
              <Legende segmente={SEG_URTEIL} />
            </>
          ) : <Sub>Noch nichts eingeordnet – oben auf „🔄 einordnen lassen“ klicken.</Sub>}
        </Panel>

        <Panel titel="🚫 Woran sind die Absagen gescheitert?">
          {s.nicht.length ? (
            <>
              <Sub>
                {s.nicht.length} Stellen „passt nicht“ – jeweils der wichtigste Grund.{' '}
                „Info fehlt“ ({s.nicht.filter((j) => j.hauptgrund === 'Info fehlt').length}) heißt: die Anzeige war zu dünn – nicht, dass es nicht passt.
              </Sub>
              <Balken gruppen={gruppieren(s.nicht, 'hauptgrund')} segmente={SEG_ANSEHEN} praefix="g:" aktiv={filter?.key} onWahl={waehlen} />
              <Legende segmente={SEG_ANSEHEN} />
              <Sub className="mt-2">
                Bei {s.duenn.length} der {s.nicht.length} Absagen ({prozent(s.duenn.length, s.nicht.length)} %) war die Beschreibung dünn.{' '}
                {s.duenn.length > 0 && (
                  <a href="#auswertung" className="text-primary" onClick={(e) => { e.preventDefault(); waehlen({ key: 'duenn', titel: 'Absagen mit dünner Beschreibung', stellen: s.duenn }) }}>Anzeigen</a>
                )}
              </Sub>
            </>
          ) : <Sub>Erscheint, sobald eingeordnet ist.</Sub>}
        </Panel>
      </div>

      <div ref={liste} className="pb-10">
        {filter && (
          <>
            <div className="mt-1.5 mb-2.5 flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 text-[1.05rem] font-semibold">{filter.titel} · {frisch.length}</h2>
              <Button variant="ghost" onClick={() => setFilter(null)}>✕ schließen</Button>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
              {frisch.slice(0, anzahl).map((j) => <Karte key={j.id} job={j} haupt="sichten" />)}
            </div>
            {frisch.length > anzahl && (
              <div className="p-2.5 text-center">
                <Button variant="ghost" onClick={() => setAnzahl(anzahl + AUSW_SEITE)}>Weitere {Math.min(AUSW_SEITE, frisch.length - anzahl)} anzeigen</Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
