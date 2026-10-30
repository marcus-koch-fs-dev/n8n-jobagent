import { holen } from '@/api/dienst'
import type { ModelleAntwort } from '@/lib/modellwahl'
import type { JobsAntwort } from '@/types/job'

// Im Dev-Server leitet der Vite-Proxy /webhook an n8n weiter, in Produktion gilt CORS für localhost:3000.
const N8N = import.meta.env.DEV ? '/webhook' : 'http://localhost:5678/webhook'

const ladeVonN8n = <T>(pfad: string) => holen<T>(`${N8N}/${pfad}`)

export const ladeJobs = () => ladeVonN8n<JobsAntwort>('jobs-daten')

const post = async <T>(pfad: string, body: unknown): Promise<T> => {
  const r = await fetch(`${N8N}/${pfad}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json() as Promise<T>
}

type Aktion = 'tendenz' | 'notiz' | 'manuell'

/** `jobs-aktion` von n8n; wirft, wenn es `ok: false` meldet. */
async function aktionAusfuehren(body: Record<string, unknown>) {
  const d = await post<{ ok?: boolean; fehler?: string; schon_bekannt?: boolean }>('jobs-aktion', body)
  if (!d.ok) throw new Error(d.fehler || 'unbekannt')
  return d
}

/** Speichert eine Änderung an einer Stelle. */
export const jobsAktion = (id: number, aktion: Aktion, wert: string, extra?: Record<string, unknown>) =>
  aktionAusfuehren({ id, aktion, wert, ...extra }).then(() => undefined)
export const komplettlauf = (bisSchritt: number) => post<unknown>('komplettlauf', { bis_schritt: bisSchritt })

/** Eigenen Link eintragen. `schon_bekannt` = gab es schon. */
export async function linkHinzufuegen(link: string) {
  return Boolean((await aktionAusfuehren({ aktion: 'link', wert: link })).schon_bekannt)
}
// `bereich` je Stelle: n8n sucht damit den passenden Lebenslauf aus (Einstellungen → Lebensläufe).
export const tiefencheckStarten = (stellen: { id: number; bereich?: string | null }[]) =>
  post<unknown>('kette-tiefencheck', { ids: stellen.map((s) => s.id), stellen: stellen.map((s) => ({ id: s.id, bereich: s.bereich ?? '' })) })
export const anschreibenStarten = (stellen: { id: number; art: string; modell: string; bereich?: string | null }[]) =>
  post<unknown>('kette-anschreiben', { ids: stellen.map((s) => s.id), stellen })
/** Nur auswerten: Schritt 3 (Fakten lesen) für alle Stellen mit Text, danach Schritt 4 (bewerten). Lädt keine neuen Links. */
export const auswertenStarten = () => post<unknown>('kette-schritt-3', { bis_schritt: 4 })
/** Bestehende Stellen neu bewerten (Schritt 4 nur für diese Stellen). */
export const neuBewerten = (ids: number[]) => post<unknown>('kette-schritt-4', { bis_schritt: 4, ids })
/** KI ordnet bewertete Stellen ein (Bereich + Hauptgrund). Ohne `max` alle offenen. */
export const einordnungStarten = (max?: number) => post<unknown>('kette-einordnung', max ? { max_stellen: max } : {})
export const ladeModelle = () => ladeVonN8n<ModelleAntwort>('modelle')