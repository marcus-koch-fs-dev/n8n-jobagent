import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

/** Text aus einer hochgeladenen Datei (.pdf, .docx oder Klartext). */
export async function textAusDatei(name: string, puffer: Buffer): Promise<string> {
  if (/\.pdf$/i.test(name)) {
    const parser = new PDFParse({ data: puffer })
    try { return (await parser.getText()).text } finally { await parser.destroy().catch(() => null) }
  }
  if (/\.docx$/i.test(name)) return (await mammoth.extractRawText({ buffer: puffer })).value
  return puffer.toString('utf8')
}

/** Zeilenenden vereinheitlichen, Mehrfach-Leerzeichen und überflüssige Leerzeilen entfernen. */
export const textBereinigen = (t: unknown): string => String(t).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
