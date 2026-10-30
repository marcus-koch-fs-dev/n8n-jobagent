import { Fragment, memo, useMemo, useState } from 'react'
import { ausfuehrung, begruendung, leer, sichererLink, zusammenfassung, type Ausfuehrung } from '@/lib/job'
import { tcLesen } from '@/lib/tiefencheck'
import { cn } from '@/lib/utils'
import { useBewerbenDirektSetzen } from '@/hooks/useBewerbenDirekt'
import { useGeoeffnet } from '@/hooks/useGeoeffnet'
import { useTendenz } from '@/hooks/useTendenz'
import { useToast } from '@/hooks/useToast'
import { useTracker } from '@/hooks/useTracker'
import { Klappbar } from '@/components/Klappbar'
import { NotizFeld } from '@/components/NotizFeld'
import { Trenner } from '@/components/Panel'
import { TextEinfuegen } from '@/components/TextEinfuegen'
import { TiefenCheckBlock } from '@/components/TiefenCheckBlock'
import { MappeBlock } from '@/features/bewerben/MappeBlock'
import { ChatKopierKnopf } from '@/features/bewerben/ChatKopierKnopf'
import { MappenZeile } from '@/features/bewerben/MappenZeile'
import { TiefencheckKnopf } from '@/features/pruefen/TiefencheckKnopf'
import { bereitFuerMappe } from '@/lib/listen'
import { unterlagen, type TextSuche } from '@/lib/unterlagen'
import type { Job } from '@/types/job'

// ✉️ („beworben“) steht separat hinter 🚫, mit Trenner – siehe Fußleiste.
const TENDENZ_KNOEPFE: [wert: string, icon: string, titel: string][] = [
  ['interessant', '👍', '👍 interessant'],
  ['vielleicht', '🤔', '🤔 vielleicht'],
  ['nein', '👎', '👎 nein'],
]

const knopfKlasse = (an: boolean) =>
  cn(
    'cursor-pointer whitespace-nowrap rounded-full border border-border bg-card px-[7px] py-0.5 text-[13px]',
    an && 'border-primary bg-primary',
  )

const AUSFUEHRUNG_ICON: Record<Ausfuehrung['art'], string> = { weltweit: '🌍', region: '🗺️', hybrid: '🏢', ort: '🏢', unklar: '❓' }

interface KarteProps {
  job: Job
  /** Tab, in dem die Karte steht: Prüfen und Bewerben zeigen zusätzlich Unterlagen und den Tiefen-Check-Knopf. */
  haupt: 'sichten' | 'pruefen' | 'bewerben' | 'beworben'
  /** Ergebnis der Textsuche nach gefragten Unterlagen (für Prüfen und Bewerben) */
  textSuche?: TextSuche
}

