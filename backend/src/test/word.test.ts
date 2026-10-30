import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { platzhalterFuellen, xmlText } from '../lib/word.js'

const absatz = (...stuecke: string[]) => `<w:p>${stuecke.map((s) => `<w:r><w:t>${s}</w:t></w:r>`).join('')}</w:p>`

describe('Platzhalter im Word-XML', () => {
  const werte = { FIRMA: 'Acme', MEIN_NAME: 'Max & Co' }
  it('füllt Platzhalter, auch wenn Word sie auf mehrere Stücke verteilt hat', () => {
    const xml = platzhalterFuellen(absatz('{{FIR', 'MA}} Bewerbung'), werte, [])
    assert.match(xml, />Acme Bewerbung</)
  })
  it('maskiert Sonderzeichen', () => {
    assert.match(platzhalterFuellen(absatz('{{MEIN_NAME}}'), werte, []), /Max &amp; Co/)
  })
  it('lässt unbekannte Platzhalter und fremde Absätze unverändert', () => {
    const xml = platzhalterFuellen(absatz('Hallo {{UNBEKANNT}}'), werte, [])
    assert.match(xml, />Hallo \{\{UNBEKANNT\}\}</)
  })
  it('{{ANSCHREIBEN}} wird zu mehreren Absätzen', () => {
    const xml = platzhalterFuellen(absatz('{{ANSCHREIBEN}}'), werte, ['Eins', 'Zwei'])
    assert.equal((xml.match(/<w:p[ >]/g) ?? []).length, 2)
  })
  it('anschreibenDocx ohne Vorlage: Kopf steht vor dem Datum, Betreff und Text folgen', async () => {
    const { anschreibenDocx } = await import('../lib/word.js')
    const { default: JSZip } = await import('jszip')
    const buf = await anschreibenDocx(null, { DATUM: 'Heute', BETREFF: 'Bewerbung' }, ['Text'], ['{{MEIN_NAME}}', 'Firma'])
    const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string')
    const reihe = ['{{MEIN_NAME}}', 'Firma', 'Heute', 'Bewerbung', 'Text'].map((t) => xml.indexOf(t))
    assert.ok(reihe.every((i) => i >= 0))
    assert.deepEqual([...reihe].sort((a, b) => a - b), reihe)
  })
  it('xmlText maskiert die drei Zeichen', () => {
    assert.equal(xmlText('a & <b>'), 'a &amp; &lt;b&gt;')
  })
})
