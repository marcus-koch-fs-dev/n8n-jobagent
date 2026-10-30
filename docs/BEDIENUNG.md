# Job-Agent mit n8n – Schritt-für-Schritt-Anleitung

## Kurz und knapp: So benutzt du es

**Alles läuft über die Oberfläche: http://localhost:3000/app**

Tabs: **1 · Sammeln** (Läufe starten, Links hinzufügen) · **2 · Sichten** (KI-Vorauswahl abarbeiten) · **3 · Prüfen** (deine 👍/🤔) · **📊 Auswertung** (Verteilung nach Bereich und Absage-Grund, Kontrolle deiner Auswahl – Workflow „Auswertung · KI ordnet Stellen ein“, läuft nach jedem Komplettlauf automatisch mit) · **4 · Bewerben** (Ordner, Dokumente, ✉️ abschicken) · **5 · Beworben** (deine Bewerbungen mit Notizen) · **⚙️ Einstellungen** (ein Such-Prompt, Prüf-Anweisungen für den Tiefen-Check, Lebenslauf, KI-Modell per Stufe oder pro Schritt).
- **▶ Seiten laden (ohne KI):** holt neue Links von Missionfrei und speichert alle neuen Stellenseiten (Schritt 1–2, ca. 3 s pro Seite). Kostet nichts, Grafikkarte bleibt frei.
- **▶ Komplettlauf:** Schritt 1–4 – inkl. KI-Auswertung und Bewertung (+ Claude-Zweitmeinung, ein paar Dollar). Dauert Stunden → abends starten, Laptop am Strom.
- **↻ Aktualisieren:** Fortschritt und Ergebnisse ansehen.

Was dabei im Hintergrund passiert (Workflow **„▶ KOMPLETTLAUF“** in n8n):

| Schritt | n8n-Workflow | Was passiert | Status danach |
|---|---|---|---|
| 1 | Schritt 1 · Links von Missionfrei holen | neue Links von der Missionfrei-Seite in die Tabelle | `neu` |
| 2 | Schritt 2 · Seiten laden & speichern | Browser öffnet jede Seite, speichert Text + Screenshot; tote Links / Login werden erkannt | `abgerufen`, `tot`, `wartet_auf_freigabe` |
| 3 | Schritt 3 · KI liest Fakten aus | qwen3 liest Titel, Firma, Remote-Regel, Gehalt, Datum …; Aussortieren | `aktiv`, `unklar`, `abgelaufen`, `zu_alt`, `duplikat` |
| 4 | Schritt 4 · KI bewertet | qwen3 bewertet nach deinen Kriterien; danach Claude-Zweitmeinung für Score ≥ 3 | Score 1–5 + Begründung |

Jeder Schritt macht nur, was noch offen ist – nichts wird doppelt verarbeitet. Abbruch (z. B. Laptop zuklappen) ist jederzeit ok; beim nächsten Start geht es weiter.

Workflows mit **„Baustein ·“** werden von den Schritten benutzt (nicht selbst starten). **„Extra ·“** sind Zusatzfunktionen.

**Automatisch jeden Abend:** Im Workflow „▶ KOMPLETTLAUF“ den Knoten „⏰ Jeden Abend 22 Uhr“ aktivieren (Rechtsklick → Activate) und **Publish** klicken.

---

Diese Pipeline prüft deine Stellenlinks automatisch:

```
Missionfrei-Seite ──► 01 Links einlesen ──► Tabelle "jobs" (Status: neu)
                                               │
                     A Stellen prüfen ◄────────┘   (Stufe 2–5, ruft "02" auf)
                        │  Schnellcheck → Browser → KI-Extraktion → Aussortieren
                        ▼
              Tabelle "jobs": aktiv / unklar / tot / abgelaufen / zu_alt / duplikat / wartet_auf_freigabe
                        │                                   │
                        ▼                                   ▼
              C Bewertung (Stufe 6)            du trägst "OK" ein → B Freigaben
              passt gut / teilweise / nicht
```

## Was liegt wo?

| Ordner/Datei | Inhalt |
|---|---|
| `docker-compose.yml` | Startet n8n (Port 5678) und den Browser-Dienst (Port 3000, noVNC 6080) |
| `.env` | Lokale Einstellungen (Verschlüsselungsschlüssel). **Nicht weitergeben.** |
| `backend/` | Browser-Dienst (TypeScript, Node.js + Playwright). Schnittstelle: `docs/API.md` |
| `frontend/` | Die Oberfläche (React), wird im Browser-Dienst mit ausgeliefert |
| `n8n/prompts/` | Die Prompts – hier experimentierst du (werden bei jedem Lauf neu gelesen) |
| `n8n/workflows/` | Die n8n-Workflows als JSON |
| `data/cache/` | Gespeicherte Seitentexte (`<id>.txt`) |
| `data/screenshots/` | Screenshots jeder Seite |
| `data/links/` | Gelesene Linklisten mit Zeitstempel |
| `data/browser-profile/` | Browser-Profil mit deinen Logins (privat!) |