// memo: bei jedem Tastendruck in der Suche oder Poll sollen nur die Karten neu zeichnen, deren Stelle sich geändert hat.
export const Karte = memo(function Karte({ job: j, haupt, textSuche }: KarteProps) {
  const u = useMemo(() => (haupt === 'sichten' ? null : unterlagen(j, textSuche)), [j, haupt, textSuche])
  const { setzen } = useTendenz()
  const tracker = useTracker()
  const { markieren } = useGeoeffnet()
  const melden = useToast()
  const direktSetzen = useBewerbenDirektSetzen()
  const [status, setStatus] = useState('')
  const [notizOffen, setNotizOffen] = useState(false)

  const flash = (t: string) => {
    setStatus(t)
    if (t.startsWith('✓')) setTimeout(() => setStatus(''), 1500)
  }

  const score = j.passung_score ? Math.round(j.passung_score) : 0
  const url = sichererLink(j.url)
  const b = begruendung(j)
  const wartet = j.status === 'wartet_auf_freigabe'
  const ort = ausfuehrung(j)

  // Zeile 2: Firma, Ort und Eckdaten, alles hintereinander – nur was da ist
  const firma = j.firma || j.domain
  const datum = j.veroeffentlichungsdatum ? new Date(j.veroeffentlichungsdatum + 'T00:00:00').toLocaleDateString('de-DE') : ''
  const eckdaten = [
    !leer(firma) && <span key="f" className="font-semibold text-foreground">{firma}</span>,
    !leer(j.ort) && <span key="ot">{j.ort}</span>,
    datum && <span key="d">📅 {datum}{j.alter_tage != null ? ` (vor ${j.alter_tage} T.)` : ''}</span>,
    ort && <span key="o">{AUSFUEHRUNG_ICON[ort.art]} {ort.text}</span>,
    !leer(j.gehalt) && <span key="g" title={j.gehalt!}>{j.gehalt}</span>,
    !leer(j.vertragsform) && <span key="v">{j.vertragsform}</span>,
  ].filter(Boolean)

  // Details nur mit dem Wesentlichen. Die Anforderungen aus dem Tiefen-Check stehen schon im Tiefen-Check-Block.
  const tc = tcLesen(j)
  const z = zusammenfassung(j)
  const anforderungen = !tc?.anforderungen?.length && z.anforderungen.length
    ? <ul className="m-0 list-disc pl-[18px]">{z.anforderungen.map((a, i) => <li key={i}>{a}</li>)}</ul>
    : ''
  const detailZeilen: [string, React.ReactNode][] = [
    ['Remote', !leer(j.remote_regel_wortlaut) ? <i>„{j.remote_regel_wortlaut}“</i> : ''],
    ['Stelle', z.text],
    ['Anforderungen', anforderungen],
    ['Negative Keywords', b.signaleMinus],
    ['Bewertet von', j.modell_bewertung ? `${j.modell_bewertung}${b.vorher ? ` (lokal vorher: ${b.vorher})` : ''}, ${String(j.bewertet_am ?? '').slice(0, 10)}` : ''],
  ]
  const sichtbareZeilen = detailZeilen.filter(([, v]) => !leer(v))

  // ✉️ aktiv anklicken: zurück nach „interessant“ (📝 bereit), nicht ins Nichts – sonst verschwindet die Stelle aus allen Listen
  const tendenzKlick = (wert: string) => setzen(j, j.tendenz === wert ? (wert === 'beworben' ? 'interessant' : '') : wert)

  const pruefungDa = Boolean(tc) || sichtbareZeilen.length > 0
  // 4 · Bewerben (vorbereiten) und 5 · Beworben (Verlauf): beide zeigen die Mappe, nur 4 hat Ordner/Dokumente/Chat
  const imBewerbenTab = haupt === 'bewerben' || haupt === 'beworben'
  const mappeDa = imBewerbenTab && ['interessant', 'beworben'].includes(String(j.tendenz))
  const beworben = j.tendenz === 'beworben'
  // 📝 in 3 · Prüfen: ohne Tiefen-Check nach 4 · Bewerben (Ordner und Dokumente gehen dort trotzdem)
  const nachBewerben = async () => {
    try {
      await direktSetzen(j.id, true)
      if (j.tendenz !== 'interessant') await setzen(j, 'interessant')
      melden(`✓ #${j.id} steht jetzt in 4 · Bewerben – Ordner und Dokumente gehen auch ohne Tiefen-Check.`, {
        aktion: { label: 'Zu 4 · Bewerben', onClick: () => { location.hash = 'bewerben' } },
      })
    } catch (e) {
      melden('Konnte nicht nach 4 · Bewerben schicken: ' + (e as Error).message, { fehler: true })
    }
  }
  const beworbenUmschalten = async () => {
    if (beworben) {
      tracker.entfernen(j.id) // war die Excel-Zeile noch nicht geschrieben, wird sie nicht mehr nachgetragen
      if (await setzen(j, 'interessant')) {
        melden(`#${j.id} ist wieder in 4 · Bewerben.`, { aktion: { label: 'Zu 4 · Bewerben', onClick: () => { location.hash = 'bewerben' } } })
      }
      return
    }
    if (await setzen(j, 'beworben')) {
      await tracker.eintragenFuer([{ ...j, tendenz_geaendert_am: new Date().toISOString() }], { still: true })
      melden(`✓ #${j.id} steht jetzt in 5 · Beworben und kommt in deine Excel-Liste.`, { aktion: { label: 'Zu 5 · Beworben', onClick: () => { location.hash = 'beworben' } } })
    }
  }

  return (
    <article
      className="flex min-w-0 flex-col gap-[7px] break-words rounded-xl border border-border bg-card px-3.5 py-3 has-[details[open]]:col-span-full"
    >
      {/* Zeile 1: Nummer, Passung, Titel */}
      <div className="flex items-start gap-3">
        <span title="Nummer der Stelle – in der Suche mit # eingeben" className="w-12 shrink-0 pt-0.5 text-[12.5px] tabular-nums text-muted-foreground">#{j.id}</span>
        <Passung score={score} />
        <div className="min-w-0 flex-1">
          {url
            ? <a href={url} target="_blank" rel="noopener noreferrer" title="Anzeige öffnen" onClick={() => markieren(j.id)} className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground no-underline hover:underline">{j.jobtitel || j.linktext || j.url}</a>
            : <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{j.jobtitel || j.url}</span>}
        </div>
      </div>

      {eckdaten.length > 0 && (
        <div className="break-words text-[13px] leading-relaxed text-muted-foreground">
          {eckdaten.map((e, i) => <Fragment key={i}>{i > 0 && <span aria-hidden className="mx-1.5">·</span>}{e}</Fragment>)}
        </div>
      )}

      {pruefungDa && (
        <>
          <Trenner />
          <TiefenCheckBlock job={j} />
          {sichtbareZeilen.length > 0 && (
            <Klappbar id={j.id} titel="Details zur Stelle">
              <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                {sichtbareZeilen.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="m-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </Klappbar>
          )}
        </>
      )}

      {mappeDa && (
        <>
          <Trenner />
          <MappeBlock job={j} />
        </>
      )}

      {(wartet || j.status === 'fehler') && (
        <div className="flex flex-wrap items-center gap-1.5">
          <TextEinfuegen job={j} />
        </div>
      )}

      <NotizFeld id={j.id} notiz={j.notiz ?? ''} sichtbar={notizOffen || !leer(j.notiz)} onStatus={flash} />
      {((leer(j.notiz) && !notizOffen) || mappeDa) && (
        <div className="flex items-center justify-between gap-2">
          <div>
            {leer(j.notiz) && !notizOffen && (
              <button onClick={() => setNotizOffen(true)} className="cursor-pointer whitespace-nowrap rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground hover:bg-soft hover:text-primary">+ eigener Hinweis</button>
            )}
          </div>
          {mappeDa && haupt === 'bewerben' && <MappenZeile job={j} unterlagen={u ?? null} />}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-2">
        {/* Gesperrte Stellen kennst du noch nicht: erst Text einfügen, bewerten lässt sich danach. Nur 👎 und 🚫 gehen sofort. */}
        {TENDENZ_KNOEPFE.filter(([wert]) => !(wartet && (wert === 'interessant' || wert === 'vielleicht'))).map(([wert, icon, titel]) => (
          <button key={wert} title={titel} onClick={() => tendenzKlick(wert)} className={knopfKlasse(j.tendenz === wert)}>{icon}</button>
        ))}
        {!beworben && (
          <button title="nicht mehr verfügbar (offline oder besetzt)" onClick={() => tendenzKlick('weg')} className={knopfKlasse(j.tendenz === 'weg')}>🚫</button>
        )}
        {haupt === 'pruefen' && (
          <>
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
            <button title="Nach 4 · Bewerben schicken – ohne Tiefen-Check, Ordner und Dokumente gehen trotzdem" onClick={() => void nachBewerben()} className={knopfKlasse(false)}>📝</button>
          </>
        )}
        {/* ✉️ gehört zu „beworben“: in 4 · Bewerben ein Schalter (an = beworben, mit Eintrag in die Excel-Liste), sonst nur zum Rückgängigmachen */}
        {(beworben || mappeDa) && (
          <>
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
            <button
              onClick={() => (imBewerbenTab ? void beworbenUmschalten() : tendenzKlick('beworben'))}
              title={imBewerbenTab
                ? (beworben ? 'beworben – Klick: zurück nach 4 · Bewerben' : 'als beworben markieren – die Stelle wandert nach 5 · Beworben und in deine Excel-Liste')
                : 'zurück nach 4 · Bewerben (interessant)'}
              aria-pressed={beworben}
              className={knopfKlasse(beworben)}
            >
              ✉️{beworben && <span className="ml-0.5 text-[11px]">✓</span>}
            </button>
          </>
        )}
        <span className="min-w-0 text-[12.5px] text-good">{status}</span>
        <span className="flex-1" />
        {mappeDa && haupt === 'bewerben' && bereitFuerMappe(j) && <ChatKopierKnopf job={j} />}
        <TiefencheckKnopf job={j} />
      </div>
    </article>
  )
})

/** Passung der Stelle zu deinem Such-Prompt (KI-Bewertung) als Skala 1–5. */
function Passung({ score }: { score: number }) {
  const farbe = score >= 4 ? 'bg-good' : score === 3 ? 'bg-mid' : 'bg-bad'
  const text = score ? `Passung ${score} von 5` : 'noch nicht bewertet'
  return (
    <div role="img" aria-label={text} title={`${text} – wie gut die Stelle zu deinem Such-Prompt passt (KI-Bewertung). 5 = passt genau, 3 = teilweise, 1 = passt nicht.`} className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn('h-[18px] w-1.5 rounded-sm', i <= score ? farbe : 'bg-border')} />)}
      </div>
    </div>
  )
}
