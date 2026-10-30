import type { DateiInfo, LebenslaufZeile, Profil } from '@/types/profil'
import type { TextSuche } from '@/lib/unterlagen'
import type { AnschreibenListe, Einstellungen, LaufArt, PauseStatus } from '@/types/lauf'

// Aufrufe an den Browser-Dienst (gleiche Herkunft wie die Seite, daher relative Pfade).
export async function holen<T>(pfad: string): Promise<T> {
  const r = await fetch(pfad)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json() as Promise<T>
}

const senden = (pfad: string, body: unknown) =>
  fetch(pfad, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

/** POST, dessen Antwort `{ ok, error, … }` ist; wirft bei `ok: false`. */
async function sendenOk<T extends object>(pfad: string, body: unknown): Promise<T> {
  const d = (await (await senden(pfad, body)).json()) as T & { ok?: boolean; error?: string }
  if (!d.ok) throw new Error(d.error || 'Fehler')
  return d
}

export async function cacheManuell(url: string, text: string) {
  const d = await sendenOk<{ cacheId?: string; textHash?: string }>('/cache-manuell', { url, text })
  if (!d.cacheId) throw new Error('Fehler')
  return { cacheId: d.cacheId, textHash: d.textHash }
}

export const ladePauseStatus = () => holen<PauseStatus>('/pause-status')
export const ladeEinstellungen = () => holen<Einstellungen>('/einstellungen')
export const ladeAnschreiben = async () => (await holen<{ anschreiben?: AnschreibenListe }>('/anschreiben/liste')).anschreiben ?? {}
export const ordnerAnlegen = (firma: string, ort: string, stelle: string) =>
  sendenOk<{ ordner: string; entwurf?: string }>('/anschreiben/ordner', { firma, ort, stelle })

/** Stellen, die ohne Tiefen-Check in „4 · Bewerben“ stehen (Stellen-IDs). */
export const ladeBewerbenDirekt = async () => (await holen<{ ids?: number[] }>('/bewerben-direkt')).ids ?? []
export const bewerbenDirektSetzen = async (id: number, an: boolean) => (await sendenOk<{ ids: number[] }>('/bewerben-direkt', { id, an })).ids

export const pauseSetzen = (pausiert: boolean) => senden('/pause', { pausiert })
/** Läufe beim Browser-Dienst melden – dann sieht jede geöffnete Seite den Fortschritt. */
export const laufMelden = (art: LaufArt, ids: number[], ersetzen: boolean) =>
  senden('/lauf', { art, ids, ersetzen }).catch(() => {})
export const laufLoeschen = (art: LaufArt) => fetch('/lauf/' + art, { method: 'DELETE' }).catch(() => {})

interface MissionfreiStatus { ok: boolean; error?: string; angemeldet?: boolean }
export const missionfreiStatus = (neu: boolean) => holen<MissionfreiStatus>('/missionfrei/status' + (neu ? '?neu=1' : ''))
export async function missionfreiAnmelden(passwort: string) {
  const r = await senden('/missionfrei/anmelden', { passwort })
  return (await r.json()) as { ok?: boolean; error?: string }
}
export async function ladeUnterlagen(stellen: { id: number; cache_id: string }[]): Promise<TextSuche> {
  const r = await senden('/unterlagen', { stellen })
  return ((await r.json()) as { unterlagen?: TextSuche }).unterlagen ?? {}
}
export const ladeProfil = () => holen<Profil>('/profil')
/** Mitgelieferte Prompt-Datei aus dem Ordner prompts/ (z. B. tiefencheck.md). */
export const ladePrompt = async (name: string) => (await holen<{ text: string }>('/prompts/' + name)).text
/** Gespeicherter Anzeigentext einer Stelle (für „Für Chat kopieren“); leer, wenn nichts gespeichert ist. */
export async function ladeAnzeigentext(cacheId: string): Promise<string> {
  try {
    const c = await holen<{ ok?: boolean; text?: string }>('/cache/' + encodeURIComponent(cacheId))
    return c.ok ? String(c.text) : ''
  } catch {
    return ''
  }
}
export const ablageDatei = (pfad: string) => fetch('/anschreiben/ablage?p=' + encodeURIComponent(pfad))
/** Antwort von POST /profil: das gespeicherte Profil oder ein Fehler. */
export const speichereProfil = (body: unknown) => sendenOk<Profil>('/profil', body)

const alsBase64 = (datei: File) => new Promise<string>((ok, fehler) => {
  const r = new FileReader()
  r.onload = () => ok(String(r.result).split(',')[1])
  r.onerror = () => fehler(r.error)
  r.readAsDataURL(datei)
})

export async function ladeLebenslaufHoch(datei: File) {
  return sendenOk<{ datei: string; zeichen: number }>('/profil/lebenslauf', { name: datei.name, daten: await alsBase64(datei) })
}

export async function ladeDateiHoch(art: string, datei: File) {
  return sendenOk<DateiInfo>('/profil/datei', { art, name: datei.name, daten: await alsBase64(datei) })
}

export const entferneDatei = (art: string) => senden('/profil/datei-entfernen', { art })

// Lebensläufe je Bereich – jede Antwort ist die ganze, aktuelle Liste.
async function lv(pfad: string, body: unknown): Promise<LebenslaufZeile[]> {
  return (await sendenOk<{ lebenslaeufe?: LebenslaufZeile[] }>('/profil/lv/' + pfad, body)).lebenslaeufe ?? []
}
export const lvNeu = () => lv('neu', {})
export const lvBereich = (id: string, bereich: string) => lv('bereich', { id, bereich })
export const lvLoeschen = (id: string) => lv('loeschen', { id })
export const lvDateiEntfernen = (id: string, sprache: 'de' | 'en') => lv('datei-entfernen', { id, sprache })
export async function lvDatei(id: string, sprache: 'de' | 'en', datei: File) {
  return lv('datei', { id, sprache, name: datei.name, daten: await alsBase64(datei) })
}