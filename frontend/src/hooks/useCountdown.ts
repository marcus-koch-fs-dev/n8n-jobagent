import { useCallback, useEffect, useRef, useState } from 'react'

const SEKUNDEN = 5

/**
 * Statt einer Rückfrage: Countdown auf dem Knopf. `bestaetigen()` löst mit true auf, wenn er abläuft;
 * `abbrechen()` (zweiter Klick) löst mit false auf. `text(normal)` ist der Knopftext, `laeuft` färbt den Knopf rot.
 */
export function useCountdown() {
  const [rest, setRest] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const fertig = useRef<((ok: boolean) => void) | null>(null)

  const beenden = useCallback((ok: boolean) => {
    clearInterval(timer.current)
    setRest(null)
    fertig.current?.(ok)
    fertig.current = null
  }, [])

  const bestaetigen = useCallback(() => new Promise<boolean>((resolve) => {
    fertig.current = resolve
    let n = SEKUNDEN
    setRest(n)
    timer.current = setInterval(() => {
      n -= 1
      if (n <= 0) beenden(true)
      else setRest(n)
    }, 1000)
  }), [beenden])

  useEffect(() => () => beenden(false), [beenden])
  return {
    laeuft: rest !== null,
    text: (normal: string) => (rest !== null ? `✕ Abbrechen (${rest})` : normal),
    bestaetigen,
    abbrechen: () => beenden(false),
  }
}
