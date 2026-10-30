import { Kopf } from '@/features/kopf/Kopf'
import { Auswertung } from '@/features/auswertung/Auswertung'
import { Einstellungen } from '@/features/einstellungen/Einstellungen'
import { Sammeln } from '@/features/sammeln/Sammeln'
import { ListenAnsicht } from '@/features/sichten/ListenAnsicht'
import { TendenzProvider } from '@/hooks/useTendenz'
import { ToastProvider } from '@/hooks/useToast'
import { useAblageWaechter } from '@/hooks/useAblage'
import { useHauptTab } from '@/hooks/useHauptTab'
import { useUngespeichertWarnung } from '@/hooks/useProfil'
import { useVolleBreite } from '@/lib/layout'
import { cn } from '@/lib/utils'

export default function App() {
  const [haupt, setHaupt] = useHauptTab()
  const volleBreite = useVolleBreite()
  useAblageWaechter() // neue Mappen von selbst in den Zielordner legen
  useUngespeichertWarnung()
  return (
    <ToastProvider>
      <TendenzProvider>
        <Kopf haupt={haupt} onTab={setHaupt} />
        <main className={cn('mx-auto px-4', volleBreite ? 'max-w-none' : 'max-w-[1100px]')}>
          {haupt === 'sichten' || haupt === 'pruefen' || haupt === 'bewerben' || haupt === 'beworben'
            ? <ListenAnsicht key={haupt} haupt={haupt} />
            : haupt === 'sammeln' ? <Sammeln />
            : haupt === 'auswertung' ? <Auswertung />
            : <Einstellungen />}
        </main>
      </TendenzProvider>
    </ToastProvider>
  )
}