Adressen im Browser:
- **n8n:** http://localhost:5678
- **Browser-Dienst (Bedienseite):** http://localhost:3000
- **Sichtbarer Browser (noVNC):** http://localhost:6080/vnc.html?autoconnect=1&resize=scale

---

## 1. Ollama einrichten (lokales Modell)

1. Ollama für Windows installieren: https://ollama.com/download (oder in PowerShell: `winget install Ollama.Ollama`).
2. Neues PowerShell-Fenster öffnen und das Modell laden (~5 GB):
   ```
   ollama pull qwen3:8b
   ```
3. Kurz testen:
   ```
   ollama run qwen3:8b "Sag Hallo auf Deutsch"
   ```
4. Prüfen, ob die GPU genutzt wird (während ein Modell läuft):
   ```
   ollama ps
   ```
   In der Spalte `PROCESSOR` sollte `100% GPU` stehen.

**Warum qwen3:8b?** Passt mit etwa 5–6 GB in deine 8 GB VRAM, versteht Deutsch gut und hält sich zuverlässig an JSON-Vorgaben. Zum Vergleich kannst du `ollama pull mistral:7b` laden (das ist Mistral – siehe unten).

**Erreichbarkeit aus Docker:** n8n spricht Ollama unter `http://host.docker.internal:11434` an. Falls Workflows „ECONNREFUSED … 11434“ melden, obwohl Ollama läuft:
Windows-Einstellungen → „Umgebungsvariablen für dieses Konto bearbeiten“ → neue Variable `OLLAMA_HOST` = `0.0.0.0` → Ollama (Taskleiste) beenden und neu starten.

## 2. Container starten

Im Projektordner (dort, wo du das Repo geklont hast):

```
docker compose up -d --build
```

Prüfen: http://localhost:3000 zeigt die Bedienseite des Browser-Dienstes, http://localhost:5678 zeigt n8n.

Stoppen: `docker compose down` (alle Daten bleiben erhalten).

## 3. n8n einrichten

1. http://localhost:5678 öffnen und **dein Konto anlegen** (das ist nur lokal).
2. Die Workflows sind bereits importiert. Du siehst sie unter **Overview → Workflows**:
   - `00 Einrichtung (einmalig)`
   - `00 KI-Aufruf (Modell-Weiche)` – wird von den anderen aufgerufen
   - `01 Links einlesen`
   - `02 Stelle verarbeiten (Stufen 2–5)` – wird von A und B aufgerufen
   - `A Stellen prüfen (neue Links)`
   - `B Freigaben verarbeiten`
   - `C Bewertung nach meinen Kriterien`
   - `D Modellvergleich Claude vs. Ollama`

**Falls du sie neu importieren musst** (z. B. nach einem Update der Dateien):
```
docker compose exec n8n n8n import:workflow --separate --input=/workflows
docker compose exec n8n n8n publish:workflow --id=jaKIAufruf000001
docker compose exec n8n n8n publish:workflow --id=jaStelleVerarb02
docker compose restart n8n
```
> Bitte über diese Befehle importieren, nicht über „Import from File“ in der Oberfläche. Nur so behalten die Workflows ihre IDs, über die sie sich gegenseitig aufrufen.

### Wichtig in n8n 2.x: „Publish“
Die Unter-Workflows **00 KI-Aufruf** und **02 Stelle verarbeiten** werden in ihrer **veröffentlichten** Version aufgerufen. Wenn du dort etwas änderst (z. B. das Modell), danach oben rechts auf **Publish** klicken.

## 4. API-Schlüssel hinterlegen (Claude, optional GPT / Gemini / Mistral)

1. Schlüssel beim Anbieter erstellen, z. B. https://platform.claude.com → API Keys.
2. In n8n: **Overview → Credentials** – dort gibt es schon die Einträge **„Anthropic API Key“**, **„OpenAI API Key“**, **„Gemini API Key“** und **„Mistral API Key“**.
3. Den passenden öffnen, Schlüssel einfügen → **Save**. (Bei „Anthropic API Key“: Feld **Value**, Name bleibt `x-api-key`.)
4. Auf der Ergebnis-Seite in **⚙️ Einstellungen → KI-Modell** auf „↻ neu abfragen“ klicken – der Anbieter und seine Modelle erscheinen automatisch. Dort wählst du pro Aufgabe das Modell.

