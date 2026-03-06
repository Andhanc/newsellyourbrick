'use client';

import { useScroll, useTransform, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import './Timeline.css';

/**
 * @param {{ data: Array<{ title: string; content: import('react').ReactNode }> }} props
 */
export const Timeline = ({ data }) => {
  const ref = useRef(null);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const dotRefs = useRef([]);
  const [height, setHeight] = useState(0);
  const [itemTops, setItemTops] = useState([]);
  const [checkedItems, setCheckedItems] = useState(() => data.map(() => false));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const updateHeight = () => {
      if (el) {
        const rect = el.getBoundingClientRect();
        setHeight(rect.height);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  useEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const track = ref.current;
      const dots = dotRefs.current;
      if (!track || !dots.length) return;
      const trackRect = track.getBoundingClientRect();
      const tops = dots
        .filter(Boolean)
        .map((dotEl) => {
          if (!dotEl) return 0;
          const r = dotEl.getBoundingClientRect();
          return r.top - trackRect.top + r.height / 2;
        });
      if (tops.length > 0) setItemTops(tops);
    };
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [data, height]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 10%', 'end 50%'],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, Math.max(height, 1)]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    if (itemTops.length < 2) return;
    const unsub = heightTransform.on('change', (lineHeight) => {
      setCheckedItems((prev) =>
        itemTops.map((top, i) => lineHeight >= top || prev[i])
      );
      const threshold = itemTops[1];
      setIsDarkTheme((prev) => (lineHeight >= threshold ? true : lineHeight < itemTops[0] + 60 ? false : prev));
    });
    return () => unsub();
  }, [heightTransform, itemTops]);

  return (
    <div className={`timeline-about ${isDarkTheme ? 'timeline-about--dark' : ''}`} ref={containerRef}>
      <div className="timeline-about__header">
        <h2 className="timeline-about__title">
          Как мы развивались
        </h2>
        <p className="timeline-about__subtitle">
          Sellyourbrick создавался как современная платформа для недвижимости. Краткая хронология ключевых этапов.
        </p>
      </div>

      <div ref={ref} className="timeline-about__track">
        {/* Фоновая линия */}
        <div
          className="timeline-about__line-wrap"
          style={{ height: height ? `${height}px` : '100%' }}
          aria-hidden
        >
          <div className="timeline-about__line-bg" />
          <motion.div
            className="timeline-about__line-fill"
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
          />
        </div>

        {data.map((item, index) => (
          <div
            key={index}
            className="timeline-about__item"
            ref={(el) => { itemRefs.current[index] = el; }}
          >
            <div className="timeline-about__label-wrap">
              <div
                className="timeline-about__dot-outer"
                ref={(el) => { dotRefs.current[index] = el; }}
              >
                {checkedItems[index] ? (
                  <motion.div
                    className="timeline-about__dot-check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <CheckIcon />
                  </motion.div>
                ) : (
                  <div className="timeline-about__dot-inner" />
                )}
              </div>
              <span className="timeline-about__year timeline-about__year_desktop">
                {item.title}
              </span>
            </div>
            <div className="timeline-about__content">
              <span className="timeline-about__year timeline-about__year_mobile">
                {item.title}
              </span>
              {item.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default Timeline;
