import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { platzhalterSetzen, xmlPlatzhalter } from './docx'
import { meineWerte } from './meineDaten'

const absatz = (...stuecke: string[]) => `<w:p>${stuecke.map((s) => `<w:r><w:t>${s}</w:t></w:r>`).join('')}</w:p>`

describe('xmlPlatzhalter', () => {
  const werte = { MEIN_NAME: 'Max Mustermann', MEIN_PLZ_ORT: '12345 Musterstadt' }

  it('ersetzt einen Platzhalter', () => {
    expect(xmlPlatzhalter(absatz('{{MEIN_NAME}}'), werte)).toContain('>Max Mustermann<')
  })
  it('findet Platzhalter, die Word auf mehrere Stücke verteilt hat', () => {
    const xml = xmlPlatzhalter(absatz('{{MEIN', '_NAME}}', ' – Bewerbung'), werte)
    expect(xml).toContain('>Max Mustermann – Bewerbung<')
    expect(xml).not.toContain('{{')
  })
  it('lässt unbekannte Platzhalter und fremde Absätze unverändert', () => {
    const fremd = absatz('Hallo {{FIRMA}}')
    expect(xmlPlatzhalter(fremd, werte)).toBe(fremd)
    expect(xmlPlatzhalter(absatz('{{MEIN_NAME}} {{FIRMA}}'), werte)).toContain('Max Mustermann {{FIRMA}}')
  })
  it('maskiert Sonderzeichen', () => {
    expect(xmlPlatzhalter(absatz('{{MEIN_NAME}}'), { MEIN_NAME: 'A & B <x>' })).toContain('A &amp; B &lt;x&gt;')
  })
})

describe('platzhalterSetzen', () => {
  const docx = async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', `<w:document><w:body>${absatz('Hallo {{MEIN_NAME}}')}</w:body></w:document>`)
    zip.file('word/footer1.xml', `<w:ftr>${absatz('{{MEINE_EMAIL}}')}</w:ftr>`)
    zip.file('word/styles.xml', '<w:styles>{{MEIN_NAME}}</w:styles>')
    return zip.generateAsync({ type: 'blob' })
  }
  it('setzt Text und Fußzeile ein, fasst andere Teile nicht an', async () => {
    const neu = await JSZip.loadAsync(await (await platzhalterSetzen(await docx(), { MEIN_NAME: 'Max Mustermann', MEINE_EMAIL: 'a@b.de' })).arrayBuffer())
    expect(await neu.file('word/document.xml')!.async('string')).toContain('Hallo Max Mustermann')
    expect(await neu.file('word/footer1.xml')!.async('string')).toContain('>a@b.de<')
    expect(await neu.file('word/styles.xml')!.async('string')).toContain('{{MEIN_NAME}}')
  })
  it('ohne Werte kommt dieselbe Datei zurück', async () => {
    const d = await docx()
    expect(await platzhalterSetzen(d, {})).toBe(d)
  })
})

describe('abgewählte Felder', () => {
  const zeile = absatz('Entwickler · {{MEINE_EMAIL}} · {{MEIN_TELEFON}} · {{MEIN_LINKEDIN}}')
  it('lässt das Feld samt Trenner weg', () => {
    const werte = meineWerte({ name: '', strasse: '', plz_ort: '', telefon: '0123', email: 'a@b.de', linkedin: 'li', weglassen: ['telefon'] })
    expect(xmlPlatzhalter(zeile, werte)).toContain('>Entwickler · a@b.de · li<')
  })
  it('alle drei weg: nur der feste Text bleibt', () => {
    const werte = meineWerte({ name: '', strasse: '', plz_ort: '', telefon: '1', email: '2', linkedin: '3', weglassen: ['telefon', 'email', 'linkedin'] })
    expect(xmlPlatzhalter(zeile, werte)).toContain('>Entwickler<')
  })
})
