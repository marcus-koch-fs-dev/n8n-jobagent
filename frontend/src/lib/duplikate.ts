import type { Job, JobsAntwort } from '@/types/job'

const urlSchluessel = (u: unknown): string => String(u ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()

/**
 * Dieselbe Anzeige gibt es oft zweimal (z. B. bei Adzuna und beim Arbeitgeber). Die KI erkennt das und markiert die
 * zweite als „duplikat“ mit Verweis aufs Original. Hast du die Kopie bewertet, steht dein Urteil hier nur noch beim Original –
 * sonst erscheint dieselbe Anzeige in „Prüfen“ und noch einmal in „Sichten“. Nur die Anzeige ändert sich, gespeichert wird nichts.
 */
export function duplikateZusammenfuehren(d: JobsAntwort): JobsAntwort {
  const nachUrl = new Map(d.jobs.filter((j) => j.url).map((j) => [urlSchluessel(j.url), j]))
  const nachId = new Map(d.jobs.map((j) => [String(j.id), j]))
  const neuAmOriginal = new Map<number, Partial<Job>>()
  const kopien = new Set<number>()

  for (const kopie of d.jobs) {
    if (kopie.status !== 'duplikat' || !kopie.tendenz || !kopie.duplikat_von) continue
    const original = nachUrl.get(urlSchluessel(kopie.duplikat_von)) ?? nachId.get(String(kopie.duplikat_von))
    if (!original || original.id === kopie.id || original.tendenz || neuAmOriginal.has(original.id)) continue
    neuAmOriginal.set(original.id, {
      tendenz: kopie.tendenz,
      tendenz_geaendert_am: kopie.tendenz_geaendert_am,
      ...(!original.notiz && kopie.notiz ? { notiz: kopie.notiz } : {}),
    })
    kopien.add(kopie.id)
  }
  if (!kopien.size) return d

  return {
    ...d,
    jobs: d.jobs.map((j) => (neuAmOriginal.has(j.id) ? { ...j, ...neuAmOriginal.get(j.id) } : kopien.has(j.id) ? { ...j, tendenz: '' } : j)),
  }
}

/** Markiert die Stellen, die du ohne Tiefen-Check nach „4 · Bewerben“ geschickt hast (nur in der Anzeige). */
export function direktMarkieren(d: JobsAntwort, ids: number[] | undefined): JobsAntwort {
  if (!ids?.length) return d
  const menge = new Set(ids)
  return { ...d, jobs: d.jobs.map((j) => (menge.has(j.id) ? { ...j, direkt: true } : j)) }
}
