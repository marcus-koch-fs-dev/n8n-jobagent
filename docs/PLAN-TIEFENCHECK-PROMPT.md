# Plan: Tiefen-Check-Anweisungen in den Einstellungen

## Ziel
Die Prüf-Anweisungen des Tiefen-Checks (heute nur in `prompts/tiefencheck.md`) lassen sich in
⚙️ Einstellungen → neuer Abschnitt **„🔍 Tiefen-Check“** bearbeiten – so wie der Stil beim Anschreiben.
Die Kriterien selbst kommen weiter aus dem 🎯 Such-Prompt (`{{KRITERIEN}}`) – darauf weist der Abschnitt hin.

## Was bearbeitbar ist – und was nicht
- **Bearbeitbar:** nur der System-Teil von `prompts/tiefencheck.md` (alles über `=== ANFRAGE ===`, ohne `#`-Kommentarzeilen).
- **Fest:** der Anfrage-Teil mit den Platzhaltern (`{{KRITERIEN}}`, `{{LEBENSLAUF}}`, `<<<CACHE>>>` …) und das JSON-Schema
  der Antwort im Workflow („Anfrage bauen“). Die Karten-Felder (`kurzfazit`, `empfehlung` …) können also nicht kaputtgehen.
- **Leer = Standard:** Ist kein eigener Text gespeichert, nimmt der Workflow wie bisher den Text aus `prompts/tiefencheck.md`.
  Damit wirken spätere Verbesserungen am Standard-Prompt automatisch, solange du nichts Eigenes hast.

## Umsetzung (Vorbild: `anschreiben_prompt`)
1. **Backend** (`playwright-service/src`)
   - `config.ts`: `TIEFENCHECK_MD = path.join(PROFIL_DIR, 'tiefencheck_prompt.md')` (Nutzerdaten unter `/data`, nicht im Repo).
   - `services/profil.ts`: `tiefencheck_prompt` lesen (`textLesen`) und schreiben (max. 20 000 Zeichen).
     Leerer Text → Datei löschen bzw. leer lassen (= Standard). **Keine bestehenden Profildaten anfassen.**
   - Test in `src/test/app.test.ts`: `PUT/POST /profil` mit `tiefencheck_prompt` → `GET /profil` liefert ihn zurück; leer → leer.
2. **Workflow** `workflows/G_Tiefencheck.json`, Knoten „Anfrage bauen“:
   - `const eigen = String(p.tiefencheck_prompt || '').trim();`
   - `system = eigen || system` (der Anfrage-Teil bleibt aus der Datei).
   - Im Ergebnis/Log vermerken, ob der eigene Text benutzt wurde (optional).
3. **UI** (`playwright-service/ui/src`)
   - `types/profil.ts`, `lib/profil.ts` (`entwurfAus`, `speicherBody`): Feld `tiefencheck_prompt`, Start = `''`.
   - Neue Karte `features/einstellungen/TiefencheckKarte.tsx`:
     - Hinweis: „Wonach gesucht wird, steht im 🎯 Such-Prompt. Hier steht, *wie* die KI prüft (Strenge, Remote, Warnsignale …).
       Die Antwortfelder sind fest – die Karten zeigen immer dieselben Abschnitte.“
     - Textfeld (`LangerText`). Ist es leer, wird der Standard grau als Platzhalter angezeigt.
     - Knöpfe „Standard laden“ (füllt den Text aus `GET /prompts/tiefencheck.md`, System-Teil ohne `#`-Zeilen –
       Hilfsfunktion `systemTeil(md)` in `lib/tiefencheck.ts` mit Test) und „Standard verwenden“ (leert das Feld).
   - `Einstellungen.tsx`: Abschnitt `['tiefencheck', '🔍 Tiefen-Check']` zwischen Such-Prompt und Lebensläufe.
   - `features/sichten/Hilfe.tsx` (Prüfen-Text): ein Halbsatz „Wie geprüft wird, stellst du in ⚙️ → 🔍 Tiefen-Check ein.“
4. **Doku:** `docs/API.md` (Feld `tiefencheck_prompt` bei `/profil`), Kopfkommentar in `prompts/tiefencheck.md`
   („überschreibbar in ⚙️ Einstellungen“), eine Zeile in `ANLEITUNG.md`.

## Tests
- Backend-Tests (node:test über `tsc.sh` in Docker) und UI-Tests + Build (`t.sh`) grün.
- `lib/tiefencheck.test.ts`: `systemTeil` entfernt `#`-Zeilen, behält `##`-Überschriften, schneidet bei `=== ANFRAGE ===`.

## Einspielen
1. Deploy `browser` nur, wenn `/pause-status` `sekundenSeitLetzterAktivitaet` > 150 und kein Lauf aktiv.
2. Workflow G in n8n neu importieren: `docker compose exec n8n n8n import:workflow --separate --input=/workflows`
   (danach in n8n prüfen, dass G aktiv ist).
3. Im In-App-Browser nur lesend prüfen: Abschnitt da, „Standard laden“ füllt das Feld.
   **Nicht speichern, keinen Tiefen-Check starten** – das macht Marcus selbst (kostet API-Guthaben).
4. Commit.

## Offen
- Marcus' zweite Frage („Und ist es möglich, dass der Tiefencheck dann …“) war abgeschnitten – vor dem Start nachfragen.

**Modell:** Sonnet.
