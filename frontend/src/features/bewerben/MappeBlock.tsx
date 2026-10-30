import { useAblage } from '@/hooks/useAblage'
import { useMappen } from '@/hooks/useMappen'
import { mappenOrdner } from '@/lib/mappen'
import type { Job } from '@/types/job'

/** Fertige Bewerbungsmappe auf der Karte: Inhalt, Zeitpunkt und wo sie liegt. */
export function MappeBlock({ job }: { job: Job }) {
  const { anschreiben } = useMappen()
  const { ordner: zielordner, abgelegt, ablegen } = useAblage()
  const a = anschreiben[job.id]
  if (!a) return null
  if (a.fehler && !a.pfad) return <div className="rounded-xl bg-bad-bg px-3.5 py-3 text-bad">⚠ Anschreiben fehlgeschlagen: {a.fehler}</div>

  const ordner = mappenOrdner(a)
  const hatLebenslauf = (a.extra ?? []).some((p) => /\/(Lebenslauf|CV)\b/.test('/' + p))
  const inhalt = [
    a.art === 'keins' ? null : a.art === 'kurz' ? 'kurzes Anschreiben' : 'Anschreiben',
    a.kurznachricht ? 'Kurznachricht' : null,
    hatLebenslauf ? (a.sprache === 'en' ? 'CV (englisch)' : 'Lebenslauf') : null,
  ].filter(Boolean).join(' · ')
  const imZielordner = abgelegt[job.id] === a.am && zielordner

  return (
    <div className="rounded-lg bg-soft px-2.5 py-1.5 text-[13.5px]">
      <div className="font-bold">
        ✅ Mappe erstellt<span className="font-normal text-muted-foreground"> · {inhalt} · {new Date(a.am ?? '').toLocaleString('de-DE')}</span>
      </div>
      <div className="mt-[3px] text-muted-foreground">
        {imZielordner
          ? `Liegt in deinem Ordner „${zielordner}“${ordner ? ' → ' + ordner.replace(/\//g, ' → ') : ''}`
          : `Liegt im Projektordner: data\\anschreiben-dateien\\${ordner.replace(/\//g, '\\')}`}
        {!imZielordner && zielordner && (
          <button onClick={() => void ablegen(true)} className="ml-2 cursor-pointer text-primary">→ in „{zielordner}“ ablegen</button>
        )}
      </div>
      {a.fehler && <div className="text-bad">⚠ Letzter Versuch fehlgeschlagen: {a.fehler}</div>}
    </div>
  )
}
