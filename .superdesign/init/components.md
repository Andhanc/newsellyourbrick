# Shared UI primitives

## Repository UI stack

- React 19 + Vite 5, JavaScript/JSX with a small TypeScript subset.
- Custom components and vanilla CSS are dominant; Tailwind CSS v4 utilities and CVA are used by selected primitives.
- Radix UI supplies accessible select/accordion/radio/label behavior; Lucide and React Icons supply icons.
- Buyer-mobile reusable patterns live in `src/components/buyer-mobile/`; page-level catalogue patterns live in `src/components/`.

## Class-name utility

Shared `cn()` helper used by variant-driven primitives.

### `src/lib/utils.js`

```jsx
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with tailwind-merge for proper class conflict resolution
 * @param {...(string|undefined|null|boolean)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return twMerge(clsx(classes));
}
```

## Button

CVA-based button primitive with visual and size variants plus `asChild` support.

Key props: variant, size, asChild, className and native button/link props.

### `src/components/ui/button.jsx`

```jsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white hover:bg-neutral-900/90',
        destructive: 'bg-red-600 text-white hover:bg-red-600/90',
        outline: 'border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80',
        ghost: 'hover:bg-neutral-100 hover:text-neutral-900',
        link: 'text-neutral-900 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## Card

Composable card surface with header, content, table, toolbar and footer slots.

Key props: variant (`default`/`accent`), className and slot element props.

### `src/components/ui/card.jsx`

```jsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

// Define CardContext
const CardContext = React.createContext({
  variant: 'default',
});

// Hook to use CardContext
const useCardContext = () => {
  const context = React.useContext(CardContext);
  if (!context) {
    throw new Error('useCardContext must be used within a Card component');
  }
  return context;
};

