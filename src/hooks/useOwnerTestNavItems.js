import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  Car,
  Wallet,
  CreditCard,
  MessageSquare,
  Settings,
  Home,
  Briefcase,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import OwnerAiTabIcon from '../components/OwnerAiTabIcon'

/** Sidebar navigation for owner-test cabinet (desktop + mobile drawer). */
export function useOwnerTestNavItems(options = {}) {
  const { t } = useTranslation()
  const { activeId, hrefMap = {} } = options

  return useMemo(
    () => [
      {
        id: 'home',
        label: t('ownerTest_navAnalytics'),
        icon: LayoutDashboard,
        active: activeId === 'home',
        href: hrefMap.home,
      },
      {
        id: 'properties',
        label: t('ownerTest_navMyProperties'),
        icon: Building2,
        active: activeId === 'properties',
        href: hrefMap.properties,
      },
      {
        id: 'testdrive',
        label: t('ownerTest_navTestDrive'),
        icon: Car,
        active: activeId === 'testdrive',
        href: hrefMap.testdrive,
      },
      {
        id: 'wallet',
        label: t('ownerTest_navWallet'),
        icon: Wallet,
        active: activeId === 'wallet',
        href: hrefMap.wallet,
      },
      {
        id: 'subscriptions',
        label: t('ownerTest_navSubscriptions'),
        icon: CreditCard,
        active: activeId === 'subscriptions',
        href: hrefMap.subscriptions,
      },
      {
        id: 'messages',
        label: t('ownerTest_navMessages'),
        icon: MessageSquare,
        badge: 3,
        action: 'managerChat',
      },
      {
        id: 'settings',
        label: t('ownerTest_navSettings'),
        icon: Settings,
        active: activeId === 'settings',
        href: hrefMap.settings,
      },
    ],
    [t, activeId, hrefMap]
  )
}

/** Bottom tab bar (mobile). */
export function useOwnerTestTabItems(options = {}) {
  const { t } = useTranslation()
  const { activeId, variant = 'default' } = options

  return useMemo(() => {
    if (variant === 'wallet') {
      return [
        { id: 'home', label: t('ownerTest_tabHome'), icon: Home, href: options.hrefMap?.home },
        {
          id: 'properties',
          label: t('ownerTest_tabProperties'),
          icon: Briefcase,
          href: options.hrefMap?.properties,
        },
        {
          id: 'messages',
          label: t('ownerTest_navMessages'),
          icon: MessageSquare,
          badge: 3,
          href: options.hrefMap?.messages,
        },
        {
          id: 'profile',
          label: t('ownerTest_tabProfile'),
          icon: User,
          href: options.hrefMap?.profile,
        },
      ]
    }

    return [
      {
        id: 'home',
        label: t('ownerTest_tabAnalytics'),
        icon: Home,
        active: activeId === 'home',
        href: options.hrefMap?.home,
      },
      {
        id: 'properties',
        label: t('ownerTest_tabProperties'),
        icon: Briefcase,
        active: activeId === 'properties',
        href: options.hrefMap?.properties,
      },
      { id: 'fab', fab: true },
      {
        id: 'ai',
        label: t('ownerTest_tabAi'),
        icon: OwnerAiTabIcon,
        action: 'aiChat',
        active: activeId === 'ai',
      },
      {
        id: 'more',
        label: t('ownerTest_tabMore'),
        icon: SlidersHorizontal,
      },
    ]
  }, [t, activeId, variant, options.hrefMap])
}
