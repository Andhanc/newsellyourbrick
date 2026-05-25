import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiShare2 } from 'react-icons/fi'
import Header from '@/components/Header'
import NewsArticleMeta from '@/components/news/NewsArticleMeta'
import NewsArticleBody from '@/components/news/NewsArticleBody'
import { fetchArticleBySlug } from '@/services/newsApi'
import { scrollMainTo } from '@/utils/mainScroll'
import './News.css'
import './NewsArticlePage.css'

export default function NewsArticlePage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('')

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

  useEffect(() => {
    const sections = article?.sections || []
    if (!sections.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [article])

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

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  if (loading) {
    return (
      <div className="news-page">
        <Header />
        <main className="news-article-page__main">
          <p className="news-article-page__status">Загрузка…</p>
        </main>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="news-page">
        <Header />
        <main className="news-article-page__main">
          <p className="news-article-page__status">{error || 'Статья не найдена'}</p>
          <Link to="/news" className="news-article-page__back">
            ← Все новости
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="news-page">
      <Header />
      <main className="news-article-page__main">
        <div className="news-article-page__layout">
          <aside className="news-article-page__toc" aria-label="Содержание">
            <h2 className="news-article-page__toc-title">Содержание</h2>
            <nav>
              <ul className="news-article-page__toc-list">
                {(article.sections || []).map((section) => (
                  <li
                    key={section.id}
                    className={
                      section.level === 3 ? 'news-article-page__toc-item--nested' : ''
                    }
                  >
                    <button
                      type="button"
                      className={`news-article-page__toc-link${
                        activeSection === section.id ? ' news-article-page__toc-link--active' : ''
                      }`}
                      onClick={() => scrollToSection(section.id)}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="news-article-page__content">
            <div className="news-article-page__top-row">
              <span className="news-article-page__badge">{article.badge}</span>
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
              comments={article.comments}
              likes={article.likes}
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
