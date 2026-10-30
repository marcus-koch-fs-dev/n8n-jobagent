import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  text: string
  fehler: boolean
  aktion?: { label: string; onClick: () => void }
}
type Melden = (text: string, opts?: { fehler?: boolean; aktion?: Toast['aktion'] }) => void

const Ctx = createContext<Melden>(() => {})
export const useToast = () => useContext(Ctx)

/** Meldung unten (mit optionalem Aktionsknopf, z. B. „Rückgängig“). Fehler bleiben länger stehen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const melden = useCallback<Melden>((text, opts) => {
    setToast({ text, fehler: Boolean(opts?.fehler), aktion: opts?.aktion })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), opts?.fehler ? 10000 : 5000)
  }, [])

  return (
    <Ctx.Provider value={melden}>
      {children}
      <div
        role="status"
        onClick={() => setToast(null)}
        className={cn(
          'fixed bottom-5 left-1/2 z-20 max-w-[min(560px,calc(100%-32px))] -translate-x-1/2 cursor-pointer rounded-lg px-3.5 py-2.5 text-[14px] transition-all',
          toast?.fehler ? 'bg-bad text-white' : 'bg-foreground text-background',
          toast ? 'opacity-100' : 'pointer-events-none translate-y-5 opacity-0',
        )}
      >
        {toast?.text}
        {toast?.aktion && (
          <button
            className="ml-2.5 cursor-pointer underline"
            onClick={(e) => { e.stopPropagation(); toast.aktion?.onClick() }}
          >
            {toast.aktion.label}
          </button>
        )}
      </div>
    </Ctx.Provider>
  )
}