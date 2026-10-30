// Browser-Erweiterung „Job-Agent: Stellen öffnen“ (Ordner browser-erweiterung im Projekt).
// Nur sie darf Tab-Gruppen anlegen.
const EXT_ID = 'nklpjjjgddppfbmahojbaenmkgdilhfp'

interface ChromeRuntime {
  lastError?: unknown
  sendMessage?: (id: string, msg: unknown, cb: (antwort: { ok?: boolean } | undefined) => void) => void
}

export function erweiterung(nachricht: unknown): Promise<{ ok?: boolean } | null> {
  return new Promise((resolve) => {
    try {
      const rt = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime
      if (!rt?.sendMessage) return resolve(null)
      rt.sendMessage(EXT_ID, nachricht, (antwort) => resolve(rt.lastError ? null : (antwort ?? null)))
    } catch {
      resolve(null)
    }
  })
}