import fs from 'node:fs'
import path from 'node:path'
import { ABLAGE, ANSCHREIBEN_INDEX, PROFIL_DIR, STANDARD_VORLAGE } from '../config.js'
import type { MappenEintrag } from '../types.js'
import { jsonLesen, log } from '../lib/util.js'
import { anschreibenDocx } from '../lib/word.js'
import { ordnerName, stadtKurz } from '../lib/namen.js'
import { lebenslaufWaehlen } from './lebenslaeufe.js'
import { profilLesen } from './profil.js'

// Fertige Bewerbungsmappen: Anschreiben (Word), Kurznachricht und Lebenslauf-Kopie. Die Seite legt sie
// in deinen Zielordner ab; hier liegen sie zuerst im Projekt (data/anschreiben-dateien).

type Profil = ReturnType<typeof profilLesen>

/** Index aller Mappen (Stellen-ID → Eintrag). Fehlt die Datei, leer. */
export const indexLesen = (): Record<string, MappenEintrag> => jsonLesen<Record<string, MappenEintrag>>(ANSCHREIBEN_INDEX, {})

const indexSchreiben = (index: Record<string, MappenEintrag>): void =>
  fs.writeFileSync(ANSCHREIBEN_INDEX, JSON.stringify(index, null, 2))

/** Antwort einer Service-Funktion: HTTP-Status und JSON-Body. */
export interface Antwort {
  status: number
  body: Record<string, unknown>
}
const fehler = (status: number, error: string): Antwort => ({ status, body: { ok: false, error } })
const ok = (body: Record<string, unknown>): Antwort => ({ status: 200, body })

// Gender-Kürzel wie „(m/w/d)“ und Zusätze nach „ – “ / „ - “ gehören nicht in Betreff und Stellenname.
const ohneKuerzel = (t: unknown): string =>
  String(t || '').replace(/\s*\((?:[mwfdx]\s*[/|,]\s*)+[mwfdx]\*?\)|\s*\(all genders\)|\s*\(gn\)/gi, '').replace(/\s{2,}/g, ' ').trim()

/** Vorlage für das Anschreiben: nur Vorlagen mit {{ANSCHREIBEN}} taugen, sonst käme der Brieftext nirgends hin. */
function vorlageWaehlen(p: Profil, en: boolean): { datei: string | undefined; vorlage: Buffer | null; platz: Set<string> } {
  const brauchbar = (art: string) => ((p.anschreiben_dateien[art] || {}).platzhalter || []).includes('ANSCHREIBEN')
  const datei = [en && brauchbar('vorlage_en') ? 'vorlage_en.docx' : '', brauchbar('vorlage_de') ? 'vorlage_de.docx' : ''].find(Boolean)
  if (!datei) {
    // Keine eigene Vorlage: die mitgelieferte (hat Platz für Anrede und Gruß)
    if (!fs.existsSync(STANDARD_VORLAGE)) return { datei: undefined, vorlage: null, platz: new Set() }
    return { datei: 'Standard-Vorlage', vorlage: fs.readFileSync(STANDARD_VORLAGE), platz: new Set(['ANREDE', 'GRUSS', 'ANSCHREIBEN']) }
  }
  const vorlage = fs.readFileSync(path.join(PROFIL_DIR, datei))
  const platz = new Set<string>((p.anschreiben_dateien[datei.replace('.docx', '')] || {}).platzhalter || [])
  return { datei, vorlage, platz }
}

