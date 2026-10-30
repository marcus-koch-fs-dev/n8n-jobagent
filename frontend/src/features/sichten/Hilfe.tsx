import { useState, type ReactNode } from 'react'
import { speicherLesen, speicherSchreiben } from '@/lib/speicher'

type HilfeHaupt = 'sichten' | 'pruefen' | 'bewerben' | 'beworben'

const HILFE: Record<HilfeHaupt, { titel: string; text: ReactNode }> = {
  sichten: {
    titel: 'So funktioniert Sichten',
    text: 'Hier gehst du die Vorschläge der KI durch. Obere Zeile: was die KI sortiert hat und du noch nicht entschieden hast – Anzeige öffnen, dann 👍 / 🤔 / 👎 setzen. Die Karte verschwindet dann oben und erscheint unter „Meine Auswahl“ (👍 und 🤔 auch in „3 · Prüfen“).',
  },
  pruefen: {
    titel: 'So funktioniert Prüfen',
    text: 'Auf einer Karte „Tiefen-Check“ klicken: Die KI gleicht die Anzeige mit deinem Lebenslauf und Such-Prompt ab und empfiehlt „Unbedingt bewerben“, „Probier es“ oder „Erwarte nichts“. Kostet API-Guthaben (💰 = wenig, 💰💰💰 = mehr – je nach Modell in den Einstellungen), deshalb nur auf Knopfdruck. Wie streng und worauf geprüft wird, stellst du in ⚙️ Einstellungen → 🔍 Tiefen-Check ein. Stellen mit 👍 wandern danach von selbst nach „4 · Bewerben“ – oder sofort mit 📝, auch ohne Tiefen-Check.',
  },
  bewerben: {
    titel: 'So entsteht dein Anschreiben',
    text: (
      <>
        Hier bereitest du deine Bewerbungen vor: deine 👍-Stellen nach dem Tiefen-Check oder mit 📝 aus „3 · Prüfen“, beste Empfehlung zuerst. Pro Kachel gibt es zwei Wege:
        <ul className="my-1.5 list-disc pl-5">
          <li><b>Selbst im KI-Chat</b> (dein Abo, z. B. claude.ai oder ChatGPT – keine Extrakosten): 📋 kopiert die Stelle, dort einfügen, schreiben lassen und als Word-Datei herunterladen. Ob Anweisungen und Lebenslauf mitkopiert werden, stellst du in Einstellungen → Anschreiben ein.</li>
          <li><b>Per KI-API</b> („Dokumente generieren“): bequemer und schneller – ein Klick, eine Minute warten, die Word-Datei mit deiner Vorlage landet direkt im Zielordner. Kostet API-Guthaben: 💰 = wenig, 💰💰💰 = mehr, je nach Modell.</li>
        </ul>
        Beides ist ein <b>Entwurf</b> – lesen und anpassen. Wenn die Bewerbung raus ist: ✉️ anklicken – die Stelle wandert nach „5 · Beworben“ und in deine Excel-Liste.
      </>
    ),
  },
  beworben: {
    titel: 'So funktioniert Beworben',
    text: 'Hier stehen alle Stellen, bei denen du dich beworben hast – zuletzt beworbene oben. Im Notizfeld hältst du Datum, Kontakt und den nächsten Schritt fest. ✉️ nochmal anklicken nimmt die Stelle zurück nach „4 · Bewerben“ (eine schon geschriebene Zeile in der Excel-Liste bleibt stehen).',
  },
}

/** Einklappbare Hilfe oben im Tab. Beim ersten Mal offen, danach so, wie du sie gelassen hast. */
export function Hilfe({ haupt }: { haupt: HilfeHaupt }) {
  const [offen, setOffen] = useState(() => speicherLesen('hilfe_' + haupt) !== 'zu')
  const h = HILFE[haupt]
  return (
    <details
      open={offen}
      onToggle={(e) => { setOffen(e.currentTarget.open); speicherSchreiben('hilfe_' + haupt, e.currentTarget.open ? 'auf' : 'zu') }}
      className="my-2.5 rounded-xl bg-info-bg px-3.5 py-2.5 text-[14.5px] text-info"
    >
      <summary className="cursor-pointer font-semibold text-foreground">{h.titel}</summary>
      <div className="mt-1.5">{h.text}</div>
    </details>
  )
}