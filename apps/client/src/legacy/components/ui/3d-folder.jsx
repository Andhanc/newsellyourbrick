import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMainScrollLeft, getMainScrollTop } from '@/utils/mainScroll';

const PLACEHOLDER_IMAGE = '/images/external/photo-1618005182384-a83a8bd57fbe-57eec0643a.jpg';

const ProjectCard = forwardRef(
  (
    {
      image,
      title,
      delay,
      isVisible,
      index,
      totalCount,
      onClick,
      isSelected,
      /** На главном слайдере папок (≤768): иначе 421–768px даёт размах −100px и «большой воздух» не убирается padding-top. */
      landingSliderSpread = false,
    },
    ref
  ) => {
    const middleIndex = (totalCount - 1) / 2;
    const factor = totalCount > 1 ? (index - middleIndex) / middleIndex : 0;
    const compact = typeof window !== 'undefined' ? window.innerWidth <= 420 : false;
    const tightSpread = compact || landingSliderSpread;
    const rotation = factor * 25;
    const translationX = factor * (tightSpread ? 55 : 85);
    const translationY = Math.abs(factor) * (tightSpread ? 9 : 12);
    const translateBaseY = tightSpread ? -80 : -100;
    const cardLeft = tightSpread ? '-28px' : '-40px';
    const cardTop = tightSpread ? '-44px' : '-56px';

    return (
      <div
        ref={ref}
        className={cn(
          'absolute cursor-pointer group/card',
          tightSpread ? 'w-14 h-20' : 'w-20 h-28',
          isSelected && 'opacity-0'
        )}
        style={{
          transform: isVisible
            ? `translateY(calc(${translateBaseY}px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
            : 'translateY(0px) translateX(0px) rotate(0deg) scale(0.4)',
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          zIndex: 10 + index,
          left: cardLeft,
          top: cardTop,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <div
          className={cn(
            'w-full h-full rounded-lg overflow-hidden shadow-xl bg-white border border-gray-200/50 relative',
            'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'group-hover/card:-translate-y-6 group-hover/card:shadow-2xl group-hover/card:shadow-teal-500/30 group-hover/card:ring-2 group-hover/card:ring-teal-500 group-hover/card:scale-125'
          )}
        >
          <img
            src={image || PLACEHOLDER_IMAGE}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = PLACEHOLDER_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <p className="absolute bottom-1.5 left-1.5 right-1.5 text-[7px] font-black uppercase tracking-tighter text-white truncate drop-shadow-md leading-none">
            {title}
          </p>
        </div>
      </div>
    );
  }
);
ProjectCard.displayName = 'ProjectCard';

function ImageLightbox({
  projects,
  currentIndex,
  isOpen,
  onClose,
  sourceRect,
  onCloseComplete,
  onNavigate,
  linkHref,
}) {
  const [animationPhase, setAnimationPhase] = useState('initial');
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [internalIndex, setInternalIndex] = useState(currentIndex);
  const [isSliding, setIsSliding] = useState(false);
  const containerRef = useRef(null);

  const totalProjects = projects.length;
  const hasNext = internalIndex < totalProjects - 1;
  const hasPrev = internalIndex > 0;
  const currentProject = projects[internalIndex];

  useEffect(() => {
    if (isOpen && currentIndex !== internalIndex && !isSliding) {
      setIsSliding(true);
      const timer = setTimeout(() => {
        setInternalIndex(currentIndex);
        setIsSliding(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isOpen, internalIndex, isSliding]);

  useEffect(() => {
    if (isOpen) {
      setInternalIndex(currentIndex);
      setIsSliding(false);
    }
  }, [isOpen, currentIndex]);

  const navigateNext = useCallback(() => {
    if (internalIndex >= totalProjects - 1 || isSliding) return;
    onNavigate(internalIndex + 1);
  }, [internalIndex, totalProjects, isSliding, onNavigate]);

  const navigatePrev = useCallback(() => {
    if (internalIndex <= 0 || isSliding) return;
    onNavigate(internalIndex - 1);
  }, [internalIndex, isSliding, onNavigate]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    onClose();
    setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      setAnimationPhase('initial');
      onCloseComplete?.();
    }, 500);
  }, [onClose, onCloseComplete]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') navigateNext();
      if (e.key === 'ArrowLeft') navigatePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    const main = typeof document !== 'undefined' ? document.querySelector('.app-layout') : null;
    if (isOpen) {
      if (main) main.style.overflow = 'hidden';
      else document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (main) main.style.overflow = '';
      else document.body.style.overflow = '';
    };
  }, [isOpen, handleClose, navigateNext, navigatePrev]);

  useLayoutEffect(() => {
    if (isOpen && sourceRect) {
      setShouldRender(true);
      setAnimationPhase('initial');
      setIsClosing(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationPhase('animating');
        });
      });
      const timer = setTimeout(() => {
        setAnimationPhase('complete');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sourceRect]);

  const handleDotClick = (idx) => {
    if (isSliding || idx === internalIndex) return;
    onNavigate(idx);
  };

  if (!shouldRender || !currentProject) return null;

  const getInitialStyles = () => {
    if (!sourceRect) return {};
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetWidth = Math.min(800, viewportWidth - 64);
    const targetHeight = Math.min(viewportHeight * 0.85, 600);
    const targetX = (viewportWidth - targetWidth) / 2;
    const targetY = (viewportHeight - targetHeight) / 2;
    const scaleX = sourceRect.width / targetWidth;
    const scaleY = sourceRect.height / targetHeight;
    const scale = Math.max(scaleX, scaleY);
    const translateX =
      sourceRect.left +
      sourceRect.width / 2 -
      (targetX + targetWidth / 2) +
      getMainScrollLeft();
    const translateY =
      sourceRect.top +
      sourceRect.height / 2 -
      (targetY + targetHeight / 2) +
      getMainScrollTop();
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      opacity: 0.5,
      borderRadius: '12px',
    };
  };

  const getFinalStyles = () => ({
    transform: 'translate(0, 0) scale(1)',
    opacity: 1,
    borderRadius: '24px',
  });

  const currentStyles =
    animationPhase === 'initial' && !isClosing ? getInitialStyles() : getFinalStyles();

  return (
    <div
      className={cn('fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8')}
      onClick={handleClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="absolute inset-0 bg-gray-900/90 backdrop-blur-2xl"
        style={{
          opacity: animationPhase === 'initial' && !isClosing ? 0 : 1,
          transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className={cn(
          'absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-gray-100 hover:bg-white/20 transition-all duration-300'
        )}
        style={{
          opacity: animationPhase === 'complete' && !isClosing ? 1 : 0,
          transform: animationPhase === 'complete' && !isClosing ? 'translateY(0)' : 'translateY(-30px)',
          transition:
            'opacity 400ms ease-out 400ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 400ms',
        }}
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigatePrev();
        }}
        disabled={!hasPrev || isSliding}
        className={cn(
          'absolute left-4 md:left-10 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-gray-100 hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none shadow-2xl'
        )}
        style={{
          opacity: animationPhase === 'complete' && !isClosing && hasPrev ? 1 : 0,
          transform:
            animationPhase === 'complete' && !isClosing ? 'translateX(0)' : 'translateX(-40px)',
          transition:
            'opacity 400ms ease-out 600ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 600ms',
        }}
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={3} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateNext();
        }}
        disabled={!hasNext || isSliding}
        className={cn(
          'absolute right-4 md:right-10 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-gray-100 hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none shadow-2xl'
        )}
        style={{
          opacity: animationPhase === 'complete' && !isClosing && hasNext ? 1 : 0,
          transform:
            animationPhase === 'complete' && !isClosing ? 'translateX(0)' : 'translateX(40px)',
          transition:
            'opacity 400ms ease-out 600ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 600ms',
        }}
      >
        <ChevronRight className="w-6 h-6" strokeWidth={3} />
      </button>
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...currentStyles,
          transform: isClosing ? 'translate(0, 0) scale(0.92)' : currentStyles.transform,
          transition:
            animationPhase === 'initial' && !isClosing
              ? 'none'
              : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms ease-out, border-radius 700ms ease',
          transformOrigin: 'center center',
        }}
      >
        <div className="relative overflow-hidden rounded-[inherit] bg-white border border-white/20 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="relative overflow-hidden aspect-[4/3] md:aspect-[16/10]">
            <div
              className="flex w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(-${internalIndex * 100}%)`,
                transition: isSliding
                  ? 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'none',
              }}
            >
              {projects.map((project) => (
                <div key={project.id} className="min-w-full h-full relative">
                  <img
                    src={project.image || PLACEHOLDER_IMAGE}
                    alt={project.title}
                    className="w-full h-full object-cover select-none"
                    onError={(e) => {
                      e.target.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
          <div
            className="px-8 py-7 bg-white border-t border-gray-100"
            style={{
              opacity: animationPhase === 'complete' && !isClosing ? 1 : 0,
              transform:
                animationPhase === 'complete' && !isClosing ? 'translateY(0)' : 'translateY(40px)',
              transition:
                'opacity 500ms ease-out 500ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 500ms',
            }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-1xl font-bold text-gray-900 tracking-tight truncate leading-snug">
                  {currentProject?.title}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full border border-gray-200">
                    {projects.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDotClick(idx)}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-all duration-500',
                          idx === internalIndex
                            ? 'bg-teal-600 scale-150'
                            : 'bg-gray-400/40 hover:bg-gray-400/60'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {internalIndex + 1} / {totalProjects}
                  </p>
                </div>
              </div>
              {linkHref ? (
                <a
                  href={linkHref}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white bg-teal-600 hover:brightness-110 rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span>Подробнее</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white bg-teal-600 hover:brightness-110 rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span>Закрыть</span>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedFolder({
  title,
  projects,
  className,
  gradient,
  linkLabel,
  linkHref,
  /** Мобильная сетка лендинга 1+2+2: белая карточка с обводкой, единый масштаб 3D */
  variant = 'default',
  /** Верхняя папка «Аукционы» — на всю ширину, чуть крупнее остальных */
  featured = false,
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [sourceRect, setSourceRect] = useState(null);
  const [hiddenCardId, setHiddenCardId] = useState(null);
  const cardRefs = useRef([]);

  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 1024
    return window.innerWidth
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const previewProjects = projects.slice(0, 5);

  const handleProjectClick = (project, index) => {
    const cardEl = cardRefs.current[index];
    if (cardEl) setSourceRect(cardEl.getBoundingClientRect());
    setSelectedIndex(index);
    setHiddenCardId(project.id);
  };

  const handleCloseLightbox = () => {
    setSelectedIndex(null);
    setSourceRect(null);
  };
  const handleCloseComplete = () => {
    setHiddenCardId(null);
  };
  const handleNavigate = (newIndex) => {
    setSelectedIndex(newIndex);
    setHiddenCardId(projects[newIndex]?.id || null);
  };

  const backBg =
    gradient ||
    'linear-gradient(135deg, #007580 0%, #00605a 100%)';
  const tabBg = gradient || '#00605a';
  const frontBg =
    gradient ||
    'linear-gradient(135deg, #33adbb 0%, #007580 100%)';

  const isMobile = viewportWidth <= 768
  const isXs = viewportWidth <= 360
  const isSm = viewportWidth > 360 && viewportWidth <= 420
  const landingSliderMobile = variant === 'landingSlider' && isMobile
  /** Единый размер карточек в мобильной сетке моделей */
  const lmScale = landingSliderMobile ? 1.12 : 1

  const round = (v) => Math.round(v)

  const minWidthBase = isMobile ? (isXs ? 104 : isSm ? 112 : 124) : 280
  const minHeightBase = isMobile ? (isXs ? 204 : isSm ? 214 : 224) : 240

  const minWidth = isMobile ? round(minWidthBase * lmScale) : minWidthBase
  let minHeight = isMobile ? round(minHeightBase * lmScale) : minHeightBase
  if (landingSliderMobile) {
    minHeight = round(minHeight * 0.78)
  }

  const centerWBase = isMobile ? (isXs ? 92 : isSm ? 98 : 112) : 172
  const centerHBase = isMobile ? (isXs ? 84 : isSm ? 90 : 100) : 136

  const centerW = isMobile ? round(centerWBase * lmScale) : centerWBase
  const centerH = isMobile ? round(centerHBase * lmScale) : centerHBase

  const backWBase = isMobile ? (isXs ? 56 : isSm ? 60 : 68) : 110
  const backHBase = isMobile ? (isXs ? 40 : isSm ? 42 : 48) : 82

  const backW = isMobile ? round(backWBase * lmScale) : backWBase
  const backH = isMobile ? round(backHBase * lmScale) : backHBase

  const frontYOffset = isMobile ? Math.max(2, Math.round(4 * (backH / 96))) : 4

  const tabH = Math.max(10, Math.round(backH / 6)) // 96/6=16 (как на десктопе)
  const tabW = Math.max(24, Math.round(backW * 0.375)) // 128*0.375=48 (как на десктопе)
  const tabOffsetX = backW * 0.125 // 128*0.125=16

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group justify-start',
          landingSliderMobile
            ? 'bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:shadow-teal-500/15 hover:border-teal-500/40'
            : 'p-8 bg-white border border-gray-200 hover:shadow-2xl hover:shadow-teal-500/20 hover:border-teal-500/40',
          !landingSliderMobile && 'p-8',
          className
        )}
        style={{
          ...(landingSliderMobile
            ? { minWidth: 0, width: '100%' }
            : { minWidth: `${minWidth}px` }),
          minHeight: `${minHeight}px`,
          padding: landingSliderMobile
            ? (isXs ? '8px 8px 10px' : '10px 10px 11px')
            : isMobile
              ? (isXs ? '12px' : '13px')
              : '18px 16px 12px',
          perspective: '1200px',
          transform: isHovered
            ? `scale(${isMobile ? (landingSliderMobile ? 1.03 : 1.02) : 1.04}) rotate(-1.5deg)`
            : 'scale(1) rotate(0deg)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {linkHref ? (
          <Link
            to={linkHref}
            className={cn(
              'absolute z-[50] inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors',
              landingSliderMobile ? 'top-2.5 right-2.5 p-1.5' : 'top-3 right-3 p-1.5',
            )}
            aria-label={linkLabel || t('folderNavigateAria')}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink
              className={landingSliderMobile ? 'w-[17px] h-[17px]' : 'w-5 h-5'}
              strokeWidth={2.25}
              aria-hidden
            />
          </Link>
        ) : null}
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-700"
          style={{
            background: gradient
              ? `radial-gradient(circle at 50% 70%, ${gradient.match(/#[a-fA-F0-9]{3,6}/)?.[0] || '#007580'} 0%, transparent 70%)`
              : 'radial-gradient(circle at 50% 70%, #007580 0%, transparent 70%)',
            opacity: isHovered ? 0.12 : 0,
          }}
        />
        <div
          className="w-full mb-1.5 flex items-center justify-center"
          style={{
            marginBottom: isMobile
              ? landingSliderMobile
                ? '2px'
                : '8px'
              : undefined,
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              height: `${centerH}px`,
              width: `${centerW}px`,
              flexShrink: 0,
            }}
          >
            <div
              className="absolute rounded-lg shadow-md border border-white/10"
              style={{
                background: backBg,
                filter: gradient ? 'brightness(0.9)' : 'none',
                width: `${backW}px`,
                height: `${backH}px`,
                transformOrigin: 'bottom center',
                transform: isHovered ? 'rotateX(-20deg) scaleY(1.05)' : 'rotateX(0deg) scaleY(1)',
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 10,
              }}
            />
            <div
              className="absolute rounded-t-md border-t border-x border-white/10"
              style={{
                background: tabBg,
                filter: gradient ? 'brightness(0.85)' : 'none',
                width: `${tabW}px`,
                height: `${tabH}px`,
                top: `calc(50% - ${backH / 2}px - ${tabH / 2}px)`,
                left: `calc(50% - ${backW / 2}px + ${tabOffsetX}px)`,
                transformOrigin: 'bottom center',
                transform: isHovered
                  ? 'rotateX(-30deg) translateY(-3px)'
                  : 'rotateX(0deg) translateY(0)',
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 10,
              }}
            />
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
            >
              {previewProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  image={project.image}
                  title={project.title}
                  delay={index * 50}
                  isVisible={isHovered}
                  index={index}
                  totalCount={previewProjects.length}
                  onClick={() => handleProjectClick(project, index)}
                  isSelected={hiddenCardId === project.id}
                  landingSliderSpread={landingSliderMobile}
                />
              ))}
            </div>
            <div
              className="absolute rounded-lg shadow-lg border border-white/20"
              style={{
                background: frontBg,
                width: `${backW}px`,
                height: `${backH}px`,
                top: `calc(50% - ${backH / 2}px + ${frontYOffset}px)`,
                transformOrigin: 'bottom center',
                transform: isHovered
                  ? 'rotateX(35deg) translateY(12px)'
                  : 'rotateX(0deg) translateY(0)',
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 30,
              }}
            />
            <div
              className="absolute rounded-lg overflow-hidden pointer-events-none"
              style={{
                width: `${backW}px`,
                height: `${backH}px`,
                top: `calc(50% - ${backH / 2}px + ${frontYOffset}px)`,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)',
                transformOrigin: 'bottom center',
                transform: isHovered
                  ? 'rotateX(35deg) translateY(12px)'
                  : 'rotateX(0deg) translateY(0)',
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 31,
              }}
            />
          </div>
        </div>
        <div className="w-full min-w-0 flex flex-col text-center mt-0">
          <div className="relative w-full">
            <h3
              className={cn(
                'font-bold text-gray-900 transition-all duration-500 break-words hyphens-auto',
                isMobile ? 'mt-1 text-[13px] leading-tight' : 'mt-0.5 text-[14px] leading-tight'
              )}
              style={{
                transform: isHovered ? 'translateY(2px)' : 'translateY(0)',
                letterSpacing: isHovered ? '-0.01em' : '0',
              }}
            >
              {title}
            </h3>
          </div>
          <p
            className={cn(
              'font-medium text-gray-500 transition-all duration-500',
              isMobile ? 'text-[11px] mt-0.5' : 'text-[12px] mt-0.5'
            )}
            style={{ opacity: isHovered ? 0.8 : 1 }}
          >
            {t('folderDirectionsCount', { count: projects.length })}
          </p>
          <div
            className={cn(
              'mt-1 flex justify-center items-center gap-1.5 font-semibold uppercase tracking-wide text-gray-400 transition-all duration-500 shrink-0',
              isMobile ? (landingSliderMobile ? 'text-[8px] mt-0.5' : 'text-[9px]') : 'text-[10px]'
            )}
            style={{
              opacity: isHovered ? 0 : 1,
              transform: isHovered ? 'translateY(10px)' : 'translateY(0)',
            }}
          >
            <span>{isMobile ? t('folderPreviewTap') : t('folderPreviewHover')}</span>
          </div>
        </div>
      </div>
      <ImageLightbox
        projects={projects}
        currentIndex={selectedIndex ?? 0}
        isOpen={selectedIndex !== null}
        onClose={handleCloseLightbox}
        sourceRect={sourceRect}
        onCloseComplete={handleCloseComplete}
        onNavigate={handleNavigate}
        linkHref={linkHref}
      />
    </>
  );
}

export { AnimatedFolder };
export default AnimatedFolder;
