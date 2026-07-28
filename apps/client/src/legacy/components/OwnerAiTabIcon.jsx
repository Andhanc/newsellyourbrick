import { Bot } from 'lucide-react'

/** Иконка AI для нижнего меню кабинета продавца. */
export default function OwnerAiTabIcon({ size = 22, active = false }) {
  return (
    <span
      className={`otc-tabbar__ai-icon${active ? ' otc-tabbar__ai-icon--active' : ''}`}
      aria-hidden
    >
      <Bot size={size} strokeWidth={active ? 2.25 : 2} />
    </span>
  )
}
