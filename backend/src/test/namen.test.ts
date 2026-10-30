import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { firmaKurz, ordnerName, sichererName, stadtKurz } from '../lib/namen.js'

describe('Namen für Ordner', () => {
  it('entfernt Rechtsformen und Zusätze aus dem Firmennamen', () => {
    assert.equal(firmaKurz('ZIRKEL8 - TIECORP UG (haftungsbeschränkt)'), 'ZIRKEL8')
    assert.equal(firmaKurz('OBI GmbH & Co. Deutschland KG'), 'OBI')
    assert.equal(firmaKurz('Acme Remote'), 'Acme')
  })
  it('nimmt aus dem Ort nur die Stadt, Remote ergibt nichts', () => {
    assert.equal(stadtKurz('München (Bayern)'), 'München')
    assert.equal(stadtKurz('Berlin, Deutschland'), 'Berlin')
    assert.equal(stadtKurz('Remote (weltweit)'), '')
  })
  it('baut „Firma - Stadt“, ohne Stadt nur die Firma', () => {
    assert.equal(ordnerName('Obi GmbH', 'München'), 'Obi - München')
    assert.equal(ordnerName('Acme GmbH', 'Remote'), 'Acme')
  })
  it('macht Dateinamen windowssicher', () => {
    assert.equal(sichererName('a/b:c*d?'), 'a b c d')
    assert.equal(sichererName(''), 'unbekannt')
    assert.equal(sichererName('Name.'), 'Name')
  })
})
