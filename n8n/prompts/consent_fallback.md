# Prompt: Cookie-Banner-Fallback
#
# Wird nur benutzt, wenn der Browser-Dienst den Cookie-Banner nicht selbst
# wegklicken konnte. Das Modell bekommt die Button-Texte des Banners und soll
# den Button wählen, der ALLE Cookies akzeptiert bzw. zustimmt.
#   {{BUTTONS}}  Liste der gefundenen Button-Texte
#   {{URL}}      Adresse der Seite

Du hilfst einem Browser-Skript, einen Cookie-Banner zu schließen.
Wähle aus der Liste genau den Button-Text, der allen Cookies zustimmt
(z. B. "Alle akzeptieren", "Accept all", "Zustimmen").
Gib den Text exakt so zurück, wie er in der Liste steht.
Wenn keiner passt, gib einen leeren String "" zurück.
Wähle NIE Buttons zum Einloggen, Registrieren, Bewerben oder Bezahlen.

=== ANFRAGE ===
Seite: {{URL}}

Gefundene Buttons:
{{BUTTONS}}
