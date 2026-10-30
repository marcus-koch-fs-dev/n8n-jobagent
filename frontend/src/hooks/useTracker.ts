import { useEffect } from 'react'
import { idbLesen, idbSchreiben } from '@/lib/idb'
import { createStore, useStore } from '@/lib/store'
import { eintragen, trackerZeile, warteschlangeAufnehmen, warteschlangeEntfernen, type WartendeZeile } from '@/lib/tracker'
import type { Job } from '@/types/job'
import { useToast } from './useToast'

// Deine Excel-Liste: einmal wählen, der Browser merkt sich die Datei (IndexedDB „tracker“) und darf hineinschreiben.
interface Datei {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<{ write(b: Blob | ArrayBuffer): Promise<void>; close(): Promise<void> }>
  queryPermission(o: { mode: 'readwrite' }): Promise<string>
  requestPermission(o: { mode: 'readwrite' }): Promise<string>
}
type Picker = (o: object) => Promise<Datei[]>
type Melden = ReturnType<typeof useToast>

const name = createStore('')
void idbLesen<Datei>('tracker').then((h) => name.set(h?.name ?? '')).catch(() => undefined)

// Einträge, die noch nicht in der Liste stehen (Datei offen, kein Schreibrecht …). Bleiben im Browser erhalten und werden nachgetragen.
const SCHLUESSEL = 'trackerWarteschlange'
const warteschlange = createStore<WartendeZeile[]>([])
const speichern = (neu: WartendeZeile[]) => {
  warteschlange.set(neu)
  void idbSchreiben(SCHLUESSEL, neu).catch(() => undefined)
}
const geladen = idbLesen<WartendeZeile[]>(SCHLUESSEL)
  .then((q) => { if (q?.length) speichern(warteschlangeAufnehmen(q, warteschlange.get())) })
  .catch(() => undefined)

const wartet = (n: number) => `${n} ${n === 1 ? 'Eintrag wartet' : 'Einträge warten'}`
const offen = (n: number) => `Die Excel-Datei ist gerade geöffnet – ${wartet(n)} und werden nachgetragen, sobald sie zu ist.`

let arbeitet = false

/**
 * Wartende Einträge in die Excel-Liste schreiben. `interaktiv` = aus einem Klick heraus (darf nach der Erlaubnis fragen
 * und meldet Probleme); sonst leiser Versuch im Hintergrund. Was nicht klappt, bleibt in der Warteschlange.
 */
async function abarbeiten(melden: Melden, interaktiv: boolean) {
  await geladen
  const q = warteschlange.get()
  if (!q.length || arbeitet) return
  arbeitet = true
  try {
    const h = await idbLesen<Datei>('tracker').catch(() => undefined)
    if (!h) return
    let recht = await h.queryPermission({ mode: 'readwrite' })
    if (recht !== 'granted' && interaktiv) recht = await h.requestPermission({ mode: 'readwrite' })
    if (recht !== 'granted') {
      if (interaktiv) melden(`Kein Schreibrecht für die Excel-Liste – ${wartet(q.length)} weiter.`, { fehler: true })
      return
    }
    let daten: ArrayBuffer
    try { daten = await (await h.getFile()).arrayBuffer() } catch {
      if (interaktiv) melden(offen(q.length), { fehler: true })
      return
    }
    const ExcelJS = (await import('exceljs')).default // erst bei Bedarf laden (groß)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(daten)
    const r = eintragen(wb.worksheets[0], q.map((x) => x.zeile))
    if (r.neu) {
      const puffer = await wb.xlsx.writeBuffer()
      try {
        const w = await h.createWritable()
        await w.write(puffer as ArrayBuffer)
        await w.close()
      } catch {
        if (interaktiv) melden(offen(q.length), { fehler: true })
        return
      }
    }
    // Nur die gerade geschriebenen Einträge streichen – was inzwischen neu dazukam, bleibt stehen
    speichern(warteschlange.get().filter((x) => !q.includes(x)))
    if (interaktiv) melden(`Excel-Liste: ${r.neu} eingetragen${r.schon ? `, ${r.schon} standen schon drin` : ''}.`)
    else if (r.neu) melden(`Excel-Liste: ${r.neu} wartende${r.neu === 1 ? 'r Eintrag' : ' Einträge'} nachgetragen.`)
  } catch (e) {
    if (interaktiv) melden('Excel-Liste: ' + (e as Error).message, { fehler: true })
  } finally {
    arbeitet = false
  }
}

/** Einmal im Kopf einhängen: versucht wartende Einträge beim Start, beim Zurückkehren ins Fenster und jede Minute, solange welche warten. */
export function useTrackerWaechter() {
  const melden = useToast()
  const hatWartende = useStore(warteschlange).length > 0
  useEffect(() => {
    const versuch = () => void abarbeiten(melden, false)
    versuch()
    window.addEventListener('focus', versuch)
    const takt = hatWartende ? setInterval(versuch, 60_000) : undefined
    return () => {
      window.removeEventListener('focus', versuch)
      if (takt) clearInterval(takt)
    }
  }, [melden, hatWartende])
}

export function useTracker() {
  const melden = useToast()
  const dateiName = useStore(name)
  const wartend = useStore(warteschlange).length

  /** Excel-Liste auswählen (nur .xlsx). */
  async function waehlen() {
    const picker = (window as unknown as { showOpenFilePicker?: Picker }).showOpenFilePicker
    if (!picker) return melden('Dein Browser kann keine Datei dauerhaft auswählen – bitte Chrome oder Edge nutzen.', { fehler: true })
    try {
      const [h] = await picker({
        id: 'jobagent-tracker', startIn: 'documents',
        types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      })
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return melden('Ohne Schreibrecht kann nichts eingetragen werden.', { fehler: true })
      await idbSchreiben('tracker', h)
      name.set(h.name)
      melden(`„${h.name}“ gewählt.`)
      void abarbeiten(melden, true) // schon wartende Einträge gleich mitnehmen
    } catch (e) {
      if ((e as Error).name !== 'AbortError') melden('Datei konnte nicht gewählt werden: ' + (e as Error).message, { fehler: true })
    }
  }

  /** Stellen in die Liste eintragen (nur aus einem Klick heraus aufrufen). Klappt es nicht, warten sie und werden nachgetragen. */
  async function eintragenFuer(jobs: Job[], { still = false } = {}) {
    const h = await idbLesen<Datei>('tracker').catch(() => undefined)
    if (!h) return still ? undefined : melden('Erst in Einstellungen → Anschreiben deine Excel-Liste wählen.', { fehler: true })
    if (!jobs.length) return melden('Keine Stellen zum Eintragen.')
    await geladen
    speichern(warteschlangeAufnehmen(warteschlange.get(), jobs.map((j) => ({ job_id: j.id, zeile: trackerZeile(j) }))))
    await abarbeiten(melden, true)
  }

  /** Eintrag einer Stelle zurücknehmen, solange er noch wartet. */
  const entfernen = (jobId: number) => speichern(warteschlangeEntfernen(warteschlange.get(), jobId))

  /** Wartende Einträge jetzt versuchen (Knopf). */
  const jetztNachtragen = () => abarbeiten(melden, true)

  return { dateiName, wartend, waehlen, eintragenFuer, entfernen, jetztNachtragen }
}
