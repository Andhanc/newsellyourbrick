import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Варианты как в shadcn-примере; default size xxl по исходному компоненту.
 */
const liquidbuttonVariants = cva(
  'relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,box-shadow,transform] duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4 focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
  {
    variants: {
      variant: {
        default: 'border border-white/20 bg-white/10 text-gray-900 hover:scale-[1.02] dark:border-white/10 dark:text-white',
        destructive:
          'border border-red-200/50 bg-red-600 text-white hover:bg-red-600/90 focus-visible:ring-red-500/30 dark:border-red-900/40',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'border border-transparent hover:bg-accent hover:text-accent-foreground',
        link: 'border-transparent text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-4 text-xs has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        xl: 'h-12 rounded-md px-8 has-[>svg]:px-6',
        xxl: 'h-14 rounded-md px-10 text-base has-[>svg]:px-8',
        icon: 'size-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'xxl'
    }
  }
)

const glassShadowClass =
  'pointer-events-none absolute inset-0 z-0 rounded-[inherit] shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] transition-all dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]'

/**
 * Кнопка «liquid glass». Требует один раз смонтированный <GlassFilterDefs /> в корне приложения.
 */
export const LiquidButton = React.forwardRef(function LiquidButton(
  { className, variant, size, asChild = false, children, type = 'button', ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      data-slot="liquid-button"
      className={cn(liquidbuttonVariants({ variant, size }), className)}
      {...props}
    >
      <span className={glassShadowClass} aria-hidden />
      <span
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
        style={{ backdropFilter: 'url(#container-glass)' }}
        aria-hidden
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </Comp>
  )
})

LiquidButton.displayName = 'LiquidButton'

export { liquidbuttonVariants }
