import { speicherLesen, speicherSchreiben } from '@/lib/speicher'
import { createStore, useStore } from '@/lib/store'

type Theme = 'auto' | 'hell' | 'dunkel'
const FOLGE: Theme[] = ['auto', 'hell', 'dunkel']

const gespeichert = speicherLesen('theme')
const store = createStore<Theme>(gespeichert === 'hell' || gespeichert === 'dunkel' ? gespeichert : 'auto')

/** Setzt `data-theme` am <html>: „auto“ = System (prefers-color-scheme), sonst erzwungen. */
function anwenden(t: Theme) {
  const el = document.documentElement
  if (t === 'auto') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t === 'hell' ? 'light' : 'dark')
}

/** Einmal vor dem ersten Rendern aufrufen, damit nichts aufblitzt. */
export const themeStarten = () => anwenden(store.get())

export function useTheme() {
  return {
    theme: useStore(store),
    weiter() {
      const neu = FOLGE[(FOLGE.indexOf(store.get()) + 1) % FOLGE.length]
      speicherSchreiben('theme', neu)
      anwenden(neu)
      store.set(neu)
    },
  }
}
