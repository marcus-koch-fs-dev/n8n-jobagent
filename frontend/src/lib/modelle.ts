import type { Einstellungen, ModellWahl } from '@/types/lauf'

const grossgeschrieben = (s: string) => s[0].toUpperCase() + s.slice(1)

/** claude-haiku-5-5 → „Haiku (Claude online)“, lokale Modelle mit Hinweis. */
export function modellKurz(m?: ModellWahl | null): string {
  if (!m) return '?'
  const c = String(m.modell ?? '').match(/^claude-(\w+)/)
  if (c) return grossgeschrieben(c[1]) + ' (Claude online)'
  return (m.modell || m.anbieter) + (m.anbieter === 'lokal' ? ' (lokal, Grafikkarte)' : '')
}

/** Modell, das für eine Aufgabe eingestellt ist, ganz kurz: „Sonnet“. */
export function modellFuer(einst: Einstellungen | undefined, key: string): string {
  const modelle = einst?.modelle ?? {}
  const m = modelle[key] ?? (key === 'einordnung' ? modelle.fakten : undefined)
  if (!m) return ''
  const c = String(m.modell ?? '').match(/^claude-(\w+)/)
  return c ? grossgeschrieben(c[1]) : (m.modell || m.anbieter || '')
}

/** Münzen als grobe Kostenstufe: 💰 günstig (Haiku) · 💰💰 mittel (Sonnet) · 💰💰💰 teuer (Opus). */
export function muenzenModell(id?: string | null): string {
  const m = String(id ?? '')
  const n = /haiku/.test(m) ? 1 : /sonnet/.test(m) ? 2 : /opus/.test(m) ? 3 : 0
  return n ? ' ' + '💰'.repeat(n) : ''
}