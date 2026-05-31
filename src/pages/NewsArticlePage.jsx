import { useCallback, useEffect, useRef, useState } from 'react'
import { useNewsArticleTocFixed } from '@/hooks/useNewsArticleTocFixed'
import {
  getNewsArticleScrollOffsetPx,
  useNewsArticleMobileFixedHead,
} from '@/hooks/useNewsArticleMobileFixedHead'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiShare2 } from 'react-icons/fi'
import Header from '@/components/Header'
import PageBackButton from '@/components/PageBackButton'
import NewsArticleMeta from '@/components/news/NewsArticleMeta'
import NewsArticleBody from '@/components/news/NewsArticleBody'
import { fetchArticleBySlug } from '@/services/newsApi'
import {
  getMainScrollEl,
  pickActiveIdByMainScroll,
  scrollMainElementIntoView,
  scrollMainTo,
} from '@/utils/mainScroll'
import './News.css'
import './NewsArticlePage.css'

export default function NewsArticlePage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const layoutRef = useRef(null)
  const stickyHeadRef = useRef(null)
  const headSpacerRef = useRef(null)
  const toolbarRef = useRef(null)
  const tocPanelRef = useRef(null)
  const tocNavRef = useRef(null)
  const scrollSpyRafRef = useRef(0)

  useNewsArticleTocFixed(
    layoutRef,
    stickyHeadRef,
    tocPanelRef,
    Boolean(article?.sections?.length),
  )

  useNewsArticleMobileFixedHead(stickyHeadRef, headSpacerRef)

  useEffect(() => {
    scrollMainTo(0, 0)
    let cancelled = false
    setLoading(true)
    setError('')
    fetchArticleBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setArticle(data)
          const first = data.sections?.[0]?.id
          if (first) setActiveSection(first)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Статья не найдена')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const sectionIds = article?.sections?.map((s) => s.id).filter(Boolean) ?? []

  useEffect(() => {
    if (!sectionIds.length) return undefined

    const updateActive = () => {
      const next = pickActiveIdByMainScroll(sectionIds, {
        offset: getNewsArticleScrollOffsetPx(stickyHeadRef.current),
      })
      setActiveSection((prev) => (prev === next ? prev : next))
    }

    const schedule = () => {
      if (scrollSpyRafRef.current) return
      scrollSpyRafRef.current = window.requestAnimationFrame(() => {
        scrollSpyRafRef.current = 0
        updateActive()
      })
    }

    const scrollRoot = getMainScrollEl()
    scrollRoot?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    const t = window.setTimeout(updateActive, 80)

    return () => {
      scrollRoot?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.clearTimeout(t)
      if (scrollSpyRafRef.current) {
        window.cancelAnimationFrame(scrollSpyRafRef.current)
        scrollSpyRafRef.current = 0
      }
    }
  }, [sectionIds.join('|')])

  useEffect(() => {
    if (!activeSection || !tocNavRef.current) return
    const link = tocNavRef.current.querySelector(
      `[data-toc-section="${activeSection}"]`,
    )
    link?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSection])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: article?.title, url })
        return
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(url)
      window.alert('Ссылка скопирована')
    } catch {
      window.prompt('Скопируйте ссылку', url)
    }
  }, [article?.title])

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id)
    if (el) {
      scrollMainElementIntoView(el, {
        offset: getNewsArticleScrollOffsetPx(stickyHeadRef.current),
        behavior: 'smooth',
      })
      setActiveSection(id)
    }
  }, [])

  const goToNewsList = useCallback(() => {
    navigate('/news')
  }, [navigate])

  if (loading) {
    return (
      <div className="news-page news-page--article">
        <Header />
        <main className="news-article-page__main">
          <div ref={stickyHeadRef} className="news-article-page__sticky-head">
            <div ref={toolbarRef} className="news-article-page__toolbar">
              <PageBackButton
                className="news-article-page__back-btn"
                onClick={goToNewsList}
              />
            </div>
          </div>
          <div ref={headSpacerRef} className="news-article-page__head-spacer" aria-hidden />
          <p className="news-article-page__status">Загрузка…</p>
        </main>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="news-page news-page--article">
        <Header />
        <main className="news-article-page__main">
          <div ref={stickyHeadRef} className="news-article-page__sticky-head">
            <div ref={toolbarRef} className="news-article-page__toolbar">
              <PageBackButton
                className="news-article-page__back-btn"
                onClick={goToNewsList}
              />
            </div>
          </div>
          <div ref={headSpacerRef} className="news-article-page__head-spacer" aria-hidden />
          <p className="news-article-page__status">{error || 'Статья не найдена'}</p>
        </main>
      </div>
    )
  }

  const hasToc = (article.sections || []).length > 0

  return (
    <div className="news-page news-page--article">
      <Header />
      <main className="news-article-page__main">
        <div ref={layoutRef} className="news-article-page__layout">
          <div ref={stickyHeadRef} className="news-article-page__sticky-head">
            <div ref={toolbarRef} className="news-article-page__toolbar">
              <PageBackButton
                className="news-article-page__back-btn"
                onClick={goToNewsList}
              />
            </div>

            {hasToc ? (
              <aside className="news-article-page__toc" aria-label="Содержание">
                <div ref={tocPanelRef} className="news-article-page__toc-panel">
                  <h2 className="news-article-page__toc-title">Содержание</h2>
                  <nav ref={tocNavRef} className="news-article-page__toc-nav">
                    <ul className="news-article-page__toc-list">
                      {(article.sections || []).map((section) => (
                        <li
                          key={section.id}
                          className={
                            section.level === 3
                              ? 'news-article-page__toc-item--nested'
                              : ''
                          }
                        >
                          <button
                            type="button"
                            data-toc-section={section.id}
                            className={`news-article-page__toc-link${
                              activeSection === section.id
                                ? ' news-article-page__toc-link--active'
                                : ''
                            }`}
                            aria-current={
                              activeSection === section.id ? 'location' : undefined
                            }
                            onClick={() => scrollToSection(section.id)}
                          >
                            {section.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>
            ) : null}
          </div>

          <div ref={headSpacerRef} className="news-article-page__head-spacer" aria-hidden />

          <article className="news-article-page__content">
            <div className="news-article-page__top-row">
              <button
                type="button"
                className="news-article-page__share"
                onClick={handleShare}
                aria-label="Поделиться"
              >
                <FiShare2 size={20} />
              </button>
            </div>

            <h1 className="news-article-page__title">{article.title}</h1>
            <p className="news-article-page__lead">{article.lead}</p>

            <NewsArticleMeta
              date={article.date}
              views={article.views}
              className="news-article-page__meta"
            />

            <div className="news-article-page__hero-image-wrap">
              <img src={article.image} alt="" className="news-article-page__hero-image" />
            </div>

            <NewsArticleBody body={article.body} />

            <p className="news-article-page__back-wrap">
              <Link to="/news" className="news-article-page__back">
                ← Все новости
              </Link>
            </p>
          </article>
        </div>
      </main>
    </div>
  )
}
