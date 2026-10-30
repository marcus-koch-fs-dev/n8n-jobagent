import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pauseSetzen } from '@/api/dienst'
import { auswertenStarten, komplettlauf } from '@/api/n8n'
import { createStore, useStore } from '@/lib/store'
import { useToast } from './useToast'

// Zwischen Klick und erstem Lebenszeichen der Pipeline vergehen oft 10–60 s – so lange „wird gestartet“ zeigen.
const startZeitStore = createStore(0)

export const startZeitLoeschen = () => startZeitStore.set(0)

export function useKomplettlauf() {
  const startZeit = useStore(startZeitStore)
  const qc = useQueryClient()
  const melden = useToast()

  const starten = useCallback(async (bisSchritt: number) => {
    startZeitStore.set(Date.now())
    try {
      await komplettlauf(bisSchritt)
      void qc.invalidateQueries({ queryKey: ['pause-status'] })
    } catch (e) {
      startZeitStore.set(0)
      melden(`Konnte nicht starten: ${(e as Error).message} – ist der Workflow „Komplettlauf“ in n8n veröffentlicht?`, { fehler: true })
    }
  }, [qc, melden])

  /** Nur Schritt 3 und 4 für Stellen, die schon Text haben. Eine normale Pause wird dafür aufgehoben. */
  const auswerten = useCallback(async (pausiert: boolean) => {
    startZeitStore.set(Date.now())
    try {
      if (pausiert) await pauseSetzen(false)
      await auswertenStarten()
      void qc.invalidateQueries({ queryKey: ['pause-status'] })
    } catch (e) {
      startZeitStore.set(0)
      melden(`Konnte nicht starten: ${(e as Error).message} – ist der Workflow „Schritt 3 · KI liest Fakten“ in n8n veröffentlicht?`, { fehler: true })
    }
  }, [qc, melden])

  return { startZeit, starten, auswerten }

}
