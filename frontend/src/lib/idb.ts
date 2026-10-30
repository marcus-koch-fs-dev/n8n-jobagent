// IndexedDB „jobagent“ / Store „ablage“ – dort merkt sich der Browser den gewählten Zielordner (Handle).
const oeffnen = () => new Promise<IDBDatabase>((ok, fehler) => {
  const r = indexedDB.open('jobagent', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('ablage')
  r.onsuccess = () => ok(r.result)
  r.onerror = () => fehler(r.error)
})

export async function idbLesen<T>(schluessel: string): Promise<T | undefined> {
  const db = await oeffnen()
  return new Promise((ok, fehler) => {
    const r = db.transaction('ablage', 'readonly').objectStore('ablage').get(schluessel)
    r.onsuccess = () => ok(r.result as T | undefined)
    r.onerror = () => fehler(r.error)
  })
}

export async function idbSchreiben(schluessel: string, wert: unknown): Promise<void> {
  const db = await oeffnen()
  return new Promise((ok, fehler) => {
    const r = db.transaction('ablage', 'readwrite').objectStore('ablage').put(wert, schluessel)
    r.onsuccess = () => ok()
    r.onerror = () => fehler(r.error)
  })
}