// Variants
const cardVariants = cva('flex flex-col items-stretch text-card-foreground rounded-xl', {
  variants: {
    variant: {
      default: 'bg-card border border-border shadow-xs black/5',
      accent: 'bg-muted shadow-xs p-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardHeaderVariants = cva('flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5', {
  variants: {
    variant: {
      default: 'border-b border-border',
      accent: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardContentVariants = cva('grow p-5', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-t-xl [&:last-child]:rounded-b-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardTableVariants = cva('grid grow', {
  variants: {
    variant: {
      default: '',
      accent: 'bg-card rounded-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const cardFooterVariants = cva('flex items-center px-5 min-h-14', {
  variants: {
    variant: {
      default: 'border-t border-border',
      accent: 'bg-card rounded-b-xl mt-[2px]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

// Card Component
function Card({
  className,
  variant = 'default',
  ...props
}) {
  return (
    <CardContext.Provider value={{ variant: variant || 'default' }}>
      <div data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />
    </CardContext.Provider>
  );
}

// CardHeader Component
function CardHeader({ className, ...props }) {
  const { variant } = useCardContext();
  return <div data-slot="card-header" className={cn(cardHeaderVariants({ variant }), className)} {...props} />;
}

// CardContent Component
function CardContent({ className, ...props }) {
  const { variant } = useCardContext();
  return <div data-slot="card-content" className={cn(cardContentVariants({ variant }), className)} {...props} />;
}

// CardTable Component
function CardTable({ className, ...props }) {
  const { variant } = useCardContext();
  return <div data-slot="card-table" className={cn(cardTableVariants({ variant }), className)} {...props} />;
}

// CardFooter Component
function CardFooter({ className, ...props }) {
  const { variant } = useCardContext();
  return <div data-slot="card-footer" className={cn(cardFooterVariants({ variant }), className)} {...props} />;
}

// Other Components
function CardHeading({ className, ...props }) {
  return <div data-slot="card-heading" className={cn('space-y-1', className)} {...props} />;
}

function CardToolbar({ className, ...props }) {
  return <div data-slot="card-toolbar" className={cn('flex items-center gap-2.5', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

// Exports
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardHeading, CardTable, CardTitle, CardToolbar };
```

## Badge

Compact status/tag primitive with default, secondary and outline treatments.

Key props: variant, className and div props.

### `src/components/ui/badge.jsx`

```jsx
import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-900 text-white',
        secondary: 'border-transparent bg-white/80 text-neutral-900 backdrop-blur-sm',
        outline: 'border-neutral-200 bg-transparent text-neutral-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

## Select

Accessible Radix select composition with trigger, content, groups and items.

Key props: Radix Select props and className.

### `src/components/ui/select.jsx`

```jsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
)
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
)
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
)
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
```

## ImageWithSkeleton

Progressive image primitive with loading skeleton, error state and optional overlay.

Key props: src, alt, fallbackSrc, aspectRatio, overlay, onLoad, onError, className.

### `src/components/ImageWithSkeleton.jsx`

```jsx
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import './ImageWithSkeleton.css'

function isImageDecoded(img) {
  return Boolean(img?.complete && img.naturalWidth > 0)
}

export default function ImageWithSkeleton({
  imgProps = {},
  alt = '',
  className = '',
  containerClassName = '',
  skeletonClassName = '',
  imgStyle,
  onError,
  onLoad,
}) {
  const src = imgProps?.src ?? ''
  const srcSet = imgProps?.srcSet
  const imgRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const syncLoadedFromDom = useCallback(() => {
    if (isImageDecoded(imgRef.current)) {
      setIsLoaded(true)
      return true
    }
    return false
  }, [])

  useLayoutEffect(() => {
    if (!src) {
      setIsLoaded(false)
      return
    }
    if (!syncLoadedFromDom()) {
      setIsLoaded(false)
    }
  }, [src, srcSet, syncLoadedFromDom])

  const handleImgRef = (node) => {
    imgRef.current = node
    if (node && isImageDecoded(node)) {
      setIsLoaded(true)
    }
  }

  return (
    <div className={`image-with-skeleton ${containerClassName}`.trim()}>
      {!isLoaded ? <div className={`image-with-skeleton__placeholder ${skeletonClassName}`.trim()} /> : null}
      <img
        {...imgProps}
        ref={handleImgRef}
        alt={alt}
        style={imgStyle}
        className={`${className} ${isLoaded ? 'image-with-skeleton__img--ready' : 'image-with-skeleton__img--loading'}`.trim()}
        onLoad={(e) => {
          setIsLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setIsLoaded(true)
          onError?.(e)
        }}
      />
    </div>
  )
}
```

### `src/components/ImageWithSkeleton.css`

```css
.image-with-skeleton {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.image-with-skeleton__placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: image-skeleton-shimmer 1.2s ease-in-out infinite;
}

.image-with-skeleton img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 180ms ease;
}

.image-with-skeleton__img--loading {
  opacity: 0;
}

.image-with-skeleton__img--ready {
  opacity: 1;
}

@keyframes image-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

## ListingPagePagination

Reusable accessible catalogue pagination with compact page window.

Key props: page, totalPages, onPageChange, ariaLabel, className.

### `src/components/ListingPagePagination.jsx`

```jsx
import { useTranslation } from 'react-i18next'
import './ListingPagePagination.css'

export default function ListingPagePagination({ currentPage, totalPages, onPageChange }) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <nav className="auction-desktop-pagination listing-page-pagination" aria-label={t('auctionPaginationLabel')}>
      <button
        type="button"
        className="auction-desktop-pagination__arrow"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t('auctionPaginationPrev')}
      >
        ←
      </button>
      <div className="auction-desktop-pagination__pages">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`auction-desktop-pagination__page${
              page === currentPage ? ' auction-desktop-pagination__page--active' : ''
            }`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="auction-desktop-pagination__arrow"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t('auctionPaginationNext')}
      >
        →
      </button>
    </nav>
  )
}
```

### `src/components/ListingPagePagination.css`

```css
.listing-page-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-bottom: 8px;
}

.listing-page-pagination .auction-desktop-pagination__pages {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-width: min(100%, 640px);
}

.listing-page-pagination .auction-desktop-pagination__page,
.listing-page-pagination .auction-desktop-pagination__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  border: 1.5px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  font-family: 'Montserrat', system-ui, sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.listing-page-pagination .auction-desktop-pagination__page:hover:not(.auction-desktop-pagination__page--active),
.listing-page-pagination .auction-desktop-pagination__arrow:hover:not(:disabled) {
  border-color: rgba(74, 150, 166, 0.4);
  color: #3f8798;
  background: rgba(74, 150, 166, 0.06);
}

.listing-page-pagination .auction-desktop-pagination__page--active {
  border-color: #4a96a6;
  background: #4a96a6;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(74, 150, 166, 0.28);
  cursor: default;
}

.listing-page-pagination .auction-desktop-pagination__arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .listing-page-pagination {
    margin-top: 20px;
    padding-inline: 4px;
  }

  .listing-page-pagination .auction-desktop-pagination__page,
  .listing-page-pagination .auction-desktop-pagination__arrow {
    min-width: 36px;
    height: 36px;
    font-size: 0.875rem;
  }
}
```

## BuyerStatusRibbon

Buyer-card state ribbon for sold, ended, reserved and unavailable inventory.

Key props: listingState, className.

### `src/components/buyer-mobile/BuyerStatusRibbon.jsx`

```jsx
import './BuyerStatusRibbon.css'

const VISIBLE_STATES = new Set(['sold', 'auction-ended', 'reserved', 'unavailable'])

export default function BuyerStatusRibbon({ listingState, className = '' }) {
  if (!listingState || !VISIBLE_STATES.has(listingState.state)) return null

  const label = listingState.label
  const tone = listingState.tone || listingState.state

  return (
    <div
      className={`buyer-status-ribbon buyer-status-ribbon--${tone}${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <span className="buyer-status-ribbon__text">{label}</span>
    </div>
  )
}
```

### `src/components/buyer-mobile/BuyerStatusRibbon.css`

```css
.buyer-status-ribbon {
  position: absolute;
  z-index: 8;
  top: 24px;
  left: -12%;
  display: grid;
  place-items: center;
  width: 124%;
  min-height: 44px;
  padding: 9px 48px;
  overflow: hidden;
  pointer-events: none;
  transform: rotate(-7deg);
  transform-origin: center;
  box-shadow: 0 8px 24px rgba(2, 18, 20, 0.2);
  font-family: var(--buyer-font-display);
  isolation: isolate;
}

.buyer-status-ribbon::before,
.buyer-status-ribbon::after {
  position: absolute;
  right: 0;
  left: 0;
  z-index: -1;
  height: 5px;
  content: '';
}

.buyer-status-ribbon::before { top: 0; }
.buyer-status-ribbon::after { bottom: 0; }

.buyer-status-ribbon__text {
  color: inherit;
  font-size: clamp(11px, 3.4vw, 14px);
  font-weight: 850;
  letter-spacing: 0.075em;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
  text-wrap: balance;
  user-select: text;
}

.buyer-status-ribbon--sold {
  background: var(--buyer-teal-deep);
  color: var(--buyer-white);
}

.buyer-status-ribbon--sold::before,
.buyer-status-ribbon--sold::after {
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.92) 0 16px,
    transparent 16px 30px
  );
  opacity: 0.34;
}

.buyer-status-ribbon--auction-ended {
  background: var(--buyer-auction);
  color: var(--buyer-ink);
}

.buyer-status-ribbon--auction-ended::before,
.buyer-status-ribbon--auction-ended::after {
  background: repeating-linear-gradient(
    90deg,
    var(--buyer-ink) 0 18px,
    transparent 18px 34px
  );
}

.buyer-status-ribbon--reserved {
  background: var(--buyer-ink);
  color: var(--buyer-white);
}

.buyer-status-ribbon--reserved::before,
.buyer-status-ribbon--reserved::after,
.buyer-status-ribbon--unavailable::before,
.buyer-status-ribbon--unavailable::after {
  background: rgba(255, 255, 255, 0.22);
}

.buyer-status-ribbon--unavailable {
  background: #68706f;
  color: var(--buyer-white);
}

.buyer-card-final-action {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: var(--buyer-touch);
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--buyer-teal) 22%, transparent);
  border-radius: 14px;
  background: var(--buyer-mint);
  color: var(--buyer-ink);
  cursor: pointer;
  font-family: var(--buyer-font-display);
  text-align: left;
}

.buyer-card-final-action > span {
  color: var(--buyer-text-muted);
  font-size: 10px;
  font-weight: 650;
}

.buyer-card-final-action > strong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--buyer-teal-deep);
  font-size: 11px;
  font-weight: 780;
}

.property-card--buyer-sold .property-image-container,
.property-card--buyer-auction-ended .property-image-container,
.auction-card--buyer-sold .auction-card__media,
.auction-card--buyer-auction-ended .auction-card__media {
  background: var(--buyer-ink);
}

.property-card--buyer-sold .property-image,
.property-card--buyer-auction-ended .property-image,
.auction-card--buyer-sold .auction-card__image,
.auction-card--buyer-auction-ended .auction-card__image {
  filter: saturate(0.55) brightness(0.8);
}

@media (max-width: 360px) {
  .buyer-status-ribbon {
    top: 20px;
    min-height: 40px;
    padding-inline: 40px;
  }

  .buyer-status-ribbon__text {
    font-size: 10px;
    letter-spacing: 0.06em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buyer-status-ribbon {
    transition: none !important;
  }
}
```

## BuyerEmptyState

Guided mobile empty state with recovery action hierarchy.

Key props: eyebrow, title, description, primaryLabel/onPrimary, optional secondary action, icon, className.

### `src/components/buyer-mobile/BuyerEmptyState.jsx`

```jsx
import { ArrowRight, SearchX } from 'lucide-react'
import './BuyerEmptyState.css'

export default function BuyerEmptyState({
  eyebrow = 'Продолжим поиск',
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon: Icon = SearchX,
  className = '',
}) {
  return (
    <section className={`buyer-empty-state${className ? ` ${className}` : ''}`} role="status">
      <span className="buyer-empty-state__icon" aria-hidden><Icon size={30} strokeWidth={1.8} /></span>
      <span className="buyer-empty-state__eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="buyer-empty-state__actions">
        <button type="button" className="buyer-empty-state__primary" onClick={onPrimary}>
          {primaryLabel}<ArrowRight size={18} aria-hidden />
        </button>
        {secondaryLabel && onSecondary ? (
          <button type="button" className="buyer-empty-state__secondary" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </section>
  )
}
```

### `src/components/buyer-mobile/BuyerEmptyState.css`

```css
.buyer-empty-state {
  display: grid;
  justify-items: center;
  width: min(100%, 520px);
  margin: 26px auto 48px;
  padding: 30px 22px;
  border: 1px solid color-mix(in srgb, var(--buyer-teal) 14%, transparent);
  border-radius: var(--buyer-radius-lg);
  background: linear-gradient(145deg, var(--buyer-white), var(--buyer-mint));
  box-shadow: var(--buyer-shadow-card);
  color: var(--buyer-ink);
  font-family: var(--buyer-font-body);
  text-align: center;
}

.buyer-empty-state__icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: var(--buyer-mint);
  color: var(--buyer-teal-deep);
  transform: rotate(-4deg);
}

.buyer-empty-state__eyebrow {
  margin-top: 18px;
  color: var(--buyer-teal-deep);
  font: 760 10px/1.2 var(--buyer-font-display);
  letter-spacing: .1em;
  text-transform: uppercase;
}

.buyer-empty-state h2 {
  max-width: 380px;
  margin: 7px 0 0;
  font: 820 clamp(24px, 7vw, 32px)/1.04 var(--buyer-font-display);
  letter-spacing: -.045em;
  text-wrap: balance;
}

.buyer-empty-state p {
  max-width: 380px;
  margin: 11px 0 0;
  color: var(--buyer-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.buyer-empty-state__actions {
  display: grid;
  width: min(100%, 340px);
  gap: 8px;
  margin-top: 21px;
}

.buyer-empty-state__primary,
.buyer-empty-state__secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: var(--buyer-touch);
  padding: 0 16px;
  border-radius: 15px;
  cursor: pointer;
  font: 740 13px/1 var(--buyer-font-display);
}

.buyer-empty-state__primary {
  border: 0;
  background: var(--buyer-ink);
  color: var(--buyer-white);
  box-shadow: 0 12px 26px rgba(5, 5, 5, .16);
}

.buyer-empty-state__secondary {
  border: 1px solid var(--buyer-line);
  background: var(--buyer-white);
  color: var(--buyer-teal-deep);
}

@media (max-width: 360px) {
  .buyer-empty-state { padding: 26px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .buyer-empty-state__icon { transform: none; }
}
```

## BuyerSheetShell

Accessible portal-based mobile drawer/sheet with focus trap, dismiss animation and sticky footer.

Key props: isOpen, onClose, titleId/labelledBy, describedBy, tone, dismissible, footer, initialFocusRef, className.

### `src/components/buyer-mobile/BuyerSheetShell.jsx`

```jsx
import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DRAWER_DISMISS_MS, useDrawerDismiss } from '../../hooks/useDrawerDismiss'
import './BuyerSheetShell.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableElements(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export default function BuyerSheetShell({
  isOpen,
  onClose,
  titleId,
  labelledBy,
  describedBy,
  tone = 'detail',
  closeLabel = 'Закрыть',
  dismissible = true,
  footer = null,
  initialFocusRef,
  children,
  className = '',
}) {
  const surfaceRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const bodyOverflowRef = useRef('')
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => previouslyFocusedRef.current?.focus?.())
  }, [])

  const handleRequestClose = useCallback(() => {
    if (!dismissible) return
    requestClose(restoreFocus)
  }, [dismissible, requestClose, restoreFocus])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) handleRequestClose()
    },
    [handleRequestClose],
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        if (dismissible) {
          event.preventDefault()
          handleRequestClose()
        }
        return
      }

      if (event.key !== 'Tab') return
      const focusables = focusableElements(surfaceRef.current)
      if (focusables.length === 0) {
        event.preventDefault()
        surfaceRef.current?.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [dismissible, handleRequestClose],
  )

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    previouslyFocusedRef.current = document.activeElement
    bodyOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const preferred = initialFocusRef?.current
      const firstFocusable = focusableElements(surfaceRef.current)[0]
      ;(preferred || closeButtonRef.current || firstFocusable || surfaceRef.current)?.focus?.()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = bodyOverflowRef.current
      previouslyFocusedRef.current?.focus?.()
    }
  }, [initialFocusRef, isOpen])

  if (!visible || typeof document === 'undefined') return null

  const rootClassName = [
    'buyer-sheet',
    `buyer-sheet--${tone}`,
    isClosing ? 'buyer-sheet--closing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div className={rootClassName} onKeyDown={handleKeyDown}>
      <div
        className={`buyer-sheet__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        role="presentation"
        onClick={handleBackdropClick}
      />
      <section
        ref={surfaceRef}
        className={`buyer-sheet__surface${isClosing ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <div className="buyer-sheet__handle" aria-hidden="true"><span /></div>
        {dismissible ? (
          <button
            ref={closeButtonRef}
            type="button"
            className="buyer-sheet__close buyer-touch-target"
            onClick={handleRequestClose}
            aria-label={closeLabel}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <div className="buyer-sheet__body">{children}</div>
        {footer ? <footer className="buyer-sheet__footer buyer-safe-bottom">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}

export { FOCUSABLE_SELECTOR }
```

### `src/components/buyer-mobile/BuyerSheetShell.css`

```css
.buyer-sheet {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-family: var(--buyer-font-body);
}

.buyer-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 15, 17, 0.58);
  backdrop-filter: blur(7px);
  animation: buyer-sheet-backdrop-in var(--buyer-duration-fast) ease-out both;
}

.buyer-sheet__surface {
  position: relative;
  width: min(100%, 620px);
  max-height: min(88dvh, 760px);
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: var(--buyer-radius-sheet) var(--buyer-radius-sheet) 0 0;
  background: var(--buyer-warm);
  box-shadow: var(--buyer-shadow-float);
  color: var(--buyer-ink);
  animation: buyer-sheet-surface-in var(--buyer-duration-base) var(--buyer-ease-out) both;
  scrollbar-width: thin;
}

.buyer-sheet__surface:focus {
  outline: none;
}

.buyer-sheet__handle {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  height: 22px;
  padding-top: 8px;
  background: linear-gradient(var(--buyer-warm) 70%, transparent);
}

.buyer-sheet__handle span {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: rgba(5, 5, 5, 0.18);
}

.buyer-sheet__close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  display: grid;
  place-items: center;
  min-height: var(--buyer-touch);
  border: 0;
  border-radius: 50%;
  background: rgba(5, 5, 5, 0.06);
  color: var(--buyer-ink);
  cursor: pointer;
  font: 400 30px/1 var(--buyer-font-body);
  transition: background var(--buyer-duration-fast), transform var(--buyer-duration-fast);
}

.buyer-sheet__close:active {
  transform: scale(0.94);
}

.buyer-sheet__close:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--buyer-teal) 35%, transparent);
  outline-offset: 2px;
}

.buyer-sheet__body {
  padding: 12px var(--buyer-gutter) 24px;
}

.buyer-sheet__footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: grid;
  gap: 10px;
  padding: 12px var(--buyer-gutter);
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--buyer-line);
  background: color-mix(in srgb, var(--buyer-warm) 92%, transparent);
  backdrop-filter: blur(18px);
}

.buyer-sheet--success .buyer-sheet__surface {
  background: linear-gradient(180deg, var(--buyer-mint), var(--buyer-warm) 42%);
}

.buyer-sheet--guard .buyer-sheet__surface {
  background: linear-gradient(180deg, #fff8d6, var(--buyer-warm) 38%);
}

.buyer-sheet--choice .buyer-sheet__surface {
  background: linear-gradient(180deg, var(--buyer-cloud), var(--buyer-warm) 44%);
}

@keyframes buyer-sheet-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes buyer-sheet-surface-in {
  from { opacity: 0; transform: translate3d(0, 36px, 0) scale(0.985); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@media (min-width: 768px) {
  .buyer-sheet {
    align-items: center;
    padding: 24px;
  }

  .buyer-sheet__surface {
    border-radius: var(--buyer-radius-sheet);
  }

  .buyer-sheet__handle {
    display: none;
  }

  .buyer-sheet__body {
    padding-top: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buyer-sheet__backdrop,
  .buyer-sheet__surface {
    animation-duration: 1ms !important;
  }
}
```

## SiteBrandLogo

Shared SellYourBrick wordmark/mark used by navigation surfaces.

Key props: variant, compact, className and link-related presentation props.

### `src/components/SiteBrandLogo.jsx`

```jsx
import { Link } from 'react-router-dom'
import './SiteBrandLogo.css'

export function SiteBrandIcon({ className = '' }) {
  return (
    <div className={`site-brand__icon ${className}`.trim()} aria-hidden>
      <span className="site-brand__house" />
    </div>
  )
}

export default function SiteBrandLogo({
  className = '',
  iconClassName = '',
  textClassName = '',
  to,
  onClick,
  ariaLabel = 'Sellyourbrick',
}) {
  const inner = (
    <>
      <SiteBrandIcon className={iconClassName} />
      <span className={`site-brand__text ${textClassName}`.trim()}>sellyourbrick</span>
    </>
  )

  const rootClass = `site-brand site-brand--header ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={rootClass} aria-label={ariaLabel} onClick={onClick}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={rootClass} aria-label={ariaLabel}>
      {inner}
    </div>
  )
}
```

### `src/components/SiteBrandLogo.css`

```css
.site-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.site-brand__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--oc-tiffany, #0099A9);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 6px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.site-brand__house {
  width: 18px;
  height: 14px;
  border-radius: 3px 3px 0 0;
  background: #ffffff;
  position: relative;
}

.site-brand__house::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-bottom: 8px solid #ffffff;
}

.site-brand__text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  color: #0f172a;
  white-space: nowrap;
}

.site-brand--header .site-brand__icon {
  width: 34px;
  height: 34px;
}

.site-brand--header .site-brand__text {
  font-size: 18px;
  letter-spacing: -0.02em;
}
```
