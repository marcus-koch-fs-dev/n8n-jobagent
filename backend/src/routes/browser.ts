import { Router } from 'express'
import { MAX_CONCURRENCY, PAGE_TIMEOUT_MS } from '../config.js'
import { log } from '../lib/util.js'
import { aktuellerKontext, auslastung, getContext, istSichtbar, setMode } from '../services/browser.js'
import { fetchWithRetries } from '../services/abruf.js'

// Browser: Gesundheit, Seiten abrufen, Seite sichtbar öffnen, Tabs, sichtbar/unsichtbar.
export const browserRouter = Router()

/** GET /health – läuft der Dienst? */
browserRouter.get('/health', (_req, res) => {
  const { active, queued } = auslastung()
  res.json({ ok: true, visible: istSichtbar(), active, queued, maxConcurrency: MAX_CONCURRENCY })
})

/** POST /fetch – eine Stellenseite abrufen. Body: { url, consentButtonText? } */
browserRouter.post('/fetch', async (req, res) => {
  const { url, consentButtonText } = req.body || {}
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: 'url fehlt oder ist ungültig' })
  log(`/fetch ${url}${consentButtonText ? ` (Consent-Button: "${consentButtonText}")` : ''}`)
  res.json(await fetchWithRetries(url, consentButtonText ?? null))
})

/** POST /open – Seite SICHTBAR öffnen (noVNC). Body: { url } */
browserRouter.post('/open', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ ok: false, error: 'url fehlt' })
  await setMode(true)
  const ctx = await getContext()
  // Ist die Seite schon in einem Tab offen? Dann diesen Tab nach vorne holen statt einen neuen zu öffnen.
  const base = String(url).split('#')[0]
  let page = ctx.pages().find((p) => p.url().split('#')[0].startsWith(base))
  if (!page) {
    // Einen leeren Start-Tab wiederverwenden, sonst neuen Tab öffnen.
    page = ctx.pages().find((p) => p.url() === 'about:blank') || (await ctx.newPage())
    await page.goto(String(url), { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS }).catch((e: Error) => log(e.message))
  }
  await page.bringToFront().catch(() => null)
  res.json({ ok: true, hinweis: 'Seite ist offen. Jetzt "Sichtbaren Browser anzeigen" klicken (noVNC).' })
})

/** GET /tabs – offene Tabs (für die Bedienseite). */
browserRouter.get('/tabs', async (_req, res) => {
  const ctx = aktuellerKontext()
  if (!ctx) return res.json({ ok: true, visible: istSichtbar(), tabs: [] })
  const tabs = await Promise.all(
    ctx.pages().map(async (p, i) => ({ index: i, url: p.url(), title: await p.title().catch(() => '') })),
  )
  res.json({ ok: true, visible: istSichtbar(), tabs })
})

/** POST /tabs/close – einen Tab schließen. Body: { index }. Den letzten Tab leert er nur, damit der Browser bleibt. */
browserRouter.post('/tabs/close', async (req, res) => {
  const i = Number(req.body && req.body.index)
  const pages = aktuellerKontext()?.pages() ?? []
  if (pages[i]) {
    if (pages.length === 1) await pages[i].goto('about:blank').catch(() => null)
    else await pages[i].close().catch(() => null)
  }
  res.json({ ok: true })
})

/** POST /mode – sichtbar oder unsichtbar umschalten. Body: { visible } */
browserRouter.post('/mode', async (req, res) => {
  await setMode(Boolean(req.body && req.body.visible))
  res.json({ ok: true, visible: istSichtbar() })
})
