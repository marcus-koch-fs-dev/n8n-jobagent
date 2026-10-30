import { jsonSchreiben, jsonLesen } from '@/lib/speicher'
import { createStore, useStore } from '@/lib/store'

// „Schon geöffnet“-Markierung der aktuellen Runde und Reihenfolge der letzten Tab-Gruppe.
interface Stand { geoeffnet: ReadonlySet<number>; gruppe: readonly number[] }
const stand = createStore<Stand>({
  geoeffnet: new Set(jsonLesen<number[]>('geoeffnetRunde', [])),
  gruppe: jsonLesen<number[]>('letzteGruppe', []),
})

export function useGeoeffnet() {
  const s = useStore(stand)
  return {
    ...s,
    markieren(id: number) {
      const geoeffnet = new Set(stand.get().geoeffnet).add(id)
      jsonSchreiben('geoeffnetRunde', [...geoeffnet])
      stand.set({ ...stand.get(), geoeffnet })
    },
    /** Neue Runde: Hervorhebung nur für diese Gruppe. */
    gruppeSetzen(ids: number[]) {
      jsonSchreiben('letzteGruppe', ids)
      jsonSchreiben('geoeffnetRunde', ids)
      stand.set({ geoeffnet: new Set(ids), gruppe: ids })
    },
  }
}
