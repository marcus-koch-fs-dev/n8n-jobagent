// Vorlagen und Anleitungen für die Einstellungen – Text 1:1 aus der bisherigen Seite.

export const ANSCHREIBEN_PROMPT_VORSCHLAG = `## Ton
- Locker-professionell, direkt, ohne Floskeln ("hiermit bewerbe ich mich", "mit großem Interesse").
- Sprache wie die Anzeige: deutsche Anzeige → Deutsch, englische → Englisch.
- Du oder Sie so, wie die Firma in der Anzeige schreibt.

## Länge
- Höchstens eine halbe Seite (ca. 150–220 Wörter), 3–4 kurze Absätze.

## Inhalt
- Einstieg: konkret, warum genau diese Stelle / Firma – kein allgemeiner Satz.
- Die 2–3 stärksten Argumente aus dem Tiefen-Check, mit einem Beispiel aus meinem Lebenslauf.
- [Optional, anpassen: Arbeitsort/Verfügbarkeit, z. B. "Ich arbeite ortsunabhängig, zuverlässig in europäischer Zeitzone."]
- [Optional: ein eigenes Projekt, das du gern erwähnst, z. B. als Beleg für Eigeninitiative.]
- Schluss: kurz, freundlich, Gesprächsbereitschaft – kein "über eine Einladung würde ich mich sehr freuen".

## Nie
- Nichts erfinden, was nicht im Lebenslauf steht.
- Keine Gehaltsangaben, außer die Anzeige verlangt sie ausdrücklich.
`;

// Vorlage für den Such-Prompt: gleiche Abschnitte wie ein fertiger Prompt, mit [Platzhaltern] zum Ersetzen.
// Die Überschriften helfen der KI beim Bewerten – "## Bereits bearbeitet" wird außerdem vom Programm gelesen.
export const SUCHPROMPT_VORLAGE = `# Profil und Kriterien: [Worum es geht, z. B. "Remote-Jobs im Kundenservice"]

## Wer ich bin
- [Beruf / Rolle und wie viele Jahre Erfahrung]
- [Wichtigste Fähigkeiten, Werkzeuge, Programme]
- [Bisherige Stationen in 1–3 Stichpunkten]
- [Sprachen und Niveau, z. B. Deutsch Muttersprache, Englisch fließend]
- [Abschluss / Ausbildung]

## Pflichtkriterien (Muss-Kriterien)
Wird eines davon klar verletzt, passt die Stelle nicht.
1. Arbeitsort: [z. B. 100 % remote aus Deutschland / hybrid in Köln / work from anywhere]
   - Plus-Signale: [Wörter in Anzeigen, die dafür sprechen, z. B. "remote-first", "hire globally"]
   - Minus-Signale: [Wörter, die dagegen sprechen, z. B. "3 Tage im Büro", "Wohnsitz in … erforderlich"]
2. Verdienst: [mindestens … € brutto/netto im Monat oder … € pro Stunde]
3. [Weiteres Muss, z. B. Arbeitszeit: Teilzeit 20–30 Stunden]

## Vertragsform
- Bevorzugt: [Festanstellung / Freelance / Werkstudent / Minijob …]
- Auch okay: [z. B. befristet, Projektarbeit]
- Nicht gewünscht: [z. B. reine Provision, Arbeitnehmerüberlassung]

## Rollen nach Priorität
1. [Wunschrolle, z. B. "Frontend-Entwicklung mit React"]
2. [Zweite Wahl]
3. [Wäre auch okay, wenn die Bedingungen stimmen]

## Wie ich arbeiten will
- [z. B. flexible Arbeitszeiten, lieber schriftlich als am Telefon, kleines Team, B2B-Kunden]

## Ausschlusskriterien
- [Was auf keinen Fall geht, z. B. Kaltakquise am Telefon, Schichtdienst, Network Marketing]
- Kosten für Start, Ausbildung oder Material
- Firma ohne Namen oder ohne auffindbare Website

## Bevorzugte Firmen
- [Branchen oder Firmenarten, z. B. SaaS, E-Commerce, öffentlicher Dienst, Start-ups]

## Bei der Bewertung bitte beachten
- Gehalt nicht angegeben: realistisch einschätzen und als offene Frage notieren
- [Was im ersten Gespräch geklärt werden soll, z. B. Homeoffice-Regel, Quereinstieg möglich?]

## Bereits bearbeitet (diese Firmen → automatisch „passt nicht“)
[Firmen, bei denen du dich schon beworben hast oder die du nicht willst – durch Komma getrennt]
`;

// Anleitung für einen KI-Chat: daraus den eigenen Such-Prompt erstellen lassen
export const SUCHPROMPT_CHAT_ANLEITUNG = `Hilf mir, meinen Such-Prompt für eine automatische Jobsuche zu schreiben. Eine KI bewertet damit später jede Stellenanzeige.

So gehst du vor:
1. Ich hänge meinen Lebenslauf an (oder beschreibe mich kurz). Lies ihn.
2. Stell mir dann nacheinander kurze Fragen zu allem, was im Lebenslauf nicht steht: Arbeitsort/Remote, Mindestgehalt, Vertragsform, Wunschrollen, No-Gos.
3. Fülle danach die Vorlage unten vollständig aus: alle [Platzhalter] ersetzen, Überschriften (##) genau so beibehalten, Stichpunkte kurz und konkret. Nichts erfinden – was du nicht weißt, fragst du.
4. Gib mir am Ende nur den fertigen Text in einem Codeblock, damit ich ihn kopieren kann.

Vorlage:
`;

export const ANSCHREIBEN_CHAT_ANLEITUNG = `Hilf mir, meine Stil-Vorgaben für Bewerbungsanschreiben zu schreiben. Eine KI schreibt damit später meine Anschreiben.

So gehst du vor:
1. Ich hänge meinen Lebenslauf und gern ein Anschreiben an, dessen Ton mir gefällt. Lies beides.
2. Stell mir dann nacheinander kurze Fragen: gewünschter Ton, Länge, was immer rein soll, was nie.
3. Fülle danach die Vorlage unten aus: alle [Platzhalter] ersetzen, Überschriften (##) beibehalten, Stichpunkte kurz und konkret. Nichts erfinden.
4. Gib mir am Ende nur den fertigen Text in einem Codeblock.

Vorlage:
`;
