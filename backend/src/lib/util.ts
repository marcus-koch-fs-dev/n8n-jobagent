import crypto from 'node:crypto'
import fs from 'node:fs'

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
export const sha1 = (s: string): string => crypto.createHash('sha1').update(s).digest('hex')
export const idForUrl = (url: string): string => sha1(url).slice(0, 16)
export const log = (...a: unknown[]): void => console.log(new Date().toISOString(), ...a)

/** JSON aus einer Datei lesen; bei fehlender oder kaputter Datei den Standardwert. */
export function jsonLesen<T>(datei: string, vorgabe: T): T {
  try { return JSON.parse(fs.readFileSync(datei, 'utf8')) as T } catch { return vorgabe }
}

/** Text aus einer Datei lesen; bei fehlender Datei leerer Text. */
export function textLesen(datei: string): string {
  try { return fs.readFileSync(datei, 'utf8') } catch { return '' }
}

/** Kurzer Fingerabdruck eines Textes (ohne Groß/Klein und Leerzeichen-Unterschiede) – für die Seite und n8n. */
export const textHash = (text: string): string => sha1(text.toLowerCase().replace(/\s+/g, ' ')).slice(0, 20)
