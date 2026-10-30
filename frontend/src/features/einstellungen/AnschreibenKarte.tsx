import type { ReactNode } from 'react'
import { LangerText } from '@/components/LangerText'
import { feld, Panel, Sub, Trenner } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { KopierKnopf } from '@/features/bewerben/KopierKnopf'
import { useAblage, ordnerWahlMoeglich } from '@/hooks/useAblage'
import { useChat } from '@/hooks/useChat'
import { useJobs } from '@/hooks/useJobs'
import { useProfil } from '@/hooks/useProfil'
import { useTracker } from '@/hooks/useTracker'
import { ABWAEHLBAR, imBriefSetzen, MEINE_PLATZHALTER, meineDatenSetzen, useMeineDaten } from '@/lib/meineDaten'
import { ANSCHREIBEN_CHAT_ANLEITUNG, ANSCHREIBEN_PROMPT_VORSCHLAG } from '@/lib/vorlagen'
import { DateiZeile } from './DateiZeile'
import { kopieren } from './SuchPromptKarte'

const DATEIEN = [
  { art: 'vorlage_de', titel: 'Briefvorlage Muttersprache (Word)', accept: '.docx', info: 'dein Briefkopf mit Platzhaltern – nur .docx' },
  { art: 'vorlage_en', titel: 'Briefvorlage Englisch (Word, optional)', accept: '.docx', info: 'ohne sie gilt für englische Anzeigen die Vorlage in deiner Muttersprache' },
  { art: 'beispiel', titel: 'Beispiel-Anschreiben', accept: '.docx,.pdf,.txt', info: 'optional – ein Anschreiben von dir, dessen Ton dir gefällt. Die KI orientiert sich am Stil, schreibt es aber nicht ab' },
]

const Code = ({ children }: { children: string }) => <code className="rounded bg-soft px-1">{'{{' + children + '}}'}</code>
const Ueberschrift = ({ children }: { children: ReactNode }) => <h3 className="m-0 text-[15px] font-semibold">{children}</h3>

