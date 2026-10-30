import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ablageDatei, ordnerAnlegen as ordnerAufDienst } from '@/api/dienst'
import { platzhalterSetzen } from '@/lib/docx'
import { idbLesen, idbSchreiben } from '@/lib/idb'
import { meineWerte } from '@/lib/meineDaten'
import { jsonLesen, speicherSchreiben } from '@/lib/speicher'
import { createStore, useStore } from '@/lib/store'
import type { Job } from '@/types/job'
import type { AnschreibenListe } from '@/types/lauf'
import { useAnschreiben } from './useLaufStatus'
import { useToast } from './useToast'

// Zielordner per Ordner-Auswahl des Browsers (Chrome/Edge). Der Browser merkt sich den Ordner (IndexedDB);
// fertige Mappen holt die Seite vom Browser-Dienst und legt sie dort ab. Gemerkt wird je Mappe, ob sie schon abgelegt ist.
interface Datei { createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }
interface Ordner {
  name: string
  queryPermission(o: { mode: 'readwrite' }): Promise<string>
  requestPermission(o: { mode: 'readwrite' }): Promise<string>
  getDirectoryHandle(name: string, o: { create: boolean }): Promise<Ordner>
  getFileHandle(name: string, o: { create: boolean }): Promise<Datei>
}

interface AblageStand {
  ordner: string
  /** Mappen, die noch nicht im Zielordner liegen */
  fehlt: number
  /** Der Browser will nach einem Neustart einmal die Erlaubnis (nur per Klick möglich) */
  erlaubnis: boolean
  /** Mappen-ID → Zeitstempel der abgelegten Fassung */
  abgelegt: Record<string, string>
}

const stand = createStore<AblageStand>({ ordner: '', fehlt: 0, erlaubnis: false, abgelegt: jsonLesen('abgelegt', {}) })
const aendern = (teil: Partial<AblageStand>) => stand.set({ ...stand.get(), ...teil })
export const ordnerWahlMoeglich = () => typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'

let laeuft = false

/** Fertige, noch nicht abgelegte Mappen in den Zielordner schreiben. `interaktiv` = darf nach Erlaubnis fragen (nur nach Klick). */
export async function ablegen(anschreiben: AnschreibenListe, interaktiv: boolean): Promise<number> {
  if (laeuft) return 0
  laeuft = true
  try {
    const offen = Object.entries(anschreiben).filter(([id, a]) => a.pfad && stand.get().abgelegt[id] !== a.am)
    let h: Ordner | undefined
    try { h = ordnerWahlMoeglich() ? await idbLesen<Ordner>('zielordner') : undefined } catch { /* keiner */ }
    aendern({ ordner: h?.name ?? '', fehlt: offen.length, erlaubnis: false })
    if (!h || !offen.length) return 0
    let recht = await h.queryPermission({ mode: 'readwrite' })
    if (recht !== 'granted' && interaktiv) recht = await h.requestPermission({ mode: 'readwrite' })
    if (recht !== 'granted') { aendern({ erlaubnis: true }); return 0 }

    let n = 0
    for (const [id, a] of offen) {
      try {
        // Ganze Mappe: Anschreiben (bzw. Kurznachricht) + weitere Dateien wie die Lebenslauf-Kopie
        for (const pfad of [a.pfad!, ...(a.extra ?? [])]) {
          const r = await ablageDatei(pfad)
          if (!r.ok) throw new Error(`${pfad}: HTTP ${r.status}`)
          // Deine Adresse u. Ä. kommt erst hier ins Word – aus dem Browser, nie vom Server oder aus der KI
          const blob = /[.]docx$/i.test(pfad) ? await platzhalterSetzen(await r.blob(), meineWerte()) : await r.blob()
          const teile = pfad.split('/')
          let dir = h
          for (const teil of teile.slice(0, -1)) dir = await dir.getDirectoryHandle(teil, { create: true })
          const w = await (await dir.getFileHandle(teile[teile.length - 1], { create: true })).createWritable()
          await w.write(blob)
          await w.close()
        }
        const abgelegt = { ...stand.get().abgelegt, [id]: a.am ?? '' }
        speicherSchreiben('abgelegt', JSON.stringify(abgelegt))
        aendern({ abgelegt })
        n++
      } catch (e) {
        console.warn('Ablegen fehlgeschlagen', id, e)
      }
    }
    aendern({ fehlt: stand.get().fehlt - n })
    return n
  } finally {
    laeuft = false
  }
}