**Wo liegen die Schlüssel?** Nicht in einer Datei und nicht im Code, sondern **verschlüsselt in der n8n-Datenbank** (Docker-Volume `n8n_data`). Der Schlüssel zum Entschlüsseln steht in `.env` (`N8N_ENCRYPTION_KEY`). Wer das Projekt herunterlädt, trägt also seine eigenen Schlüssel in n8n ein – im Projekt selbst steht keiner.

**Projekt weitergeben / auf GitHub hochladen:** `.env` und der Ordner `data/` dürfen nie mit hoch (stehen schon in `.gitignore`). In `data/` liegen Lebenslauf, Profil, gespeicherte Anzeigen, Anschreiben und das Browser-Profil mit deiner Missionfrei-Anmeldung. Die Missionfrei-Inhalte sind ein bezahlter Members-Bereich – nicht veröffentlichen.

**Kosten grob:** Mit Haiku kosten Extraktion + Bewertung aller 700 Stellen zusammen grob 2–5 US-Dollar (Schätzung, abhängig von der Textlänge). Sonnet ist etwa 20-mal teurer, Opus etwa 40-mal. Erst mit 10 Stellen testen und in der Anthropic-Konsole unter „Usage“ nachsehen.

## 5. Erster Testlauf mit 10 Links

1. **00 Einrichtung** öffnen → **Execute workflow**. Legt die Tabellen `jobs` und `vergleich` an (Overview → Data tables).
2. **Missionfrei entsperren** (nur nötig, wenn 01 „Die Seite ist gesperrt“ meldet – die Freischaltung bleibt im Browser-Profil gespeichert):
   - http://localhost:3000 → Schritt 1 **„Seite öffnen“** (Adresse ist schon eingetragen)
   - Schritt 2 **„Sichtbaren Browser anzeigen“** → Passwort **selbst** eingeben
   - Alternative: in 01 im Knoten ⚙️ Quelle `gespeicherte_liste_nutzen = true` → nimmt die zuletzt gelesene Liste
3. **01 Links einlesen** → **Execute workflow**. Im Knoten **„Abgleich: was ist neu?“** siehst du: gefunden / neu / schon bekannt.
4. Zurück auf http://localhost:3000 → **„Unsichtbar (headless)“** (schneller).
5. **A Stellen prüfen** → `testlimit` steht auf **10** → **Execute workflow**.
   Pro Stelle dauert es je nach Modell 10–60 Sekunden.
6. Tabelle **jobs** ansehen (Overview → Data tables → jobs). Prüfe:
   - Stimmen `status` und `hinweis`?
   - Screenshot ansehen: Link in der Spalte `screenshot`
   - Gespeicherter Text: `http://localhost:3000/text/<cache_id>`
7. **C Bewertung** → Kriterien prüfen (Knoten **📝 Meine Kriterien**) → **Execute workflow**.
8. Passt alles: in A `testlimit` auf 50, dann auf 1000 (= alle) stellen.

Neue Links später: einfach wieder **01** und danach **A** starten. Bereits bekannte Links werden übersprungen.

## 5a. Der große Lauf über Nacht

**Vorher:** Laptop ans Netzteil, Windows-Einstellungen → System → Energie → Ruhezustand im Netzbetrieb: **Nie**. Docker Desktop und Ollama laufen lassen.

**Schneller in drei Teilen** (statt „A Stellen prüfen“, das alles nacheinander macht):

1. **A1 Seiten abrufen** – ohne KI, 3 Seiten gleichzeitig, ca. **1 h** für ~844 Links. Kann jederzeit laufen (auch tagsüber), Abbruch ist ok.
2. **A2 Fakten auslesen** – KI liest die gespeicherten Seiten, ca. **2–3 h** (GPU).
3. **C Bewertung** → `testlimit` auf **1000** → Execute workflow
   - Erst bewertet qwen3 lokal alle Stellen (kostenlos, ca. 5 h)
   - Dann bewertet **C2** automatisch alle mit Score ≥ 3 noch einmal mit **Claude Sonnet 5.5** (höchstens 100 Stellen ≈ 2–3 $)

Du kannst A und C auch direkt nacheinander starten: C wartet nicht auf A, also C erst starten, wenn A fertig ist (in n8n unter **Executions** sichtbar).

