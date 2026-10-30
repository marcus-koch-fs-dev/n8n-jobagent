import express, { Router } from 'express'
import { cacheLesen, cacheManuell, cacheTextLesen } from '../services/cache.js'
import { letzteListe, linkListe } from '../services/links.js'
import { unterlagenFuer } from '../services/unterlagen.js'

// Gespeicherte Seiten und Texte, die Linkliste und die Unterlagen-Suche.
export const cacheRouter = Router()

/** GET /links/latest – die zuletzt gelesene Linkliste. */
cacheRouter.get('/links/latest', (_req, res) => {
  const liste = letzteListe()
  if (!liste) return res.json({ ok: false, error: 'Noch keine Linkliste gespeichert – erst einmal mit entsperrter Seite einlesen.' })
  res.json({ ok: true, locked: false, ausDatei: true, ...liste })
})

/** POST /extract-links – alle Links einer Stellenliste lesen. Body: { url, fallbackGespeichert? } */
cacheRouter.post('/extract-links', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ ok: false, error: 'url fehlt' })
  res.json(await linkListe(String(url), Boolean(req.body.fallbackGespeichert)))
})

/** POST /unterlagen – welche Unterlagen die Firma will (Textsuche, ohne KI). Body: { stellen: [{id, cache_id}] } */
cacheRouter.post('/unterlagen', express.json({ limit: '1mb' }), (req, res) => {
  res.json({ ok: true, unterlagen: unterlagenFuer(req.body?.stellen ?? []) })
})

/** GET /cache/:id – gespeicherte Seite, so wie /fetch sie zurückgibt (ohne Neuabruf). */
cacheRouter.get('/cache/:id', (req, res) => {
  const ergebnis = cacheLesen(req.params.id)
  if (!ergebnis.ok) return res.status(404).json(ergebnis)
  res.json(ergebnis.body)
})

/** POST /cache-manuell – Text von Hand einfügen (für Seiten mit Bot-Schutz). Body: { url, text } */
cacheRouter.post('/cache-manuell', (req, res) => {
  const { url, text } = req.body || {}
  const ergebnis = cacheManuell(url, text)
  if (!ergebnis.ok) return res.status(ergebnis.status).json({ ok: false, error: ergebnis.error })
  res.json(ergebnis)
})

/** GET /text/:id – der gespeicherte Text als reine Textseite (zum Ansehen im Browser). */
cacheRouter.get('/text/:id', (req, res) => {
  const text = cacheTextLesen(req.params.id)
  if (text === null) return res.status(404).type('text/plain').send('Nicht im Cache')
  res.type('text/plain; charset=utf-8').send(text)
})
