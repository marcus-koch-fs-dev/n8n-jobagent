import fs from 'node:fs'
import path from 'node:path'
import { ANSCHREIBEN_MD, ANSCHREIBEN_STANDARD_MD, KRITERIEN_MD, PROFIL_DIR, PROFIL_JSON, TIEFENCHECK_MD } from '../config.js'
import type { DateiInfo, ProfilDatei } from '../types.js'
import { textLesen } from '../lib/util.js'
import { lvZeilen, lvText } from './lebenslaeufe.js'
import { profilDatei, profilJsonAendern } from './profilDatei.js'

/** Modell-Auswahl je Funktion (Schlüssel wie in den n8n-Workflows). */
const FUNKTIONEN = ['fakten', 'bewertung', 'zweitmeinung', 'einordnung', 'tiefencheck', 'anschreiben'] as const

/** Dateien fürs Anschreiben: Word-Vorlagen mit Platzhaltern, Beispiel und englischer Lebenslauf (nur Text). */
export const ANSCHREIBEN_DATEIEN: Record<string, { datei: string; endungen: RegExp }> = {
  vorlage_de: { datei: 'vorlage_de.docx', endungen: /\.docx$/i },
  vorlage_en: { datei: 'vorlage_en.docx', endungen: /\.docx$/i },
  beispiel: { datei: 'beispiel.txt', endungen: /\.(docx|pdf|txt|md)$/i },
  lebenslauf_en: { datei: 'lebenslauf_en.txt', endungen: /\.(docx|pdf|txt|md)$/i },
}

/** Davon wird nur der Text gespeichert (der Rest ist eine Word-Vorlage). */
export const TEXT_DATEIEN = new Set(['beispiel', 'lebenslauf_en'])

/** Was die Seite und n8n vom Profil wissen wollen. Die Lebensläufe kommen mit ihren Texten (für n8n). */
export function profilLesen() {
  const p = profilDatei()
  const lebenslauf = fs.readdirSync(PROFIL_DIR).find((f) => /^lebenslauf\./i.test(f)) || ''
  let kriterienAm: string | null = null
  try { kriterienAm = fs.statSync(KRITERIEN_MD).mtime.toISOString() } catch { /* noch keine Datei */ }
  return {
    kriterien: textLesen(KRITERIEN_MD),
    kriterien_am: kriterienAm,
    bereits_bearbeitet: p.bereits_bearbeitet || '',
    signal_plus: p.signal_plus || '',
    signal_minus: p.signal_minus || '',
    modelle: p.modelle || {},
    lebenslauf_datei: lebenslauf && lebenslauf !== 'lebenslauf.txt' ? lebenslauf : '',
    lebenslauf_text: textLesen(path.join(PROFIL_DIR, 'lebenslauf.txt')),
    anschreiben_dateien: p.anschreiben_dateien || {},
    anschreiben_weg: p.anschreiben_weg || 'beide',
    anschreiben_prompt: textLesen(ANSCHREIBEN_MD),
    anschreiben_prompt_standard: textLesen(ANSCHREIBEN_STANDARD_MD),
    tiefencheck_prompt: textLesen(TIEFENCHECK_MD),
    beispiel_text: textLesen(path.join(PROFIL_DIR, 'beispiel.txt')),
    lebenslauf_en_text: textLesen(path.join(PROFIL_DIR, 'lebenslauf_en.txt')),
    // Weitere Lebensläufe je Bereich (der Standard oben gilt für alle anderen Bereiche)
    lebenslaeufe: lvZeilen().map((z) => ({ ...z, text_de: lvText(z.id, 'de'), text_en: lvText(z.id, 'en') })),
  }
}

/** Speichert das Profil aus der Seite. Nur Felder, die gesendet wurden, ändern sich. */
export function profilSpeichern(b: Record<string, any>) {
  const alt = profilLesen()
  // Nur bei Änderung schreiben – das Dateidatum zeigt, welche Stellen noch nach dem alten Prompt bewertet sind
  if (typeof b.kriterien === 'string' && b.kriterien.slice(0, 50000) !== alt.kriterien) fs.writeFileSync(KRITERIEN_MD, b.kriterien.slice(0, 50000), 'utf8')
  if (typeof b.anschreiben_prompt === 'string') fs.writeFileSync(ANSCHREIBEN_MD, b.anschreiben_prompt.slice(0, 20000), 'utf8')
  if (typeof b.anschreiben_prompt_standard === 'string' && b.anschreiben_prompt_standard.slice(0, 20000) !== alt.anschreiben_prompt_standard) {
    if (b.anschreiben_prompt_standard.trim()) fs.writeFileSync(ANSCHREIBEN_STANDARD_MD, b.anschreiben_prompt_standard.slice(0, 20000), 'utf8')
    else fs.rmSync(ANSCHREIBEN_STANDARD_MD, { force: true })
  }
  // Leer = Standard aus prompts/tiefencheck.md (dann wirken spätere Verbesserungen dort automatisch)
  if (typeof b.tiefencheck_prompt === 'string') {
    if (b.tiefencheck_prompt.trim()) fs.writeFileSync(TIEFENCHECK_MD, b.tiefencheck_prompt.slice(0, 20000), 'utf8')
    else fs.rmSync(TIEFENCHECK_MD, { force: true })
  }
  const modelle: NonNullable<ProfilDatei['modelle']> = { ...alt.modelle }
  for (const f of FUNKTIONEN) {
    const m = b.modelle && b.modelle[f]
    if (m && typeof m === 'object') modelle[f] = { anbieter: String(m.anbieter || '').slice(0, 40), modell: String(m.modell || '').slice(0, 80) }
  }
  const neu: ProfilDatei = {
    bereits_bearbeitet: typeof b.bereits_bearbeitet === 'string' ? b.bereits_bearbeitet.slice(0, 5000) : alt.bereits_bearbeitet,
    signal_plus: typeof b.signal_plus === 'string' ? b.signal_plus.slice(0, 5000) : alt.signal_plus,
    signal_minus: typeof b.signal_minus === 'string' ? b.signal_minus.slice(0, 5000) : alt.signal_minus,
    modelle,
    anschreiben_dateien: alt.anschreiben_dateien as Record<string, DateiInfo>, // kommt nur über den Upload, hier unverändert lassen
    lebenslaeufe: lvZeilen(), // dito (eigene Routen /profil/lv/…)
    anschreiben_weg: ['api', 'chat', 'beide'].includes(b.anschreiben_weg) ? b.anschreiben_weg : alt.anschreiben_weg,
  }
  fs.writeFileSync(PROFIL_JSON, JSON.stringify(neu, null, 2), 'utf8')
  return profilLesen()
}
