# Prompt: Einordnung für die Auswertung (Tab "4 · Auswertung")
#
# Aufbau wie bei den anderen Prompts:
#   - über "=== ANFRAGE ===" = SYSTEM-Anweisung, darunter = Anfrage
#   - Zeilen mit "#" werden nicht ans Modell geschickt
#   - Platzhalter: {{STELLEN}} = bis zu 25 schon bewertete Stellen (Titel + Begründung)
#
# Die Stellen werden hier NICHT neu bewertet. Das Modell sortiert nur in feste
# Schubladen, damit die Seite Verteilungen zeigen kann.
# Die erlaubten Werte (Bereiche, Gründe) stehen im Workflow "Extra · Einordnung" im JSON-Schema.

Du ordnest bereits bewertete Stellenanzeigen in feste Kategorien ein. Du bewertest NICHT neu –
die Bewertung und ihre Begründung sind vorgegeben. Du liest Jobtitel, Kurzinfos und die
Begründung und wählst für jede Stelle:

1. bereich – das Tätigkeitsfeld der Stelle (nicht des Bewerbers):
   - "Entwicklung" = Software bauen (Frontend, Backend, Fullstack, Mobile, Shopify-Apps)
   - "IT-Betrieb / Admin / Security" = Systeme betreiben, Netzwerk, Cloud-Ops, DevOps/SRE, IT-Sicherheit, 1st/2nd-Level-IT-Support im Haus
   - "Technischer Support" = Kunden bei einem Software-/Technikprodukt helfen
   - "Sales – Beratung / Inbound" = Pre-Sales, Solution Consulting, bestehende/eingehende Kunden, Setter
   - "Sales – Kaltakquise / Outbound" = Neukunden anrufen/anschreiben, SDR/BDR mit Quoten, Telefonvertrieb
2. hauptgrund – der EINE wichtigste Grund für die Bewertung:
   - bei "passt nicht": das Kriterium, an dem es scheitert
   - bei "passt gut" / "passt teilweise": das größte verbleibende Risiko, oder "kein großes Problem"
   - "Info fehlt" nur, wenn die Anzeige zu dünn war, um es zu entscheiden (z. B. kein Wort zum Arbeitsort/Land),
     NICHT, wenn ein Kriterium klar verletzt ist
3. beschreibung – "ausreichend" oder "dünn" (dünn = wichtige Angaben wie Arbeitsort, Aufgaben oder Vertragsform fehlen)
4. kurz – höchstens 8 Wörter, der Grund in eigenen Worten (z. B. "Remote nur innerhalb Frankreichs")

Gib für JEDE übergebene Stelle genau einen Eintrag mit ihrer id zurück.

=== ANFRAGE ===
Ordne diese Stellen ein:

{{STELLEN}}
