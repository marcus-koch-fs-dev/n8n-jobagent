import fs from 'node:fs'
import path from 'node:path'
import { LV_DIR, PROFIL_DIR } from '../config.js'
import type { LebenslaufZeile } from '../types.js'
import { textLesen } from '../lib/util.js'
import { profilDatei, profilJsonAendern } from './profilDatei.js'

// Lebensläufe je Bereich: profil.json → lebenslaeufe: [{ id, bereich, de: {datei, zeichen}, en: {…} }].
// Dateien in profil/lebenslaeufe/<id>/de.<ext> (Original) und de.txt (Text für die KI), ebenso en.

export const lvZeilen = (): LebenslaufZeile[] => {
  const z = profilDatei().lebenslaeufe
  return Array.isArray(z) ? z : []
}

export const lvText = (id: string, sprache: string): string => textLesen(path.join(LV_DIR, id, sprache + '.txt'))

/** Original-Datei (PDF, Word …) einer Zeile und Sprache, oder null. */
function lvOriginal(id: string, sprache: string): string | null {
  try {
    const f = fs.readdirSync(path.join(LV_DIR, id)).find((x) => x.startsWith(sprache + '.') && !/\.txt$/i.test(x))
    return f ? path.join(LV_DIR, id, f) : null
  } catch {
    return null
  }
}

/** Eine Zeilen-ID ist nur Kleinbuchstaben und Ziffern – sie wird als Ordnername benutzt. */
export const lvIdOk = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9]{4,20}$/.test(id)

export const lvSpeichern = (fn: (z: LebenslaufZeile[]) => LebenslaufZeile[]): void =>
  profilJsonAendern((p) => { p.lebenslaeufe = fn(Array.isArray(p.lebenslaeufe) ? p.lebenslaeufe : []) })

/** Alle Dateien einer Sprache in einer Zeile entfernen (vor dem Hochladen einer neuen). */
export function lvDateienWeg(id: string, sprache: string): void {
  try {
    for (const f of fs.readdirSync(path.join(LV_DIR, id)).filter((f) => f.startsWith(sprache + '.'))) fs.unlinkSync(path.join(LV_DIR, id, f))
  } catch {
    /* war nicht da */
  }
}

export interface LebenslaufWahl {
  text: string
  original: string | null
  quelle: string
  sprache: 'de' | 'en'
}

/**
 * Welcher Lebenslauf gilt für diese Stelle? Zeile des Bereichs; was dort fehlt, ersetzt der Standard.
 * Deutsch: Bereich-DE → Standard-DE. Englisch: Bereich-EN → Standard-EN → Bereich-DE → Standard-DE.
 * Gibt null zurück, wenn gar nichts da ist.
 */
export function lebenslaufWaehlen(bereich: unknown, en: boolean): LebenslaufWahl | null {
  const wanted = String(bereich || '').trim().toLowerCase()
  const z = wanted ? lvZeilen().find((x) => String(x.bereich || '').trim().toLowerCase() === wanted) : null
  const orig = (re: RegExp): string | null => {
    const f = fs.readdirSync(PROFIL_DIR).find((x) => re.test(x) && !/\.txt$/i.test(x))
    return f ? path.join(PROFIL_DIR, f) : null
  }
  const zeile = (sprache: 'de' | 'en'): LebenslaufWahl | null =>
    (z ? { text: lvText(z.id, sprache), original: lvOriginal(z.id, sprache), quelle: z.bereich, sprache } : null)
  const standard = (sprache: 'de' | 'en'): LebenslaufWahl => (sprache === 'en'
    ? { text: textLesen(path.join(PROFIL_DIR, 'lebenslauf_en.txt')), original: orig(/^cv_en\./i), quelle: 'Standard', sprache: 'en' }
    : { text: textLesen(path.join(PROFIL_DIR, 'lebenslauf.txt')), original: orig(/^lebenslauf\./i), quelle: 'Standard', sprache: 'de' })
  const reihe = en ? [zeile('en'), standard('en'), zeile('de'), standard('de')] : [zeile('de'), standard('de')]
  return reihe.find((c): c is LebenslaufWahl => Boolean(c && (c.text || c.original))) ?? null
}
