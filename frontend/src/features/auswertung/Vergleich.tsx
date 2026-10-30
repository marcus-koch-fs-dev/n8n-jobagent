import { Panel, Sub } from '@/components/Panel'
import { aussortiert } from '@/lib/listen'
import { cn } from '@/lib/utils'
import type { Job } from '@/types/job'

const KI_ZEILEN: [string, (j: Job) => boolean][] = [
  ['⭐ passt gut', (j) => j.bewertung === 'passt gut'],
  ['◐ teilweise', (j) => j.bewertung === 'passt teilweise'],
  ['✗ passt nicht', (j) => j.bewertung === 'passt nicht'],
  ['🔐 gesperrt / ohne KI-Urteil', (j) => !['passt gut', 'passt teilweise', 'passt nicht'].includes(String(j.bewertung)) && !aussortiert(j)],
]
const ICH_SPALTEN: [string, string][] = [['👍', 'interessant'], ['🤔', 'vielleicht'], ['✉️', 'beworben'], ['👎', 'nein'], ['offen', '']]

/** KI ↔ ich: wie hat die KI bewertet, wie hast du entschieden? Gelb = ihr seid euch uneinig. */
export function Vergleich({ jobs }: { jobs: Job[] }) {
  return (
    <Panel titel="🤝 KI und ich im Vergleich">
      <Sub>Gelb = ihr seid euch uneinig. Viele gelbe Felder → Such-Prompt in ⚙️ Einstellungen nachschärfen.</Sub>
      <table className="mt-1.5 w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th className="border-b border-border px-2 py-1 text-left font-semibold">KI sagt ↓ · du sagst →</th>
            {ICH_SPALTEN.map(([t]) => <th key={t} className="border-b border-border px-2 py-1 text-right font-semibold">{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {KI_ZEILEN.map(([titel, f], zi) => (
            <tr key={titel}>
              <td className="border-b border-border px-2 py-1 text-left">{titel}</td>
              {ICH_SPALTEN.map(([t, tendenz], si) => {
                const n = jobs.filter((j) => f(j) && String(j.tendenz ?? '') === tendenz).length
                // auffällig = du und die KI seid euch uneinig (KI gut → du 👎, KI nicht → du 👍/🤔/✉️)
                const uneinig = n > 0 && ((zi === 0 && si === 3) || (zi === 2 && si <= 2))
                return (
                  <td key={t} title={uneinig ? 'Hier seid ihr euch uneinig' : undefined}
                    className={cn('border-b border-border px-2 py-1 text-right', !n && 'text-muted-foreground', uneinig && 'bg-mid-bg font-semibold')}>
                    {n}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}