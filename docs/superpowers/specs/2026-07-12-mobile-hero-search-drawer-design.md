# Mobile Hero Search Drawer Design

## Goal

Replace the four-column mobile hero search strip with a compact catalog search action and an inline, animated filters drawer. Desktop search remains unchanged.

## Mobile experience

- The primary row contains a read-only empty search field and the button “Найдём всё!”.
- Submitting the primary row opens `/search-results` without preselected filters, so the full catalog is shown.
- A “Фильтры” control directly below the row expands and collapses an inline drawer.
- The drawer contains sale type, property type, location, and budget selects. Every select starts with “Не важно”.
- The drawer footer contains a full-width “Найти” submit button.
- The toggle exposes `aria-expanded`/`aria-controls`; the closed drawer is removed from keyboard interaction.
- Opening and closing use grid-row, opacity, transform, and chevron transitions, disabled under reduced-motion preferences.

## Data flow

Desktop and mobile filters use independent state. Desktop keeps its current defaults. Mobile starts empty and passes selected values through `buildHeroSearchNavigation`; an empty budget produces no price bounds.

## Verification

The existing mobile-search contract test is updated to cover the new structure, copy, responsive visibility, drawer transition, and empty-filter navigation. Per user instruction, automated tests and runtime processes are not executed by Codex.
