import type { Page } from 'playwright'

// Login / Captcha / Paywall ERKENNEN, nichts umgehen. Erkannte Seiten bekommen in n8n den Status
// „wartet_auf_freigabe“; du entscheidest selbst, ob du dich von Hand anmeldest.

const LOGIN_URL = /(\/login|\/signin|\/sign-in|\/anmelden|\/auth\/|\/sso\/|\/account\/login|authwall|checkpoint)/i
const LOGIN_TEXT = [
  /bitte (melde dich|melden sie sich) an/i,
  /zum (fortfahren|ansehen) (bitte )?(anmelden|einloggen)/i,
  /(sign|log) in to (view|see|continue|apply)/i,
  /please (sign|log) in/i,
  /you must be logged in/i,
  /join .{0,30} to (view|see) /i,
]
const CAPTCHA_TEXT = [
  /verify (that )?you are (a )?human/i,
  /ich bin kein roboter/i,
  /checking (if the site connection is secure|your browser)/i,
  /are you a robot/i,
  /bitte bestätigen sie, dass sie ein mensch sind/i,
  /unusual traffic/i,
  /press (&|and) hold/i,
]
const CAPTCHA_FRAME = /(recaptcha|hcaptcha|challenges\.cloudflare\.com|turnstile|arkoselabs|funcaptcha|captcha-delivery|geo\.captcha)/i
const PAYWALL_TEXT = [/premium[- ]mitglied(schaft)? erforderlich/i, /subscribe to (view|read|unlock)/i, /nur für mitglieder/i]

export interface Seiteninfo {
  text: string
  title: string
  finalUrl: string
  httpStatus: number | null
}

export interface Befund {
  login: boolean
  captcha: boolean
  paywall: boolean
  any: boolean
  reasons: string[]
}

export async function detectBlocked(page: Page, { text, title, finalUrl, httpStatus }: Seiteninfo): Promise<Befund> {
  const reasons: string[] = []
  const sample = `${title}\n${text.slice(0, 4000)}`

  // --- Login ---
  const passwordVisible = await page
    .locator('input[type="password"]')
    .first()
    .isVisible()
    .catch(() => false)
  const loginByUrl = LOGIN_URL.test(finalUrl)
  const loginByText = LOGIN_TEXT.some((re) => re.test(sample))
  // Ein Passwortfeld allein reicht nicht (manche Jobseiten haben ein Login im Kopfbereich).
  // Nur wenn die Seite zusätzlich kaum Inhalt hat, zählt es.
  const loginByPassword = passwordVisible && text.length < 3000
  const login = loginByPassword || loginByUrl || loginByText
  if (loginByPassword) reasons.push('Passwortfeld sichtbar, kaum Inhalt')
  if (loginByUrl) reasons.push('Weiterleitung auf Login-Adresse')
  if (loginByText) reasons.push('Login-Hinweis im Text')

  // --- Captcha / Bot-Schutz ---
  // Viele Seiten laden ein unsichtbares reCAPTCHA (z. B. für das Bewerbungsformular).
  // Ein Captcha-iframe zählt deshalb nur, wenn die Seite sonst kaum Inhalt hat.
  const frameHit = page.frames().some((f) => CAPTCHA_FRAME.test(f.url())) && text.length < 1500
  const textHit = CAPTCHA_TEXT.some((re) => re.test(sample))
  const cloudflareTitle = /just a moment|attention required|einen moment/i.test(title)
  const captcha = frameHit || textHit || cloudflareTitle || (httpStatus === 403 && text.length < 1500)
  if (frameHit) reasons.push('Captcha-iframe gefunden')
  if (textHit) reasons.push('Captcha-Text gefunden')
  if (cloudflareTitle) reasons.push('Bot-Schutz-Seite (Titel)')
  if (httpStatus === 403 && text.length < 1500) reasons.push('HTTP 403 mit kaum Inhalt')

  // --- Paywall / Mitgliederbereich ---
  const paywall = PAYWALL_TEXT.some((re) => re.test(sample))
  if (paywall) reasons.push('Mitglieder-/Bezahlhinweis')

  return { login, captcha, paywall, any: login || captcha || paywall, reasons }
}
