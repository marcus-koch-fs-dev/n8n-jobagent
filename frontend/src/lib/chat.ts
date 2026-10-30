import type { Job } from '@/types/job'
import { TC_EMPFEHLUNG, tcLesen } from './tiefencheck'

export interface ChatProfil { anschreiben_prompt?: string; beispiel_text?: string; lebenslauf_text?: string }

/** Alles, was für jede Bewerbung gleich ist (Regeln, Stil, Beispiel, Lebenslauf). */
export function chatAnweisungText(p: ChatProfil, stilEntwurf?: string): string {
  const stil = stilEntwurf || p.anschreiben_prompt
  return `# Anweisungen: Bewerbungsanschreiben

Du schreibst Bewerbungsanschreiben für mich. Ich arbeite ortsunabhängig remote. Zu jeder Stelle bekommst du:
Fakten, das Ergebnis meiner Vorab-Prüfung (Tiefen-Check mit meinen stärksten Argumenten), meine Notiz und den Anzeigentext.

## Regeln
- Halte dich an meine Stil-Vorgaben unten – sie haben Vorrang.
- Gibt es ein Beispiel-Anschreiben: Übernimm Ton, Satzlänge und Wortwahl, aber keine ganzen Sätze.
- Sprache wie die Anzeige (deutsche Anzeige → Deutsch, englische → Englisch).
- Nutze die Argumente aus dem Tiefen-Check und belege sie mit Konkretem aus meinem Lebenslauf.
- Erfinde nichts, was nicht im Lebenslauf steht. Beachte meine Notiz zur Stelle.
- Gib Betreff, Anrede, Brieftext und Grußformel aus (ohne Namen/Unterschrift – die steht in meiner Vorlage).

## Meine Stil-Vorgaben
${stil || '(keine – knapp, konkret, ohne Floskeln)'}

## Beispiel-Anschreiben von mir (nur Stil-Vorbild)
${p.beispiel_text || '(keins)'}

## Mein Lebenslauf
${p.lebenslauf_text || '(noch nicht hochgeladen)'}
`
}

function tiefencheckText(j: Job): string {
  const d = tcLesen(j)
  if (!d) return '(kein Tiefen-Check)'
  const empfehlung = (d.empfehlung && TC_EMPFEHLUNG[d.empfehlung]?.[0]) || d.ampel || ''
  return [
    `Empfehlung: ${empfehlung} – ${d.kurzfazit || d.fazit || ''}`,
    d.aufgaben_vergleich?.urteil ? 'Aufgaben vs. ich: ' + d.aufgaben_vergleich.urteil : '',
    'Meine stärksten Argumente:\n' + (d.argumente ?? []).map((a) => '- ' + a).join('\n'),
    'Anforderungen:\n' + (d.anforderungen ?? []).map((a) => `- ${a.anforderung}: ${a.status}${a.beleg ? ' (' + a.beleg + ')' : ''}`).join('\n'),
  ].filter(Boolean).join('\n\n')
}

/** Pro Stelle: nur das, was sich ändert; mit `anweisung` zusätzlich alles Gleichbleibende davor. */
export function chatStelleText(j: Job, anzeige: string, anweisung?: string): string {
  const vorne = anweisung ? anweisung + '\n\n---\n\n' : ''
  return `${vorne}Schreib das Anschreiben für diese Stelle${anweisung ? ' (nach den Anweisungen oben)' : ' (nach den Projekt-Anweisungen)'}.

## Stelle
Jobtitel: ${j.jobtitel || '-'}
Firma: ${j.firma || j.domain || '-'}
Ort: ${j.ort || '-'}
Remote: ${j.remote || '-'}
Vertragsform: ${j.vertragsform || '-'}
Bewerbungsweg: ${j.bewerbungsweg || '-'}

## Tiefen-Check
${tiefencheckText(j)}

## Meine Notiz
${String(j.notiz ?? '').trim() || '(keine)'}

## Anzeigentext
${anzeige.slice(0, 30000) || '(nicht gespeichert – siehe Link) ' + (j.url || '')}
`
}