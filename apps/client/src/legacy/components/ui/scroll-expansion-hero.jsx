'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import { getMainScrollTop, scrollMainTo, getMainScrollEl } from '@/utils/mainScroll';

/** Порог раскрытия (0–1): раньше полного — уже iframe и кнопка Play. */
const YOUTUBE_PLAYER_UNLOCK_PROGRESS = 0.35;

function parseYoutubeStartValue(t) {
  if (t == null || t === '') return 0;
  const s = String(t).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const h = /(\d+)h/i.exec(s);
  const mPart = /(\d+)m/i.exec(s);
  const sPart = /(\d+)s?$/i.exec(s);
  if (h || mPart || sPart) {
    return (
      (h ? parseInt(h[1], 10) * 3600 : 0) +
      (mPart ? parseInt(mPart[1], 10) * 60 : 0) +
      (sPart ? parseInt(sPart[1], 10) : 0)
    );
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

/** @param {string} raw */
function buildYoutubeIframeSrc(raw) {
  try {
    const trimmed = raw.trim();
    const urlString = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(urlString);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtu.be') {
      return null;
    }

    let videoId = '';
    let startSec = 0;

    if (host === 'youtu.be') {
      videoId = u.pathname.replace(/^\//, '').split('/')[0];
      startSec = parseYoutubeStartValue(u.searchParams.get('t') || u.searchParams.get('start'));
    } else if (u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.split('/embed/')[1]?.split(/[/?#]/)[0] || '';
      startSec =
        parseYoutubeStartValue(u.searchParams.get('start')) ||
        parseYoutubeStartValue(u.searchParams.get('t'));
    } else {
      videoId = u.searchParams.get('v') || '';
      startSec = parseYoutubeStartValue(u.searchParams.get('t') || u.searchParams.get('start'));
    }

    if (!videoId) return null;

    const params = new URLSearchParams({
      autoplay: '0',
      controls: '1',
      showinfo: '0',
      rel: '0',
      disablekb: '0',
      modestbranding: '1',
    });
    if (startSec > 0) params.set('start', String(startSec));

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  } catch {
    return null;
  }
}

/**
 * Scroll-expansion hero: media (video or image) expands on scroll.
 * @param {Object} props
 * @param {'video'|'image'} [props.mediaType='video']
 * @param {string} props.mediaSrc
 * @param {string} [props.posterSrc]
 * @param {string} props.bgImageSrc
 * @param {string} [props.title]
 * @param {string} [props.date]
 * @param {string} [props.scrollToExpand]
 * @param {boolean} [props.textBlend]
 * @param {import('react').ReactNode} [props.children]
 */
const ScrollExpandMedia = ({
  mediaType = 'video',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false);
  const [youtubeEmbedMounted, setYoutubeEmbedMounted] = useState(false);
  const [youtubeEverUnlocked, setYoutubeEverUnlocked] = useState(false);
  const [isMobileState, setIsMobileState] = useState(false);

  const sectionRef = useRef(null);
  /** Синхронная копия: обработчики колеса/тача с mount-once не должны пересоздаваться на каждый px. */
  const mediaFullyExpandedRef = useRef(false);
  mediaFullyExpandedRef.current = mediaFullyExpanded;
  const touchStartYRef = useRef(null);

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
    setYoutubeEmbedMounted(false);
    setYoutubeEverUnlocked(false);
  }, [mediaType]);

  useEffect(() => {
    setYoutubeEmbedMounted(false);
    setYoutubeEverUnlocked(false);
  }, [mediaSrc]);

  useEffect(() => {
    if (
      scrollProgress >= YOUTUBE_PLAYER_UNLOCK_PROGRESS ||
      mediaFullyExpanded
    ) {
      setYoutubeEverUnlocked(true);
      setYoutubeEmbedMounted(true);
    }
  }, [scrollProgress, mediaFullyExpanded]);

  useEffect(() => {
    const handleWheel = (e) => {
      const expanded = mediaFullyExpandedRef.current;
      if (expanded && e.deltaY < 0 && getMainScrollTop() <= 5) {
        mediaFullyExpandedRef.current = false;
        setMediaFullyExpanded(false);
        e.preventDefault();
        return;
      }
      if (!expanded) {
        e.preventDefault();
        setScrollProgress((prev) => {
          const newProgress = Math.min(
            Math.max(prev + e.deltaY * 0.0009, 0),
            1
          );
          if (newProgress >= 1) {
            mediaFullyExpandedRef.current = true;
            setMediaFullyExpanded(true);
            setShowContent(true);
          } else if (newProgress < 0.75) {
            setShowContent(false);
          }
          return newProgress;
        });
      }
    };

    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const startY = touchStartYRef.current;
      if (startY === null) return;

      const touchY = e.touches[0].clientY;
      const deltaY = startY - touchY;
      const expanded = mediaFullyExpandedRef.current;

      if (expanded && deltaY < -20 && getMainScrollTop() <= 5) {
        mediaFullyExpandedRef.current = false;
        setMediaFullyExpanded(false);
        e.preventDefault();
        return;
      }
      if (!expanded) {
        e.preventDefault();
        const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
        const scrollDelta = deltaY * scrollFactor;
        setScrollProgress((prev) => {
          const newProgress = Math.min(
            Math.max(prev + scrollDelta, 0),
            1
          );
          if (newProgress >= 1) {
            mediaFullyExpandedRef.current = true;
            setMediaFullyExpanded(true);
            setShowContent(true);
          } else if (newProgress < 0.75) {
            setShowContent(false);
          }
          return newProgress;
        });
        touchStartYRef.current = touchY;
      }
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };

    const handleScroll = () => {
      if (!mediaFullyExpandedRef.current) {
        scrollMainTo(0, 0, 'auto');
      }
    };

    const mainScrollEl = getMainScrollEl();
    const wheelOpts = { passive: false, capture: true };
    window.addEventListener('wheel', handleWheel, wheelOpts);
    if (mainScrollEl) {
      mainScrollEl.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    const touchOpts = { passive: false, capture: true };
    window.addEventListener('touchstart', handleTouchStart, touchOpts);
    window.addEventListener('touchmove', handleTouchMove, touchOpts);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel, wheelOpts);
      if (mainScrollEl) {
        mainScrollEl.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('touchstart', handleTouchStart, touchOpts);
      window.removeEventListener('touchmove', handleTouchMove, touchOpts);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileState(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Горизонтальная карточка 16:9 с первого кадра; размер ограничен 95vw × 92vh.
  const wBase = isMobileState ? 380 : 560;
  const wExtra = isMobileState ? 520 : 980;
  let mediaWidth = wBase + scrollProgress * wExtra;
  let mediaHeight = Math.round((mediaWidth * 9) / 16);
  if (typeof window !== 'undefined') {
    const maxW = Math.round(window.innerWidth * 0.95);
    const maxH = Math.round(window.innerHeight * 0.92);
    mediaWidth = Math.min(mediaWidth, maxW);
    mediaHeight = Math.round((mediaWidth * 9) / 16);
    if (mediaHeight > maxH) {
      mediaHeight = maxH;
      mediaWidth = Math.round((mediaHeight * 16) / 9);
    }
  }

  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  const firstWord = title ? title.split(' ')[0] : '';
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : '';
  const youtubeIframeSrc =
    mediaType === 'video' && mediaSrc ? buildYoutubeIframeSrc(mediaSrc) : null;

  /** Постер снимается при первом достижении порога (не возвращаем при прокрутке назад). */
  const youtubePlayerUnlocked = youtubeEverUnlocked;
  const hideHeroYoutubeChrome = !youtubePlayerUnlocked;
  const youtubeIdFromEmbed =
    youtubeIframeSrc?.match(/\/embed\/([^/?]+)/)?.[1] ?? null;
  /** Превью кадра ролика: сначала maxres (если нет — onError ниже → hq → posterSrc). */
  const heroYoutubePosterSrc =
    youtubeIdFromEmbed != null
      ? `https://i.ytimg.com/vi/${youtubeIdFromEmbed}/maxresdefault.jpg`
      : posterSrc ?? null;
  const ytThumbHqUrl =
    youtubeIdFromEmbed != null
      ? `https://i.ytimg.com/vi/${youtubeIdFromEmbed}/hqdefault.jpg`
      : '';

  return (
    <div
      ref={sectionRef}
      className="transition-colors duration-700 ease-in-out overflow-x-hidden"
    >
      <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
        <div className="relative w-full flex flex-col items-center min-h-[100dvh]">
          <motion.div
            className="absolute inset-0 z-0 h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <img
              src={bgImageSrc}
              alt="Background"
              className="w-screen h-screen object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/10" />
          </motion.div>

          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">
              <div
                className="absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none rounded-2xl"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '95vw',
                  maxHeight: '92vh',
                  boxShadow: '0px 0px 50px rgba(0, 0, 0, 0.3)',
                }}
              >
                {mediaType === 'video' ? (
                  youtubeIframeSrc ? (
                    <div
                      className={`relative w-full h-full overflow-hidden rounded-xl ${
                        youtubePlayerUnlocked ? 'pointer-events-auto' : 'pointer-events-none'
                      }`}
                    >
                      {youtubeEmbedMounted ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={youtubeIframeSrc}
                          className={`absolute inset-0 h-full w-full rounded-xl transition-opacity duration-300 ${
                            hideHeroYoutubeChrome ? 'opacity-0' : 'opacity-100'
                          }`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Video"
                          aria-hidden={hideHeroYoutubeChrome}
                        />
                      ) : null}
                      {heroYoutubePosterSrc &&
                      (!youtubeEmbedMounted || hideHeroYoutubeChrome) ? (
                        <img
                          src={heroYoutubePosterSrc}
                          alt=""
                          className="absolute inset-0 z-[1] h-full w-full object-cover rounded-xl"
                          draggable={false}
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (youtubeIdFromEmbed && !el.dataset.ytThumbStep) {
                              el.dataset.ytThumbStep = 'hq';
                              el.src = ytThumbHqUrl;
                              return;
                            }
                            if (posterSrc && !el.dataset.ytPosterFallback) {
                              el.dataset.ytPosterFallback = '1';
                              el.src = posterSrc;
                            }
                          }}
                        />
                      ) : null}
                      <motion.div
                        className="absolute inset-0 z-[2] rounded-xl pointer-events-none"
                        initial={{ opacity: 0.42 }}
                        animate={{
                          opacity: hideHeroYoutubeChrome
                            ? 0.32
                            : Math.max(0.22, 0.52 - scrollProgress * 0.34),
                        }}
                        transition={{ duration: 0.2 }}
                        style={{
                          backgroundColor: hideHeroYoutubeChrome
                            ? 'rgba(0, 0, 0, 0.14)'
                            : 'rgba(0, 0, 0, 0.34)',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`relative w-full h-full ${
                        mediaFullyExpanded ? 'pointer-events-auto' : 'pointer-events-none'
                      }`}
                    >
                      <video
                        src={mediaSrc}
                        poster={posterSrc}
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover rounded-xl"
                        controls
                        disablePictureInPicture
                        disableRemotePlayback
                      />
                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-xl"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={mediaSrc}
                      alt={title || 'Media content'}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <motion.div
                      className="absolute inset-0 bg-black/50 rounded-xl"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0.7 - scrollProgress * 0.3 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                {(youtubeIframeSrc ? youtubePlayerUnlocked : true) ? (
                  <div className="flex flex-col items-center text-center relative z-10 mt-4 transition-none">
                    {date && (
                      <p
                        className="text-2xl text-blue-200"
                        style={{ transform: `translateX(-${textTranslateX}vw)` }}
                      >
                        {date}
                      </p>
                    )}
                    {scrollToExpand && (
                      <p
                        className="text-blue-200 font-medium text-center"
                        style={{ transform: `translateX(${textTranslateX}vw)` }}
                      >
                        {scrollToExpand}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <div
                className={`flex items-center justify-center text-center gap-4 w-full relative z-10 transition-none flex-col ${
                  textBlend ? 'mix-blend-difference' : 'mix-blend-normal'
                }`}
              >
                <motion.h2
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-200 transition-none"
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  {firstWord}
                </motion.h2>
                <motion.h2
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-blue-200 transition-none"
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  {restOfTitle}
                </motion.h2>
              </div>
            </div>

            <motion.section
              className="flex flex-col w-full px-8 py-10 md:px-16 lg:py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandMedia;
