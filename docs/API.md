# API des Browser-Dienstes

Der Browser-Dienst läuft im Container `browser` auf Port 3000 (http://localhost:3000). Alle Antworten sind JSON,
außer den Seiten und Downloads. Fehler kommen als `{ "ok": false, "error": "…" }`, bei Serverfehlern mit Status 500.

Die Quelltexte liegen in `src/`:
- `src/routes/` – HTTP-Routen (nur Annahme, Prüfung, Antwort)
- `src/services/` – Logik (Browser, Abruf, Profil, Mappen, Pause, Links, Cache)
- `src/lib/` – Hilfsfunktionen (Erkennung, Cookie-Banner, Dateinamen, Word, Text)

**Aufrufer:** `Seite` = die Oberfläche unter `/app`, `n8n` = die Workflows in n8n (Port 5678), `Erweiterung` = die Browser-Erweiterung.

**Hinweis zu den Tests:** Routen, die Dateien schreiben oder löschen, gelten als „schreibend“ (markiert mit ✍️).

---

## Browser (`src/routes/browser.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| GET | `/health` | Läuft der Dienst? Sichtbarkeit und Auslastung | n8n, Seite |
| POST | `/fetch` | Eine Stellenseite abrufen, Cookie-Banner akzeptieren, Text und Screenshot speichern | n8n |
| POST | `/open` | Seite SICHTBAR öffnen (noVNC). Body: `{ url }` | Seite |
| GET | `/tabs` | Offene Tabs | Seite |
| POST | `/tabs/close` | Tab schließen. Body: `{ index }` | Seite |
| POST | `/mode` | Sichtbar oder unsichtbar umschalten. Body: `{ visible }` | Seite |

**`POST /fetch`** – Body `{ url, consentButtonText? }`. Antwort: `ok`, `url`, `finalUrl`, `httpStatus`, `title`, `text`, `textLength`, `textHash`, `cacheId`, `screenshotUrl`, `textUrl`, `consent` (`accepted`, `method`, `candidates`), `blocked` (`login`, `captcha`, `paywall`, `any`, `reasons`), `abgerufenAm`. Bei Fehlern nach allen Versuchen: `ok: false`, `error`.

---

## Profil (`src/routes/profil.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| GET | `/profil` | Such-Prompt, Tiefen-Check-Anweisungen (`tiefencheck_prompt`, leer = Standard), Modelle, Vorlagen-Stand, Lebensläufe (mit Texten) | Seite, n8n |
| GET | `/profil/standard-vorlage` | Mitgelieferte Briefvorlage (neutral, nur Platzhalter) als Download; gilt ohne eigene Vorlage | Seite |
| POST ✍️ | `/profil` | Such-Prompt, Tiefen-Check-Anweisungen, Modelle, Stichwörter, Schreibweg speichern | Seite |
| POST ✍️ | `/profil/lebenslauf` | Lebenslauf hochladen (PDF, Word, Text). Body: `{ name, daten }` (base64) | Seite |
| POST ✍️ | `/profil/datei` | Vorlage oder Beispiel fürs Anschreiben. Body: `{ art, name, daten }` | Seite |
| POST ✍️ | `/profil/datei-entfernen` | Vorlage oder Beispiel entfernen. Body: `{ art }` | Seite |

`art` ist `vorlage_de`, `vorlage_en`, `beispiel` oder `lebenslauf_en`.

---

## Lebensläufe je Bereich (`src/routes/lebenslaeufe.ts`)

Alle Routen antworten mit `{ ok, lebenslaeufe }` (ohne Texte).

| Methode | Pfad | Zweck |
|---|---|---|
| POST ✍️ | `/profil/lv/neu` | Leere Zeile anlegen |
| POST ✍️ | `/profil/lv/bereich` | Bereich einer Zeile setzen. Body: `{ id, bereich }`. 409, wenn der Bereich schon vergeben ist |
| POST ✍️ | `/profil/lv/loeschen` | Zeile samt Dateien löschen. Body: `{ id }` |
| POST ✍️ | `/profil/lv/datei` | Lebenslauf einer Sprache hochladen. Body: `{ id, sprache: "de"\|"en", name, daten }` |
| POST ✍️ | `/profil/lv/datei-entfernen` | Eine Sprache entfernen. Body: `{ id, sprache }` |

---

## Anschreiben und Mappen (`src/routes/anschreiben.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| POST ✍️ | `/anschreiben/ordner` | Ordner „Firma - Stadt“ mit Anschreiben-Entwurf (.docx, ohne KI) anlegen. Body: `{ firma, ort, stelle? }`. Antwort: `{ ok, ordner, entwurf }`; die Seite überschreibt im Zielordner keinen vorhandenen Entwurf | Seite |
| POST ✍️ | `/anschreiben/speichern` | Mappe erzeugen: Word aus der Vorlage, Kurznachricht, Lebenslauf-Kopie. Body: `job_id`, `firma`, `stelle`, `betreff`, `anrede`, `gruss`, `absaetze`, `kurznachricht`, `bereich`, `sprache`, `art` (`voll`/`kurz`/`keins`), `fehler?` | n8n |
| GET | `/anschreiben/ablage?p=…` | Eine Datei aus dem Mappen-Ordner (Download). Nur innerhalb des Ordners | Seite |
| GET | `/anschreiben/liste` | Index aller Mappen (`{ anschreiben: { <id>: {…} } }`) | Seite |
| GET | `/bewerben-direkt` | Stellen-IDs, die ohne Tiefen-Check in „4 · Bewerben“ stehen (`{ ids }`) | Seite |
| POST ✍️ | `/bewerben-direkt` | Stelle dorthin schicken oder zurücknehmen. Body: `{ id, an }`. Antwort: `{ ok, ids }` | Seite |

---

## Einstellungen, Pause und Läufe (`src/routes/einstellungen.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| GET | `/einstellungen` | KI-Ort und Modelle je Funktion | n8n, Seite |
| POST ✍️ | `/einstellungen` | KI-Ort setzen. Body: `{ ki_ort: "lokal"\|"claude" }` | Seite |
| GET | `/pause?schritt=…` | Pause abfragen; merkt sich den Schritt | n8n (jede Stelle) |
| POST ✍️ | `/pause` | Pause an/aus. Body: `{ pausiert }` | Seite |
| POST ✍️ | `/ki-status` | Guthaben leer oder Schlüssel ungültig → Pause. Body: `{ art: "guthaben"\|"schluessel", anbieter?, fehler? }` | n8n |
| POST | `/lauf` | Knopf-Lauf melden (Fortschritt). Body: `{ art: "tc"\|"an"\|"bw", ids, ersetzen? }` | Seite |
| DELETE | `/lauf/:art` | Knopf-Lauf beenden | Seite |
| GET | `/pause-status` | Pause, Läufe, Sekunden seit der letzten Aktivität | Seite |

---

## Missionfrei (`src/routes/missionfrei.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| GET | `/missionfrei/status?neu=1` | Angemeldet? Höchstens alle 5 Minuten neu geprüft (mit `neu=1` sofort) | Seite |
| POST | `/missionfrei/anmelden` | Passwort eintragen. Body: `{ passwort }`. Das Passwort wird nicht gespeichert | Seite |

---

## Links, Cache und Texte (`src/routes/cache.ts`)

| Methode | Pfad | Zweck | Aufrufer |
|---|---|---|---|
| GET | `/links/latest` | Zuletzt gelesene Linkliste | Seite |
| POST | `/extract-links` | Alle Links einer Stellenliste lesen. Body: `{ url, fallbackGespeichert? }`. Bei gesperrter Seite und `fallbackGespeichert` die letzte Liste | n8n |
| POST | `/unterlagen` | Welche Unterlagen die Firma will (Textsuche im gespeicherten Text, ohne KI). Body: `{ stellen: [{ id, cache_id }] }` | Seite |
| GET | `/cache/:id` | Gespeicherte Seite, so wie `/fetch` sie zurückgibt (ohne Neuabruf) | n8n |
| POST | `/cache-manuell` | Text von Hand einfügen (mind. 200 Zeichen). Body: `{ url, text }` | Seite |
| GET | `/text/:id` | Gespeicherter Text als Textseite | Browser |

---

## Seiten und Dateien (`src/routes/seiten.ts`)

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/` | Bedienseite (ui.html) |
| GET | `/app/…` | React-Oberfläche (Vite-Build aus `ui/`) |
| GET | `/ergebnisse`, `/neu` | Weiterleitung (302) nach `/app/` |
| GET | `/prompts/:name` | Prompt-Datei aus dem Prompts-Ordner (wird bei jedem Lauf neu gelesen) |
| GET | `/screenshots/<id>.png` | Screenshot einer abgerufenen Seite |

---

## n8n-Webhooks (Port 5678)

Die Workflows liegen in `workflows/`. Die Oberfläche ruft die Webhooks auf, der Browser-Dienst wird von den Workflows aufgerufen.

| Pfad | Workflow | Zweck |
|---|---|---|
| `GET /webhook/jobs-daten` | `E_Ergebnis_Seite` | Alle Stellen mit Ergebnissen für die Oberfläche |
| `POST /webhook/jobs-aktion` | `E_Ergebnis_Seite` | Tendenz, Notiz oder Freigabe einer Stelle ändern |
| `POST /webhook/komplettlauf` | `_KOMPLETTLAUF` | Gesamte Pipeline starten |
| `POST /webhook/kette-schritt-1` | `01_Links_einlesen` | Links einlesen |
| `POST /webhook/kette-schritt-2` | `A1_Seiten_abrufen` | Seiten abrufen |
| `POST /webhook/kette-schritt-3` | `A2_Fakten_auslesen` | Fakten auslesen |
| `POST /webhook/kette-schritt-4` | `C_Bewertung` | Stellen bewerten |
| `POST /webhook/kette-zweitmeinung` | `C2_Zweitmeinung` | Zweitmeinung zur Bewertung |
| `POST /webhook/kette-einordnung` | `F_Einordnung` | Einordnung für die Auswertung |
| `POST /webhook/kette-tiefencheck` | `G_Tiefencheck` | Tiefen-Check je Stelle |
| `POST /webhook/kette-anschreiben` | `I_Anschreiben` | Anschreiben und Mappe |
| `GET /webhook/modelle` | `H_Modelle` | Verfügbare KI-Modelle abfragen |

---

## Gespeicherte Daten

| Ort | Inhalt |
|---|---|
| `data/profil/` | Such-Prompt (`kriterien.md`), Anschreiben-Prompt, Vorlagen, Lebensläufe, `profil.json` |
| `data/anschreiben-dateien/` | Fertige Mappen (Anschreiben, Kurznachricht, Lebenslauf) |
| `data/anschreiben.json` | Index der Mappen |
| `data/cache/` | Gespeicherter Seitentext und Metadaten je Stelle |
| `data/screenshots/` | Screenshots abgerufener Seiten |
| `data/links/` | Gelesene Linklisten |
| `data/browser-profile/` | Browser-Profil (Anmeldungen, Cookies) |
| `data/einstellungen.json`, `data/pause.json` | KI-Ort, Pause-Stand |
| n8n-Tabellen | Stellen (`jobs`), Auswahl (`meine_auswahl`), Einordnung, Tiefen-Check |

Der Browser speichert zusätzlich: Zielordner und Excel-Liste (als Verweis), Adressdaten für die Word-Datei und die Warteschlange der Excel-Einträge.

---

## Entwicklung

- `npm run build` – TypeScript nach `dist/`
- `npm test` – baut und prüft (Tests in `src/test/`, gegen einen leeren Testordner)
- `npm start` – startet `dist/server.js` (im Container über `start.sh`)

Beim Ändern einer Route: Pfad, Body und Antwort hier nachtragen.