export function AnschreibenKarte() {
  const { entwurf, aendern, vorlageEinsetzen } = useProfil()
  const ablage = useAblage()
  const tracker = useTracker()
  const { mit, mitSetzen } = useChat()
  const { data: jobsDaten } = useJobs()
  const daten = useMeineDaten()
  const beworben = (jobsDaten?.jobs ?? []).filter((j) => j.tendenz === 'beworben')
  const ordnerInfo = !ordnerWahlMoeglich()
    ? '⚠ Dieser Browser kann keinen Ordner wählen (Chrome oder Edge nutzen).'
    : ablage.ordner ? `Gewählt: „${ablage.ordner}“` : 'Noch kein Ordner gewählt – bis dahin gibt es die Dateien per Download.'

  const meinStandard = entwurf?.anschreiben_prompt_standard ?? ''
  const text = entwurf?.anschreiben_prompt ?? ''

  return (
    <Panel titel="✉️ Anschreiben">
      <Ueberschrift>📁 Ablage</Ueberschrift>
      <Sub>Hier legt die Seite die fertigen Mappen ab, je Stelle ein Ordner „Firma - Stadt“.</Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => void ablage.zielordnerWaehlen()}>Zielordner wählen …</Button>
        <span className="text-[14px] text-muted-foreground">{ordnerInfo}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => void tracker.waehlen()}>Excel-Liste wählen …</Button>
        <span className="text-[14px] text-muted-foreground">
          {tracker.dateiName ? `Gewählt: „${tracker.dateiName}“` : 'Noch keine Liste – bei ✉️ „beworben“ käme die Stelle dort als Zeile hinein.'}
        </span>
        {tracker.dateiName && (
          <Button variant="ghost" size="sm" title="Alle Stellen, die auf „beworben“ stehen und noch nicht in der Liste sind"
            onClick={() => void tracker.eintragenFuer(beworben)}>
            Beworbene nachtragen ({beworben.length})
          </Button>
        )}
      </div>
      {tracker.wartend > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="text-mid">✉️ {tracker.wartend} {tracker.wartend === 1 ? 'Eintrag wartet' : 'Einträge warten'} auf die Excel-Liste (Datei offen?) – sie werden von selbst nachgetragen.</span>
          <Button variant="ghost" size="sm" onClick={() => void tracker.jetztNachtragen()}>Jetzt nachtragen</Button>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-1.5 text-[14px]"
        title="Für Bewerbungen, die du selbst in einem KI-Chat im Abo schreibst (z. B. claude.ai) – ohne API-Kosten. An: Anweisungen, Stil und Lebenslauf werden mitkopiert, das klappt in jedem neuen Chat. Aus: nur die Stelle – wenn die Anweisungen schon in einem Chat-Projekt liegen.">
        <input type="checkbox" checked={mit} onChange={(e) => mitSetzen(e.target.checked)} />
        „📋 Für Chat kopieren“ nimmt Anweisungen und Lebenslauf mit
      </label>

      <Trenner />
      <Ueberschrift>📄 Briefvorlage</Ueberschrift>
      <Sub>
        Deine Word-Datei (.docx) mit Briefkopf und Layout. Wo etwas Wechselndes hin soll, setzt du einen Platzhalter, alles andere bleibt, wie es ist.
      </Sub>
      <div className="grid gap-1 text-[14px] text-muted-foreground">
        <div>
          <b className="text-foreground">Aus der Stelle:</b>{' '}
          {['FIRMA', 'STRASSE', 'PLZ_ORT', 'STELLE', 'DATUM', 'BETREFF', 'ANREDE', 'GRUSS', 'ANSCHREIBEN'].map((p) => <span key={p}><Code>{p}</Code>{' '}</span>)}
          (<Code>ANSCHREIBEN</Code> ist der Brieftext)
        </div>
        <div>
          <b className="text-foreground">Deine Daten:</b> {MEINE_PLATZHALTER.map(([f, p]) => <span key={f}><Code>{p}</Code>{' '}</span>)}
        </div>
      </div>
      <div className="my-1 grid gap-2.5">
        {DATEIEN.map((d) => <DateiZeile key={d.art} {...d} />)}
      </div>
      <Sub>
        Ohne eigene Vorlage gilt die mitgelieferte (Briefkopf mit deinen Daten, Firmenanschrift, Datum, Betreff, Text, Gruß).{' '}
        <a className="text-primary" href="/profil/standard-vorlage" download>⬇ Standard-Vorlage herunterladen</a> – in Word anpassen und oben als deine hochladen.
      </Sub>

      <div className="grid gap-1.5 rounded-lg bg-soft px-3 py-2.5">
        <b className="text-[14px]">Deine Daten für den Briefkopf</b>
        <Sub>
          Bleiben nur in diesem Browser – nie beim Server, in n8n oder bei der KI. Erst beim Ablegen in deinen Zielordner setzt dein Browser sie in die Word-Datei ein.
          Wirkt auf Mappen, die ab jetzt abgelegt werden. Leere Felder lassen den Platzhalter stehen, ohne Haken „im Brief“ fällt das Feld samt Trenner weg.
        </Sub>
        <div className="grid gap-2 sm:grid-cols-2">
          {MEINE_PLATZHALTER.map(([f, , label]) => (
            <div key={f} className="grid gap-0.5 text-[13px] text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`mein-${f}`}>{label}</label>
                {ABWAEHLBAR.includes(f) && (
                  <label className="flex cursor-pointer items-center gap-1">
                    <input type="checkbox" checked={!daten.weglassen.includes(f)} onChange={(e) => imBriefSetzen(f, e.target.checked)} />
                    im Brief
                  </label>
                )}
              </div>
              <input id={`mein-${f}`} className={feld} value={daten[f]} onChange={(e) => meineDatenSetzen({ [f]: e.target.value })} autoComplete="off" />
            </div>
          ))}
        </div>
      </div>

      <Trenner />
      <Ueberschrift>✍️ Schreibstil</Ueberschrift>
      <Sub>
        Ton, Länge, was immer rein soll und was nie. Die KI bekommt zusätzlich die Anzeige, deinen Lebenslauf und das Ergebnis des Tiefen-Checks.
      </Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm"
          title={meinStandard ? 'Setzt deinen gemerkten Standard ein' : 'Setzt die mitgelieferte Vorlage ein'}
          onClick={() => vorlageEinsetzen('anschreiben_prompt', meinStandard || ANSCHREIBEN_PROMPT_VORSCHLAG)}>
          Standard einsetzen
        </Button>
        <Button variant="ghost" size="sm" disabled={!text.trim() || text === meinStandard}
          title="Merkt den Text im Feld als deinen Standard – gilt nach dem Speichern (Leiste unten)"
          onClick={() => aendern({ anschreiben_prompt_standard: text })}>
          Als meinen Standard merken
        </Button>
        {meinStandard && (
          <button className="cursor-pointer text-[13px] text-primary" onClick={() => vorlageEinsetzen('anschreiben_prompt', ANSCHREIBEN_PROMPT_VORSCHLAG)}>
            Mitgelieferte Vorlage einsetzen
          </button>
        )}
        <span className="flex-1" />
        <KopierKnopf mini titel="Vorlage mit Anleitung für einen KI-Chat kopieren" kopieren={kopieren(ANSCHREIBEN_CHAT_ANLEITUNG + ANSCHREIBEN_PROMPT_VORSCHLAG)}>📋 Vorlage für KI-Chat</KopierKnopf>
      </div>
      <LangerText value={text} onChange={(v) => aendern({ anschreiben_prompt: v })} />
    </Panel>
  )
}
