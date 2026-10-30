import { HAUPT_TABS, type Haupt } from '@/lib/listen'

/** Tab-Name als Link, z. B. im Lauf-Kasten: springt in den Tab. */
export function TabLink({ haupt }: { haupt: Haupt }) {
  const name = HAUPT_TABS.find((t) => t.key === haupt)?.label ?? haupt
  return <a href={'#' + haupt} className="font-bold text-inherit">{name}</a>
}