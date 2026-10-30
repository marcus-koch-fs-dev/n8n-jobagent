import { Fragment } from 'react'
import { Panel, Sub, Trenner, auswahl } from '@/components/Panel'
import { useModelle } from '@/hooks/useModelle'
import { useProfil } from '@/hooks/useProfil'
import { anbieterVerfuegbar, BEDARF, FUNKTIONEN, modellListe } from '@/lib/modellwahl'

/** Welche KI in welchem Tab arbeitet – jede Aufgabe einzeln einstellbar. */
export function ModellKarte() {
  const { stand, text, neuAbfragen } = useModelle()
  const { entwurf, aendern } = useProfil()
  const wahl = entwurf?.modelle ?? {}

  return (
    <Panel titel="🧠 KI-Modell">
      <Sub>Hier siehst du, welche KI in welchem Tab arbeitet – jede Aufgabe einzeln einstellbar. 💰 = günstig, 💰💰 = mittel, 💰💰💰 = teuer. Gilt nach dem Speichern (Leiste unten) ab dem nächsten Lauf.</Sub>
      <Sub className="flex flex-wrap items-center gap-2">
        <span>{text}</span>
        <a href="#einstellungen" className="text-primary" onClick={(e) => { e.preventDefault(); neuAbfragen() }}>↻ neu abfragen</a>
      </Sub>
      <div className="mt-2 grid gap-2">
        {FUNKTIONEN.map(([key, tab, titel, info, bedarf], i) => {
          const w = wahl[key] ?? {}
          const anbieter = w.anbieter || 'claude'
          const liste = modellListe(stand, anbieter, w)
          const gruppen = [...new Set(liste.map((x) => x[2] ?? ''))]
          const eintrag = ([m, t]: [string, string, string?]) => <option key={m} value={m}>{t}</option>
          return (
            <Fragment key={key}>
              {tab !== FUNKTIONEN[i - 1]?.[1] && <div className="mt-1 border-t border-border pt-2 text-[13.5px] font-bold text-muted-foreground">{tab}</div>}
              <div className="grid items-center gap-2 sm:grid-cols-[minmax(150px,1.2fr)_1fr_1fr]">
                <div>
                  <b>{titel}</b>
                  <div className="text-[14px] text-muted-foreground">{info}</div>
                  <div className="text-[14px]">{BEDARF[bedarf]}</div>
                </div>
                {/* Nur Anbieter mit Schlüssel – plus der gespeicherte, falls dessen Schlüssel inzwischen fehlt (mit Warnung) */}
                <select value={anbieter} className={auswahl}
                  onChange={(e) => aendern({ modelle: { ...wahl, [key]: { anbieter: e.target.value, modell: modellListe(stand, e.target.value, {})[0]?.[0] ?? '' } } })}>
                  {Object.entries(stand.anbieter).filter(([k]) => anbieterVerfuegbar(stand, k) || k === anbieter).map(([k, a]) => (
                    <option key={k} value={k}>{a.name + (anbieterVerfuegbar(stand, k) ? '' : ' – ⚠ Schlüssel fehlt/ungültig')}</option>
                  ))}
                </select>
                <select value={w.modell ?? ''} className={auswahl}
                  onChange={(e) => aendern({ modelle: { ...wahl, [key]: { anbieter, modell: e.target.value } } })}>
                  {gruppen.length > 1
                    ? gruppen.map((g) => <optgroup key={g} label={g}>{liste.filter((x) => (x[2] ?? '') === g).map(eintrag)}</optgroup>)
                    : liste.map(eintrag)}
                </select>
              </div>
            </Fragment>
          )
        })}
      </div>
      <Trenner />
      <Sub>
        🔑 Weitere Anbieter freischalten: in <a href="http://localhost:5678/home/credentials" target="_blank" rel="noopener" className="text-primary">n8n → Credentials</a> den passenden Eintrag öffnen („OpenAI API Key“, „Gemini API Key“, „Mistral API Key“), Schlüssel einfügen, speichern – danach hier „↻ neu abfragen“. Der Anbieter und seine Modelle erscheinen dann automatisch.
      </Sub>
    </Panel>
  )
}