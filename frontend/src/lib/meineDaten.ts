import { createStore, useStore } from './store'
import { jsonLesen, jsonSchreiben } from './speicher'

type Feld = 'name' | 'strasse' | 'plz_ort' | 'telefon' | 'email' | 'linkedin'

/** Deine persönlichen Angaben für den Briefkopf. Bleiben nur in diesem Browser – nie an Server, n8n oder KI. */
interface MeineDaten extends Record<Feld, string> {
  /** Felder ohne Haken: kommen nicht in den Brief (samt Trenner „ · “) */
  weglassen: Feld[]
}

/** Feld → Platzhalter in der Word-Vorlage, z. B. {{MEIN_NAME}} */
export const MEINE_PLATZHALTER: [feld: Feld, platzhalter: string, label: string][] = [
  ['name', 'MEIN_NAME', 'Name'],
  ['strasse', 'MEINE_STRASSE', 'Straße und Hausnummer'],
  ['plz_ort', 'MEIN_PLZ_ORT', 'PLZ und Ort'],
  ['telefon', 'MEIN_TELEFON', 'Telefon'],
  ['email', 'MEINE_EMAIL', 'E-Mail'],
  ['linkedin', 'MEIN_LINKEDIN', 'LinkedIn / Website'],
]

/** Diese Felder lassen sich per Haken aus dem Brief nehmen. */
export const ABWAEHLBAR: Feld[] = ['telefon', 'email', 'linkedin']

const LEER: MeineDaten = { name: '', strasse: '', plz_ort: '', telefon: '', email: '', linkedin: '', weglassen: [] }
const meineDatenStore = createStore<MeineDaten>({ ...LEER, ...jsonLesen<Partial<MeineDaten>>('meineDaten', {}) })

export const useMeineDaten = () => useStore(meineDatenStore)
export const meineDatenSetzen = (teil: Partial<MeineDaten>) => {
  const neu = { ...meineDatenStore.get(), ...teil }
  meineDatenStore.set(neu)
  jsonSchreiben('meineDaten', neu)
}

/** Haken für ein Feld umschalten (an = kommt in den Brief). */
export const imBriefSetzen = (f: Feld, an: boolean) => {
  const rest = meineDatenStore.get().weglassen.filter((x) => x !== f)
  meineDatenSetzen({ weglassen: an ? rest : [...rest, f] })
}

/**
 * Platzhalter → Text, nur für ausgefüllte Felder (leere bleiben in der Vorlage sichtbar stehen).
 * Abgewählte Felder werden zu leerem Text – die Ersetzung räumt dann den Trenner mit weg.
 */
export const meineWerte = (d: MeineDaten = meineDatenStore.get()): Record<string, string> =>
  Object.fromEntries(MEINE_PLATZHALTER.flatMap(([f, p]): [string, string][] =>
    d.weglassen?.includes(f) ? [[p, '']] : d[f].trim() ? [[p, d[f].trim()]] : []))
