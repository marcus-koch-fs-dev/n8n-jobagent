import { ladePauseStatus } from '@/api/dienst'
import type { useToast } from './useToast'

/** Steht ein KI-Problem an (Guthaben leer / Schlüssel abgelehnt)? Dann gar nicht erst starten. */
export async function kiGesperrt(melden: ReturnType<typeof useToast>) {
  try {
    const s = await ladePauseStatus()
    if (s.pausiert && s.grund) {
      melden(s.grund === 'guthaben' ? 'API-Guthaben leer – erst nachladen, dann oben „Behoben“ klicken.' : 'API-Schlüssel abgelehnt – in n8n prüfen, dann oben „Behoben“ klicken.', { fehler: true })
      return true
    }
  } catch { /* Dienst nicht erreichbar – trotzdem versuchen */ }
  return false
}