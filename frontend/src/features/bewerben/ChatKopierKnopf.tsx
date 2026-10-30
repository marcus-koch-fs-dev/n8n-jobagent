import { useChat } from '@/hooks/useChat'
import type { Job } from '@/types/job'
import { KopierKnopf } from './KopierKnopf'

/** 📋 kopiert die Stelle (bei Bedarf mit Anweisungen und Lebenslauf) für einen KI-Chat im Abo – keine API-Kosten. */
export function ChatKopierKnopf({ job }: { job: Job }) {
  const { mit, stelleKopieren } = useChat()
  return (
    <KopierKnopf mini kopieren={() => stelleKopieren(job)} fertig="✓ kopiert"
      titel={(mit ? 'Für Chat kopieren: Anweisungen + Lebenslauf + Stelle – in einen beliebigen KI-Chat einfügen' : 'Für Chat kopieren: nur die Stelle – im Chat-Projekt mit deinen Anweisungen einfügen') + ' (keine API-Kosten)'}>
      📋
    </KopierKnopf>
  )
}
