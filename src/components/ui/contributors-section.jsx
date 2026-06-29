import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

const GAP = 12;

// Повторяет аватары, пока не заполнит последнюю строку, чтобы сетка оставалась прямоугольной.
function padToGrid(items, columns) {
  if (items.length === 0) return items;
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  const fill = columns - remainder;
  return items.concat(
    Array.from({ length: fill }, (_, i) => items[i % items.length]),
  );
}

export default function ContributorsWall({
  title = 'Contributors',
  subtitle,
  contributors,
  totalCount,
  columns = 16,
  tilt = 18,
  perspective = 1100,
  speed = 24,
  height = 300,
  showHeader = true,
  pauseOnHover = true,
  showTooltip = true,
  fullWidth = false,
  wallBg,
  className,
}) {
  const wallRef = useRef(null);
  const blockRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [blockHeight, setBlockHeight] = useState(0);

  const tiles = useMemo(
    () => padToGrid(contributors, columns),
    [contributors, columns],
  );
  const count = totalCount ?? contributors.length;

  // Измеряем высоту одной копии сетки, чтобы прокрутка зацикливалась без шва.
  useLayoutEffect(() => {
    const block = blockRef.current;
    if (!block) return;
    const measure = () => setBlockHeight(block.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(block);
    return () => ro.disconnect();
  }, [tiles, columns]);

  // Непрерывная прокрутка вверх; при pauseOnHover пауза при наведении на плитку.
  const y = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if ((pauseOnHover && tooltip) || blockHeight === 0) return;
    const wrap = blockHeight + GAP;
    let next = y.get() - (speed * delta) / 1000;
    if (next <= -wrap) next += wrap;
    y.set(next);
  });

  const handleEnter = (e, username) => {
    if (!showTooltip) return;
    const wall = wallRef.current;
    if (!wall) return;
    const tile = e.currentTarget.getBoundingClientRect();
    const box = wall.getBoundingClientRect();
    setTooltip({
      username,
      left: tile.left - box.left + tile.width / 2,
      top: tile.top - box.top,
    });
  };

  const wallStyle = wallBg ? { '--wall-bg': wallBg } : undefined;

  const planeStyle = {
    transform: `rotateX(${tilt}deg)`,
    transformStyle: 'preserve-3d',
  };
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: GAP,
  };

  const renderGrid = (copy, ref) => (
    <div ref={ref} className="grid w-full" style={gridStyle}>
      {tiles.map((c, i) => {
        const Tile = c.profileUrl ? 'a' : 'div';
        return (
          <Tile
            key={`${copy}-${c.username}-${i}`}
            {...(c.profileUrl
              ? { href: c.profileUrl, target: '_blank', rel: 'noreferrer' }
              : {})}
            aria-label={c.username}
            onMouseEnter={(e) => handleEnter(e, c.username)}
            className="group relative block aspect-square outline-none"
          >
            {/* Кликабельная зона остаётся на месте, увеличивается только внутренний слой — курсор не выходит за плитку при наведении. */}
            <span className="absolute inset-0 overflow-hidden rounded-[3px] transition-transform duration-300 ease-out group-hover:z-20 group-hover:scale-[1.28] group-focus-visible:z-20 group-focus-visible:scale-[1.28]">
              <img
                src={c.avatarUrl}
                alt={c.username}
                loading="lazy"
                draggable={false}
                className="h-full w-full select-none object-cover grayscale brightness-95 transition duration-300 group-hover:grayscale-0 group-hover:brightness-100 group-focus-visible:grayscale-0 group-focus-visible:brightness-100"
              />
              <span className="pointer-events-none absolute inset-0 rounded-[3px] ring-1 ring-inset ring-black/[0.08] transition group-hover:ring-black/30" />
            </span>
          </Tile>
        );
      })}
    </div>
  );

  return (
    <div
      className={`w-full bg-[var(--wall-bg)] text-zinc-900 [--wall-bg:#fafafa] ${className ?? ''}`}
      style={wallStyle}
    >
      {showHeader && (
        <div className="mx-auto max-w-5xl px-6 pt-2 sm:px-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">
              {title}
            </h2>
            <span className="h-px flex-1 bg-black/10" />
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {subtitle ?? (
              <>
                Built by a community of{' '}
                <span className="font-semibold text-zinc-900/80">{count}+</span>{' '}
                contributors.
              </>
            )}
          </p>
        </div>
      )}

      <div
        ref={wallRef}
        className={`relative mx-auto overflow-hidden ${showHeader ? 'mt-8' : ''} ${fullWidth ? 'max-w-none' : 'max-w-6xl'}`}
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
          height,
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="h-full" style={planeStyle}>
          {/* Две одинаковые копии сетки друг над другом создают иллюзию бесконечной ленты. */}
          <motion.div className="flex w-full flex-col" style={{ y, gap: GAP }}>
            {renderGrid(0, blockRef)}
            {renderGrid(1)}
          </motion.div>
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(130% 95% at 50% 50%, transparent 30%, var(--wall-bg) 82%),
              linear-gradient(to bottom, var(--wall-bg) 0%, transparent 16%, transparent 84%, var(--wall-bg) 100%),
              linear-gradient(to right, var(--wall-bg) 0%, transparent 12%, transparent 88%, var(--wall-bg) 100%)
            `,
          }}
        />

        {showTooltip && tooltip && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-zinc-900 shadow-lg shadow-black/10"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            {tooltip.username}
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-black/10 bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}
