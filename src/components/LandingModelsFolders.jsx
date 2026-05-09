import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import AnimatedFolder from './ui/3d-folder';
import './LandingModelsFolders.css';

/**
 * Инвестиционные модели (3D-папки): на десктопе — сетка, на телефоне — горизонтальный слайдер с точками.
 */
export default function LandingModelsFolders({ folders, ariaLabel }) {
  const viewportRef = useRef(null);
  const slideRefs = useRef([]);
  const scrollRafRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const label =
    ariaLabel || 'Investment models';

  const syncActiveFromScroll = useCallback(() => {
    const vp = viewportRef.current;
    const slides = slideRefs.current;
    if (!vp || slides.length === 0) return;

    const vpRect = vp.getBoundingClientRect();
    const centerX = vpRect.left + vpRect.width / 2;
    let best = 0;
    let bestDist = Infinity;

    slides.forEach((slide, i) => {
      if (!slide) return;
      const r = slide.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const d = Math.abs(mid - centerX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActiveIndex(best);
  }, []);

  const onScroll = useCallback(() => {
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncActiveFromScroll();
    });
  }, [syncActiveFromScroll]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    syncActiveFromScroll();
  }, [folders, syncActiveFromScroll]);

  useEffect(() => {
    const onResize = () => syncActiveFromScroll();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [syncActiveFromScroll]);

  const goTo = useCallback((i) => {
    const slide = slideRefs.current[i];
    if (!slide) return;
    slide.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, []);

  if (!folders?.length) return null;

  return (
    <div className="landing-models__folders-root">
      <div
        ref={viewportRef}
        className="landing-models__folders-viewport"
        onScroll={onScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
      >
        <div className="landing-models__folders-track">
          {folders.map((folder, i) => (
            <div
              key={folder.titleKey}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="landing-models__folders-slide"
            >
              <AnimatedFolder
                variant="landingSlider"
                title={folder.title}
                projects={folder.projects}
                gradient={folder.gradient}
                linkLabel={folder.linkLabel}
                linkHref={folder.linkHref}
                className="landing-models__folder"
              />
            </div>
          ))}
        </div>
      </div>

      {folders.length > 1 ? (
        <div className="landing-models__folders-dots">
          {folders.map((folder, i) => (
            <button
              key={`${folder.titleKey}-dot`}
              type="button"
              aria-label={`${i + 1} / ${folders.length}`}
              className={`landing-models__folders-dot${
                activeIndex === i ? ' landing-models__folders-dot--active' : ''
              }`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
