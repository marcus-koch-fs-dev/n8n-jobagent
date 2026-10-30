import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Server } from 'node:http'

// Die Anwendung gegen einen LEEREN Testordner prüfen – nie gegen den echten Datenordner.
// DATA_DIR muss vor dem Laden von config.ts gesetzt sein.
const testDaten = fs.mkdtempSync(path.join(os.tmpdir(), 'jobagent-test-'))
process.env.DATA_DIR = testDaten

let server: Server
let base = ''

before(async () => {
  const { createApp } = await import('../app.js')
  server = createApp().listen(0)
  const port = (server.address() as { port: number }).port
  base = `http://127.0.0.1:${port}`
})

after(() => {
  server?.close()
  fs.rmSync(testDaten, { recursive: true, force: true })
})

describe('HTTP-Schnittstelle (leerer Testordner)', () => {
  it('GET /health meldet, dass der Dienst läuft', async () => {
    const r = await fetch(`${base}/health`)
    assert.equal(r.status, 200)
    const body = await r.json() as { ok: boolean; maxConcurrency: number }
    assert.equal(body.ok, true)
    assert.equal(typeof body.maxConcurrency, 'number')
  })

  it('GET /profil liefert ein leeres Profil mit Lebensläufen als Liste', async () => {
    const body = await (await fetch(`${base}/profil`)).json() as { ok: boolean; lebenslaeufe: unknown[]; kriterien: string }
    assert.equal(body.ok, true)
    assert.equal(body.kriterien, '')
    assert.deepEqual(body.lebenslaeufe, [])
  })

  it('POST /profil speichert eigene Tiefen-Check-Anweisungen, leer = Standard', async () => {
    const speichern = async (text: string) => (await (await fetch(`${base}/profil`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tiefencheck_prompt: text }),
    })).json()) as { tiefencheck_prompt: string }
    assert.equal((await speichern('Sei streng.')).tiefencheck_prompt, 'Sei streng.')
    assert.equal(((await (await fetch(`${base}/profil`)).json()) as { tiefencheck_prompt: string }).tiefencheck_prompt, 'Sei streng.')
    assert.equal((await speichern('  ')).tiefencheck_prompt, '')
  })

  it('GET /pause-status hat den Pause-Stand', async () => {
    const body = await (await fetch(`${base}/pause-status`)).json() as { pausiert: boolean }
    assert.equal(body.pausiert, false)
  })

  it('GET /anschreiben/liste ist leer', async () => {
    assert.deepEqual(await (await fetch(`${base}/anschreiben/liste`)).json(), { anschreiben: {} })
  })

  it('GET /prompts/:name meldet fehlende Prompts als 404', async () => {
    assert.equal((await fetch(`${base}/prompts/gibt-es-nicht.md`)).status, 404)
  })

  it('POST /anschreiben/ordner legt Ordner und Entwurf an (immer mit der aktuellen Vorlage)', async () => {
    const { ABLAGE } = await import('../config.js')
    const { default: JSZip } = await import('jszip')
    const senden = () => fetch(`${base}/anschreiben/ordner`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firma: 'Testfirma', ort: 'Teststadt (Remote, weltweit)', stelle: 'Fullstack Developer (m/w/d)' }),
    }).then((r) => r.json()) as Promise<{ ok: boolean; ordner: string; entwurf: string }>
    const erst = await senden()
    assert.equal(erst.ok, true)
    const xml = await (await JSZip.loadAsync(fs.readFileSync(path.join(ABLAGE, erst.entwurf))))
      .file('word/document.xml')!.async('string')
    assert.match(xml, /Testfirma/)
    assert.match(xml, /Bewerbung als Fullstack Developer/)
    assert.match(xml, /\[PLZ\] Teststadt</)
    assert.doesNotMatch(xml, /Remote/)
    assert.match(xml, /\{\{MEIN_NAME\}\}/) // persönliche Daten füllt der Browser, nicht der Server
    const zweit = await senden()
    assert.equal(zweit.entwurf, erst.entwurf)
  })

  it('/bewerben-direkt merkt Stellen und gibt sie wieder frei', async () => {
    const senden = (id: unknown, an: boolean) => fetch(`${base}/bewerben-direkt`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, an }),
    })
    const lesen = async () => ((await (await fetch(`${base}/bewerben-direkt`)).json()) as { ids: number[] }).ids
    assert.deepEqual(await lesen(), [])
    await senden(7, true)
    await senden(7, true) // doppelt merken ändert nichts
    await senden(9, true)
    assert.deepEqual(await lesen(), [7, 9])
    await senden(7, false)
    assert.deepEqual(await lesen(), [9])
    assert.equal((await senden('abc', true)).status, 400)
  })

  it('GET /profil/standard-vorlage liefert die mitgelieferte Word-Vorlage', async () => {
    const r = await fetch(`${base}/profil/standard-vorlage`)
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-disposition') || '', /Standard-Briefvorlage\.docx/)
  })

  it('POST /cache-manuell lehnt zu kurzen Text ab, ohne etwas zu speichern', async () => {
    const r = await fetch(`${base}/cache-manuell`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/x', text: 'kurz' }),
    })
    assert.equal(r.status, 400)
    assert.deepEqual(fs.readdirSync(path.join(testDaten, 'cache')), [])
  })
})