Einstellungen für den Hybrid (Workflow C → **📝 Meine Kriterien**):

| Feld | Bedeutung |
|---|---|
| `zweitmeinung_automatisch` | `true` = nach dem lokalen Durchgang automatisch Claude; `false` = nur lokal (0 $) |
| `zweitmeinung_ab_score` | ab welchem lokalen Score Claude nochmal schaut (Standard 3) |
| `zweitmeinung_max_stellen` | Kostenbremse: höchstens so viele Claude-Bewertungen pro Lauf (100 ≈ 2–3 $) |
| `zweitmeinung_modell` | `claude-sonnet-5-5` (genauer) oder `claude-haiku-5-5` (ca. 20× günstiger) |
| `nur_zweitmeinung` | `true` = lokalen Durchgang überspringen, nur die Claude-Runde |

Bereits mit Claude bewertete Stellen werden nicht noch einmal an Claude geschickt. Auf der Ergebnis-Seite steht dann **🧠 Claude (lokal vorher: X)**.

## 5b. Ergebnis-Seite: http://localhost:3000/ergebnisse

Die übersichtliche Ansicht deiner Stellen – statt der großen Data Table.

- **Oben:** Fortschrittsbalken und Zahlen (passt gut / teilweise / nicht, zu bewerten, Freigabe, aussortiert, noch nicht geprüft)
- **Tabs:** ⭐ Passt gut · Passt teilweise · 📌 Meine Auswahl · Noch zu bewerten · 🔐 Freigabe nötig · Passt nicht · Aussortiert
- **Pro Stelle:** Score, Titel, Firma, Remote-Zitat, Gehalt, Vertragsform, Begründung, „Details“ (offene Fragen, Lücken, Warnsignale) und Links zu Anzeige, Screenshot und Text
- **Deine Tendenz:** 👍 interessant · 🤔 vielleicht · ✉️ beworben · 👎 nein – plus Notizfeld. Wird automatisch gespeichert (Data Table `meine_auswahl`) und bleibt auch bei Neubewertungen erhalten.
- **Freigabe:** Im Tab „Freigabe nötig“ auf **Freigeben** klicken → danach Workflow **B** starten.
- Suche, Sortierung (Score, neueste, Firma, Tendenz) und „👎 ausblenden“.

Technisch: Die Seite holt ihre Daten aus n8n über den Workflow **„E Ergebnis-Seite (Backend)“**. Der muss **veröffentlicht (Publish)** sein. Nach neuen Läufen von A oder C auf **↻ Aktualisieren** klicken.

### Stellen im Block öffnen (↗ Nächste 10)

Öffnet die nächsten Anzeigen des aktuellen Tabs (übersprungen: schon geöffnet 👁 oder schon mit Tendenz). Mit der **Browser-Erweiterung** als **📑 Tab-Gruppe** oder **🪟 neues Fenster**, ohne sie als einzelne Tabs.

**Erweiterung einmalig installieren (Chrome oder Edge):**
1. In die Adresszeile `chrome://extensions` (Edge: `edge://extensions`) eingeben.
2. Oben rechts (Edge: links unten) **Entwicklermodus** einschalten.
3. **„Entpackte Erweiterung laden“** → Ordner `browser-erweiterung` im Projektordner wählen.
4. Ergebnis-Seite neu laden – fertig.

Die Erweiterung kann nur eines: auf Bitte von http://localhost:3000 Links als Tab-Gruppe oder Fenster öffnen. Sie liest keine Seiten und hat keine weiteren Rechte.

## 6. Anmeldungen und gesperrte Seiten

- **Missionfrei:** Auf der Ergebnis-Seite in **1 · Sammeln** bei „Missionfrei-Zugang“ dein Passwort eingeben → **Anmelden**. Der Browser-Dienst trägt es in die Missionfrei-Maske ein; gespeichert wird nur die Anmeldung im Browser-Profil, nicht das Passwort. Läuft sie ab, steht dort wieder „nicht angemeldet“.
- **Gesperrte Stellenanzeigen** (Login oder Captcha auf der Jobseite): In **2 · Sichten → gesperrt** die Anzeige selbst im Browser öffnen, den Text kopieren und auf der Karte bei **„Text einfügen“** einfügen – die KI wertet ihn dann aus.

Captchas werden **nicht** automatisch gelöst und Logins **nicht** umgangen.

## 7. Bedeutung der Status

