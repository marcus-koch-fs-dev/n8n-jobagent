// localStorage mit try/catch. Präfix und Schlüssel sind wie in neu.html, damit gemerkte Werte erhalten bleiben.
const PRAEFIX = 'stellen.'

export function speicherLesen(key: string): string | null {
  try { return localStorage.getItem(PRAEFIX + key) } catch { return null }
}

export function speicherSchreiben(key: string, wert: string): void {
  try { localStorage.setItem(PRAEFIX + key, wert) } catch { /* privater Modus o. Ä. */ }
}

export const jsonSchreiben = (key: string, wert: unknown): void => speicherSchreiben(key, JSON.stringify(wert))

export function jsonLesen<T>(key: string, fallback: T): T {
  try { return JSON.parse(speicherLesen(key) ?? '') as T } catch { return fallback }
}