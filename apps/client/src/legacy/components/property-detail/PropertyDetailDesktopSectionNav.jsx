import { useCallback, useEffect, useState } from 'react'
import './PropertyDetailDesktopSectionNav.css'

/**
 * Sticky-навигация по секциям страницы объекта (desktop).
 * @param {{ sections: Array<{ id: string, label: string }>, scrollRoot?: string }} props
 */
export default function PropertyDetailDesktopSectionNav({
  sections = [],
  scrollRoot = '.app-layout',
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    if (!sections.length) return undefined

    const root = document.querySelector(scrollRoot)
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean)

    if (!targets.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        root: root || null,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.15, 0.4, 0.65],
      },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections, scrollRoot])

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id)
    if (!el) return
    setActiveId(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (sections.length < 2) return null

  return (
    <nav
      className="pd-desktop-section-nav"
      aria-label="Sections"
    >
      <div className="pd-desktop-section-nav__inner" role="tablist">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeId === section.id}
            className={`pd-desktop-section-nav__tab${
              activeId === section.id ? ' pd-desktop-section-nav__tab--active' : ''
            }`}
            onClick={() => scrollTo(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
