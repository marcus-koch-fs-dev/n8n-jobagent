import { Router } from 'express'
import { missionfreiAnmelden, missionfreiStatus } from '../services/missionfrei.js'

// Missionfrei-Zugang von der Ergebnis-Seite aus. Das Passwort wird nicht gespeichert.
export const missionfreiRouter = Router()

/** GET /missionfrei/status?neu=1 – angemeldet oder nicht (höchstens alle 5 Minuten neu geprüft). */
missionfreiRouter.get('/missionfrei/status', async (req, res) => {
  res.json(await missionfreiStatus(Boolean(req.query.neu)))
})

/** POST /missionfrei/anmelden – Passwort eintragen und anmelden. Body: { passwort } */
missionfreiRouter.post('/missionfrei/anmelden', async (req, res) => {
  const pw = String((req.body && req.body.passwort) || '')
  if (!pw) return res.status(400).json({ ok: false, error: 'Bitte das Passwort eingeben.' })
  res.json(await missionfreiAnmelden(pw))
})
