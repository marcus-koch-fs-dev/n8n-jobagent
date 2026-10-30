import { useCallback } from 'react'
import { ladeAnzeigentext, ladeProfil } from '@/api/dienst'
import { chatAnweisungText, chatStelleText } from '@/lib/chat'
import { speicherLesen, speicherSchreiben } from '@/lib/speicher'
import { createStore, useStore } from '@/lib/store'
import type { Job } from '@/types/job'
import { useToast } from './useToast'

// Haken „Anweisungen + Lebenslauf mitkopieren“: an = in jedem neuen Chat nutzbar, aus = nur die Stelle (Anweisungen liegen im Chat-Projekt).
const mitAnweisung = createStore(speicherLesen('chatMitAnweisung') !== 'nein')

export function useChat() {
  const melden = useToast()
  const mit = useStore(mitAnweisung)

  const mitSetzen = (an: boolean) => {
    mitAnweisung.set(an)
    speicherSchreiben('chatMitAnweisung', an ? 'ja' : 'nein')
  }

  /** Text für diese Stelle in die Zwischenablage; true bei Erfolg. */
  const stelleKopieren = useCallback(async (j: Job) => {
    try {
      const anzeige = j.cache_id ? await ladeAnzeigentext(j.cache_id) : ''
      const anweisung = mitAnweisung.get() ? chatAnweisungText(await ladeProfil()) : undefined
      await navigator.clipboard.writeText(chatStelleText(j, anzeige, anweisung))
      return true
    } catch (e) {
      melden('Kopieren ging nicht: ' + (e as Error).message, { fehler: true })
      return false
    }
  }, [melden])

  return { mit, mitSetzen, stelleKopieren }
}