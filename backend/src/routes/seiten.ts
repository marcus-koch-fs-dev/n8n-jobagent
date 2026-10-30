import fs from 'node:fs'
import path from 'node:path'
import express, { Router } from 'express'
import { NOVNC_URL, PROMPTS_DIR, ROOT_DIR, UI_DIR } from '../config.js'

// Seiten und Dateien, die der Browser öffnet: Bedienseite, Ergebnis-Oberfläche, Prompts.
export const seitenRouter = Router()

/** GET /prompts/:name – Prompt-Datei aus dem Prompts-Ordner (wird bei jedem Lauf neu gelesen). */
seitenRouter.get('/prompts/:name', (req, res) => {
  const name = path.basename(req.params.name)
  const file = path.join(PROMPTS_DIR, name)
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: `Prompt ${name} nicht gefunden` })
  res.json({ ok: true, name, text: fs.readFileSync(file, 'utf8') })
})

// Die Ergebnis-Oberfläche liegt seit der React-Migration unter /app; die alten Adressen leiten dorthin weiter.
const zurNeuen = (req: express.Request, res: express.Response) => res.redirect(302, '/app/' + req.url.slice(req.path.length))
seitenRouter.get('/ergebnisse', zurNeuen)
seitenRouter.get('/neu', zurNeuen)

// Neue React-Oberfläche (Vite-Build): /app
seitenRouter.use('/app', express.static(UI_DIR, {
  index: false,
  setHeaders: (res, f) => { if (f.endsWith('index.html')) res.set('Cache-Control', 'no-cache') },
}))
seitenRouter.get(/^\/app(\/.*)?$/, (_req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(UI_DIR, 'index.html')))

/** GET / – Bedienseite (ui.html); der noVNC-Link wird eingesetzt. */
seitenRouter.get('/', (_req, res) => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'ui.html'), 'utf8').replace(/__NOVNC_URL__/g, NOVNC_URL)
  res.type('html').send(html)
})
