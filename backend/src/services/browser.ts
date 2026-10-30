import { chromium, type BrowserContext } from 'playwright'
import { DIRS, MAX_CONCURRENCY, START_VISIBLE } from '../config.js'
import { log, sleep } from '../lib/util.js'

// Ein einziger Chromium mit festem Profil-Ordner: Cookies und Logins, die du im sichtbaren Modus (noVNC)
// machst, bleiben gespeichert. Dazu eine Warteschlange, damit nie mehr als MAX_CONCURRENCY Seiten gleichzeitig laufen.

let context: BrowserContext | null = null
let visible = START_VISIBLE
let switching: Promise<void> | null = null
let active = 0
const queue: (() => void)[] = []

async function launch(wantVisible: boolean): Promise<void> {
  if (context) await context.close().catch(() => null)
  log(`Starte Chromium (${wantVisible ? 'sichtbar über noVNC' : 'headless'})`)
  context = await chromium.launchPersistentContext(DIRS.profile, {
    headless: !wantVisible,
    viewport: { width: 1366, height: 900 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  })
  visible = wantVisible
  context.on('close', () => {
    if (!switching) context = null
  })
}

/** Aktueller Browser-Kontext; startet Chromium bei Bedarf. */
export async function getContext(): Promise<BrowserContext> {
  if (switching) await switching
  if (!context) await launch(visible)
  return context!
}

/** Offene Kontexte ohne neu zu starten – für Routen, die nur lesen (z. B. Tab-Liste). */
export const aktuellerKontext = (): BrowserContext | null => context

/** Sichtbar oder unsichtbar: wartet auf laufende Abrufe, dann startet der Browser neu. */
export async function setMode(wantVisible: boolean): Promise<void> {
  if (context && visible === wantVisible) return
  switching = (async () => {
    while (active > 0) await sleep(200)
    await launch(wantVisible)
  })()
  try {
    await switching
  } finally {
    switching = null
  }
}

export const istSichtbar = (): boolean => visible

/** Zahlen für /health und Statusanzeigen. */
export const auslastung = (): { active: number; queued: number } => ({ active, queued: queue.length })

/** Führt `fn` aus, sobald einer der MAX_CONCURRENCY Plätze frei ist. */
export async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENCY) await new Promise<void>((r) => queue.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    const next = queue.shift()
    if (next) next()
  }
}
