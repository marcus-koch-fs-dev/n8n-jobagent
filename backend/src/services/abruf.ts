import fs from 'node:fs'
import path from 'node:path'
import { DIRS, MAX_TEXT_CHARS, PAGE_TIMEOUT_MS, MAX_DELAY_MS, MIN_DELAY_MS, PUBLIC_URL, RETRIES } from '../config.js'
import { acceptConsent, type ConsentErgebnis } from '../lib/consent.js'
import { detectBlocked, type Befund } from '../lib/detect.js'
import { idForUrl, log, sleep, textHash } from '../lib/util.js'
import { getContext, istSichtbar, withSlot } from './browser.js'

/** Ergebnis eines Seitenabrufs – so wie /fetch es an n8n zurückgibt. */
export interface Abruf {
  ok: boolean
  url: string
  error?: string
  finalUrl?: string
  httpStatus?: number | null
  title?: string
  text?: string
  textLength?: number
  textHash?: string
  cacheId?: string
  screenshotUrl?: string
  textUrl?: string
  consent?: ConsentErgebnis
  blocked: Befund
  abgerufenAm?: string
}

/** Eine Seite öffnen, Cookie-Banner akzeptieren, Text und Screenshot speichern. */
async function fetchOnce(url: string, consentButtonText: string | null): Promise<Abruf> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  let keepOpen = false
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null)
    await sleep(1000)

    const consent = await acceptConsent(page, consentButtonText || null)
    if (consent.accepted) {
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null)
      await sleep(1000)
    }

    const title = await page.title().catch(() => '')
    const finalUrl = page.url()
    const httpStatus = response ? response.status() : null
    const rawText = await page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '')
    const text = rawText
      .replace(/\r/g, '')
      .replace(/[ \t ]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim()
      .slice(0, MAX_TEXT_CHARS)

    const blocked = await detectBlocked(page, { text, title, finalUrl, httpStatus })
    keepOpen = istSichtbar() && blocked.any

    const id = idForUrl(url)
    const screenshotFile = path.join(DIRS.screenshots, `${id}.png`)
    await page.screenshot({ path: screenshotFile, fullPage: false }).catch(() => null)

    // Cache: Text + Metadaten dauerhaft speichern (für spätere Neubewertung).
    const meta = { id, url, finalUrl, title, httpStatus, abgerufenAm: new Date().toISOString() }
    fs.writeFileSync(path.join(DIRS.cache, `${id}.txt`), text, 'utf8')
    fs.writeFileSync(path.join(DIRS.cache, `${id}.json`), JSON.stringify(meta, null, 2), 'utf8')

    return {
      ok: true,
      url,
      finalUrl,
      httpStatus,
      title,
      text,
      textLength: text.length,
      textHash: textHash(text),
      cacheId: id,
      screenshotUrl: `${PUBLIC_URL}/screenshots/${id}.png`,
      textUrl: `${PUBLIC_URL}/text/${id}`,
      consent,
      blocked,
      abgerufenAm: meta.abgerufenAm,
    }
  } finally {
    // Im sichtbaren Modus bleiben blockierte Seiten offen, damit du sie in noVNC ansehen kannst.
    if (!keepOpen) await page.close().catch(() => null)
  }
}

/** Wie fetchOnce, aber mit kleiner Pause davor und mehreren Versuchen bei Fehlern. */
export async function fetchWithRetries(url: string, consentButtonText: string | null): Promise<Abruf> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      // Kleine zufällige Pause: schont die Webseiten.
      await sleep(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS))
      return await withSlot(() => fetchOnce(url, consentButtonText))
    } catch (err) {
      lastError = err
      log(`Fehler bei ${url} (Versuch ${attempt + 1}/${RETRIES + 1}): ${(err as Error).message}`)
      await sleep(2000 * (attempt + 1))
    }
  }
  return {
    ok: false,
    url,
    error: String(lastError && (lastError as Error).message ? (lastError as Error).message : lastError).slice(0, 500),
    blocked: { login: false, captcha: false, paywall: false, any: false, reasons: [] },
    consent: { accepted: false, method: null, candidates: [] },
  }
}
