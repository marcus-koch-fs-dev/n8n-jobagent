import fs from 'node:fs'
import { PROFIL_JSON } from '../config.js'
import type { ProfilDatei } from '../types.js'
import { jsonLesen } from '../lib/util.js'

// Zugriff auf profil/profil.json – eigenes Modul, damit Profil und Lebensläufe sich nicht gegenseitig importieren.

/** Inhalt von profil/profil.json lesen (fehlt die Datei oder ist sie kaputt, leer). */
export const profilDatei = (): ProfilDatei => jsonLesen<ProfilDatei>(PROFIL_JSON, {})

/** Profil-Datei ändern: liest, verändert, schreibt. */
export function profilJsonAendern(fn: (p: ProfilDatei) => void): void {
  const p = profilDatei()
  fn(p)
  fs.writeFileSync(PROFIL_JSON, JSON.stringify(p, null, 2))
}
