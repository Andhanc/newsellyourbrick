import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIFFANY = '#0099A9'

/**
 * История транзакций: плоская белая карта и серые строки (референс payment card), без градиентов.
 */
export default function TransactionHistoryCard({
  totalLabel = 'Сумма операций',
  totalAmountDisplay,
  subtitle,
  listTitle = 'Последние операции',
  items = [],
  defaultSelectedId,
  historyHref = '/history',
  historyButtonLabel = 'Вся история',
  className,
}) {
  const initialId = defaultSelectedId ?? items[0]?.id ?? ''
  const [selectedId, setSelectedId] = useState(initialId)

  useEffect(() => {
    const next = defaultSelectedId ?? items[0]?.id ?? ''
    setSelectedId((prev) => (items.some((r) => r.id === prev) ? prev : next))
  }, [items, defaultSelectedId])

  return (
    <div className={cn('test-tx-panel', className)}>
      <div className="text-center">
        <p className="test-tx__eyebrow">{totalLabel}</p>
        <p className="test-tx__headline test-tx__headline--center">{totalAmountDisplay}</p>
        {subtitle ? <p className="mt-2 text-sm leading-snug text-zinc-500">{subtitle}</p> : null}
      </div>

      <div className="mt-7 flex flex-1 flex-col">
        <p className="test-tx__eyebrow mb-3">{listTitle}</p>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-zinc-500">
            Пока нет событий в истории — они появятся после ставок и покупок.
          </p>
        ) : null}
        <div role="radiogroup" aria-label={listTitle} className="flex flex-col gap-3">
          {items.map((row) => {
            const isSelected = selectedId === row.id
            return (
              <button
                key={row.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedId(row.id)}
                className={cn(
                  'relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-2xl p-4 text-left',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A9]',
                  !isSelected && 'test-tx-row--ghost',
                  isSelected && 'text-white'
                )}
                aria-label={`${row.title}, ${row.details}`}
              >
                {isSelected ? (
                  <motion.div
                    layoutId="transaction-history-selected-bg"
                    className="absolute inset-0 z-0 rounded-2xl"
                    style={{ backgroundColor: TIFFANY }}
                    initial={{ opacity: 0.92 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}

                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isSelected ? 'bg-white/20 text-white ring-1 ring-white/40' : 'border border-slate-200 bg-white text-slate-800'
                  )}
                >
                  {row.initials}
                </div>

                <div className="relative z-10 min-w-0 flex-1">
                  <p className={cn('font-semibold leading-tight', isSelected ? 'text-white' : 'text-slate-900')}>
                    {row.title}
                  </p>
                  <p className={cn('mt-0.5 truncate text-sm', isSelected ? 'text-white/90' : 'text-zinc-500')}>
                    {row.details}
                  </p>
                </div>

                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-sm"
                      style={{ color: TIFFANY }}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    </motion.div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-zinc-300 bg-white" aria-hidden />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Link to={historyHref} className="test-tx__cta">
        {historyButtonLabel}
      </Link>
    </div>
  )
}