| Status | Bedeutung |
|---|---|
| `neu` | Link eingelesen, noch nicht geprüft |
| `tot` | 404/410, Domain weg, Weiterleitung auf allgemeine Karriereseite, oder keine einzelne Stellenanzeige |
| `wartet_auf_freigabe` | Login / Captcha / Mitgliederbereich erkannt |
| `abgelaufen` | Seite sagt: nicht mehr verfügbar |
| `zu_alt` | Älter als `max_alter_tage` (Standard 60) |
| `unklar` | Kein Datum gefunden oder Status unsicher – **wird trotzdem bewertet** |
| `aktiv` | Gültige, aktuelle Stelle |
| `duplikat` | Gleiche Stelle wie eine andere Zeile (`duplikat_von`) – wird nicht bewertet |
| `fehler` | Technisches Problem (siehe `hinweis`), z. B. Ollama nicht erreichbar → nach Behebung Status auf `neu` setzen und A erneut starten |

Bewertung (Spalten `passung_score`, `bewertung`): 4–5 = passt gut, 3 = passt teilweise, 1–2 = passt nicht. In der Tabelle nach `passung_score` absteigend sortieren.

## 8. Mit Prompts und Modellen experimentieren

- **Prompts** liegen in `prompts/`. Oben in jeder Datei steht, wie sie aufgebaut ist. Speichern genügt – kein Neustart nötig.
  - `extraktion.md` – welche Fakten wie ausgelesen werden
  - `bewertung.md` – wie streng bewertet wird
  - `consent_fallback.md` – Cookie-Banner-Hilfe
- **Kriterien** stehen im Workflow **C** im Knoten **📝 Meine Kriterien**. Nach einer Änderung `alle_neu_bewerten` auf `true` setzen.
- **Modellvergleich:** Workflow **D** lässt bis zu 20 gespeicherte Seiten von beiden Modellen extrahieren und legt die Ergebnisse in der Tabelle `vergleich` nebeneinander. Dafür brauchst du den API-Key und Ollama.
- **Was ist Mistral?** Mistral AI ist eine französische KI-Firma mit offenen Modellen. `mistral:7b` läuft gut auf deiner GPU. Zum Testen in **00 KI-Aufruf** `ollama_modell = mistral:7b` und `ollama_denken = standard` setzen, Publish, dann **D** starten.

### Was im KI-Aufruf passiert (zum Lernen)
- **System-Prompt:** die feste Rolle und die Regeln („Du bist …, erfinde nichts“)
- **Anfrage:** die konkrete Aufgabe mit dem Seitentext
- **JSON-Schema / structured output:** zwingt das Modell, exakt die gewünschten Felder zu liefern. Claude bekommt es als `output_config.format`, Ollama als `format`.
- **Kontextfenster:** Wie viel Text ein Modell auf einmal lesen kann. Deshalb wird der Seitentext für Ollama auf 12.000 Zeichen gekürzt (`max_zeichen_ollama`).
- **Temperatur 0** (Ollama): möglichst gleiche Antworten bei gleicher Eingabe.
- **effort** (Claude): wie gründlich Claude nachdenkt – `low` reicht für Extraktion.

## 9. Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| `KI-Fehler: connect ECONNREFUSED …:11434` | Ollama läuft nicht oder ist nicht erreichbar → Abschnitt 1 (OLLAMA_HOST) |
| `KI-Fehler: … 401` | API-Key falsch/fehlt → Abschnitt 4 |
| `Missionfrei ist gesperrt …` in Schritt 1 | Auf der Ergebnis-Seite in „1 · Sammeln“ bei „Missionfrei-Zugang“ anmelden (Abschnitt 6) |
| `Data table with name "jobs" not found` | **00 Einrichtung** ausführen |
| Änderung am Modell wirkt nicht | In **00 KI-Aufruf** auf **Publish** klicken |
| Browser hängt | `docker compose restart browser` |
| Viele `wartet_auf_freigabe` bei adzuna.de | Adzuna blockt automatische Browser (HTTP 403). Das wird bewusst nicht umgangen – Stelle bei Interesse von Hand öffnen. |
| Bewertungen wirken unlogisch | Kleine lokale Modelle verwechseln bei langen Kriterien gern Dinge. Für Workflow C `anbieter_override = claude` setzen. |
| Logs ansehen | `docker compose logs -f browser` bzw. `docker compose logs -f n8n` |

Einstellungen des Browser-Dienstes (in `.env`, danach `docker compose up -d`):
`HEADLESS=false` (immer sichtbar in noVNC), `MAX_CONCURRENCY` (Seiten gleichzeitig), `PAGE_TIMEOUT_MS`, `RETRIES`.
