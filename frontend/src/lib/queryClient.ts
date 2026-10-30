import { QueryClient } from '@tanstack/react-query'

/** Ein gemeinsamer Client – auch für Abfrage-Intervalle, die den Stand anderer Abfragen brauchen. */
export const queryClient = new QueryClient()
