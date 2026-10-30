import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { entferneDatei, ladeDateiHoch } from '@/api/dienst'
import { Button } from '@/components/ui/button'
import { useProfil } from '@/hooks/useProfil'
import { dateiStatus } from '@/lib/profil'
import type { Profil } from '@/types/profil'

/** Datei zum Hochladen (Word-Vorlage, Beispiel, Lebenslauf Englisch) mit Status und „entfernen“. Speichert sich selbst. */
export function DateiZeile({ art, titel, accept, info }: { art: string; titel: string; accept: string; info: string }) {
  const qc = useQueryClient()
  const { profil } = useProfil()
  const eingabe = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState('')
  const d = profil?.anschreiben_dateien?.[art]

  const aendereCache = (f: (alt: NonNullable<Profil['anschreiben_dateien']>) => NonNullable<Profil['anschreiben_dateien']>) =>
    qc.setQueryData<Profil>(['profil'], (p) => (p ? { ...p, anschreiben_dateien: f(p.anschreiben_dateien ?? {}) } : p))

  const hochladen = async () => {
    const datei = eingabe.current?.files?.[0]
    if (!datei) return setMeldung('Bitte zuerst eine Datei auswählen.')
    setMeldung('lädt hoch …')
    try {
      const r = await ladeDateiHoch(art, datei)
      aendereCache((alt) => ({ ...alt, [art]: r }))
      setMeldung('')
    } catch (e) {
      setMeldung('⚠ ' + (e as Error).message)
    }
  }
  const entfernen = async () => {
    await entferneDatei(art)
    aendereCache(({ [art]: _weg, ...rest }) => rest)
    setMeldung('')
  }

  return (
    <div>
      <div><b>{titel}</b><span className="text-[14px] text-muted-foreground"> · {info}</span></div>
      <span className="text-[14px] text-muted-foreground">{meldung || dateiStatus(d)}</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input ref={eingabe} type="file" accept={accept} className="text-[14px]" />
        <Button variant="ghost" onClick={hochladen}>Hochladen</Button>
        {d && <button onClick={entfernen} className="cursor-pointer rounded-md px-1 py-0.5 text-[13px] text-muted-foreground hover:bg-soft hover:text-primary">✕ entfernen</button>}
      </div>
    </div>
  )
}