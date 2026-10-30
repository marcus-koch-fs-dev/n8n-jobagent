import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pauseSetzen } from '@/api/dienst'
import { Button } from '@/components/ui/button'
import { Fortschritt } from '@/components/Fortschritt'
import { TabLink } from '@/components/TabLink'
import { useLaufLage } from '@/hooks/useLaufLage'
import { cn } from '@/lib/utils'

const BILLING: Record<string, [name: string, url: string, text: string]> = {
  claude: ['Claude', 'https://platform.claude.com/settings/billing', 'platform.claude.com → Billing'],
  openai: ['OpenAI', 'https://platform.openai.com/settings/organization/billing', 'platform.openai.com → Billing'],
  gemini: ['Gemini', 'https://aistudio.google.com/', 'Google AI Studio'],
  mistral: ['Mistral', 'https://console.mistral.ai/', 'console.mistral.ai'],
}

const FARBE = {
  an: 'bg-info-bg',
  halt: 'bg-mid-bg',
  problem: 'bg-bad-bg border border-bad',
  aus: 'bg-soft text-muted-foreground',
}

const Puls = () => <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-info" />
const Sub = ({ children }: { children: ReactNode }) => <span className="text-[13.5px] text-muted-foreground">{children}</span>

/** Blauer Kasten: Was läuft gerade? Aktualisiert sich alle 10 Sekunden. */
export function LaufBox() {
  const { lage, status } = useLaufLage()
  const qc = useQueryClient()
  if (!lage || !status) return null

  const neuLaden = () => void qc.invalidateQueries({ queryKey: ['pause-status'] })
  const anhalten = (
    <Button variant="ghost" size="sm" className="ml-2 h-6 px-2.5" onClick={async (e) => { e.currentTarget.disabled = true; await pauseSetzen(true); neuLaden() }}>
      Anhalten
    </Button>
  )
  const aktivVor = (s: number | null) => <Sub> · zuletzt aktiv vor {s} s</Sub>

  let farbe: keyof typeof FARBE = 'an'
  let inhalt: ReactNode

  switch (lage.art) {
    case 'problem': {
      farbe = 'problem'
      const [name, url, text] = BILLING[lage.anbieter] ?? ['KI', '', '']
      const g = lage.grund === 'guthaben'
        ? { kopf: `💳 ${name}-Guthaben ist leer – alle KI-Läufe sind angehalten.`, wo: 'Guthaben nachladen: ', url, text }
        : lage.grund === 'schluessel'
          ? { kopf: `🔑 ${name}-API-Schlüssel wird abgelehnt – alle KI-Läufe sind angehalten.`, wo: 'Schlüssel prüfen: ', url: 'http://localhost:5678/home/credentials', text: 'n8n → Credentials' }
          : { kopf: '⚠ KI-Problem – Läufe angehalten.', wo: '', url: '', text: '' }
      inhalt = (
        <>
          <div><b>{g.kopf}</b></div>
          <div className="text-[13.5px] text-muted-foreground">
            {g.wo}{g.url && <a href={g.url} target="_blank" rel="noopener" className="text-primary">{g.text}</a>}
            . Danach „✓ Behoben“ klicken. Nichts geht verloren: Stellen mit Fehler werden beim nächsten Lauf automatisch neu versucht.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={async () => { await pauseSetzen(false); neuLaden() }}>✓ Behoben</Button>
            {lage.fehlertext && <span className="text-[13.5px] text-muted-foreground" title={lage.fehlertext}>Technische Meldung (Maus drüber)</span>}
          </div>
        </>
      )
      break
    }
    case 'startet':
      inhalt = (
        <>
          <div><Puls /><b>⏳ Pipeline wird gestartet … bitte warten</b><Sub> ({lage.sek} s)</Sub></div>
          <div className="text-[13.5px] text-muted-foreground">Nicht nochmal klicken – sobald der erste Schritt läuft, erscheint er hier.</div>
        </>
      )
      break
    case 'aus':
      farbe = 'aus'
      inhalt = <div>💤 Gerade läuft nichts. Neue Stellen holen: „1 · Sammeln“ → ▶ Komplettlauf.</div>
      break
    case 'haeltAn':
      farbe = 'halt'
      inhalt = <div><b>⏸ {lage.name} hält an … </b><Sub>nach der aktuellen Stelle (max. ca. 1 Minute)</Sub></div>
      break
    case 'fertig':
      farbe = 'aus'
      inhalt = (
        <div>
          <b>✓ {lage.name} fertig: {lage.zahlen.fertig} von {lage.zahlen.gesamt}</b> · Ergebnisse in <TabLink haupt={lage.lauf === 'tc' ? 'pruefen' : 'bewerben'} />
          {lage.lauf === 'tc' && <>, die 👍-Stellen jetzt in <TabLink haupt="bewerben" /></>}
        </div>
      )
      break
    case 'auswertung':
      inhalt = (
        <>
          <div><Puls /><b>Läuft gerade: </b><TabLink haupt="auswertung" /><b> · Einordnen</b> · noch ca. {lage.rest} Stellen einzuordnen{aktivVor(lage.aktivVor)}</div>
          <div className="text-[13.5px] text-muted-foreground">KI {lage.modell} sortiert je 25 Stellen in Bereiche und Hauptgründe (liest nur Titel + Begründung).</div>
        </>
      )
      break
    case 'knopfLauf':
      inhalt = (
        <>
          <div>
            <Puls /><b>Läuft gerade: </b><TabLink haupt={lage.lauf === 'tc' ? 'pruefen' : 'bewerben'} /><b> · {lage.name}</b> · ca. 30–60 s pro Stelle{aktivVor(lage.aktivVor)}{anhalten}
          </div>
          <Fortschritt zahlen={lage.zahlen} />
          <div className="text-[13.5px] text-muted-foreground">
            {lage.lauf === 'tc'
              ? `KI ${lage.modell} gleicht Anzeige, Lebenslauf und Such-Prompt ab. Das Ergebnis erscheint auf der Karte.`
              : `KI ${lage.modell} schreibt das Anschreiben, danach wird die Word-Datei im Zielordner gespeichert.`}
          </div>
        </>
      )
      break
    case 'schritt': {
      farbe = lage.pausiert ? 'halt' : 'an'
      const kopfzeile = lage.pausiert
        ? lage.aktiv ? '⏸ Hält an … (nach der aktuellen Stelle)' : '⏸ Angehalten ✓ – es geht nichts verloren. Weiter mit „▶ Fortsetzen“ in „1 · Sammeln“.'
        : null
      inhalt = (
        <>
          <div>
            {kopfzeile ? <b>{kopfzeile}</b> : <><Puls /><b>Läuft gerade: </b><TabLink haupt="sammeln" /><b> · Schritt {lage.nr} von 4</b></>}
            {lage.rest ? ` · ${lage.rest}` : ''}
            {aktivVor(lage.aktivVor)}
          </div>
          {lage.neuBewertung
            ? <Fortschritt zahlen={lage.neuBewertung} />
            : (
              <div className="flex flex-wrap gap-1">
                {lage.schritte.map((t, i) => (
                  <span key={t} className={cn('rounded-full bg-card px-2.5 py-0.5 text-[13px] text-muted-foreground', i + 1 < lage.nr && 'text-good', i + 1 === lage.nr && 'bg-info font-semibold text-card')}>
                    {i + 1 < lage.nr ? '✓ ' : ''}{t}
                  </span>
                ))}
              </div>
            )}
          <div className="text-[13.5px] text-muted-foreground">{lage.erklaerung}</div>
        </>
      )
    }
  }

  return <div className={cn('mb-2 grid gap-1.5 rounded-xl px-3 py-2 text-[13.5px]', FARBE[farbe])}>{inhalt}</div>
}