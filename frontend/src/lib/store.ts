import { useSyncExternalStore } from 'react'

/** Kleiner Speicher außerhalb von React, den mehrere Komponenten gemeinsam lesen. */
export interface Store<T> {
  get: () => T
  set: (neu: T) => void
  subscribe: (f: () => void) => () => void
}

export function createStore<T>(anfang: T): Store<T> {
  let wert = anfang
  const hoerer = new Set<() => void>()
  return {
    get: () => wert,
    set(neu) { wert = neu; hoerer.forEach((f) => f()) },
    subscribe(f) { hoerer.add(f); return () => { hoerer.delete(f) } },
  }
}

export const useStore = <T,>(s: Store<T>): T => useSyncExternalStore(s.subscribe, s.get)