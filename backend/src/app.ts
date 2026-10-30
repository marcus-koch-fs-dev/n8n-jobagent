import fs from 'node:fs'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ABLAGE, DIRS, LV_DIR, PROFIL_DIR } from './config.js'
import { log } from './lib/util.js'
import { anschreibenRouter } from './routes/anschreiben.js'
import { browserRouter } from './routes/browser.js'
import { cacheRouter } from './routes/cache.js'
import { einstellungenRouter } from './routes/einstellungen.js'
import { lebenslaeufeRouter } from './routes/lebenslaeufe.js'
import { missionfreiRouter } from './routes/missionfrei.js'
import { profilRouter } from './routes/profil.js'
import { seitenRouter } from './routes/seiten.js'

/** Alle Datenordner anlegen, die der Dienst braucht (vorhandene bleiben unangetastet). */
function datenordnerAnlegen(): void {
  for (const dir of [...Object.values(DIRS), PROFIL_DIR, LV_DIR, ABLAGE]) fs.mkdirSync(dir, { recursive: true })
}

// Diese Pfade bekommen ihre eigene, größere Grenze (Datei-Uploads als base64).
const GROSSE_UPLOADS = ['/profil/lebenslauf', '/profil/datei', '/profil/lv/datei']
const jsonKlein = express.json({ limit: '2mb' })

/** Die Anwendung ohne Listen: für den Start (server.ts) und für Tests. */
export function createApp(): express.Express {
  datenordnerAnlegen()
  const app = express()
  // JSON-Anfragen bis 2 MB – außer den Datei-Uploads, die ihr eigenes Limit haben.
  app.use((req, res, next) => (GROSSE_UPLOADS.includes(req.path) ? next() : jsonKlein(req, res, next)))
  app.use('/screenshots', express.static(DIRS.screenshots))
  app.use(browserRouter, profilRouter, lebenslaeufeRouter, anschreibenRouter, einstellungenRouter, missionfreiRouter, cacheRouter, seitenRouter)
  // Einheitliche Fehlerantwort für alle Routen: { ok: false, error }
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log('Unerwarteter Fehler:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  })
  return app
}
