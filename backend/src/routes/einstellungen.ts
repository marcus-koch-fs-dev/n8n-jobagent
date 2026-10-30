import { Router } from 'express'
import { profilLesen } from '../services/profil.js'
import { einstellungenLesen, kiOrtSetzen } from '../services/einstellungen.js'
import { kiProblemMelden, laufLoeschen, laufMelden, pauseAbfragen, pauseSetzen, pauseStatus } from '../services/lauf.js'
import type { LaufArt } from '../types.js'

// Einstellungen (KI-Ort, Modelle), Pause-Schalter für den Komplettlauf und die Lauf-Anzeige.
export const einstellungenRouter = Router()

/** GET /einstellungen – KI-Ort und die Modell-Auswahl je Funktion (für den n8n-Baustein „KI-Aufruf“). */
einstellungenRouter.get('/einstellungen', (_req, res) => res.json({ ...einstellungenLesen(), modelle: profilLesen().modelle }))

/** POST /einstellungen – KI-Ort setzen. Body: { ki_ort: "lokal" | "claude" } */
einstellungenRouter.post('/einstellungen', (req, res) => {
  const neu = kiOrtSetzen(req.body && req.body.ki_ort)
  if (!neu) return res.status(400).json({ ok: false, error: 'ki_ort muss "lokal" oder "claude" sein' })
  res.json({ ok: true, ...neu })
})

/** GET /pause?schritt=… – von den n8n-Schleifen bei jeder Stelle abgefragt. */
einstellungenRouter.get('/pause', (req, res) => {
  const schritt = req.query.schritt ? String(req.query.schritt) : undefined
  res.json({ pausiert: pauseAbfragen(schritt) })
})

/** POST /pause – Pause an oder aus. Body: { pausiert } */
einstellungenRouter.post('/pause', (req, res) => {
  const stand = pauseSetzen(Boolean(req.body && req.body.pausiert))
  res.json({ ok: true, ...stand })
})

/** POST /ki-status – Guthaben leer oder Schlüssel ungültig: alles anhalten. Body: { art, anbieter?, fehler? } */
einstellungenRouter.post('/ki-status', (req, res) => {
  const art = String((req.body && req.body.art) || '')
  if (!['guthaben', 'schluessel'].includes(art)) return res.json({ ok: true, ignoriert: true })
  kiProblemMelden(art, String((req.body && req.body.anbieter) || ''), String((req.body && req.body.fehler) || ''))
  res.json({ ok: true })
})

/** POST /lauf – Knopf-Lauf melden (Fortschritt). Body: { art: "tc"|"an"|"bw", ids, ersetzen? } */
einstellungenRouter.post('/lauf', (req, res) => {
  const { art, ids, ersetzen } = req.body || {}
  if (!['tc', 'an', 'bw'].includes(art) || !Array.isArray(ids)) return res.status(400).json({ ok: false })
  const lauf = laufMelden(art as LaufArt, ids, Boolean(ersetzen))
  res.json({ ok: true, lauf })
})

/** DELETE /lauf/:art – Knopf-Lauf beenden. */
einstellungenRouter.delete('/lauf/:art', (req, res) => {
  laufLoeschen(req.params.art as LaufArt)
  res.json({ ok: true })
})

/** GET /pause-status – Pause, Läufe und Sekunden seit der letzten Aktivität (für die Statusanzeige). */
einstellungenRouter.get('/pause-status', (_req, res) => res.json(pauseStatus()))
