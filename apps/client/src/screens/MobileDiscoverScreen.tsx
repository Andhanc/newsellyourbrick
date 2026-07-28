import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, layout, rounded } from '../theme/tokens'
import { MENU_ITEMS, SALE_CARDS } from '../constants/discover'

const heroImage = require('../assets/images/mobile-discover/hero-townhouses.png')
const welcomeHouse = require('../assets/images/mobile-discover/welcome-summer.png')
const cardImages = {
  cardAuction: require('../assets/images/mobile-discover/card-auction.png'),
  // The source asset is JPEG bytes with a .png extension, which works on web
  // but Android's resource compiler rejects. This lossless PNG copy preserves
  // the same pixels across native and web builds.
  cardBuyNow: require('../assets/images/mobile-discover/card-buy-now-native.png'),
  cardDebts: require('../assets/images/mobile-discover/card-debts.png'),
  cardShares: require('../assets/images/mobile-discover/card-shares.png'),
}

const WHEEL_THRESHOLD = 40
const COVER_MS = 140
const HOLD_MS = 70
const REVEAL_MS = 480

type ScreenKind = 'hero' | 'stage'
type FlashPhase = 'idle' | 'cover' | 'reveal'

function prefersReducedMotion() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function MobileDiscoverScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const isPhoneFrame = width >= 768
  const frameWidth = isPhoneFrame ? Math.min(layout.discoverPhoneMaxWidth, width) : width
  const stageCardWidth = Math.min(width * 0.76, 292)

  const [screen, setScreen] = useState<ScreenKind>('hero')
  const [flashPhase, setFlashPhase] = useState<FlashPhase>('idle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState<Set<string>>(() => new Set())
  const [stageEntered, setStageEntered] = useState(false)
  const [welcomeQuery, setWelcomeQuery] = useState('')

  const busyRef = useRef(false)
  const screenRef = useRef<ScreenKind>('hero')
  const stageScrollRef = useRef<ScrollView>(null)
  const stageScrollY = useRef(0)
  const wheelAcc = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  screenRef.current = screen

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  const goTo = useCallback(
    (next: ScreenKind) => {
      if (busyRef.current) return
      if (screenRef.current === next) return
      busyRef.current = true
      setMenuOpen(false)

      const finish = () => {
        busyRef.current = false
        wheelAcc.current = 0
      }

      if (prefersReducedMotion()) {
        setScreen(next)
        setStageEntered(next === 'stage')
        setFlashPhase('idle')
        finish()
        return
      }

      setFlashPhase('cover')
      later(() => {
        setScreen(next)
        if (next === 'stage') setStageEntered(false)
        later(() => {
          if (next === 'stage') {
            stageScrollRef.current?.scrollTo({ y: 0, animated: false })
            setStageEntered(true)
          }
          setFlashPhase('reveal')
          later(() => {
            setFlashPhase('idle')
            finish()
          }, REVEAL_MS)
        }, HOLD_MS)
      }, COVER_MS)
    },
    [later],
  )

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onWheel = useCallback(
    (event: { preventDefault?: () => void; deltaY: number }) => {
      if (busyRef.current || flashPhase !== 'idle') {
        event.preventDefault?.()
        return
      }
      const current = screenRef.current
      if (current === 'stage') {
        const atTop = stageScrollY.current <= 2
        if (event.deltaY < 0 && atTop) {
          event.preventDefault?.()
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= WHEEL_THRESHOLD) goTo('hero')
          return
        }
        if (event.deltaY > 0) {
          wheelAcc.current = 0
          return
        }
      }

      event.preventDefault?.()
      wheelAcc.current += event.deltaY
      if (current === 'hero' && wheelAcc.current >= WHEEL_THRESHOLD) goTo('stage')
      else if (current === 'stage' && wheelAcc.current <= -WHEEL_THRESHOLD) goTo('hero')
    },
    [flashPhase, goTo],
  )

  const shellStyle = useMemo(
    () => [
      styles.shell,
      { width: frameWidth, maxWidth: frameWidth },
      screen === 'stage' ? styles.shellStage : null,
    ],
    [frameWidth, screen],
  )

  return (
    <View style={[styles.page, isPhoneFrame && styles.pageDesktop]}>
      <StatusBar style={screen === 'hero' ? 'light' : 'dark'} />
      <View
        style={shellStyle}
        // @ts-expect-error web-only wheel
        onWheel={Platform.OS === 'web' ? onWheel : undefined}
      >
        {flashPhase !== 'idle' && (
          <View
            pointerEvents="none"
            style={[
              styles.flash,
              flashPhase === 'cover' ? styles.flashCover : styles.flashReveal,
            ]}
          />
        )}

        {screen === 'hero' ? (
          <View style={styles.hero}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View
              style={[
                styles.heroCopy,
                // Mirrors the source page: clamp(5.25rem, 15vh, 7.5rem),
                // while retaining enough clearance for native status bars.
                { paddingTop: Math.max(insets.top + 80, Math.min(120, height * 0.15)) },
              ]}
            >
              <Text style={styles.heroTitle}>Find Your Dream{'\n'}Home Easily</Text>
              <Text style={styles.heroLead}>
                Now you can find your dream house easily and quickly at a low price
              </Text>
            </View>

            <View style={styles.heroVisual} pointerEvents="none">
              <ExpoImage source={heroImage} style={styles.heroImage} contentFit="cover" />
              <View style={styles.heroVeil} />
            </View>

            <Pressable
              style={styles.heroScroll}
              onPress={() => goTo('stage')}
              accessibilityLabel="Go to next screen"
            >
              <View style={styles.heroScrollArrow} />
            </Pressable>
          </View>
        ) : (
          <ScrollView
            ref={stageScrollRef}
            style={styles.stage}
            contentContainerStyle={[styles.stageContent, stageEntered && styles.stageReady]}
            onScroll={(e) => {
              stageScrollY.current = e.nativeEvent.contentOffset.y
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.stageNav, { paddingTop: Math.max(insets.top, 16) }]}>
              <Pressable style={styles.stageNavCircle} accessibilityLabel="Меню">
                <Text style={styles.stageNavMenu}>☰</Text>
              </Pressable>
              <Link href="/" asChild>
                <Pressable style={styles.stageNavHome} accessibilityLabel="Главная">
                  <Text style={styles.stageNavHomeText}>Главная</Text>
                  <Text style={styles.stageNavHomeChevron}>⌄</Text>
                </Pressable>
              </Link>
              <View style={styles.stageNavActions}>
                <Link href="/auction" asChild>
                  <Pressable style={styles.stageNavIcon} accessibilityLabel="Открыть поиск">
                    <Text style={styles.stageNavIconText}>⌕</Text>
                  </Pressable>
                </Link>
                <Link href="/profile" asChild>
                  <Pressable style={styles.stageNavIcon} accessibilityLabel="Профиль">
                    <Text style={styles.stageNavIconText}>♙</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={styles.stageSheet}>
              <View style={styles.stageIntro}>
                <Text style={styles.stageTitle}>
                  Four <Text style={styles.stageTitleAccent}>Sales</Text> Strategies
                </Text>
                <Text style={styles.stageSubtitle}>Discover the best home for you</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cards}
                decelerationRate="fast"
                snapToInterval={stageCardWidth + 18}
                snapToAlignment="start"
              >
                {SALE_CARDS.map((card, index) => {
                  const isSaved = saved.has(card.id)
                  return (
                    <View
                      key={card.id}
                      style={[
                        styles.card,
                        { width: stageCardWidth, height: stageCardWidth * 1.41 },
                        stageEntered && { opacity: 1 },
                        { zIndex: 10 - index },
                      ]}
                    >
                      <View style={styles.cardFrame}>
                        <ExpoImage
                          source={cardImages[card.imageKey]}
                          style={styles.cardImage}
                          contentFit="cover"
                        />
                        <View style={styles.cardShade} />
                        <View style={styles.cardBody}>
                          <View style={styles.cardActions}>
                            <Link href={card.to as any} asChild>
                              <Pressable style={styles.cardCta}>
                                <Text style={styles.cardCtaText}>Подробнее</Text>
                              </Pressable>
                            </Link>
                            <Pressable
                              style={[styles.cardSave, isSaved && styles.cardSaveOn]}
                              onPress={() => toggleSaved(card.id)}
                              accessibilityLabel={isSaved ? 'Убрать из избранного' : 'Сохранить'}
                            >
                              <Text style={styles.cardSaveIcon}>{isSaved ? '★' : '☆'}</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>

              <View style={styles.welcomeCopy}>
                <Text style={styles.welcomeTitle}>Buying Property Is Easy!</Text>
                <Text style={styles.welcomeLead}>
                  Find your next space, feel at home.{'\n'}Where comfort meets convenience.
                </Text>
              </View>

              <View style={styles.quickLinks}>
                <Link href="/news" asChild>
                  <Pressable style={styles.quickLink}>
                    <Text style={styles.quickLinkText}>Новости</Text>
                  </Pressable>
                </Link>
                <Link href="/about" asChild>
                  <Pressable style={styles.quickLink}>
                    <Text style={styles.quickLinkText}>About</Text>
                  </Pressable>
                </Link>
                <Link href="/map" asChild>
                  <Pressable style={styles.quickLink}>
                    <Text style={styles.quickLinkText}>Карта</Text>
                  </Pressable>
                </Link>
                <Link href="/profile" asChild>
                  <Pressable style={styles.quickLink}>
                    <Text style={styles.quickLinkText}>Кабинет</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={styles.welcome}>
              <View style={styles.welcomeMedia}>
                <Image source={welcomeHouse} style={styles.welcomePhoto} resizeMode="cover" />
                <View style={styles.welcomeBrand}>
                  <Text style={styles.welcomeBrandText}>
                    Sell
                    <Text style={styles.welcomeBrandAccent}>Your</Text>
                    Brick
                  </Text>
                </View>
                <View style={styles.welcomeActions}>
                  <View style={styles.welcomeSearch}>
                    <TextInput
                      style={styles.welcomeSearchInput}
                      value={welcomeQuery}
                      onChangeText={setWelcomeQuery}
                      placeholder="Search city, villa, apartment…"
                      placeholderTextColor={colors.mdInkSoft}
                      returnKeyType="search"
                      onSubmitEditing={() => {
                        const q = welcomeQuery.trim()
                        router.push(q ? `/search-results?q=${encodeURIComponent(q)}` : '/auction')
                      }}
                    />
                    <Pressable
                      style={styles.welcomeSearchGo}
                      onPress={() => {
                        const q = welcomeQuery.trim()
                        router.push(q ? `/search-results?q=${encodeURIComponent(q)}` : '/auction')
                      }}
                    >
                      <Text style={styles.welcomeSearchGoText}>⌕</Text>
                    </Pressable>
                  </View>
                  <Link href="/auction" asChild>
                    <Pressable style={styles.welcomeCta}>
                      <Text style={styles.welcomeCtaText}>View all properties</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>

            <View style={{ height: 120 + insets.bottom }} />
          </ScrollView>
        )}

        {screen === 'stage' && (
          <View style={[styles.fab, { bottom: 20 + insets.bottom }, menuOpen && styles.fabOpen]}>
            {menuOpen && (
              <Pressable style={styles.fabAway} onPress={() => setMenuOpen(false)} />
            )}
            {menuOpen && (
              <View style={styles.fabRail}>
                {MENU_ITEMS.map((item) => (
                  <Link key={item.id} href={item.to as any} asChild>
                    <Pressable style={styles.fabItem} onPress={() => setMenuOpen(false)}>
                      <Text style={styles.fabItemLabel}>{item.label}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
            <Pressable
              style={styles.fabToggle}
              onPress={() => setMenuOpen((o) => !o)}
              accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Text style={styles.fabToggleText}>{menuOpen ? '✕' : '▦'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.mdWhite,
    alignItems: 'center',
  },
  pageDesktop: {
    backgroundColor: colors.mdDesktopCanvas,
  },
  shell: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colors.mdSky,
    position: 'relative',
  },
  shellStage: {
    backgroundColor: colors.mdWhite,
  },
  flash: {
    ...StyleSheet.absoluteFill,
    zIndex: 11000,
    backgroundColor: '#ffffff',
  },
  flashCover: {
    opacity: 1,
  },
  flashReveal: {
    opacity: 0,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.mdSky,
  },
  heroGlow: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  heroCopy: {
    position: 'relative',
    zIndex: 3,
    alignItems: 'center',
    paddingHorizontal: 26,
    flex: 1,
  },
  heroTitle: {
    color: colors.mdWhite,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -1.4,
    textAlign: 'center',
    fontWeight: '700',
  },
  heroLead: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 260,
    fontWeight: '500',
  },
  heroVisual: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '66%',
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '120%',
  },
  heroVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(78, 205, 214, 0.35)',
  },
  heroScroll: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 28,
    zIndex: 4,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mdWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(8, 70, 80, 0.2)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroScrollArrow: {
    width: 0,
    height: 0,
    marginTop: 2,
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111827',
  },
  stage: {
    flex: 1,
    backgroundColor: colors.mdWhite,
  },
  stageContent: {
    paddingBottom: 24,
    opacity: 0.96,
  },
  stageReady: {
    opacity: 1,
  },
  stageNav: {
    minHeight: 88,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mdWhite,
  },
  stageNavCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f5fa',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.14)',
  },
  stageNavMenu: { fontSize: 19, color: colors.mdInk, transform: [{ rotate: '180deg' }] },
  stageNavHome: {
    minWidth: 122,
    height: 46,
    paddingHorizontal: 15,
    borderRadius: 23,
    backgroundColor: '#f5f1fb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    boxShadow: '0 5px 14px rgba(119, 104, 164, 0.17)',
  },
  stageNavHomeText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: colors.mdInk, fontWeight: '700' },
  stageNavHomeChevron: { color: colors.mdInk, fontSize: 16, marginTop: -4 },
  stageNavActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stageNavIcon: { width: 31, height: 42, alignItems: 'center', justifyContent: 'center' },
  stageNavIconText: { color: colors.mdInk, fontSize: 27, lineHeight: 30 },
  stageSheet: {
    backgroundColor: colors.mdWhite,
  },
  stageIntro: {
    marginBottom: 0,
    paddingHorizontal: 24,
    paddingTop: 21,
    paddingBottom: 22,
  },
  stageTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 27,
    lineHeight: 31,
    color: colors.mdInk,
    letterSpacing: -0.9,
    fontWeight: '700',
  },
  stageTitleAccent: {
    color: colors.mdWhite,
    backgroundColor: colors.mdSky,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  stageSubtitle: {
    marginTop: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: colors.mdInkSoft,
  },
  cards: {
    gap: 18,
    paddingLeft: 21,
    paddingRight: 21,
    paddingTop: 14,
    paddingBottom: 38,
  },
  card: {
    borderRadius: rounded.card,
    overflow: 'hidden',
    backgroundColor: '#111827',
    boxShadow: '0 10px 18px -8px rgba(15, 23, 42, 0.18), 0 28px 44px -22px rgba(15, 23, 42, 0.32)',
  },
  cardFrame: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
  },
  cardShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 18, 32, 0.28)',
  },
  cardBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardCta: {
    backgroundColor: colors.mdWhite,
    borderRadius: rounded.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardCtaText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: colors.mdInk,
    fontWeight: '700',
  },
  cardSave: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSaveOn: {
    backgroundColor: colors.mdSky,
  },
  cardSaveIcon: {
    fontSize: 18,
    color: colors.mdInk,
  },
  welcomeCopy: {
    marginTop: 0,
    marginBottom: 18,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  welcomeTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: colors.mdInk,
    textAlign: 'center',
    fontWeight: '700',
  },
  welcomeLead: {
    marginTop: 10,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.mdInkSoft,
    textAlign: 'center',
  },
  quickLinks: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickLink: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.mdWhite,
  },
  quickLinkText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    fontWeight: '700',
    color: colors.mdInk,
  },
  welcome: {
    marginTop: 8,
  },
  welcomeMedia: {
    position: 'relative',
    minHeight: 320,
    backgroundColor: '#dbeafe',
  },
  welcomePhoto: {
    width: '100%',
    height: 320,
  },
  welcomeBrand: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  welcomeBrandText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 28,
    color: colors.mdWhite,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  welcomeBrandAccent: {
    color: colors.mdSky,
  },
  welcomeActions: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
    gap: 12,
  },
  welcomeSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mdWhite,
    borderRadius: rounded.full,
    paddingLeft: 16,
    paddingRight: 6,
    height: 52,
  },
  welcomeSearchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: colors.mdInk,
    paddingVertical: 8,
  },
  welcomeSearchGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mdSky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSearchGoText: {
    color: colors.mdWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  welcomeCta: {
    alignSelf: 'center',
    backgroundColor: colors.mdSky,
    borderRadius: rounded.full,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  welcomeCtaText: {
    color: colors.mdWhite,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
    alignItems: 'flex-end',
  },
  fabOpen: {},
  fabAway: {
    ...StyleSheet.absoluteFill,
    width: 4000,
    height: 4000,
    right: -2000,
    bottom: -2000,
  },
  fabRail: {
    marginBottom: 10,
    backgroundColor: colors.mdWhite,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  fabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fabItemLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: colors.mdInk,
    fontWeight: '700',
  },
  fabToggle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mdSky,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.mdSkyShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  fabToggleText: {
    color: colors.mdWhite,
    fontSize: 22,
    fontWeight: '700',
  },
})
