import fs from 'node:fs'
import path from 'node:path'
import { DIRS, PAGE_TIMEOUT_MS, PUBLIC_URL } from '../config.js'
import { log } from '../lib/util.js'
import { getContext, istSichtbar } from './browser.js'
import { schrittMelden } from './lauf.js'

// Links einer Stellenliste lesen (Schritt 1 der Pipeline). Ist die Seite schon offen, wird genau diese genommen.

const LETZTE_LISTE = path.join(DIRS.links, 'links-latest.json')

export interface LinkListe {
  quelle: string
  gelesenAm: string
  count: number
  links: { url: string; text: string }[]
}

/** Zuletzt gelesene Liste, falls vorhanden. */
export function letzteListe(): LinkListe | null {
  return fs.existsSync(LETZTE_LISTE) ? JSON.parse(fs.readFileSync(LETZTE_LISTE, 'utf8')) as LinkListe : null
}

/**
 * Alle Links einer Seite lesen. `fallbackGespeichert` = automatischer Lauf: ist die Seite nicht erreichbar
 * oder gesperrt, wird die zuletzt gelesene Liste verwendet. Netzfehler ohne Fallback werden weitergeworfen.
 */
export async function linkListe(url: string, fallbackGespeichert: boolean): Promise<Record<string, unknown>> {
  schrittMelden('Schritt 1 · Links holen') // Lebenszeichen, damit die Seite „Schritt 1 läuft“ zeigt
  const ctx = await getContext()
  const base = url.split('#')[0]

  // Ist die Seite schon offen (z. B. weil du sie in noVNC entsperrt hast)? Dann nehmen wir genau diese Seite.
  let page = ctx.pages().find((p) => p.url().split('#')[0].startsWith(base))
  let opened = false
  if (!page) {
    page = await ctx.newPage()
    opened = true
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null)
    } catch (err) {
      // Netzproblem (z. B. WLAN-Wechsel): beim automatischen Lauf die gespeicherte Liste nehmen.
      await page.close().catch(() => null)
      const gespeichert = letzteListe()
      if (fallbackGespeichert && gespeichert) {
        log(`/extract-links ${url}: nicht erreichbar (${(err as Error).message.split('\n')[0]}) – nehme gespeicherte Liste`)
        return { ok: true, locked: false, ausDatei: true, hinweis: `Seite nicht erreichbar – gespeicherte Liste vom ${gespeichert.gelesenAm} verwendet`, ...gespeichert }
      }
      throw err
    }
  }

  try {
    const locked = await page.locator('input[type="password"]').first().isVisible().catch(() => false)
    const gespeichert = letzteListe()
    if (locked && fallbackGespeichert && gespeichert) {
      // Automatischer Lauf: Seite ist gesperrt → zuletzt gelesene Liste verwenden.
      log(`/extract-links ${url}: gesperrt – nehme gespeicherte Liste vom ${gespeichert.gelesenAm}`)
      return { ok: true, locked: true, ausDatei: true, hinweis: `Seite war gesperrt – gespeicherte Liste vom ${gespeichert.gelesenAm} verwendet`, ...gespeichert }
    }
    if (locked) {
      return {
        ok: false,
        locked: true,
        count: 0,
        links: [],
        hinweis: `Missionfrei ist gesperrt. Auf ${PUBLIC_URL}/ergebnisse in „1 · Sammeln“ bei „Missionfrei-Zugang“ dein Passwort eingeben und den Lauf dann erneut starten.`,
      }
    }
    const links: { url: string; text: string }[] = []
    for (const frame of page.frames()) {
      const found = await frame
        .evaluate(() =>
          Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => ({
            url: a.href,
            text: (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 200),
          })),
        )
        .catch((): { url: string; text: string }[] => [])
      links.push(...found)
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const payload: LinkListe = { quelle: url, gelesenAm: new Date().toISOString(), count: links.length, links }
    fs.writeFileSync(path.join(DIRS.links, `links-${stamp}.json`), JSON.stringify(payload, null, 2))
    fs.writeFileSync(LETZTE_LISTE, JSON.stringify(payload, null, 2))
    log(`/extract-links ${url}: ${links.length} Links`)
    return { ok: true, locked: false, ...payload }
  } finally {
    if (opened && !istSichtbar()) await page.close().catch(() => null)
  }
}
