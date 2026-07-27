# Extractable DraftComponents

These existing components are the preferred reuse points before a Superdesign draft introduces new structure. Props listed here are only the state/navigation values that vary by page; labels, icons, class names and brand assets remain internal unless a real product requirement says otherwise.

## Layout components

## AppLayoutFrame
- Source: `src/App.jsx` (local component)
- Category: layout
- Description: Scroll-owning application content frame used by every route.
- Extractable props: isBlocked (boolean), appLayoutRef (ref)
- Hardcoded: route-class rules, `.app-layout` structure, content scrolling contract

## Header
- Source: `src/components/Header.jsx`
- Category: layout
- Description: Shared responsive site header with menu, search, language, auth, wallet and notification entry points.
- Extractable props: none; route/user state comes from router and providers
- Hardcoded: navigation labels, logo treatment, icon set, mobile/desktop breakpoint behavior

## SiteNavDrawer
- Source: `src/components/SiteNavDrawer.jsx`
- Category: layout
- Description: Animated mobile navigation drawer composed into Header.
- Extractable props: isMenuOpen, isMenuClosing, setIsMenuOpen, setIsMenuClosing, openLoginOrNavigate
- Hardcoded: backdrop/dropdown class structure and embedded HeaderMegaMenu

## HeaderMegaMenu
- Source: `src/components/HeaderMegaMenu.jsx`
- Category: layout
- Description: Role-aware catalogue/services/account mega menu for desktop and mobile.
- Extractable props: onClose, openLoginOrNavigate, closeAfterNav
- Hardcoded: column definitions, role mapping, icons, localization keys

## Footer
- Source: `src/components/Footer.jsx`
- Category: layout
- Description: Global footer with brand, service links, contacts and language controls.
- Extractable props: none; content is localized and route-independent
- Hardcoded: section labels, brand assets, social/contact icons, legal/navigation structure

## BuyerCabinetSidebar
- Source: `src/components/BuyerCabinetSidebar.jsx`
- Category: layout
- Description: Buyer account navigation and logout/language footer.
- Extractable props: compact, showProfileIndicator, showDataIndicator, onLogout, headerSpaceBetween, asideClassName
- Hardcoded: buyer cabinet routes, icon names, localized labels

## AuctionMobileLayout
- Source: `src/components/ui/AuctionMobileLayout.jsx`
- Category: layout
- Description: Dense-commerce phone catalogue with card/list views and buyer property actions.
- Extractable props: properties, formatPrice, isFavorite, onFavoriteToggle, viewerHasVip, onOpen, onTooltip, debtsCards
- Hardcoded: view modes, motion spring, grid/list structure, product-card iconography

## Basic components

## Button
- Source: `src/components/ui/button.jsx`
- Category: basic
- Description: CVA button primitive with semantic visual and size variants.
- Extractable props: variant, size, asChild
- Hardcoded: utility classes, focus ring and disabled behavior

## Card
- Source: `src/components/ui/card.jsx`
- Category: basic
- Description: Composable card with header/content/table/footer slots.
- Extractable props: variant
- Hardcoded: slot structure, typography and utility classes

## Badge
- Source: `src/components/ui/badge.jsx`
- Category: basic
- Description: Compact status/tag primitive.
- Extractable props: variant
- Hardcoded: sizing, rounded shape and focus treatment

## Select
- Source: `src/components/ui/select.jsx`
- Category: basic
- Description: Accessible Radix select composition.
- Extractable props: value/defaultValue, open/defaultOpen, onValueChange
- Hardcoded: chevron/check icons, popper animation and utility classes

## ImageWithSkeleton
- Source: `src/components/ImageWithSkeleton.jsx`
- Category: basic
- Description: Progressive image with loading placeholder and decoded-image synchronization.
- Extractable props: imgProps, alt, className, containerClassName, skeletonClassName, imgStyle, onLoad, onError
- Hardcoded: skeleton/ready class state machine

## ListingPagePagination
- Source: `src/components/ListingPagePagination.jsx`
- Category: basic
- Description: Accessible compact pagination for buyer catalogues.
- Extractable props: currentPage, totalPages, onPageChange
- Hardcoded: previous/next icon names, page-window algorithm and Russian aria labels

## BuyerStatusRibbon
- Source: `src/components/buyer-mobile/BuyerStatusRibbon.jsx`
- Category: basic
- Description: Premium diagonal ribbon for sold, auction-ended, reserved or unavailable cards.
- Extractable props: listingState, className
- Hardcoded: supported state set and ribbon geometry

## BuyerEmptyState
- Source: `src/components/buyer-mobile/BuyerEmptyState.jsx`
- Category: basic
- Description: Guided empty state with explanation and one primary recovery action.
- Extractable props: eyebrow, title, description, primaryLabel/onPrimary, secondaryLabel/onSecondary, icon, className
- Hardcoded: action hierarchy and arrow icon

## BuyerSheetShell
- Source: `src/components/buyer-mobile/BuyerSheetShell.jsx`
- Category: basic
- Description: Accessible mobile drawer with focus trap, portal, dismiss lifecycle and sticky safe-area footer.
- Extractable props: isOpen, onClose, titleId/labelledBy, describedBy, tone, dismissible, footer, initialFocusRef, className
- Hardcoded: close/drag-handle structure, focusable selector and portal target

## SiteBrandLogo
- Source: `src/components/SiteBrandLogo.jsx`
- Category: basic
- Description: Shared SellYourBrick mark and wordmark.
- Extractable props: variant, compact, className
- Hardcoded: brand text/mark and SVG asset paths already owned by the component

## AuctionPropertyCard
- Source: `src/components/AuctionPropertyCard.jsx`
- Category: basic
- Description: Buyer auction card with image, timer, availability state, favorite and purchase affordances.
- Extractable props: property, isFavorite, onFavoriteToggle, onOpen, onTooltip, viewerHasVip, formatPrice
- Hardcoded: auction badge/timer hierarchy, icon set and route resolver

## DebtsPropertyCard
- Source: `src/components/DebtsPropertyCard.jsx`
- Category: basic
- Description: Financial marketplace card emphasizing risk, debt and auction state.
- Extractable props: property, isFavorite, onFavoriteToggle, onOpen, href
- Hardcoded: risk tone resolver, auction timer placement and money formatting

## SharesPropertyCard
- Source: `src/components/SharesPropertyCard.jsx`
- Category: basic
- Description: Co-investment card emphasizing forecast return, collected progress and share availability.
- Extractable props: share, viewMode, isFavorite, onFavoriteToggle, onInvest
- Hardcoded: marketplace state resolver, yield/progress formatting and icon set

## DepositButton
- Source: `src/components/DepositButton.jsx`
- Category: basic
- Description: Floating or inline deposit entry point that returns through wallet context.
- Extractable props: amount
- Hardcoded: wallet destination and label/icon treatment

## Toast
- Source: `src/components/Toast.jsx`
- Category: basic
- Description: Animated, pause-aware notification with semantic icon, action and accessible live announcement.
- Extractable props: title, message, type, duration, persistent, action, announcement, onClose
- Hardcoded: semantic icon mapping, exit duration and timer behavior
