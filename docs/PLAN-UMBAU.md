# Plan: Umbau für GitHub (geplant ab 26.10.2026)

Ziel: Jemand anderes klont das Repo, startet es lokal mit `docker compose up` und speichert dort seine eigenen Daten.
Grundregeln: **Keine bestehenden Daten löschen**, die Git-Historie wird nicht angefasst (darüber entscheidet Marcus), deployt wird nur, wenn kein Lauf aktiv ist (`/pause-status` > 150 s).

## Reihenfolge und Modell

| # | Schritt | Modell |
|---|---|---|
| U1 | Ordnerstruktur umbauen | Haiku |
| U2 | Datenbank als eigener Docker-Dienst (Postgres) | Sonnet (Datenübernahme) |
| U3 | Persönliches aus dem Repo entfernen | Haiku |
| U4 | README neu schreiben (Gliederung unten) | Haiku |
| U5 | Neuinstallation in einer getrennten Testinstanz prüfen | Sonnet |

## U1 · Ordnerstruktur

```
n8n-jobagent/
  backend/              ← playwright-service/src, package.json, tsconfig, start.sh, ui.html, docs/API.md
  frontend/             ← playwright-service/ui
  n8n/workflows/        ← workflows/
  n8n/prompts/          ← prompts/
  browser-erweiterung/
  docs/                 ← API.md, dieser Plan, Bilder für die README
  data/                 ← bleibt genau so (nicht verschieben!)
  Dockerfile            ← baut frontend + backend in ein Image
  docker-compose.yml
  README.md
```

- Mit `git mv` verschieben, damit die Historie erhalten bleibt.
- Anpassen: Dockerfile-Pfade, `docker-compose.yml` (Build-Kontext, Mounts `/prompts` und `/workflows`), `.gitignore`, `.dockerignore`, Pfade in den Docs.
- Der Dienstname `browser` bleibt, damit die Workflows `http://browser:3000` weiter erreichen.
- Prüfen: UI-Tests und Build, Backend `npm test`, nach dem Deploy `/health` und `/app/`.

## U2 · Datenbank als eigener Docker-Dienst

- Neuer Dienst `postgres` (offizielles Image, feste Version) mit eigenem Volume `postgres_data`. n8n bekommt `DB_TYPE=postgresdb` und `DB_POSTGRESDB_*` (Werte aus `.env`). MySQL kommt nicht in Frage, weil n8n es nicht mehr unterstützt.
- `.env.example` um `POSTGRES_USER`, `POSTGRES_PASSWORD` und `POSTGRES_DB` ergänzen.
- **Datenübernahme aus SQLite** (Workflows, Datentabellen, verschlüsselte Zugangsdaten):
  1. Vorher die SQLite-Datei sichern, falls genug Platz ist. Die Datei ist 17 GB groß, vermutlich wegen Ausführungsdaten.
  2. Mit den n8n-Befehlen exportieren und importieren (`n8n export:entities` / `import:entities`, die genaue Verfügbarkeit in 2.43 vorher prüfen). Die Ausführungshistorie wird nicht übernommen.
  3. Den alten Stand im Volume `n8n_data` stehen lassen, bis Marcus den neuen bestätigt hat.
- Auch mit Postgres gilt: Wer das Repo klont, bekommt beim ersten Start eine leere eigene Datenbank.

## U3 · Persönliches aus dem Repo entfernen

- `workflows/C_Bewertung.json`: Den Standard-Prompt mit Marcus' Profil durch ein neutrales Beispielprofil ersetzen. Der eigene Prompt kommt ohnehin aus ⚙️ Einstellungen. Danach muss der Workflow in n8n neu importiert werden.
- `MIGRATION-REACT.md` löschen. Das ist erledigt und enthält Persönliches.
- Testdaten „Marcus Koch“ (`ui/src/lib/docx.test.ts`, `src/test/word.test.ts`) durch „Max Mustermann“ ersetzen, den Kommentar in `src/services/anschreiben.ts` ebenso.
- Mit grep nach Namen, E-Mail und lokalen Pfaden (`C:\Users`, `Mirror`) suchen. Ziel: keine Treffer.
- **Ergänzung 30.10.:** Default-Prompts durch ein ausgedachtes Zufallsprofil ersetzen – ohne Namen, ohne Jobtitel, ohne Länder-Bezüge.
  Betrifft: `workflows/C_Bewertung.json` (Standard-Prompt), `prompts/tiefencheck.md` (Zeilen mit persönlichem Bezug),
  `workflows/00_Test_KI_Verbindung.json` (Testfrage „aus Ägypten“), `ui/src/lib/mock.ts` (Ägypten), `ANLEITUNG.md` (Pfade `C:\Users\Marcu`).
  Antwortfelder/JSON-Schema und Platzhalter nicht ändern.
