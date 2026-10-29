import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BookOpen, Clock, Coins, Gavel, MapPin, Sparkles } from 'lucide-react'
import './AboutScrollStory.css'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/** Скролл-история для «О нас»: эффект из промта (clip-path + pin), контент про SellYourBrick. */
export default function AboutScrollStory() {
  const { t } = useTranslation()
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onResize = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)

    const ctx = gsap.context(() => {
      const heroReveal = gsap.utils.toArray(el.querySelectorAll('.syb-hero-reveal'))

      heroReveal.forEach((section) => {
        const heroBox = section.querySelector('.syb-hero-reveal__header')
        const heroHeadings = section.querySelectorAll('.syb-hero-reveal_split_item')
        const contentEl = section.querySelector('.syb-hero-reveal__content')

        if (!heroBox || !contentEl) return

        const heroBoxHeight = heroBox.offsetHeight
        const contentHeight = contentEl.offsetHeight
        const scrollLen = heroBoxHeight > contentHeight ? heroBoxHeight : contentHeight

        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: `+=${scrollLen}`,
              scrub: true,
            },
          })
          .fromTo(contentEl, { y: '50%' }, { y: '0%', ease: 'none' }, 0.2)

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: `+=${scrollLen}`,
            scrub: true,
            pin: true,
          },
        })

        tl.fromTo(
          heroBox,
          {
            clipPath:
              'polygon(0 0, 100% 0, 100% 50%, 0 50%, 0 50%, 100% 50%, 100% 100%, 0 100%)',
          },
          {
            clipPath:
              'polygon(0 0, 100% 0, 100% 0%, 0 0%, 0 100%, 100% 100%, 100% 100%, 0 100%)',
            duration: 0.4,
            ease: 'power4.inOut',
          },
        )

        if (heroHeadings.length < 2) return

        tl.fromTo(
          heroHeadings[0],
          { y: '0%' },
          { y: '-30%', ease: 'power3.inOut' },
          0,
        )
        tl.fromTo(
          heroHeadings[1],
          { y: '0%' },
          { y: '30%', ease: 'power3.inOut' },
          0,
        )
      })

      const contentEl = el.querySelector('.syb-hero-reveal__content')
      const contentHeight = contentEl?.getBoundingClientRect().height || 0
      const triggerSection = el.querySelector('.syb-hero-reveal')
      if (!triggerSection || !contentHeight) return

      const parallaxScrollBySpeed = (selector, speed = 1) => {
        const node = el.querySelector(selector)
        if (!node) return
        gsap.to(node, {
          yPercent: (speed - 1) * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerSection,
            start: 'top top',
            end: `+=${contentHeight * 3}`,
            scrub: true,
          },
        })
      }

      parallaxScrollBySpeed('.syb-hero-reveal__parallax-building', 14)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-clock', 12)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-book', 17)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-kattle', 22)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-card', 6)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-map', 11)
      parallaxScrollBySpeed('.syb-hero-reveal__parallax-gavel', 18)
    }, el)

    return () => {
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className="syb-scroll-story" id="about-journey">
      <section className="syb-scroll-story__intro" aria-labelledby="syb-story-title">
        <div className="syb-scroll-story__intro-bg" aria-hidden />
        <div className="syb-scroll-story__intro-vignette" aria-hidden />
        <div className="syb-scroll-story__intro-inner syb-scroll-story__glass-panel">
          <p className="syb-scroll-story__badge">
            <Sparkles size={14} strokeWidth={2.25} aria-hidden />
            {t('aboutScrollStory_badge')}
          </p>
          <h1 id="syb-story-title" className="syb-scroll-story__heading">
            SellYourBrick
          </h1>
          <p className="syb-scroll-story__sub">
            {t('aboutScrollStory_subBefore')}{' '}
            <span className="syb-scroll-story__sub-strong">{t('aboutScrollStory_subStrong')}</span>{' '}
            {t('aboutScrollStory_subAfter')}
          </p>
        </div>
      </section>

      <section className="syb-scroll-story__content">
        <article className="syb-scroll-story__article syb-scroll-story__chapter-card">
          <p className="syb-scroll-story__eyebrow">{t('aboutScrollStory_chapter1Eyebrow')}</p>
          <h2>{t('aboutScrollStory_chapter1Title')}</h2>
          <p>
            <strong>SellYourBrick</strong>
            {t('aboutScrollStory_chapter1P1').replace(/^SellYourBrick/, '')}
          </p>
          <p>{t('aboutScrollStory_chapter1P2')}</p>
          <p>{t('aboutScrollStory_chapter1P3')}</p>
        </article>
      </section>

      <section className="syb-hero-reveal">
        <article>
          <header className="syb-hero-reveal__header">
            <div className="syb-hero-reveal__header-bg" aria-hidden />
            <div className="syb-hero-reveal_split">
              <div className="syb-hero-reveal_split_item">
                <p className="c-wide-text -split">{t('aboutScrollStory_revealWord')}</p>
              </div>
              <div className="syb-hero-reveal_split_item" aria-hidden="true">
                <p className="c-wide-text -split" aria-hidden="true">
                  {t('aboutScrollStory_revealWord')}
                </p>
              </div>
            </div>
          </header>

          <div className="syb-hero-reveal__content">
            <div className="syb-hero-reveal__content-inner">
              <div className="syb-hero-reveal__parallax" aria-hidden>
                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-building">
                  <img
                    className="syb-hero-reveal__parallax-building-img"
                    src="/images/external/7481373-0fcb3cf8eb.png"
                    alt=""
                    width={280}
                    height={280}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-clock">
                  <Clock aria-hidden strokeWidth={1.35} />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-book">
                  <BookOpen aria-hidden strokeWidth={1.35} />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-kattle">
                  <Coins aria-hidden strokeWidth={1.35} />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-card">
                  <img
                    src="/images/external/pdf-file-icon-70a6aa0f65.svg"
                    alt=""
                    width={200}
                    height={260}
                    className="syb-parallax-card-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-map">
                  <MapPin aria-hidden strokeWidth={1.35} />
                </div>

                <div className="syb-parallax-svg syb-parallax-float syb-hero-reveal__parallax-gavel">
                  <Gavel aria-hidden strokeWidth={1.15} />
                </div>
              </div>

              <div className="syb-hero-reveal__prose-shell">
                <div className="syb-hero-reveal__content-p">
                  <p>{t('aboutScrollStory_revealP1')}</p>
                  <p>
                    {(() => {
                      const full = t('aboutScrollStory_revealP2')
                      const marker = 'SellYourBrick'
                      const idx = full.indexOf(marker)
                      if (idx < 0) return full
                      return (
                        <>
                          {full.slice(0, idx)}
                          <strong>{marker}</strong>
                          {full.slice(idx + marker.length)}
                        </>
                      )
                    })()}
                  </p>
                  <p>{t('aboutScrollStory_revealP3')}</p>
                  <p>{t('aboutScrollStory_revealP4')}</p>
                  <p>{t('aboutScrollStory_revealP5')}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="syb-scroll-story__after">
        <article className="syb-scroll-story__article syb-scroll-story__chapter-card">
          <p className="syb-scroll-story__eyebrow">{t('aboutScrollStory_afterEyebrow')}</p>
          <h2>{t('aboutScrollStory_afterTitle')}</h2>
          <p>{t('aboutScrollStory_afterP1')}</p>
          <p>{t('aboutScrollStory_afterP2')}</p>
        </article>
      </section>
    </div>
  )
}
