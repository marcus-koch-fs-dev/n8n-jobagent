import type { Locator, Page } from 'playwright'

// Cookie-Banner automatisch akzeptieren. Reihenfolge:
//   1. Bekannte Consent-Tools (OneTrust, Cookiebot, Usercentrics, ...) über ihre festen Selektoren.
//   2. Buttons mit typischen Texten („Alle akzeptieren“, „Accept all“, ...), auch in iframes.
//   3. Klappt beides nicht, aber ein Banner ist sichtbar: die Button-Texte werden als Kandidaten
//      zurückgegeben. n8n fragt dann die KI, welcher Button richtig ist, und ruft /fetch mit consentButtonText auf.

export interface ConsentErgebnis {
  accepted: boolean
  method: string | null
  candidates: string[]
}

// Feste Selektoren bekannter Consent-Tools. Playwright-CSS sucht auch in offenen Shadow-DOMs (wichtig für Usercentrics).
const KNOWN_CMP_SELECTORS: { name: string; selector: string }[] = [
  { name: 'OneTrust', selector: '#onetrust-accept-btn-handler' },
  { name: 'Google Funding Choices', selector: 'button.fc-cta-consent' },
  { name: 'Cookiebot', selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll' },
  { name: 'Cookiebot', selector: '#CybotCookiebotDialogBodyButtonAccept' },
  { name: 'Usercentrics', selector: 'button[data-testid="uc-accept-all-button"]' },
  { name: 'Didomi', selector: '#didomi-notice-agree-button' },
  { name: 'TrustArc', selector: '#truste-consent-button' },
  { name: 'consentmanager', selector: '#cmpbntyestxt' },
  { name: 'consentmanager', selector: '.cmpboxbtnyes' },
  { name: 'CookieYes', selector: '.cky-btn-accept' },
  { name: 'Complianz', selector: '.cmplz-accept' },
  { name: 'Borlabs', selector: 'a[data-cookie-accept-all], [data-borlabs-cookie-accept-all]' },
  { name: 'Klaro', selector: '.cm-btn-accept-all, .cm-btn-success' },
  { name: 'Quantcast', selector: '.qc-cmp2-summary-buttons button[mode="primary"]' },
  { name: 'Osano', selector: '.osano-cm-accept-all' },
  { name: 'Iubenda', selector: '.iubenda-cs-accept-btn' },
]

// Typische Button-Texte (deutsch, englisch und ein paar weitere Sprachen).
const ACCEPT_TEXTS: RegExp[] = [
  /^\s*alle akzeptieren\s*$/i,
  /^\s*alle cookies akzeptieren\s*$/i,
  /^\s*allen zustimmen\s*$/i,
  /^\s*alle zulassen\s*$/i,
  /^\s*alles akzeptieren\s*$/i,
  /^\s*akzeptieren( und schließen)?\s*$/i,
  /^\s*zustimmen( und weiter)?\s*$/i,
  /^\s*einverstanden\s*$/i,
  /^\s*einwilligen\s*$/i,
  /^\s*accept all( cookies)?\s*$/i,
  /^\s*allow all( cookies)?\s*$/i,
  /^\s*accept( cookies)?\s*$/i,
  /^\s*i accept\s*$/i,
  /^\s*agree( and continue)?\s*$/i,
  /^\s*i agree\s*$/i,
  /^\s*got it\s*$/i,
  /^\s*tout accepter\s*$/i,
  /^\s*aceptar todo\s*$/i,
  /^\s*accetta tutto\s*$/i,
]

// Woran wir einen (noch offenen) Banner erkennen.
const BANNER_HINT = /(cookie|consent|gdpr|dsgvo|privacy|datenschutz|cmp)/i

/** Klickt das erste sichtbare Element (höchstens die ersten 5). `true`, wenn etwas geklickt wurde. */
async function clickIfVisible(locator: Locator): Promise<boolean> {
  const count = await locator.count().catch(() => 0)
  for (let i = 0; i < Math.min(count, 5); i++) {
    const el = locator.nth(i)
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 3000 }).catch(() => null)
      return true
    }
  }
  return false
}

/**
 * Versucht den Cookie-Banner zu akzeptieren.
 * @param preferredText vom LLM gewählter Button-Text (Fallback-Runde)
 */
export async function acceptConsent(page: Page, preferredText: string | null = null): Promise<ConsentErgebnis> {
  const frames = page.frames()

  // Fallback-Runde: Das LLM hat uns einen konkreten Button-Text genannt.
  if (preferredText) {
    for (const frame of frames) {
      const byRole = frame.getByRole('button', { name: preferredText, exact: true })
      if (await clickIfVisible(byRole)) return { accepted: true, method: 'llm-auswahl', candidates: [] }
      const byText = frame.getByText(preferredText, { exact: true })
      if (await clickIfVisible(byText)) return { accepted: true, method: 'llm-auswahl', candidates: [] }
    }
  }

  // 1. Bekannte Consent-Tools
  for (const frame of frames) {
    for (const { name, selector } of KNOWN_CMP_SELECTORS) {
      if (await clickIfVisible(frame.locator(selector))) {
        return { accepted: true, method: `bekanntes-tool:${name}`, candidates: [] }
      }
    }
  }

  // 2. Typische Button-Texte
  for (const frame of frames) {
    for (const re of ACCEPT_TEXTS) {
      if (await clickIfVisible(frame.getByRole('button', { name: re }))) {
        return { accepted: true, method: `button-text:${re.source}`, candidates: [] }
      }
      if (await clickIfVisible(frame.getByRole('link', { name: re }))) {
        return { accepted: true, method: `link-text:${re.source}`, candidates: [] }
      }
    }
  }

  // 3. Banner sichtbar, aber nichts gefunden? Kandidaten für das LLM sammeln.
  const candidates = new Set<string>()
  for (const frame of frames) {
    const texts = await frame
      .evaluate((hintSource: string) => {
        const hint = new RegExp(hintSource, 'i')
        const out: string[] = []
        const containers = Array.from(document.querySelectorAll('div, section, aside, dialog, form')).filter((el) => {
          const marker = `${el.id} ${el.className} ${el.getAttribute('aria-label') || ''}`
          if (!hint.test(marker)) return false
          const r = el.getBoundingClientRect()
          return r.width > 50 && r.height > 20
        })
        for (const c of containers.slice(0, 5)) {
          for (const b of c.querySelectorAll<HTMLElement>('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]')) {
            const t = (b.innerText || (b as HTMLInputElement).value || '').trim().replace(/\s+/g, ' ')
            if (t && t.length <= 60) out.push(t)
          }
        }
        return out
      }, BANNER_HINT.source)
      .catch((): string[] => [])
    texts.forEach((t) => candidates.add(t))
  }

  return { accepted: false, method: null, candidates: Array.from(candidates).slice(0, 15) }
}
