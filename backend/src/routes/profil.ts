import fs from 'node:fs'
import path from 'node:path'
import express, { Router } from 'express'
import { PROFIL_DIR, STANDARD_VORLAGE } from '../config.js'
import { log } from '../lib/util.js'
import { textAusDatei, textBereinigen } from '../lib/text.js'
import { ANSCHREIBEN_DATEIEN, TEXT_DATEIEN, profilLesen, profilSpeichern } from '../services/profil.js'
import { profilJsonAendern } from '../services/profilDatei.js'

// Profil: Such-Prompt, Modelle, Anschreiben-Vorlagen und der Lebenslauf. Alles liegt als normale Datei
// in data/profil/ – die Seite bearbeitet sie, die n8n-Workflows lesen sie über GET /profil.
export const profilRouter = Router()

/** GET /profil – alles, was die Seite und n8n vom Profil brauchen. */
profilRouter.get('/profil', (_req, res) => res.json({ ok: true, ...profilLesen() }))

/** GET /profil/standard-vorlage – die mitgelieferte Briefvorlage zum Anpassen in Word. */
profilRouter.get('/profil/standard-vorlage', (_req, res) => res.download(STANDARD_VORLAGE, 'Standard-Briefvorlage.docx'))

/** POST /profil – Such-Prompt, Modelle, Stichwörter und Schreibweg speichern. */
profilRouter.post('/profil', (req, res) => {
  const neu = profilSpeichern(req.body || {})
  log('Profil gespeichert')
  res.json({ ok: true, ...neu })
})

/** POST /profil/lebenslauf – Lebenslauf hochladen (PDF, Word oder Text). Der Text wird für die KI herausgelesen. */
profilRouter.post('/profil/lebenslauf', express.json({ limit: '25mb' }), async (req, res) => {
  const { name, daten } = req.body || {}
  const endung = String(name || '').toLowerCase().match(/\.(pdf|docx|txt|md)$/)
  if (!endung || !daten) return res.status(400).json({ ok: false, error: 'Bitte eine PDF-, Word- (.docx) oder Textdatei wählen.' })
  const puffer = Buffer.from(String(daten), 'base64')
  for (const f of fs.readdirSync(PROFIL_DIR)) if (/^lebenslauf\./i.test(f)) fs.unlinkSync(path.join(PROFIL_DIR, f))
  const datei = path.join(PROFIL_DIR, `lebenslauf.${endung[1]}`)
  fs.writeFileSync(datei, puffer)
  let text = ''
  try {
    text = textBereinigen(await textAusDatei(datei, puffer))
  } catch (e) {
    return res.json({ ok: false, error: 'Datei gespeichert, aber der Text ließ sich nicht auslesen: ' + (e as Error).message })
  }
  fs.writeFileSync(path.join(PROFIL_DIR, 'lebenslauf.txt'), text, 'utf8')
  log(`Lebenslauf gespeichert (${endung[1]}, ${text.length} Zeichen Text)`)
  res.json({ ok: true, datei: path.basename(datei), zeichen: text.length, vorschau: text.slice(0, 400) })
})

/** POST /profil/datei – Vorlage oder Beispiel fürs Anschreiben hochladen. Body: { art, name, daten } */
profilRouter.post('/profil/datei', express.json({ limit: '25mb' }), async (req, res) => {
  const { art, name, daten } = req.body || {}
  const def = ANSCHREIBEN_DATEIEN[art]
  if (!def) return res.status(400).json({ ok: false, error: 'Unbekannte Dateiart.' })
  if (!def.endungen.test(String(name || '')) || !daten) {
    return res.status(400).json({ ok: false, error: TEXT_DATEIEN.has(art) ? 'Bitte eine Word-, PDF- oder Textdatei wählen.' : 'Bitte eine Word-Datei (.docx) wählen – in ein PDF kann der Brieftext nicht eingesetzt werden.' })
  }
  const puffer = Buffer.from(String(daten), 'base64')
  let text = ''
  try {
    text = textBereinigen(await textAusDatei(name, puffer))
  } catch (e) {
    return res.json({ ok: false, error: 'Die Datei ließ sich nicht lesen: ' + (e as Error).message })
  }
  const info: { datei: string; zeichen?: number; platzhalter?: string[] } = { datei: String(name).slice(0, 120) }
  if (TEXT_DATEIEN.has(art)) {
    if (text.length < 100) return res.json({ ok: false, error: 'Kaum Text gefunden – ist das ein eingescanntes Bild-PDF? Dann bitte als Word oder Text.' })
    fs.writeFileSync(path.join(PROFIL_DIR, def.datei), text.slice(0, 30000), 'utf8')
    // Englischer CV: zusätzlich das Original behalten – kommt als Kopie in die Bewerbungsmappe
    if (art === 'lebenslauf_en') {
      for (const f of fs.readdirSync(PROFIL_DIR).filter((f) => /^cv_en\./i.test(f))) fs.unlinkSync(path.join(PROFIL_DIR, f))
      fs.writeFileSync(path.join(PROFIL_DIR, 'cv_en' + path.extname(String(name)).toLowerCase()), puffer)
    }
    info.zeichen = text.length
  } else {
    fs.writeFileSync(path.join(PROFIL_DIR, def.datei), puffer)
    info.platzhalter = [...new Set((text.match(/\{\{\s*[A-ZÄÖÜa-zäöü_]+\s*\}\}/g) || []).map((p) => p.replace(/[{}\s]/g, '').toUpperCase()))]
  }
  profilJsonAendern((p) => { p.anschreiben_dateien = { ...(p.anschreiben_dateien || {}), [art]: info } })
  log(`Anschreiben-Datei gespeichert: ${art} (${info.datei})`)
  res.json({ ok: true, art, ...info })
})

/** POST /profil/datei-entfernen – Vorlage oder Beispiel entfernen. Body: { art } */
profilRouter.post('/profil/datei-entfernen', (req, res) => {
  const art = req.body && req.body.art
  const def = ANSCHREIBEN_DATEIEN[art]
  if (!def) return res.status(400).json({ ok: false, error: 'Unbekannte Dateiart.' })
  try { fs.unlinkSync(path.join(PROFIL_DIR, def.datei)) } catch { /* war nicht da */ }
  profilJsonAendern((p) => { if (p.anschreiben_dateien) delete p.anschreiben_dateien[art] })
  log(`Anschreiben-Datei entfernt: ${art}`)
  res.json({ ok: true })
})
