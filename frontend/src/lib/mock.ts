import type { Job, JobsAntwort } from '@/types/job'

/** Vorschau: `?mock` in der Adresse → Beispiel-Tiefen-Check für eine Stelle (nur im Browser, wird nicht gespeichert, kostet nichts). */
export const mockAktiv = () => new URLSearchParams(location.search).has('mock')

const MOCK_ERGEBNIS = {
  aufgaben_vergleich: {
    bezug_suchprompt: 'Du hast geschrieben, dass Entwicklung mit Automatisierung zu deinen Wunschrollen gehört.',
    urteil: 'Der Kern (Workflows bauen, APIs anbinden, Prozesse automatisieren) liegt klar in deinem Bereich – genau das hast du mit deiner n8n-Pipeline gemacht. Mehr verlangt wird bei produktiver LLM-Erfahrung (Prompt-Pipelines, Evaluierung) und Python im Betrieb. Zu deiner Notiz „Extrem AI-lastig“: ja, aber eher Anwendung als Forschung – trau dich, wenn du dein Projekt zeigen kannst.',
  },
  empfehlung: 'probier_es',
  kurzfazit: 'Die Stelle kann passen, wenn Remote aus dem Ausland erlaubt ist und du dein n8n-Projekt als KI-Erfahrung zeigst.',
  klartext: [
    { begriff: 'AI-first mindset', bedeutet: 'Du sollst Aufgaben zuerst mit KI-Tools lösen, nicht von Hand.' },
    { begriff: 'wear many hats', bedeutet: 'Kleines Team, du machst vieles nebenbei mit.' },
  ],
  anforderungen: [
    { anforderung: 'API-Integrationen / REST', status: 'erfuellt', beleg: 'mehrere Projekte im CV' },
    { anforderung: 'Workflow-Automatisierung', status: 'erfuellt', beleg: 'n8n-Jobagent (fehlt noch im CV!)' },
    { anforderung: 'Python im Produktivbetrieb', status: 'teilweise', beleg: 'Grundlagen, kein Live-System' },
    { anforderung: 'Claude Code / Cursor', status: 'teilweise', beleg: 'täglich genutzt, aber nicht im CV' },
    { anforderung: 'LLM-Evaluierung / Monitoring', status: 'fehlt', beleg: 'keine Erfahrung belegt' },
  ],
  remote_einschaetzung: '„Remote within EU time zones“ – Zeitzone passt, Wohnsitz außerhalb der EU nicht ausgeschlossen, aber unklar. Unbedingt fragen.',
  firma: 'Kleines KI-Startup (laut Anzeige ca. 20 Leute), baut KI-Telefonassistenten. (KI-Wissen, ungeprüft)',
  warnsignale: 'Kleines Team, „wear many hats“ → viel Eigenverantwortung, wenig Einarbeitung.',
  argumente: ['Eigene KI-Automatisierungs-Pipeline gebaut (n8n, Claude-API, Playwright)', 'Praxis mit Claude Code im Alltag', 'Erfahrung, Prozesse für Nicht-Techniker verständlich zu machen'],
  fragen: ['Ist Arbeiten aus dem Ausland als Freelancer oder per EOR möglich?', 'Wie viel davon ist LLM-Entwicklung vs. klassische Automatisierung?', 'Wie läuft die Einarbeitung im kleinen Team?'],
}

/** Setzt den Beispiel-Check auf Stelle 673 (sonst die erste mit Tendenz „interessant“). */
export function mockAnwenden(d: JobsAntwort): JobsAntwort {
  const ziel: Job | undefined = d.jobs.find((x) => x.id === 673) ?? d.jobs.find((x) => x.tendenz === 'interessant')
  if (!ziel) return d
  const mock: Job = {
    ...ziel,
    tc_ampel: 'gelb',
    tc_modell: 'MOCK – Beispieldaten, nicht echt',
    tc_am: new Date().toISOString(),
    tc_ergebnis: JSON.stringify(MOCK_ERGEBNIS),
  }
  return { ...d, jobs: d.jobs.map((j) => (j === ziel ? mock : j)) }
}
