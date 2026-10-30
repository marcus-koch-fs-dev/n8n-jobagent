import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { missionfreiAnmelden, missionfreiStatus, pauseSetzen } from '@/api/dienst'
import { linkHinzufuegen } from '@/api/n8n'
import { Button } from '@/components/ui/button'
import { ModellHinweis } from '@/components/ModellHinweis'
import { Panel, Sub, feld } from '@/components/Panel'
import { useCountdown } from '@/hooks/useCountdown'
import { useJobs } from '@/hooks/useJobs'
import { useKomplettlauf } from '@/hooks/useKomplettlauf'
import { useLaufStatus } from '@/hooks/useLaufStatus'
import { kiGesperrt } from '@/hooks/kiGesperrt'
import { useToast } from '@/hooks/useToast'
import { sichererLink } from '@/lib/job'
import { aussortiert, wartetAufKi } from '@/lib/listen'
import { cn } from '@/lib/utils'

export function Sammeln() {
  return (
    <div className="pt-3.5">
      <Komplettlauf />
      <EigeneLinks />
    </div>
  )
}

function Komplettlauf() {
  const qc = useQueryClient()
  const { data: status, aktiv } = useLaufStatus()
  const { startZeit, starten, auswerten } = useKomplettlauf()
  const countdown = useCountdown()
  const countdownAuswerten = useCountdown()
  const melden = useToast()
  const { data: jobsDaten } = useJobs()
  const wartend = (jobsDaten?.jobs ?? []).filter(wartetAufKi).length
  const pausiert = Boolean(status?.pausiert)

  const klick = async () => {
    // Zweiter Klick während des Countdowns bricht ab
    if (countdown.laeuft) return countdown.abbrechen()
    if (await countdown.bestaetigen()) await starten(4)
  }
  // Nur Schritt 3 und 4: für Stellen, die schon Text haben (z. B. eingefügten) – kostet nur für diese
  const auswertenKlick = async () => {
    if (countdownAuswerten.laeuft) return countdownAuswerten.abbrechen()
    if (await kiGesperrt(melden)) return
    if (await countdownAuswerten.bestaetigen()) await auswerten(pausiert)
  }
  const startText = countdown.text(
startZeit ? '⏳ startet …' : pausiert ? '▶ Fortsetzen' : '▶ Komplettlauf')

  return (
    <Panel titel="Neue Stellen holen und auswerten">
      <Sub>Holt neue Links von Missionfrei, lädt die Seiten, lässt die KI Fakten auslesen und bewerten. Jeder Schritt macht nur, was noch offen ist.</Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={countdown.laeuft ? 'destructive' : 'default'} disabled={Boolean(startZeit)} onClick={klick} title="Neue Links holen, Seiten laden, KI auswerten und bewerten">{startText}</Button>
        {wartend > 0 && (
          <Button variant={countdownAuswerten.laeuft ? 'destructive' : 'ghost'} disabled={Boolean(startZeit)} onClick={auswertenKlick}
            title="Nur Schritt 3 und 4: Die KI liest und bewertet die Stellen, die schon Text haben (z. B. eingefügten). Lädt keine neuen Links und keine Seiten.">
            {countdownAuswerten.text(`▶ Nur auswerten (${wartend})`)}
          </Button>
        )}
        {!pausiert && aktiv && (
          <Button variant="ghost" title="Hält nach der aktuellen Stelle an – später mit ▶ Fortsetzen weiter"
            onClick={async () => { await pauseSetzen(true); void qc.invalidateQueries({ queryKey: ['pause-status'] }) }}>
            ⏸ Pause
          </Button>
        )}
        <ModellHinweis funktionen={['fakten', 'bewertung', 'zweitmeinung']} />
      </div>
      <Missionfrei />
      <PipelineStand />
    </Panel>
  )
}

/** Das Passwort geht nur an den Browser-Dienst auf deinem Rechner. Gespeichert bleibt nur die Anmeldung im Browser-Profil. */
function Missionfrei() {
  const qc = useQueryClient()
  const status = useQuery({ queryKey: ['missionfrei'], queryFn: () => missionfreiStatus(false), staleTime: 0, retry: false })
  const neuPruefen = useMutation({
    mutationFn: () => missionfreiStatus(true),
    onSuccess: (d) => qc.setQueryData(['missionfrei'], d),
  })
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const anmelden = useMutation({
    mutationFn: async () => {
      const pw = passwort
      setPasswort('') // Passwort sofort aus dem Feld löschen
      const r = await missionfreiAnmelden(pw)
      if (!r.ok) throw new Error(r.error || 'Anmeldung fehlgeschlagen')
    },
    onMutate: () => setFehler(''),
    onError: (e) => setFehler((e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['missionfrei'] }),
  })

  const d = status.data
  const text = anmelden.isPending ? 'meldet an …'
    : fehler ? '⚠ ' + fehler
    : status.isPending || neuPruefen.isPending ? 'wird geprüft …'
    : status.isError ? '⚠ Browser-Dienst nicht erreichbar'
    : !d?.ok ? '⚠ ' + d?.error
    : d.angemeldet ? '✓ angemeldet' : 'nicht angemeldet'
  const farbe = fehler ? 'text-bad' : d?.ok && !anmelden.isPending ? (d.angemeldet ? 'text-good' : 'text-mid') : 'text-muted-foreground'

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-info-bg px-3.5 py-2.5 text-[14.5px] text-info">
      <b>Missionfrei-Zugang:</b> <span className={cn('text-[13.5px]', farbe)}>{text}</span>
      {d?.ok && !d.angemeldet && (
        <form className="flex flex-wrap items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (passwort) anmelden.mutate() }}>
          <input type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} placeholder="Dein Missionfrei-Passwort" className={feld} />
          <Button type="submit" size="sm">Anmelden</Button>
        </form>
      )}
      <a href="#sammeln" className="text-[13.5px] text-primary" onClick={(e) => { e.preventDefault(); neuPruefen.mutate() }}>neu prüfen</a>
    </div>
  )
}

