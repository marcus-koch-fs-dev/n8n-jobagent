import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ladeProfil, speichereProfil } from '@/api/dienst'
import { entwurfAus, speicherBody, type Entwurf } from '@/lib/profil'
import { startWahl } from '@/lib/modellwahl'
import { createStore, useStore } from '@/lib/store'
import { useModelle } from './useModelle'

// Ungespeicherte Änderungen liegen außerhalb der Seite, damit beim Tab-Wechsel nichts verloren geht.
// Gespeichert wird nur per Knopf (oder Strg+S).
interface Stand {
  /** Gesetzt = es gibt ungespeicherte Änderungen */
  entwurf: Entwurf | null
  info: string
  /** „rückgängig“-Link in der Speicher-Leiste (nach „Standard wiederherstellen“) */
  zurueck: (() => void) | null
}
const stand = createStore<Stand>({ entwurf: null, info: '', zurueck: null })

export function useProfil() {
  const qc = useQueryClient()
  const profil = useQuery({ queryKey: ['profil'], queryFn: ladeProfil, refetchOnMount: 'always' })
  const { stand: modelle } = useModelle()
  const s = useStore(stand)

  // Solange nichts geändert ist, kommt alles vom Server – ein Neuladen überschreibt nie ungespeicherte Eingaben.
  const basis = useMemo(() => (profil.data ? entwurfAus(profil.data, startWahl(profil.data.modelle, modelle)) : null), [profil.data, modelle])
  const entwurf = s.entwurf ?? basis

  const aendern = (teil: Partial<Entwurf>) => {
    if (!entwurf) return
    stand.set({ ...stand.get(), entwurf: { ...entwurf, ...teil }, info: '● Ungespeicherte Änderungen', zurueck: null })
  }

  /** Feld mit einer Vorlage überschreiben – ohne Rückfrage, dafür mit „rückgängig“. */
  const vorlageEinsetzen = (feld: 'kriterien' | 'anschreiben_prompt' | 'tiefencheck_prompt', vorlage: string) => {
    if (!entwurf) return
    const vorher = entwurf[feld]
    aendern({ [feld]: vorlage })
    stand.set({
      ...stand.get(), info: '● Standard eingesetzt – noch nicht gespeichert',
      zurueck: () => {
        stand.set({ ...stand.get(), entwurf: { ...stand.get().entwurf!, [feld]: vorher }, info: '● Ungespeicherte Änderungen (rückgängig gemacht)', zurueck: null })
      },
    })
  }

  const speichern = async () => {
    if (!entwurf) return
    stand.set({ ...stand.get(), info: 'Speichere …', zurueck: null })
    try {
      const r = await speichereProfil(speicherBody(entwurf))
      qc.setQueryData(['profil'], (alt: object | undefined) => ({ ...alt, ...r }))
      void qc.invalidateQueries({ queryKey: ['profil'] })
      void qc.invalidateQueries({ queryKey: ['einstellungen'] })
      stand.set({ entwurf: null, zurueck: null, info: `✓ gespeichert um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – gilt ab dem nächsten Lauf` })
    } catch (e) {
      stand.set({ ...stand.get(), info: '⚠ ' + (e as Error).message })
    }
  }

  return {
    profil: profil.data, fehler: profil.isError, entwurf, aendern, vorlageEinsetzen, speichern,
    ungespeichert: s.entwurf !== null, info: s.info, zurueck: s.zurueck,
  }
}

/** Einmal in der App einhängen: Browser warnt beim Schließen, solange Einstellungen ungespeichert sind. */
export function useUngespeichertWarnung() {
  const ungespeichert = useStore(stand).entwurf !== null
  useEffect(() => {
    if (!ungespeichert) return
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [ungespeichert])
}

export const ungespeichertJetzt = () => stand.get().entwurf !== null