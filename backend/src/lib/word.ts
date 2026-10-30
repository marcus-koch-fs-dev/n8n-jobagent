import JSZip from 'jszip'

export const xmlText = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Platzhalter in einem Word-XML ersetzen. Word zerlegt Text gern in mehrere Stücke (Runs) –
 * deshalb pro Absatz den ganzen Text zusammensetzen, ersetzen und ins erste Stück schreiben.
 * {{ANSCHREIBEN}} wird zu mehreren Absätzen (gleiche Formatierung).
 */
export function platzhalterFuellen(xml: string, werte: Record<string, string>, absaetze: string[]): string {
  const T = /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g
  const setzen = (p: string, text: string) => {
    let i = 0
    return p.replace(T, () => (i++ === 0 ? `<w:t xml:space="preserve">${text}</w:t>` : '<w:t></w:t>'))
  }
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => {
    const teile = [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1])
    const ganz = teile.join('')
    if (!ganz.includes('{{')) return p
    if (/\{\{\s*ANSCHREIBEN\s*\}\}/i.test(ganz)) return absaetze.map((a) => setzen(p, xmlText(a))).join('')
    const neu = ganz.replace(/\{\{\s*([A-Za-zÄÖÜäöü_]+)\s*\}\}/g, (m, k: string) => (k.toUpperCase() in werte ? xmlText(werte[k.toUpperCase()]) : m))
    return setzen(p, neu)
  })
}

const absatzXml = (t: string, fett = false) => `<w:p><w:r>${fett ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xmlText(t)}</w:t></w:r></w:p>`

/**
 * Anschreiben als .docx: mit Vorlage die Platzhalter füllen, ohne Vorlage ein schlichtes Dokument
 * (Kopfzeilen `kopf`, Datum, Betreff, Text). `kopf` wird nur ohne Vorlage verwendet.
 */
export async function anschreibenDocx(vorlage: Buffer | null, werte: Record<string, string>, absaetze: string[], kopf: string[] = []): Promise<Buffer> {
  if (vorlage) {
    const zip = await JSZip.loadAsync(vorlage)
    for (const name of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) {
      zip.file(name, platzhalterFuellen(await zip.file(name)!.async('string'), werte, absaetze))
    }
    return zip.generateAsync({ type: 'nodebuffer' })
  }
  const kopfXml = kopf.length ? [...kopf.map((k) => absatzXml(k)), absatzXml('')] : []
  const body = [...kopfXml, absatzXml(werte.DATUM), absatzXml(''), absatzXml(werte.BETREFF, true), absatzXml(''), ...absaetze.map((a) => absatzXml(a))].join('')
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}
