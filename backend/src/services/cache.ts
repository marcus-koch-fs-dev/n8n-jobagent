import fs from 'node:fs'
import path from 'node:path'
import { DIRS, MAX_TEXT_CHARS, PUBLIC_URL } from '../config.js'
import { idForUrl, jsonLesen, log, textHash } from '../lib/util.js'

// Gespeicherte Seiten (Cache): Text und Metadaten je Stelle. Die Dateien liegen unter data/cache.

/** Nur Kleinbuchstaben und Ziffern a–f: so kann niemand aus einer ID einen Pfad bauen. */
export const idBereinigen = (id: string): string => id.replace(/[^a-f0-9]/g, '')

const cacheTextPfad = (id: string): string => path.join(DIRS.cache, `${idBereinigen(id)}.txt`)

/** Gespeicherter Text einer Stelle, oder null, wenn es keinen Cache gibt. */
export const cacheTextLesen = (id: string): string | null => {
  const file = cacheTextPfad(id)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
}

/** Gespeicherte Seite, so wie /fetch sie zurückgibt – n8n kann sie ohne Neuabruf auswerten. */
export function cacheLesen(rohId: string): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  const id = idBereinigen(rohId)
  const text = cacheTextLesen(id)
  if (text === null) return { ok: false, error: `Kein Cache für ${id}` }
  const meta = jsonLesen<Record<string, unknown>>(path.join(DIRS.cache, `${id}.json`), {})
  return {
    ok: true,
    body: {
      ok: true,
      id,
      ...meta,
      text,
      textLength: text.length,
      textHash: textHash(text),
      cacheId: id,
      screenshotUrl: `${PUBLIC_URL}/screenshots/${id}.png`,
      blocked: { login: false, captcha: false, paywall: false, any: false, reasons: [] },
      consent: { accepted: true, method: 'cache', candidates: [] },
      ausCache: true,
    },
  }
}

/** Text von Hand eingefügt (für Seiten, die der Browser wegen Bot-Schutz nicht lesen kann). */
export function cacheManuell(url: unknown, text: unknown): { ok: true; cacheId: string; textHash: string; textLength: number } | { ok: false; error: string; status: number } {
  if (!url || !/^https?:\/\//i.test(String(url))) return { ok: false, status: 400, error: 'url fehlt' }
  const sauber = String(text || '').replace(/\r/g, '').trim().slice(0, MAX_TEXT_CHARS)
  if (sauber.length < 200) return { ok: false, status: 400, error: 'Text ist zu kurz (mind. 200 Zeichen) – bitte die ganze Anzeige kopieren' }
  const u = String(url)
  const id = idForUrl(u)
  const meta = { id, url: u, finalUrl: u, title: '(Text manuell eingefügt)', httpStatus: 200, abgerufenAm: new Date().toISOString(), manuell: true }
  fs.writeFileSync(path.join(DIRS.cache, `${id}.txt`), sauber, 'utf8')
  fs.writeFileSync(path.join(DIRS.cache, `${id}.json`), JSON.stringify(meta, null, 2), 'utf8')
  log(`/cache-manuell ${u}: ${sauber.length} Zeichen`)
  return { ok: true, cacheId: id, textHash: textHash(sauber), textLength: sauber.length }
}

