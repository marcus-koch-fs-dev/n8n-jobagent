# Job-Agent

Ein lokaler Helfer für die Stellensuche: Er sammelt Stellenanzeigen, lässt sie von einer KI einordnen
und bereitet Bewerbungsmappen vor. Alles läuft auf deinem Rechner, deine Daten bleiben bei dir.

## Was er kann

- Links zu Stellen sammeln und Seiten im Browser laden (inklusive Erkennung von Bot-Schutz)
- Die KI liest Fakten aus der Anzeige und bewertet die Stelle nach deinem eigenen Such-Prompt
- Zweitmeinung und Tiefen-Check für einzelne Favoriten
- Anschreiben als Word-Datei mit deiner Vorlage, persönliche Daten nur im Browser
- Excel-Tracker für deine Bewerbungen

## Aufbau

```
Browser  ──►  frontend/  (React-Oberfläche, wird vom Browser-Dienst ausgeliefert)
              │
              ▼
          backend/   (Node/TypeScript + Playwright: lädt Seiten, speichert Daten)
              ▲
              │  http://browser:3000
              │
          n8n        (Workflows: Stellen auslesen, KI-Aufrufe)  ──►  KI-Anbieter oder Ollama
```

Alle Daten liegen in `data/` (Lebenslauf, Profil, Seiten-Cache, Anschreiben) und im Docker-Volume `n8n_data` (Workflows, Zugangsdaten).

## Voraussetzungen

- Docker Desktop
- Optional: [Ollama](https://ollama.com) für ein lokales Modell (eine GPU mit etwa 8 GB reicht für kleine Modelle)
- Für die KI-Auswertung brauchst du **eines von beiden**: einen **API-Schlüssel** (Claude über die Anthropic Console, OpenAI, Gemini oder Mistral – kostet pro Aufruf, ein claude.ai-Abo reicht dafür nicht) **oder** Ollama mit einem lokalen Modell.

## Schnellstart

1. Repo klonen:
   ```bash
   git clone <adresse-des-repos> n8n-jobagent
   cd n8n-jobagent
   ```
2. Umgebungsdatei anlegen und `N8N_ENCRYPTION_KEY` auf einen langen Zufallswert setzen:
   ```bash
   cp .env.example .env
   ```
3. Starten:
   ```bash
   docker compose up -d --build
   ```
4. Workflows importieren und veröffentlichen, Befehle in [docs/BEDIENUNG.md](docs/BEDIENUNG.md).
5. n8n öffnen unter http://localhost:5678, ein Konto anlegen und deinen API-Schlüssel eintragen (sofern du einen nutzt).
6. In n8n den Workflow **00 Einrichtung** öffnen und einmal **Execute workflow** klicken – er legt die Tabellen an. Ohne diesen Schritt läuft nichts.
7. Die Oberfläche öffnen unter http://localhost:3000/app und in **⚙️ Einstellungen** deinen Such-Prompt und deinen Lebenslauf eintragen.

## Erster Lauf

1. Links hinzufügen (Tab **1 · Sammeln**).
2. **▶ Seiten laden**.
3. **▶ Komplettlauf** starten. Achtung: Die KI kostet API-Guthaben, mit Ollama ist es kostenlos, aber langsamer.

## Die Tabs

| Tab | Wofür |
|---|---|
| 1 · Sammeln | Links hinzufügen, Läufe starten |
| 2 · Sichten | KI-Vorauswahl durchgehen (👍 / 🤔 / 👎) |
| 3 · Prüfen | Favoriten prüfen, Tiefen-Check, 📝 weiter zu Bewerben |
| 4 · Bewerben | Ordner und Dokumente vorbereiten, ✉️ abschicken |
| 5 · Beworben | Deine Bewerbungen mit Notizen |
| 📊 Auswertung | Verteilung nach Bereich und Absage-Grund |
| ⚙️ Einstellungen | Such-Prompt, Tiefen-Check, Lebensläufe, Anschreiben, KI-Modelle |

## Deine Daten

| Was | Wo | Hinweis |
|---|---|---|
| `.env` | Projektordner | Verschlüsselungsschlüssel für n8n. **Nicht weitergeben.** |
| Lebenslauf, Profil, Anschreiben | `data/profil/`, `data/anschreiben-dateien/` | Bleibt lokal, wird nicht hochgeladen |
| Browser-Profil mit Logins | `data/browser-profile/` | Privat |
| Workflows, Zugangsdaten | Docker-Volume `n8n_data` | Wird nicht im Repo gespeichert |

Sichern: `data/` kopieren und das Volume mit `docker run --rm -v jobagent_n8n_data:/d -v "$PWD":/b alpine tar czf /b/n8n-backup.tgz -C /d .`
Zurücksetzen: `docker compose down -v` löscht alle Volumes des Projekts (**alle Workflows und Zugangsdaten**), `data/` bleibt bestehen.

## Ordnerstruktur

| Ordner | Inhalt |
|---|---|
| `backend/` | Browser-Dienst (TypeScript, Playwright), Tests, Schnittstelle in `docs/API.md` |
| `frontend/` | Oberfläche (React, Vite) |
| `n8n/workflows/` | n8n-Workflows als JSON |
| `n8n/prompts/` | Prompts, werden bei jedem Lauf neu gelesen |
| `browser-erweiterung/` | Browser-Erweiterung für Tab-Gruppen |
| `docs/` | Bedienung und API |
| `data/` | Deine Daten, nie im Repo |

## Entwicklung

- Oberfläche: `cd frontend && npm test && npm run build`
- Browser-Dienst: `cd backend && npm test`
- Schnittstelle: [docs/API.md](docs/API.md)

## Fehlerbehebung

Ausführlich in [docs/BEDIENUNG.md](docs/BEDIENUNG.md), Abschnitt „Wenn etwas nicht klappt“.

## Lizenz

[MIT](LICENSE)