const datumText = (en: boolean): string => new Date().toLocaleDateString(en ? 'en-GB' : 'de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

/** Erste Zeile des Lebenslaufs, wenn sie wie ein Name aussieht (für Dateinamen). */
function nameAusLebenslauf(p: Profil): string {
  const ersteZeile = String(p.lebenslauf_text || '').split('\n').map((z) => z.trim()).find(Boolean) || ''
  return /^[\p{L}.' -]{3,40}$/u.test(ersteZeile) && ersteZeile.split(' ').length <= 4 ? ersteZeile : ''
}

const ANREDE = 'Sehr geehrte Damen und Herren,'
const GRUSS = 'Mit freundlichen Grüßen'

/**
 * Leeren Ordner „Firma - Stadt“ anlegen (zum Selbst-Befüllen) – ohne KI, ohne Kosten. Dazu ein Anschreiben-Entwurf:
 * Absender, Firma, Datum, Betreff und Gruß stehen drin, den Text schreibst du selbst. Deine Daten (MEIN_*) füllt der
 * Browser beim Ablegen – wie bei den fertigen Mappen; dort wird ein vorhandener Entwurf nicht überschrieben.
 */
export async function ordnerAnlegen(firma: unknown, ort: unknown, stelle?: unknown): Promise<Antwort> {
  if (!String(firma || '').trim()) return fehler(400, 'firma fehlt')
  const ordner = ordnerName(firma, ort)
  try {
    fs.mkdirSync(path.join(ABLAGE, ordner), { recursive: true })
  } catch (e) {
    return ok({ ok: false, error: 'Ordner ließ sich nicht anlegen: ' + (e as Error).message })
  }
  const p = profilLesen()
  const { vorlage, platz } = vorlageWaehlen(p, false)
  const stelleKurz = ohneKuerzel(stelle).split(/\s+[–-]\s+/)[0]
  const firmaText = String(firma).trim()
  const ortText = stadtKurz(ort) // „Potsdam (Remote, weltweit)“ → „Potsdam“
  const strasse = '[Straße Hausnummer]'
  const plzOrt = `[PLZ] ${ortText || '[Ort]'}`
  const werte: Record<string, string> = {
    FIRMA: firmaText, STELLE: stelleKurz, DATUM: datumText(false), BETREFF: stelleKurz ? `Bewerbung als ${stelleKurz}` : 'Bewerbung',
    ANREDE: ANREDE, GRUSS: GRUSS, ORT: ortText, STRASSE: strasse, PLZ_ORT: plzOrt,
  }
  const absaetze = [
    ...(platz.has('ANREDE') ? [] : [ANREDE]),
    '[Hier dein Anschreiben …]',
    ...(platz.has('GRUSS') ? [] : [GRUSS, '{{MEIN_NAME}}']),
  ]
  // Ohne Vorlage: Absenderzeilen oben (mit Platzhaltern für deine Daten), Firmenanschrift darunter
  const kopf = vorlage ? [] : ['{{MEIN_NAME}}', '{{MEINE_STRASSE}}', '{{MEIN_PLZ_ORT}}', '{{MEIN_TELEFON}} · {{MEINE_EMAIL}}', '', firmaText, strasse, plzOrt]
  const name = nameAusLebenslauf(p)
  const datei = ['Anschreiben', name].filter(Boolean).join(' - ') + '.docx'
  const relativ = `${ordner}/${datei}`
  // Die Projekt-Kopie immer neu (aktuelle Vorlage); „nicht überschreiben“ gilt nur im Zielordner (Browser)
  fs.writeFileSync(path.join(ABLAGE, relativ), await anschreibenDocx(vorlage, werte, absaetze, kopf))
  log(`Anschreiben-Entwurf angelegt: ${relativ}`)
  return ok({ ok: true, ordner, entwurf: relativ })
}

/** Die Mappe zu einer Stelle erstellen: Word aus der Vorlage, Kurznachricht und Lebenslauf-Kopie in den Ordner. */
export async function mappeSpeichern(b: Record<string, any>): Promise<Antwort> {
  const id = Number(b.job_id)
  if (!Number.isInteger(id) || id <= 0) return fehler(400, 'job_id fehlt')
  const index = indexLesen()
  const jetzt = new Date().toISOString()
  if (b.fehler) {
    index[id] = { ...(index[id] || {}), fehler: String(b.fehler).slice(0, 400), am: jetzt }
    indexSchreiben(index)
    return ok({ ok: true, fehler: true })
  }
  const p = profilLesen()
  const en = b.sprache === 'en'
  const { datei: vorlageDatei, vorlage, platz } = vorlageWaehlen(p, en)
  const datum = datumText(en)
  // Anrede/Gruß kommen in den Brieftext, wenn die Vorlage keinen eigenen Platz dafür hat
  const absaetze = [
    ...(platz.has('ANREDE') ? [] : [b.anrede]),
    ...(Array.isArray(b.absaetze) ? b.absaetze : []),
    ...(platz.has('GRUSS') ? [] : [b.gruss]),
  ].filter((x) => x && String(x).trim()).map(String)
  const stelleKurz = ohneKuerzel(b.stelle).split(/\s+[–-]\s+/)[0]
  const ort: string = b.firmensitz && !/remote/i.test(b.firmensitz) ? b.firmensitz : ''
  const werte: Record<string, string> = {
    FIRMA: b.firma || '', STELLE: stelleKurz, DATUM: datum, BETREFF: ohneKuerzel(b.betreff), ANREDE: b.anrede || '', GRUSS: b.gruss || '', ORT: b.firmensitz || '',
    // Anschrift der Firma: aus der Anzeige, sonst Platzhalter zum Selbst-Ausfüllen
    STRASSE: String(b.strasse || '').trim() || '[Straße Hausnummer]',
    PLZ_ORT: String(b.plz_ort || '').trim() || `[PLZ] ${ort || '[Ort]'}`,
  }
  // Mappe: „voll“/„kurz“ = mit Anschreiben, „keins“ = Firma will keins → nur Kurznachricht + Lebenslauf
  const mitBrief = b.art !== 'keins' && Array.isArray(b.absaetze) && b.absaetze.some((a: unknown) => String(a || '').trim())
  let puffer: Buffer | null = null
  if (mitBrief) {
    try {
      puffer = await anschreibenDocx(vorlage, werte, absaetze)
    } catch (e) {
      return ok({ ok: false, error: 'Word-Datei ließ sich nicht erzeugen: ' + (e as Error).message })
    }
  }
  const ordner = ordnerName(b.firma, ort)
  // Dateiname kurz: „Anschreiben - Max Mustermann“ (Name = erste Zeile des Lebenslaufs)
  const name = nameAusLebenslauf(p)
  const basis = ['Anschreiben', name].filter(Boolean).join(' - ')
  const ziel = ABLAGE
  try {
    fs.mkdirSync(path.join(ziel, ordner), { recursive: true })
  } catch (e) {
    return ok({ ok: false, error: 'Ordner ließ sich nicht anlegen: ' + (e as Error).message })
  }
  const rel = (f: string) => (ordner ? `${ordner}/${f}` : f)
  const dateien: string[] = [] // alles, was die Seite in deinen Zielordner legt
  if (puffer) {
    let datei = basis + '.docx'
    for (let n = 2; fs.existsSync(path.join(ziel, ordner, datei)); n++) datei = `${basis} (${n}).docx`
    fs.writeFileSync(path.join(ziel, rel(datei)), puffer)
    dateien.push(rel(datei))
  }
  // Kurznachricht fürs Nachrichtenfeld im Bewerbungsformular / als E-Mail-Text
  const kurz = String(b.kurznachricht || '').trim()
  if (kurz) {
    fs.writeFileSync(path.join(ziel, rel('Kurznachricht.txt')), kurz + '\n', 'utf8')
    dateien.push(rel('Kurznachricht.txt'))
  }
  // Lebenslauf als Kopie in den Firmenordner: der des Bereichs der Stelle, sonst der Standard
  const cv = lebenslaufWaehlen(b.bereich, en)
  if (cv && cv.original) {
    const datei = `${cv.sprache === 'en' ? 'CV' : 'Lebenslauf'}${name ? ' - ' + name : ''}${path.extname(cv.original)}`
    fs.copyFileSync(cv.original, path.join(ziel, rel(datei)))
    dateien.push(rel(datei))
  }
  if (!dateien.length) return ok({ ok: false, error: 'Weder Anschreiben noch Kurznachricht erhalten.' })
  const [abAblage, ...extra] = dateien // pfad = Hauptdatei (Anschreiben, sonst Kurznachricht)
  const eintrag: MappenEintrag = {
    pfad: abAblage, extra, ordner, datei: abAblage.split('/').pop(), art: mitBrief ? (b.art === 'kurz' ? 'kurz' : 'voll') : 'keins',
    sprache: en ? 'en' : 'de', vorlage: vorlageDatei || 'ohne Vorlage', betreff: mitBrief ? b.betreff || '' : '', text: mitBrief ? absaetze.join('\n\n') : '',
    kurznachricht: kurz, modell: String(b.modell || ''), am: jetzt,
  }
  index[id] = eintrag
  indexSchreiben(index)
  log(`Bewerbungsmappe gespeichert: ${dateien.join(', ')}`)
  return ok({ ok: true, pfad: abAblage, extra })
}

/** Absoluter Pfad einer Datei in der Ablage – nur innerhalb des Ablage-Ordners, sonst null. */
export function ablagePfad(relativ: string): string | null {
  const voll = path.resolve(ABLAGE, relativ)
  if (!voll.startsWith(path.resolve(ABLAGE) + path.sep) || !fs.existsSync(voll)) return null
  return voll
}