- **Keine Keys ins Repo:** geprüft am 30.10. – `.env` und `data/` sind ignoriert, `workflows/zugang/anthropic_platzhalter.json` enthält nur
  „HIER-DEINEN-API-KEY-EINTRAGEN“, kein `sk-ant` in der Historie. Nach dem Umbau nochmal: `git grep -n -E "sk-|api[_-]?key.*[A-Za-z0-9]{20}"`.
- Nur Dateien ändern, **nicht testen, nicht deployen, nicht in n8n importieren** – das macht Marcus. Am Ende committen.
- Missionfrei-Hinweis: Der bezahlte Members-Bereich wird nicht veröffentlicht. Die Workflows enthalten nur die URL, keine Inhalte.

## U4 · README.md (ersetzt ANLEITUNG.md)

Kurz, für Fremde verständlich, auf Deutsch. Die Details zur Bedienung kommen in `docs/BEDIENUNG.md`.

1. **Titel und ein Satz:** lokaler Job-Agent, der Stellenanzeigen sammelt, von einer KI auswerten lässt und Bewerbungsmappen vorbereitet.
2. **Screenshot** der Oberfläche (2 · Sichten), aus der Testinstanz mit Beispieldaten, ohne echte Stellen oder Namen.
3. **Was es kann** (5–7 Punkte):
   - Links sammeln
   - Seiten laden inklusive Bot-Schutz-Erkennung und Text einfügen
   - KI liest Fakten aus
   - KI bewertet nach dem eigenen Such-Prompt
   - Zweitmeinung und Tiefen-Check
   - Anschreiben als Word-Datei, persönliche Daten nur im Browser
   - Excel-Tracker
4. **Architektur:** Ein Diagramm mit Browser-UI (React), Backend (Node/TS + Playwright), n8n (Workflows), Postgres, KI-Anbieter und Ollama, dazu wer wen aufruft und wo die Daten liegen (`data/`, Datenbank-Volume).
5. **Voraussetzungen:** Docker Desktop, optional Ollama (lokales Modell, GPU mit ca. 8 GB), optional API-Schlüssel (Claude, OpenAI, Gemini, Mistral).
6. **Schnellstart** (nummeriert, kopierbare Befehle):
   1. Klonen.
   2. `.env.example` → `.env`, Schlüssel setzen.
   3. `docker compose up -d --build`.
   4. Workflows importieren und veröffentlichen (Befehle aus der alten ANLEITUNG, aktuelle IDs).
   5. Einrichtungs-Workflow einmal starten (legt die Tabellen an).
   6. In n8n ein Konto anlegen und den API-Schlüssel eintragen.
   7. http://localhost:3000/app öffnen, in ⚙️ Einstellungen den Such-Prompt und den Lebenslauf eintragen.
7. **Erster Lauf:** Links hinzufügen → ▶ Seiten laden → ▶ Komplettlauf, mit einem Hinweis zu den Kosten.
8. **Die Tabs in einem Satz je Tab:** 1 Sammeln · 2 Sichten · 3 Prüfen · 4 Bewerben · 📊 Auswertung · ⚙️ Einstellungen.
9. **Wo liegen meine Daten:** eine Tabelle mit `data/…`, dem Datenbank-Volume und der `.env`. Was nie ins Repo gehört. Sicherung und Zurücksetzen.
10. **Ordnerstruktur:** die Tabelle aus U1.
11. **Entwicklung:** UI-Tests und Build, Backend-Tests, `docs/API.md`, Mock-Modus (nur `npm run dev`, `?mock`).
12. **Fehlerbehebung:** Abschnitt 9 der alten ANLEITUNG aktualisieren (Ollama nicht erreichbar, Port belegt, Seite gesperrt, n8n-„Publish“).
13. **Lizenz:** offen, Marcus entscheidet.

Aus der alten ANLEITUNG entfällt:
- Workflow A/B/D, `/ergebnisse`, „Nächste 10“, Freigeben, Screenshot-Spalte;
- Kosten mit festen Stellenzahlen (700);
- `C:\Users\Marcu`-Pfade.

Prüfen: Jeder Befehl in der README wird in der Testinstanz (U5) einmal ausgeführt.

## U5 · Neuinstallation prüfen

- Ein frischer Klon in einen eigenen Ordner, eigener Compose-Projektname (z. B. `jobagent-test`), andere Ports und eigene Volumes. Marcus' Instanz und `data/` bleiben unberührt.
- Die README Schritt für Schritt befolgen, bis die Oberfläche läuft und ein Test-Link geladen ist. Ohne Kosten, also ohne bezahlte KI.
- Danach die Testinstanz mit `docker compose -p jobagent-test down -v` entfernen. Das löscht nur die Volumes der Testinstanz.
