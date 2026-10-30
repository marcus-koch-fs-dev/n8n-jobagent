import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pauseSetzen } from '@/api/dienst'
import { lauflage, startLaeuft } from '@/lib/lauflage'
import { useJobs } from './useJobs'
import { startZeitLoeschen, useKomplettlauf } from './useKomplettlauf'
import { useLaeufe } from './useLaeufe'
import { useAnschreiben, useEinstellungen, useLaufStatus } from './useLaufStatus'
import { useToast } from './useToast'

/** Was der Lauf-Kasten zeigt – samt den Seiteneffekten (Pause zurücksetzen, Daten neu laden). */
export function useLaufLage() {
  const qc = useQueryClient()
  const melden = useToast()
  const { data: status } = useLaufStatus()
  const { data: einst } = useEinstellungen()
  const { data: jobsAntwort } = useJobs()
  const { data: anschreiben } = useAnschreiben()
  const { laeufe, vergessen } = useLaeufe()
  const { startZeit } = useKomplettlauf()

  // Sekundentakt nur, solange „wird gestartet“ zählt
  const [jetzt, setJetzt] = useState(() => Date.now())
  useEffect(() => {
    if (!startZeit) return
    const t = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startZeit])
  const stempel = startZeit ? jetzt : Date.now()

  const lage = useMemo(
    () => status && lauflage({ status, startZeit, einst, jobs: jobsAntwort?.jobs ?? [], laeufe, anschreiben: anschreiben ?? {}, jetzt: stempel }),
    [status, startZeit, einst, jobsAntwort, laeufe, anschreiben, stempel],
  )

  // Start-Anzeige beenden: Pipeline hat sich gemeldet oder 3 min sind um
  useEffect(() => {
    if (status && startZeit && !startLaeuft(status, startZeit, stempel)) startZeitLoeschen()
  }, [status, startZeit, stempel])

  // Alle Stellen durch → Daten einmal neu laden
  const gemeldet = useRef('')
  useEffect(() => {
    if (lage?.art !== 'fertig' || gemeldet.current === lage.schluessel) return
    gemeldet.current = lage.schluessel
    void qc.invalidateQueries({ queryKey: ['jobs'] })
    void qc.invalidateQueries({ queryKey: ['anschreiben'] })
  }, [lage, qc])

  // Angehaltener Tiefen-Check/Anschreiben: Schalter zurücksetzen, sobald n8n die Pause gesehen hat; Lauf vergessen
  const zurueckgesetzt = useRef('')
  useEffect(() => {
    if (lage?.art !== 'haeltAn' || !lage.zuruecksetzen || !status) return
    const schluessel = `${lage.name}:${status.letzteAbfrage}:${status.gesetztAm}`
    if (zurueckgesetzt.current === schluessel) return
    zurueckgesetzt.current = schluessel
    const art = lage.name === 'Tiefen-Check' ? 'tc' : 'an'
    void (async () => {
      await pauseSetzen(false)
      vergessen(art)
      melden(`${lage.name} angehalten. Offene Stellen kannst du jederzeit neu starten.`)
      void qc.invalidateQueries({ queryKey: ['pause-status'] })
    })()
  }, [lage, status, vergessen, melden, qc])

  return { lage, status }
}