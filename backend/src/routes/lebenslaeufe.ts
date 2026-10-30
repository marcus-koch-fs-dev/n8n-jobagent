import fs from 'node:fs'
import path from 'node:path'
import express, { Router, type Response } from 'express'
import { LV_DIR } from '../config.js'
import { log } from '../lib/util.js'
import { textAusDatei, textBereinigen } from '../lib/text.js'
import { lvDateienWeg, lvIdOk, lvSpeichern, lvZeilen } from '../services/lebenslaeufe.js'

// Lebensläufe je Bereich: Zeile anlegen, Bereich ändern, Zeile löschen; Datei je Sprache hochladen oder entfernen.
// Antwort ist immer die ganze Liste (ohne die Texte – die braucht nur n8n über GET /profil).
export const lebenslaeufeRouter = Router()

const antwort = (res: Response) => res.json({ ok: true, lebenslaeufe: lvZeilen() })
const ungueltig = (res: Response) => res.status(400).json({ ok: false, error: 'Unbekannte Zeile.' })

/** POST /profil/lv/neu – eine leere Zeile anlegen. */
lebenslaeufeRouter.post('/profil/lv/neu', (_req, res) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  lvSpeichern((z) => [...z, { id, bereich: '' }])
  log('Lebenslauf-Zeile angelegt')
  antwort(res)
})

/** POST /profil/lv/bereich – Bereich einer Zeile setzen. Body: { id, bereich } */
lebenslaeufeRouter.post('/profil/lv/bereich', (req, res) => {
  const { id } = req.body || {}
  if (!lvIdOk(id)) return ungueltig(res)
  const bereich = String(req.body.bereich || '').trim().slice(0, 80)
  // Jeder Bereich gehört zu höchstens einer Zeile – sonst nähme lebenslaufWaehlen still die erste
  if (bereich && lvZeilen().some((z) => z.id !== id && String(z.bereich).trim().toLowerCase() === bereich.toLowerCase())) {
    return res.status(409).json({ ok: false, error: 'Für diesen Bereich gibt es schon eine Zeile.' })
  }
  lvSpeichern((z) => z.map((x) => (x.id === id ? { ...x, bereich } : x)))
  antwort(res)
})

/** POST /profil/lv/loeschen – Zeile samt Dateien löschen. Body: { id } */
lebenslaeufeRouter.post('/profil/lv/loeschen', (req, res) => {
  const { id } = req.body || {}
  if (!lvIdOk(id)) return ungueltig(res)
  lvSpeichern((z) => z.filter((x) => x.id !== id))
  try { fs.rmSync(path.join(LV_DIR, id), { recursive: true, force: true }) } catch { /* war nicht da */ }
  log('Lebenslauf-Zeile gelöscht')
  antwort(res)
})

/** POST /profil/lv/datei – Lebenslauf einer Sprache zu einer Zeile hochladen. Body: { id, sprache, name, daten } */
lebenslaeufeRouter.post('/profil/lv/datei', express.json({ limit: '25mb' }), async (req, res) => {
  const { id, sprache, name, daten } = req.body || {}
  if (!lvIdOk(id) || !['de', 'en'].includes(sprache)) return ungueltig(res)
  if (!lvZeilen().some((z) => z.id === id)) return res.status(404).json({ ok: false, error: 'Die Zeile gibt es nicht mehr.' })
  const endung = String(name || '').toLowerCase().match(/\.(pdf|docx|txt|md)$/)
  if (!endung || !daten) return res.status(400).json({ ok: false, error: 'Bitte eine PDF-, Word- (.docx) oder Textdatei wählen.' })
  const puffer = Buffer.from(String(daten), 'base64')
  let text = ''
  try {
    text = textBereinigen(await textAusDatei(name, puffer))
  } catch (e) {
    return res.json({ ok: false, error: 'Die Datei ließ sich nicht lesen: ' + (e as Error).message })
  }
  if (text.length < 100) return res.json({ ok: false, error: 'Kaum Text gefunden – ist das ein eingescanntes Bild-PDF? Dann bitte als Word oder Text.' })
  const dir = path.join(LV_DIR, id)
  fs.mkdirSync(dir, { recursive: true })
  lvDateienWeg(id, sprache)
  fs.writeFileSync(path.join(dir, `${sprache}.${endung[1]}`), puffer)
  fs.writeFileSync(path.join(dir, `${sprache}.txt`), text.slice(0, 30000), 'utf8')
  const info = { datei: String(name).slice(0, 120), zeichen: text.length }
  lvSpeichern((z) => z.map((x) => (x.id === id ? { ...x, [sprache]: info } : x)))
  log(`Lebenslauf gespeichert (${id}, ${sprache}, ${text.length} Zeichen)`)
  antwort(res)
})

/** POST /profil/lv/datei-entfernen – eine Sprache einer Zeile entfernen. Body: { id, sprache } */
lebenslaeufeRouter.post('/profil/lv/datei-entfernen', (req, res) => {
  const { id, sprache } = req.body || {}
  if (!lvIdOk(id) || !['de', 'en'].includes(sprache)) return ungueltig(res)
  lvDateienWeg(id, sprache)
  lvSpeichern((z) => z.map((x) => {
    if (x.id !== id) return x
    const { [sprache as 'de' | 'en']: _weg, ...rest } = x
    return rest
  }))
  antwort(res)
})
