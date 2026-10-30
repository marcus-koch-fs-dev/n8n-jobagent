import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useProfil } from '@/hooks/useProfil'
import { speicherLesen, speicherSchreiben } from '@/lib/speicher'
import { cn } from '@/lib/utils'
import { AnschreibenKarte } from './AnschreibenKarte'
import { LebenslaufKarte } from './LebenslaufKarte'
import { ModellKarte } from './ModellKarte'
import { SuchPromptKarte } from './SuchPromptKarte'
import { TiefencheckKarte } from './TiefencheckKarte'

const ABSCHNITTE: [string, string][] = [
  ['suchprompt', '🎯 Such-Prompt'], ['tiefencheck', '🔍 Tiefen-Check'], ['lebenslaeufe', '📄 Lebensläufe'], ['anschreiben', '✉️ Anschreiben'], ['modelle', '🧠 KI-Modell'],
]

export function Einstellungen() {
  const [tab, setTab] = useState(() => { const t = speicherLesen('einstellungenTab'); return ABSCHNITTE.some(([id]) => id === t) ? t : 'suchprompt' })
  const waehlen = (id: string) => { setTab(id); speicherSchreiben('einstellungenTab', id) }
  const { entwurf, fehler, speichern, ungespeichert, info, zurueck } = useProfil()

  // Strg+S speichert (nur hier, solange die Einstellungen offen sind)
  const speichernRef = useRef(speichern)
  speichernRef.current = speichern
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void speichernRef.current() }
    }
    document.addEventListener('keydown', f)
    return () => document.removeEventListener('keydown', f)
  }, [])

  return (
    <div className="pt-3.5">
      {!entwurf ? (
        <p className="py-6 text-muted-foreground">{fehler ? '⚠ Profil konnte nicht geladen werden' : 'lädt …'}</p>
      ) : (
        <>
          <nav className="mb-3 flex gap-0.5 overflow-x-auto border-b border-border" role="tablist" aria-label="Einstellungen">
            {ABSCHNITTE.map(([id, label]) => (
              <button
                key={id} role="tab" aria-selected={tab === id} onClick={() => waehlen(id)}
                className={cn(
                  'cursor-pointer whitespace-nowrap border-b-[3px] border-transparent px-3.5 py-2 text-[15px] text-muted-foreground',
                  tab === id && 'border-primary font-semibold text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'suchprompt' && <SuchPromptKarte />}
          {tab === 'tiefencheck' && <TiefencheckKarte />}
          {tab === 'lebenslaeufe' &&<LebenslaufKarte />}
          {tab === 'anschreiben' && <AnschreibenKarte />}
          {tab === 'modelle' && <ModellKarte />}
        </>
      )}
      {/* Speicher-Leiste: klebt beim Scrollen am unteren Rand, egal wo du gerade bist */}
      <div className={cn('sticky bottom-0 z-4 -mx-4 mb-6 flex items-center gap-2.5 border-t border-border bg-background px-4 py-2.5', ungespeichert && 'bg-soft')}>
        <Button onClick={() => void speichern()} title="Strg+S">Einstellungen speichern</Button>
        <span className={cn('text-[14px] text-muted-foreground', ungespeichert && 'font-semibold text-foreground')}>
          {info}
          {zurueck && <> · <a href="#einstellungen" className="text-primary" onClick={(e) => { e.preventDefault(); zurueck() }}>rückgängig</a></>}
        </span>
      </div>
    </div>
  )
}