function PipelineStand() {
  const { data } = useJobs()
  const jobs = data?.jobs ?? []
  const z = (f: (j: (typeof jobs)[number]) => boolean) => jobs.filter(f).length
  const kacheln: [string, number][] = [
    ['noch nicht geladen', z((j) => j.status === 'neu')],
    ['geladen, KI liest noch', z((j) => j.status === 'abgerufen')],
    ['wartet auf Bewertung', z((j) => ['aktiv', 'unklar'].includes(j.status) && (!j.bewertung || j.bewertung === 'fehler'))],
    ['fertig bewertet', z((j) => Boolean(j.bewertung) && j.bewertung !== 'fehler')],
    // Nur noch offene: gesperrte Stellen, die du schon markiert hast (z. B. 👎), zählen als erledigt
    ['gesperrt, noch offen', z((j) => j.status === 'wartet_auf_freigabe' && !j.tendenz)],
    ['tot / alt / doppelt', z(aussortiert)],
  ]
  // Welche Stellen warten auf die KI? Vor allem die mit eingefügtem Text – sonst sähe man nur eine Zahl.
  const wartend = jobs.filter(wartetAufKi)
  return (
    <>
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {kacheln.map(([t, n]) => (
          <div key={t} className="rounded-lg bg-soft px-2.5 py-2 text-[14px]">
            <b className="block text-[1.2rem]">{n}</b>{t}
          </div>
        ))}
      </div>
      {wartend.length > 0 && (
        <div className="mt-2 rounded-lg bg-soft px-3 py-2 text-[14px]">
          <b>Warten auf die KI-Auswertung ({wartend.length})</b>
          <ul className="m-0 mt-1 grid list-none gap-0.5 p-0">
            {wartend.slice(0, 30).map((j) => {
              const url = sichererLink(j.url)
              const name = j.jobtitel || j.firma || j.domain || j.url
              return (
                <li key={j.id}>
                  <span className="tabular-nums text-muted-foreground">#{j.id}</span>{' '}
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">{name}</a> : name}
                  <span className="text-muted-foreground"> · {String(j.hinweis || '').includes('manuell') ? 'Text eingefügt' : 'noch nicht bewertet'}</span>
                </li>
              )
            })}
          </ul>
          <Sub className="mt-1">Mit „▶ Nur auswerten“ oben liest und bewertet die KI sie jetzt. Danach stehen sie neu in 2 · Sichten.</Sub>
        </div>
      )}
    </>
  )
}

function EigeneLinks() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [info, setInfo] = useState('Werden beim nächsten „▶ Komplettlauf“ verarbeitet.')
  const [laeuft, setLaeuft] = useState(false)

  const hinzufuegen = async () => {
    const links = text.split(/\s+/).map((s) => s.trim()).filter(Boolean)
    if (!links.length) return setInfo('Bitte mindestens einen Link einfügen.')
    setLaeuft(true)
    let neu = 0, bekannt = 0
    const fehler: string[] = []
    for (const [i, link] of links.entries()) {
      setInfo(`speichert ${i + 1} von ${links.length} …`)
      try {
        if (await linkHinzufuegen(link)) bekannt++
        else neu++
      } catch (e) {
        fehler.push(`${link}: ${(e as Error).message}`)
      }
    }
    setInfo(`✓ ${neu} neu, ${bekannt} schon bekannt${fehler.length ? ` · ⚠ ${fehler.join(' | ')}` : ''} – beim nächsten „▶ Komplettlauf“ werden sie geladen.`)
    if (!fehler.length) setText('')
    setLaeuft(false)
    void qc.invalidateQueries({ queryKey: ['jobs'] })
  }

  return (
    <Panel titel="➕ Eigene Links hinzufügen">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Einen Link pro Zeile, z. B. https://firma.de/jobs/support-remote" className={cn(feld, 'min-h-[80px] w-full')} />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button disabled={laeuft} onClick={hinzufuegen}>Hinzufügen</Button>
        <span className="text-[13.5px] text-muted-foreground">{info}</span>
      </div>
    </Panel>
  )
}