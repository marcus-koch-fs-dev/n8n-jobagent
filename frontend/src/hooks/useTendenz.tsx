import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { jobsAktion } from '@/api/n8n'
import { jobAusCache, patchJob } from '@/lib/cache'
import { jobName, TENDENZ_NAME } from '@/lib/job'
import { useToast } from './useToast'
import type { Job } from '@/types/job'

interface Letzte { id: number; alt: string }

interface TendenzApi {
  /** Setzt die Tendenz optimistisch; bei Fehler wird zurückgerollt. */
  setzen: (job: Job, wert: string, opts?: { ohneUndo?: boolean }) => Promise<boolean>
  rueckgaengig: () => Promise<void>
  /** Tooltip für den Rückgängig-Knopf; null = nichts zu tun. */
  undoText: string | null
}

const Ctx = createContext<TendenzApi | null>(null)

export function useTendenz() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTendenz braucht den TendenzProvider')
  return c
}

export function TendenzProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const melden = useToast()
  const [letzte, setLetzte] = useState<Letzte | null>(null)
  // Die Funktionen unten brauchen immer den aktuellen Stand, ohne bei jedem Klick neu gebaut zu werden.
  const letzteRef = useRef(letzte)
  letzteRef.current = letzte

  const setzen = useCallback<TendenzApi['setzen']>(async (job, wert, opts) => {
    const alt = String(job.tendenz ?? '')
    const altZeit = job.tendenz_geaendert_am
    await qc.cancelQueries({ queryKey: ['jobs'] }) // kein laufender Abruf überschreibt die Änderung
    patchJob(qc, job.id, { tendenz: wert, tendenz_geaendert_am: new Date().toISOString() })
    try {
      await jobsAktion(job.id, 'tendenz', wert)
    } catch (e) {
      patchJob(qc, job.id, { tendenz: alt, tendenz_geaendert_am: altZeit })
      melden(`Speichern fehlgeschlagen: ${(e as Error).message}`, { fehler: true })
      return false
    }
    if (!opts?.ohneUndo && alt !== wert) {
      setLetzte({ id: job.id, alt })
      melden(`${jobName(job)} → ${TENDENZ_NAME[wert] ?? wert}`, {
        aktion: { label: 'Rückgängig (Strg+Z)', onClick: () => void rueckgaengigRef.current() },
      })
    }
    return true
  }, [qc, melden])

  const rueckgaengig = useCallback(async () => {
    const l = letzteRef.current
    if (!l) return
    const job = jobAusCache(qc, l.id)
    setLetzte(null)
    if (!job) return
    if (await setzen(job, l.alt, { ohneUndo: true })) {
      melden(`Rückgängig: ${jobName(job)} ist wieder ${TENDENZ_NAME[l.alt] ?? l.alt}.`)
    }
  }, [qc, setzen, melden])

  const rueckgaengigRef = useRef(rueckgaengig)
  rueckgaengigRef.current = rueckgaengig

  // Strg+Z außerhalb von Eingabefeldern
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const ziel = e.target instanceof Element ? e.target : null
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !ziel?.closest('input, textarea, select, [contenteditable]') && letzteRef.current) {
        e.preventDefault()
        void rueckgaengigRef.current()
      }
    }
    document.addEventListener('keydown', f)
    return () => document.removeEventListener('keydown', f)
  }, [])

  const job = letzte ? jobAusCache(qc, letzte.id) : undefined
  const undoText = letzte && job ? `Rückgängig (Strg+Z): ${jobName(job)} wieder ${TENDENZ_NAME[letzte.alt] ?? letzte.alt}` : null

  const wert = useMemo(() => ({ setzen, rueckgaengig, undoText }), [setzen, rueckgaengig, undoText])
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>
}