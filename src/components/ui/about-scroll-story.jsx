import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BookOpen, Clock, Coins, Gavel, MapPin, Sparkles } from 'lucide-react'
import './AboutScrollStory.css'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/** Скролл-история для «О нас»: эффект из промта (clip-path + pin), контент про SellYourBrick. */
export default function AboutScrollStory() {
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
            Платформа недвижимости
          </p>
          <h1 id="syb-story-title" className="syb-scroll-story__heading">
            SellYourBrick
          </h1>
          <p className="syb-scroll-story__sub">
            Погрузитесь в экосистему, где{' '}
            <span className="syb-scroll-story__sub-strong">поиск, карта, аукционы</span> и забота о
            сделке живут в одном потоке — без лишних шагов и «кроличьих нор» из бесконечных таблиц и
            переписок.
          </p>
        </div>
      </section>

      <section className="syb-scroll-story__content">
        <article className="syb-scroll-story__article syb-scroll-story__chapter-card">
          <p className="syb-scroll-story__eyebrow">Путеводитель • глава 1</p>
          <h2>Точка входа</h2>
          <p>
            <strong>SellYourBrick</strong> — это место, где продавцы и покупатели встречаются на
            понятных правилах: прозрачные лоты на аукционе, быстрый «купить сейчас», карта объектов и
            подбор по тем параметрам, которые действительно важны — не только цена и площадь, но и
            контекст района, логистика просмотров и сопровождение.
          </p>
          <p>
            Мы строим сервис так, чтобы вы не теряли время на бесконечные уточнения: избранное и
            сравнение, напоминания, чат с менеджером и подсказки на каждом шаге — всё рядом, в одном
            интерфейсе. Для инвесторов и дольщиков это ровно тот «центр управления», где данные о
            долях, бонусах и подписках не размазаны по десяти сервисам.
          </p>
          <p>
            Безопасность и доверие для нас не лозунг, а инфраструктура: верификации, аккуратная
            работа с персональными данными, поддержка и ясные сценарии — от первого клика до финала
            сделки. Дальше скролл превращается в спектакль: мы буквально «раскрываем сцену» и
            переносим вас внутрь истории платформы.
          </p>
        </article>
      </section>

      <section className="syb-hero-reveal">
        <article>
          <header className="syb-hero-reveal__header">
            <div className="syb-hero-reveal__header-bg" aria-hidden />
            <div className="syb-hero-reveal_split">
              <div className="syb-hero-reveal_split_item">
                <p className="c-wide-text -split">ПРОЗРАЧНОСТЬ</p>
              </div>
              <div className="syb-hero-reveal_split_item" aria-hidden="true">
                <p className="c-wide-text -split" aria-hidden="true">
                  ПРОЗРАЧНОСТЬ
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
                    src="https://cdn-icons-png.flaticon.com/512/7481/7481373.png"
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
                    src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
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
                  <p>
                  Когда экран темнеет и сетка на фоне выглядит как ночной город, мы оказываемся в том
                  самом потоке, где недвижимость перестаёт быть абстрактной строчкой в таблице. Вы
                  буквально «падаете» через слои продукта: от карты районов и фильтров — к конкретным
                  лотам, ставкам, истории активности и сигналам о том, когда пора действовать.
                  </p>
                  <p>
                  На <strong>SellYourBrick</strong> аукцион — не хаос чисел, а ритм: видны шаги,
                  тайминг, правила, прозрачная динамика цены. «Купить сейчас» остаётся для тех, кто
                  ценит скорость и готов зафиксировать условия без ожидания финала торгов. Избранное,
                  напоминания и сравнение объектов превращают хаос рынка в управляемую траекторию —
                  как дорожная развязка, где каждый съезд понятно подписан.
                  </p>
                  <p>
                  Документы, чек-листы, переписки с менеджером и уведомления не разбегаются по
                  мессенджерам и почте без связи между собой. Мы хотим, чтобы вы чувствовали опору: всё,
                  что относится к сделке, можно собрать в одном контуре — от первого интереса до
                  спокойного «готово», без ощущения свободного падения в бюрократии.
                  </p>
                  <p>
                  Для владельцев долей и инвесторов платформа открывает отдельный горизонт: аналитика,
                  бонусы, подписки — не как галочки в презентации, а как рабочие инструменты. И да,
                  технологии у нас вплетены в сервис ненавязчиво: TON-поддержка там, где это уместно,
                  понятная оплата и вывод, понятная коммуникация с поддержкой.
                  </p>
                  <p>
                  В какой‑то момент скорость становится почти музыкальной: карта машет контекстом,
                  ставки напоминают про шанс дотянуться до цели, а чат поддерживает, когда нужен живой
                  человеческий ответ. Мы хотим, чтобы вы вынырнули уверенно — как закончился свободный
                  полёт и под ногами снова твёрдая земля: ясные условия, ясный следующий шаг, ясная
                  цель.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="syb-scroll-story__after">
        <article className="syb-scroll-story__article syb-scroll-story__chapter-card">
          <p className="syb-scroll-story__eyebrow">Навигация • финал блока</p>
          <h2>Продолжение пути</h2>
          <p>
            Впереди — команда и дорожная карта: мы каждый день улучшаем поиск, стабильность и опыт на
            мобильных устройствах, добавляем сценарии для продавцов и покупателей и укрепляем связку
            «данные ↔ интерфейс ↔ люди». Если вам откликается такой способ делать недвижимость
            понятнее — вы уже здесь.
          </p>
          <p>
            Спуститесь ниже по странице: познакомьтесь с таймлайном, командой и шагами, с которых
            удобнее всего начать — от карты объектов до подписки и инвестиционного калькулятора.
          </p>
        </article>
      </section>
    </div>
  )
}
