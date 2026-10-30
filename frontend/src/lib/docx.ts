const xmlText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const PLATZHALTER = /\{\{\s*([A-Za-zÄÖÜäöü_]+)\s*\}\}/g
const TEXT_STUECK = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g

/**
 * Platzhalter wie {{MEIN_NAME}} in einem Word-XML ersetzen. Word zerlegt Text gern in mehrere Stücke (Runs) –
 * deshalb wird pro Absatz der ganze Text zusammengesetzt, ersetzt und ins erste Stück geschrieben.
 * Nur Absätze mit einem bekannten Platzhalter werden angefasst, alles andere bleibt unverändert.
 * Wird ein Platzhalter zu leerem Text (Feld abgewählt), verschwindet auch sein Trenner „ · “.
 */
export function xmlPlatzhalter(xml: string, werte: Record<string, string>): string {
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (absatz) => {
    const ganz = [...absatz.matchAll(TEXT_STUECK)].map((m) => m[1]).join('')
    let leer = false
    const ersetzt = ganz.replace(PLATZHALTER, (m, name: string) => {
      const k = name.toUpperCase()
      if (!(k in werte)) return m
      if (!werte[k]) leer = true
      return xmlText(werte[k])
    })
    const neu = leer ? ersetzt.replace(/(\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '') : ersetzt
    if (neu === ganz) return absatz
    let i = 0
    return absatz.replace(TEXT_STUECK, () => (i++ === 0 ? `<w:t xml:space="preserve">${neu}</w:t>` : '<w:t></w:t>'))
  })
}

const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Setzt die Werte in eine fertige .docx ein (Text, Kopf- und Fußzeile). Ohne Werte kommt die Datei unverändert zurück. */
export async function platzhalterSetzen(docx: Blob, werte: Record<string, string>): Promise<Blob> {
  if (!Object.keys(werte).length) return docx
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await docx.arrayBuffer())
  for (const name of Object.keys(zip.files).filter((n) => /^word\/(document|header[0-9]*|footer[0-9]*)\.xml$/.test(n))) {
    zip.file(name, xmlPlatzhalter(await zip.file(name)!.async('string'), werte))
  }
  return zip.generateAsync({ type: 'blob', mimeType: WORD_MIME })
}
