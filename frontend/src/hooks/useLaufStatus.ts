import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ladeAnschreiben, ladeEinstellungen, ladePauseStatus } from '@/api/dienst'
import { istAktiv } from '@/lib/lauflage'
import { laeufeVomDienst, useLaeufe } from './useLaeufe'

/** Status des Browser-Dienstes, alle 10 s. Läufe, die der Dienst kennt, werden übernommen. */
export function useLaufStatus() {
  const q = useQuery({ queryKey: ['pause-status'], queryFn: ladePauseStatus, refetchInterval: 10_000 })
  useEffect(() => laeufeVomDienst(q.data?.laeufe), [q.data])
  return { ...q, aktiv: q.data ? istAktiv(q.data) : false }
}

/** Welches KI-Modell für welche Aufgabe eingestellt ist (für Hinweise und Kostenschätzung). */
export function useEinstellungen() {
  return useQuery({ queryKey: ['einstellungen'], queryFn: ladeEinstellungen, staleTime: 30_000 })
}

/** Mappen der Anschreiben; wird nur häufiger abgefragt, solange ein Anschreiben-Lauf geführt wird. */
export function useAnschreiben() {
  const { laeufe } = useLaeufe()
  return useQuery({ queryKey: ['anschreiben'], queryFn: ladeAnschreiben, staleTime: 60_000, refetchInterval: laeufe.an ? 10_000 : false })
}