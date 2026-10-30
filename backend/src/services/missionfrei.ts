import type { Page } from 'playwright'
import { MISSIONFREI_URL, PAGE_TIMEOUT_MS } from '../config.js'
import { log } from '../lib/util.js'
import { getContext } from './browser.js'

// Missionfrei-Anmeldung von der Ergebnis-Seite aus. Das Passwort wird NICHT gespeichert und nicht ins
// Protokoll geschrieben – gespeichert bleibt nur die Anmeldung selbst im Browser-Profil.

interface Status {
  angemeldet: boolean | null
  geprueft: number
}
let mfStatus: Status = { angemeldet: null, geprueft: 0 }

async function missionfreiSeite(): Promise<Page> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  await page.goto(MISSIONFREI_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })
  await page.waitForTimeout(1500)
  return page
}

const gesperrt = (page: Page): Promise<boolean> => page.locator('input[type="password"]').first().isVisible().catch(() => false)

/** Stand der Anmeldung; höchstens alle 5 Minuten wirklich nachsehen, sonst den gemerkten Stand. */
export async function missionfreiStatus(neu: boolean): Promise<{ ok: true; angemeldet: boolean | null; geprueft: number } | { ok: false; error: string }> {
  if (!neu && mfStatus.angemeldet !== null && Date.now() - mfStatus.geprueft < 5 * 60 * 1000) return { ok: true, ...mfStatus }
  let page: Page | undefined
  try {
    page = await missionfreiSeite()
    mfStatus = { angemeldet: !(await gesperrt(page)), geprueft: Date.now() }
    return { ok: true, ...mfStatus }
  } catch (e) {
    return { ok: false, error: 'Missionfrei nicht erreichbar: ' + (e as Error).message.split('\n')[0] }
  } finally {
    if (page) await page.close().catch(() => null)
  }
}

/** Passwort in die Anmeldemaske eintragen und „Bereich öffnen“ klicken. */
export async function missionfreiAnmelden(pw: string): Promise<{ ok: boolean; angemeldet?: boolean; hinweis?: string; error?: string }> {
  let page: Page | undefined
  try {
    page = await missionfreiSeite()
    if (!(await gesperrt(page))) {
      mfStatus = { angemeldet: true, geprueft: Date.now() }
      return { ok: true, angemeldet: true, hinweis: 'Du warst schon angemeldet.' }
    }
    await page.locator('input[type="password"]').first().fill(pw)
    const knopf = page.getByRole('button', { name: /bereich öffnen/i }).first()
    if (await knopf.isVisible().catch(() => false)) await knopf.click()
    else await page.keyboard.press('Enter')
    await page.waitForTimeout(2500)
    const ok = !(await gesperrt(page))
    mfStatus = { angemeldet: ok, geprueft: Date.now() }
    log(`Missionfrei-Anmeldung: ${ok ? 'erfolgreich' : 'abgelehnt'}`) // ohne Passwort
    return ok ? { ok: true, angemeldet: true } : { ok: false, angemeldet: false, error: 'Passwort wurde nicht angenommen.' }
  } catch (e) {
    return { ok: false, error: 'Anmeldung ging nicht: ' + (e as Error).message.split('\n')[0] }
  } finally {
    if (page) await page.close().catch(() => null)
  }
}
