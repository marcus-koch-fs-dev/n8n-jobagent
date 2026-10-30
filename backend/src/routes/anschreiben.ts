import path from 'node:path'
import express, { Router } from 'express'
import { ablagePfad, indexLesen, mappeSpeichern, ordnerAnlegen } from '../services/anschreiben.js'
import { bewerbenDirektLesen, bewerbenDirektSetzen } from '../services/bewerbenDirekt.js'

// Fertige Bewerbungsmappen: Ordner anlegen, Mappe speichern, Ablage-Dateien abrufen.
export const anschreibenRouter = Router()

/** POST /anschreiben/ordner – Ordner „Firma - Stadt“ mit Anschreiben-Entwurf anlegen (ohne KI). Body: { firma, ort, stelle } */
anschreibenRouter.post('/anschreiben/ordner', express.json(), async (req, res) => {
  const { status, body } = await ordnerAnlegen(req.body?.firma, req.body?.ort, req.body?.stelle)
  res.status(status).json(body)
})

/** POST /anschreiben/speichern – Mappe zu einer Stelle erzeugen (von n8n). */
anschreibenRouter.post('/anschreiben/speichern', express.json({ limit: '2mb' }), async (req, res) => {
  const { status, body } = await mappeSpeichern(req.body || {})
  res.status(status).json(body)
})

/** GET /anschreiben/ablage?p=… – eine Datei aus der Ablage (Kurznachricht, Lebenslauf-Kopie). */
anschreibenRouter.get('/anschreiben/ablage', (req, res) => {
  const voll = ablagePfad(String(req.query.p || ''))
  if (!voll) return res.status(404).send('Datei nicht gefunden.')
  res.download(voll, path.basename(voll))
})

/** GET /bewerben-direkt – Stellen, die ohne Tiefen-Check in „4 · Bewerben“ stehen. */
anschreibenRouter.get('/bewerben-direkt', (_req, res) => res.json({ ids: bewerbenDirektLesen() }))

/** POST /bewerben-direkt – eine Stelle dorthin schicken oder zurücknehmen. Body: { id, an } */
anschreibenRouter.post('/bewerben-direkt', (req, res) => {
  const ids = bewerbenDirektSetzen(req.body?.id, req.body?.an)
  if (!ids) return res.status(400).json({ ok: false, error: 'id fehlt' })
  res.json({ ok: true, ids })
})

/** GET /anschreiben/liste – Index aller Mappen. */
anschreibenRouter.get('/anschreiben/liste', (_req, res) => res.json({ anschreiben: indexLesen() }))
