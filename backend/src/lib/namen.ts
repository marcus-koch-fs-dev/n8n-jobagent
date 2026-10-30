// Namen für Dateien und Ordner. Was Windows nicht mag, wird entfernt; Rechtsformen fallen bei Firmen weg.

/** Datei-/Ordnernamen: nichts, was Windows nicht mag. */
export function sichererName(s: unknown, max = 60): string {
  return String(s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).replace(/[. ]+$/, '') || 'unbekannt'
}

const RECHTSFORM = /[\s,]+(gmbh\s*&\s*co\.?\s*kg|gmbh|ggmbh|mbh|ug|ag|se|kg|ohg|gbr|e\.\s?k\.|e\.\s?v\.|inc\.?|ltd\.?|llc|limited|corp\.?|co\.|s\.?a\.?r?\.?l?\.?|b\.?v\.?|oy|ab|a\/s|sp\.\s?z\s?o\.?o\.?)\s*$/i

/**
 * Nur der Firmenname für Ordner: ohne Rechtsform („GmbH“, „UG (haftungsbeschränkt)“, „Inc.“ …), ohne Klammern,
 * bei „Marke - Firma GmbH“ nur die Marke. Beispiel: „ZIRKEL8 - TIECORP UG (haftungsbeschränkt)“ → „ZIRKEL8“.
 */
export function firmaKurz(firma: unknown): string {
  // Klammern weg, nur der Teil vor „ - “ / „|“ / „,“ (dahinter stehen oft Zusätze wie „100% Remote“ oder Standorte)
  let f = String(firma || '').replace(/\([^)]*\)/g, ' ').split(/\s+[–-]\s+|\s*[|,·]\s*/)[0]
  f = f.replace(/\b(100\s*%\s*)?(remote|homeoffice|home office|hybrid)\b/gi, ' ')
  // ab der ersten Rechtsform alles weg („OBI GmbH & Co. Deutschland KG“ → „OBI“)
  f = f.replace(/\s+(gmbh|ggmbh|mbh|ug|ag|kg|ohg|gbr|inc\.?|ltd\.?|llc|limited|corp\.?)(?=[\s.,]|$)[\s\S]*$/i, '')
  for (let i = 0; i < 3; i++) f = f.replace(RECHTSFORM, '')
  return f.replace(/\s{2,}/g, ' ').trim() || String(firma || '').trim()
}

/** Nur die Stadt: „Berlin, Deutschland“ → „Berlin“, „München (Bayern)“ → „München“; „remote“ o. Ä. → leer. */
export function stadtKurz(ort: unknown): string {
  const s = String(ort || '').split(/[,(/|]/)[0].replace(/\s{2,}/g, ' ').trim()
  return /remote|homeoffice|home office|deutschlandweit|weltweit|europa/i.test(s) ? '' : s
}

/** Ordner einer Bewerbung: immer „Firma - Stadt“, kurz, z. B. „Obi - München“. */
export function ordnerName(firma: unknown, ort: unknown): string {
  const stadt = stadtKurz(ort)
  return sichererName(firmaKurz(firma), 40) + (stadt ? ` - ${sichererName(stadt, 25)}` : '')
}
