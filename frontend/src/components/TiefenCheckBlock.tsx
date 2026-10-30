import type { ReactNode } from 'react'
import { useOffen } from '@/hooks/useOffen'
import { ANFORDERUNG_ICON, tcEmpfehlung, tcLesen } from '@/lib/tiefencheck'
import { cn } from '@/lib/utils'
import type { Job } from '@/types/job'
import type { TiefenCheck } from '@/types/tiefencheck'

const PUNKT = { good: 'bg-good', mid: 'bg-mid', bad: 'bg-bad', '': 'bg-border' }

const istLeer = (v: ReactNode | ReactNode[] | undefined) => !v || (Array.isArray(v) && !v.length)

function Liste({ items, geordnet }: { items?: string[]; geordnet?: boolean }) {
  const Tag = geordnet ? 'ol' : 'ul'
  return <Tag className={cn('m-0 pl-[18px]', geordnet ? 'list-decimal' : 'list-disc')}>{(items ?? []).map((x, i) => <li key={i}>{x}</li>)}</Tag>
}

function abschnitte(d: TiefenCheck, j: Job): [string, ReactNode][] {
  const v = d.aufgaben_vergleich ?? {}
  const alle: [string, ReactNode | undefined][] = [
    ['Aufgaben vs. du', v.urteil ? <div>{v.bezug_suchprompt && <div className="text-[13.5px] italic text-muted-foreground">{v.bezug_suchprompt}</div>}{v.urteil}</div> : undefined],
    ['Fazit', d.kurzfazit && d.fazit ? d.fazit : undefined],
    ['Anforderungen', d.anforderungen?.length ? (
      <div className="grid gap-[3px]">
        {d.anforderungen.map((a, i) => <div key={i}>{ANFORDERUNG_ICON[a.status] ?? '•'} <b>{a.anforderung}</b>{a.beleg && <span className="text-muted-foreground"> – {a.beleg}</span>}</div>)}
      </div>
    ) : undefined],
    ['Klartext', d.klartext?.length ? (
      <div className="grid gap-[3px]">{d.klartext.map((k, i) => <div key={i}><i>„{k.begriff}“</i> → {k.bedeutet}</div>)}</div>
    ) : undefined],
    ['Remote', d.remote_einschaetzung],
    ['Firma', d.firma],
    ['Warnsignale', d.warnsignale],
    ['Für dich spricht', d.argumente?.length ? <Liste items={d.argumente} geordnet /> : undefined],
    ['Fragen fürs Gespräch', d.fragen?.length ? <Liste items={d.fragen} /> : undefined],
    ['Geprüft', `${String(j.tc_modell ?? '').replace(/^claude:/, '')}, ${new Date(j.tc_am ?? '').toLocaleString('de-DE')}`],
  ]
  return alle.filter((a): a is [string, ReactNode] => !istLeer(a[1]))
}

function Block({ job: j, d }: { job: Job; d: TiefenCheck }) {
  const [text, farbe] = tcEmpfehlung(d)
  const [offen, setOffen] = useOffen(j.id, text)
  const satz = d.kurzfazit || d.fazit || ''
  return (
    <details open={offen} onToggle={(e) => setOffen(e.currentTarget.open)} className="rounded-lg bg-soft px-2.5 py-1.5">
      <summary className="flex cursor-pointer list-none items-center text-[13.5px] font-bold [&::-webkit-details-marker]:hidden">
        <span className={cn('mr-[7px] size-[0.7em] flex-none rounded-full', PUNKT[farbe])} /><span className="mr-1 font-normal text-muted-foreground">Tiefen-Check:</span>{text}
      </summary>
      {satz && <div className="mt-[3px] text-[13.5px]">{satz}</div>}
      <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        {abschnitte(d, j).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0">{v}</dd></div>
        ))}
      </dl>
    </details>
  )
}

/** Ergebnis des Tiefen-Checks auf der Karte: eingeklappt Punkt + Empfehlung, aufgeklappt Fazit und Details. */
export function TiefenCheckBlock({ job }: { job: Job }) {
  const d = tcLesen(job)
  if (!d) return null
  if (d.fehler) return <div className="rounded-xl bg-bad-bg px-3.5 py-3 text-bad">⚠ Tiefen-Check fehlgeschlagen: {d.fehler}</div>
  return <Block job={job} d={d} />
}