/**
 * Nur direkt in einem Klick aufrufen (Chrome erlaubt die Abfrage nur dann): holt die Schreib-Erlaubnis
 * für den Zielordner, damit die gleich entstehenden Mappen von selbst dort landen.
 */
export async function zugriffSichern() {
  try {
    const h = ordnerWahlMoeglich() ? await idbLesen<Ordner>('zielordner') : undefined
    if (h && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') await h.requestPermission({ mode: 'readwrite' })
  } catch { /* kein Ordner oder abgelehnt – die Mappe bleibt im Projektordner */ }
}

export function useAblage() {
  const qc = useQueryClient()
  const melden = useToast()
  const s = useStore(stand)
  return {
    ...s,
    /** Ordner-Auswahl des Browsers; danach wird alles Fertige gleich abgelegt. */
    async zielordnerWaehlen() {
      const picker = (window as unknown as { showDirectoryPicker?: (o: object) => Promise<Ordner> }).showDirectoryPicker
      if (!picker) return melden('Dein Browser kann keinen Ordner auswählen – bitte Chrome oder Edge nutzen.', { fehler: true })
      try {
        const h = await picker({ id: 'jobagent-bewerbungen', mode: 'readwrite', startIn: 'documents' })
        await idbSchreiben('zielordner', h)
        const n = await ablegenAusCache(qc, true)
        if (n) melden(`${n} vorhandene Anschreiben in „${h.name}“ abgelegt.`)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') melden('Ordner konnte nicht gewählt werden: ' + (e as Error).message, { fehler: true })
      }
    },
    /** Leeren Ordner „Firma - Stadt“ anlegen: im Projektordner (Dienst) und, wenn möglich, in deinem Zielordner. Nur direkt im Klick aufrufen. */
    async ordnerAnlegen(job: Job) {
      await zugriffSichern()
      try {
        const { ordner, entwurf } = await ordnerAufDienst(String(job.firma || job.domain || ''), String(job.ort || ''), String(job.jobtitel || ''))
        let imZiel = false
        let entwurfNeu = false
        try {
          const h = ordnerWahlMoeglich() ? await idbLesen<Ordner>('zielordner') : undefined
          if (h && (await h.queryPermission({ mode: 'readwrite' })) === 'granted') {
            imZiel = true
            if (entwurf) entwurfNeu = await entwurfAblegen(h, ordner, entwurf)
          }
        } catch { /* nur im Projektordner */ }
        const mitEntwurf = entwurfNeu ? ' mit Anschreiben-Entwurf zum Selbstschreiben' : ''
        melden(imZiel ? `Ordner „${ordner}“ in „${stand.get().ordner}“ angelegt${mitEntwurf}.` : `Ordner „${ordner}“ im Projektordner angelegt – dein Zielordner war nicht erreichbar.`)
      } catch (e) {
        melden('Ordner konnte nicht angelegt werden: ' + (e as Error).message, { fehler: true })
      }
    },
    /** Nach Klick: Zugriff erlauben und alles Offene ablegen. */
    ablegen: (interaktiv: boolean) => ablegenAusCache(qc, interaktiv),
  }
}

/**
 * Anschreiben-Entwurf aus dem Projektordner in den Zielordner schreiben – nur, wenn er dort noch fehlt.
 * Deine Daten (MEIN_*) setzt der Browser hier, wie beim Ablegen der Mappen. Gibt zurück, ob er neu abgelegt wurde.
 */
async function entwurfAblegen(h: Ordner, ordner: string, entwurf: string): Promise<boolean> {
  const dir = await h.getDirectoryHandle(ordner, { create: true })
  const name = entwurf.split('/').pop()!
  try {
    await dir.getFileHandle(name, { create: false })
    return false
  } catch { /* fehlt noch */ }
  const r = await ablageDatei(entwurf)
  if (!r.ok) return false
  const blob = await platzhalterSetzen(await r.blob(), meineWerte())
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable()
  await w.write(blob)
  await w.close()
  return true
}

const ablegenAusCache = (qc: QueryClient, interaktiv: boolean) =>
  ablegen(qc.getQueryData<AnschreibenListe>(['anschreiben']) ?? {}, interaktiv)

/** Einmal in der App einhängen: legt neue Mappen von selbst ab, sobald die Liste da ist oder sich ändert. */
export function useAblageWaechter() {
  const { data } = useAnschreiben()
  useEffect(() => { if (data) void ablegen(data, false) }, [data])
}