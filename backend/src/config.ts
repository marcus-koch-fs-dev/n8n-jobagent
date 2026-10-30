import path from 'node:path'

// Alle Einstellungen des Browser-Dienstes an einer Stelle. Werte kommen aus Umgebungsvariablen,
// sonst gelten die Standardwerte.

const zahl = (name: string, vorgabe: number): number => Number(process.env[name] || vorgabe)

export const PORT = zahl('PORT', 3000)
export const START_VISIBLE = String(process.env.HEADLESS || 'true').toLowerCase() === 'false'
export const MAX_CONCURRENCY = zahl('MAX_CONCURRENCY', 2)
export const PAGE_TIMEOUT_MS = zahl('PAGE_TIMEOUT_MS', 45000)
export const RETRIES = zahl('RETRIES', 2)
export const MIN_DELAY_MS = zahl('MIN_DELAY_MS', 500)
export const MAX_DELAY_MS = zahl('MAX_DELAY_MS', 1500)
export const MAX_TEXT_CHARS = zahl('MAX_TEXT_CHARS', 100000)
export const DATA_DIR = process.env.DATA_DIR || '/data'
export const PROMPTS_DIR = process.env.PROMPTS_DIR || '/prompts'
export const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000'
export const NOVNC_URL = process.env.NOVNC_URL || 'http://localhost:6080/vnc.html?autoconnect=1&resize=scale'
export const MISSIONFREI_URL = process.env.MISSIONFREI_URL || 'https://missionfrei.github.io/remote/'

/** Projektordner mit den Seiten (ui.html, neu.html, ergebnisse.html) und der React-Oberfläche (ui/). Liegt eine Ebene über dist/. */
export const ROOT_DIR = path.resolve(__dirname, '..')
export const UI_DIR = path.join(ROOT_DIR, 'ui')
/** Mitgelieferte Briefvorlage (neutral, nur Platzhalter) – gilt, solange keine eigene hochgeladen ist. */
export const STANDARD_VORLAGE = path.join(ROOT_DIR, 'vorlagen', 'standard_de.docx')

/** Unterordner im Datenordner. */
export const DIRS = {
  profile: path.join(DATA_DIR, 'browser-profile'),
  cache: path.join(DATA_DIR, 'cache'),
  screenshots: path.join(DATA_DIR, 'screenshots'),
  links: path.join(DATA_DIR, 'links'),
} as const

/** Profil: Such-Prompt, Lebensläufe, Vorlagen, Modelle (von n8n gelesen). */
export const PROFIL_DIR = path.join(DATA_DIR, 'profil')
export const PROFIL_JSON = path.join(PROFIL_DIR, 'profil.json')
export const KRITERIEN_MD = path.join(PROFIL_DIR, 'kriterien.md')
export const ANSCHREIBEN_MD = path.join(PROFIL_DIR, 'anschreiben_prompt.md')
/** Eigener Standard-Text für den Schreibstil („Als meinen Standard merken“) – nur für die Seite, n8n braucht ihn nicht. */
export const ANSCHREIBEN_STANDARD_MD = path.join(PROFIL_DIR, 'anschreiben_prompt_standard.md')
/** Eigene Prüf-Anweisungen für den Tiefen-Check (leer/fehlt = Standard aus prompts/tiefencheck.md). */
export const TIEFENCHECK_MD = path.join(PROFIL_DIR, 'tiefencheck_prompt.md')
export const LV_DIR =path.join(PROFIL_DIR, 'lebenslaeufe')

/** Fertige Bewerbungsmappen (Zielordner-Vorlage) und ihr Index. */
export const ABLAGE = path.join(DATA_DIR, 'anschreiben-dateien')
export const ANSCHREIBEN_INDEX = path.join(DATA_DIR, 'anschreiben.json')
/** Stellen, die du ohne Tiefen-Check nach „4 · Bewerben“ geschickt hast (Liste von Stellen-IDs). */
export const BEWERBEN_DIREKT = path.join(DATA_DIR, 'bewerben-direkt.json')

export const EINST_DATEI = path.join(DATA_DIR, 'einstellungen.json')
export const PAUSE_DATEI = path.join(DATA_DIR, 'pause.json')
