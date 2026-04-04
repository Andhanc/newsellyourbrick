"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import "./auction-reminder-wheel-picker.css";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PERSPECTIVE_ORIGIN = ITEM_HEIGHT * 2;
const STEP_MS = 30 * 60 * 1000;

export type AuctionReminderCompareMode = "before_start" | "before_end_inclusive";

export interface AuctionReminderWheelPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: Date;
  onChange: (date: Date) => void;
  rangeMinMs: number;
  rangeMaxMs: number;
  compareMode: AuctionReminderCompareMode;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  locale?: string;
}

const sizeConfig = {
  sm: {
    itemHeight: ITEM_HEIGHT * 0.8,
    fontSize: "text-sm",
    gap: "gap-2",
  },
  md: {
    itemHeight: ITEM_HEIGHT,
    fontSize: "text-base",
    gap: "gap-4",
  },
  lg: {
    itemHeight: ITEM_HEIGHT * 1.2,
    fontSize: "text-lg",
    gap: "gap-6",
  },
};

interface WheelItemProps {
  item: string | number;
  index: number;
  y: MotionValue<number>;
  itemHeight: number;
  visibleItems: number;
  centerOffset: number;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function WheelItem({
  item,
  index,
  y,
  itemHeight,
  visibleItems,
  centerOffset,
  isSelected,
  disabled,
  onClick,
}: WheelItemProps) {
  const itemY = useTransform(y, (latest) => index * itemHeight + latest + centerOffset);

  const rotateX = useTransform(
    itemY,
    [0, centerOffset, itemHeight * visibleItems],
    [45, 0, -45],
  );

  const scale = useTransform(
    itemY,
    [0, centerOffset, itemHeight * visibleItems],
    [0.8, 1, 0.8],
  );

  const opacity = useTransform(
    itemY,
    [0, centerOffset * 0.5, centerOffset, centerOffset * 1.5, itemHeight * visibleItems],
    [0.3, 0.6, 1, 0.6, 0.3],
  );

  return (
    <motion.div
      className="flex items-center justify-center select-none"
      style={{
        height: itemHeight,
        rotateX,
        scale,
        opacity,
        transformStyle: "preserve-3d",
        transformOrigin: `center center -${PERSPECTIVE_ORIGIN}px`,
      }}
      onClick={() => !disabled && onClick()}
    >
      <span
        className={cn(
          "font-medium transition-colors",
          isSelected ? "arm-wheel-text--selected" : "arm-wheel-text",
        )}
      >
        {item}
      </span>
    </motion.div>
  );
}

interface WheelColumnProps {
  items: (string | number)[];
  value: number;
  onChange: (index: number) => void;
  itemHeight: number;
  visibleItems: number;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
}

function WheelColumn({
  items,
  value,
  onChange,
  itemHeight,
  visibleItems,
  disabled,
  className,
  ariaLabel,
}: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const y = useMotionValue(-value * itemHeight);
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  const itemsLengthRef = React.useRef(items.length);

  React.useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    itemsLengthRef.current = items.length;
  });

  React.useEffect(() => {
    animate(y, -value * itemHeight, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  }, [value, itemHeight, y]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const currentY = y.get();
    const velocity = info.velocity.y;
    const projectedY = currentY + velocity * 0.2;

    let newIndex = Math.round(-projectedY / itemHeight);
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));

    onChange(newIndex);
  };

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY > 0 ? 1 : -1;
      const currentValue = valueRef.current;
      const maxIndex = itemsLengthRef.current - 1;
      const newIndex = Math.max(0, Math.min(maxIndex, currentValue + direction));

      if (newIndex !== currentValue) {
        onChangeRef.current(newIndex);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const maxIndex = items.length - 1;
    let newIndex = value;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        newIndex = Math.max(0, value - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = Math.min(maxIndex, value + 1);
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = maxIndex;
        break;
      case "PageUp":
        e.preventDefault();
        newIndex = Math.max(0, value - 5);
        break;
      case "PageDown":
        e.preventDefault();
        newIndex = Math.min(maxIndex, value + 5);
        break;
      default:
        return;
    }

    if (newIndex !== value) {
      onChange(newIndex);
    }
  };

  const dragConstraints = React.useMemo(
    () => ({
      top: -(items.length - 1) * itemHeight,
      bottom: 0,
    }),
    [items.length, itemHeight],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      style={{ height: itemHeight * visibleItems }}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, items.length - 1)}
      aria-valuetext={String(items[value] ?? "")}
      aria-disabled={disabled}
    >
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none arm-wheel-gradient-top"
        style={{
          height: centerOffset,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none arm-wheel-gradient-bottom"
        style={{
          height: centerOffset,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 z-[5] pointer-events-none arm-wheel-row-highlight"
        style={{
          top: centerOffset,
          height: itemHeight,
        }}
        aria-hidden="true"
      />
      <motion.div
        className="cursor-grab active:cursor-grabbing"
        style={{
          y,
          paddingTop: centerOffset,
          paddingBottom: centerOffset,
        }}
        drag="y"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {items.map((item, index) => (
          <WheelItem
            key={`${String(item)}-${index}`}
            item={item}
            index={index}
            y={y}
            itemHeight={itemHeight}
            visibleItems={visibleItems}
            centerOffset={centerOffset}
            isSelected={index === value}
            disabled={disabled}
            onClick={() => onChange(index)}
          />
        ))}
      </motion.div>
    </div>
  );
}

function buildMonthSlots(
  minD: Date,
  maxD: Date,
  locale: string,
): { y: number; m: number; label: string }[] {
  const slots: { y: number; m: number; label: string }[] = [];
  const cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const end = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    slots.push({ y, m, label: fmt.format(new Date(y, m, 1)) });
    cur.setMonth(cur.getMonth() + 1);
  }
  return slots;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function dayIntersectsRange(
  y: number,
  m: number,
  d: number,
  rangeMinMs: number,
  rangeMaxMs: number,
): boolean {
  const sod = new Date(y, m, d, 0, 0, 0, 0).getTime();
  const eod = new Date(y, m, d, 23, 59, 59, 999).getTime();
  return sod <= rangeMaxMs && eod >= rangeMinMs;
}

function buildTimeLabels(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

const ALL_TIME_LABELS = buildTimeLabels();

function timeMsForSlot(y: number, m: number, d: number, slotIndex: number) {
  const minutes = slotIndex * 30;
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return new Date(y, m, d, hh, mm, 0, 0).getTime();
}

function isValidDateTime(
  ms: number,
  rangeMinMs: number,
  rangeMaxMs: number,
  compareMode: AuctionReminderCompareMode,
): boolean {
  if (ms < rangeMinMs) return false;
  if (compareMode === "before_start") return ms < rangeMaxMs;
  return ms <= rangeMaxMs;
}

function firstValidDateTime(
  rangeMinMs: number,
  rangeMaxMs: number,
  compareMode: AuctionReminderCompareMode,
): Date {
  let t = Math.ceil(rangeMinMs / STEP_MS) * STEP_MS;
  const limit = rangeMaxMs + STEP_MS * 500;
  while (t <= limit) {
    if (isValidDateTime(t, rangeMinMs, rangeMaxMs, compareMode)) {
      return new Date(t);
    }
    t += STEP_MS;
  }
  return new Date(rangeMinMs);
}

function closestValidIndices(
  targetMs: number,
  monthSlots: { y: number; m: number; label: string }[],
  rangeMinMs: number,
  rangeMaxMs: number,
  compareMode: AuctionReminderCompareMode,
): { mi: number; di: number; ti: number } {
  let best = { mi: 0, di: 0, ti: 0 };
  let bestDelta = Infinity;
  monthSlots.forEach((s, mi) => {
    const validDays: number[] = [];
    const dim = daysInMonth(s.y, s.m);
    for (let d = 1; d <= dim; d++) {
      if (dayIntersectsRange(s.y, s.m, d, rangeMinMs, rangeMaxMs)) validDays.push(d);
    }
    validDays.forEach((d, di) => {
      const validSlotIdx: number[] = [];
      for (let i = 0; i < ALL_TIME_LABELS.length; i++) {
        const ms = timeMsForSlot(s.y, s.m, d, i);
        if (isValidDateTime(ms, rangeMinMs, rangeMaxMs, compareMode)) validSlotIdx.push(i);
      }
      validSlotIdx.forEach((slotIdx, ti) => {
        const ms = timeMsForSlot(s.y, s.m, d, slotIdx);
        const delta = Math.abs(ms - targetMs);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = { mi, di, ti };
        }
      });
    });
  });
  return best;
}

export const AuctionReminderWheelPicker = React.forwardRef<
  HTMLDivElement,
  AuctionReminderWheelPickerProps
>(
  (
    {
      value,
      onChange,
      rangeMinMs,
      rangeMaxMs,
      compareMode,
      size = "md",
      disabled = false,
      locale,
      className,
      ...props
    },
    ref,
  ) => {
    const config = sizeConfig[size];
    const loc = locale || (typeof navigator !== "undefined" ? navigator.language : "ru-RU");

    const monthSlots = React.useMemo(
      () => buildMonthSlots(new Date(rangeMinMs), new Date(rangeMaxMs), loc),
      [rangeMinMs, rangeMaxMs, loc],
    );

    const [monthIndex, setMonthIndex] = React.useState(0);
    const [dayIndex, setDayIndex] = React.useState(0);
    const [timeIndex, setTimeIndex] = React.useState(0);

    const slot = monthSlots[monthIndex] ?? monthSlots[0];

    const days = React.useMemo(() => {
      if (!slot) return [1];
      const dim = daysInMonth(slot.y, slot.m);
      const list: number[] = [];
      for (let d = 1; d <= dim; d++) {
        if (dayIntersectsRange(slot.y, slot.m, d, rangeMinMs, rangeMaxMs)) list.push(d);
      }
      return list.length ? list : [1];
    }, [slot, rangeMinMs, rangeMaxMs]);

    const timeSlotIndices = React.useMemo(() => {
      if (!slot) return [0];
      const d = days[dayIndex] ?? days[0];
      const idx: number[] = [];
      for (let i = 0; i < ALL_TIME_LABELS.length; i++) {
        const ms = timeMsForSlot(slot.y, slot.m, d, i);
        if (isValidDateTime(ms, rangeMinMs, rangeMaxMs, compareMode)) idx.push(i);
      }
      return idx.length ? idx : [0];
    }, [slot, days, dayIndex, rangeMinMs, rangeMaxMs, compareMode]);

    const timeLabels = React.useMemo(
      () => timeSlotIndices.map((i) => ALL_TIME_LABELS[i]),
      [timeSlotIndices],
    );

    const applyIndices = React.useCallback(
      (mi: number, di: number, ti: number) => {
        const s = monthSlots[mi];
        if (!s) return;
        const dayList: number[] = [];
        const dim = daysInMonth(s.y, s.m);
        for (let d = 1; d <= dim; d++) {
          if (dayIntersectsRange(s.y, s.m, d, rangeMinMs, rangeMaxMs)) dayList.push(d);
        }
        const d = dayList[Math.min(di, dayList.length - 1)] ?? 1;
        const times: number[] = [];
        for (let i = 0; i < ALL_TIME_LABELS.length; i++) {
          const ms = timeMsForSlot(s.y, s.m, d, i);
          if (isValidDateTime(ms, rangeMinMs, rangeMaxMs, compareMode)) times.push(i);
        }
        const slotIdx = times[Math.min(ti, times.length - 1)] ?? times[0] ?? 0;
        const ms = timeMsForSlot(s.y, s.m, d, slotIdx);
        if (isValidDateTime(ms, rangeMinMs, rangeMaxMs, compareMode)) {
          onChange(new Date(ms));
        }
      },
      [monthSlots, rangeMinMs, rangeMaxMs, compareMode, onChange],
    );

    const lastSyncedTs = React.useRef<number | null>(null);
    React.useEffect(() => {
      lastSyncedTs.current = null;
    }, [rangeMinMs, rangeMaxMs, compareMode]);

    React.useEffect(() => {
      if (!monthSlots.length) return;
      const v = value.getTime();
      const target = isValidDateTime(v, rangeMinMs, rangeMaxMs, compareMode)
        ? v
        : firstValidDateTime(rangeMinMs, rangeMaxMs, compareMode).getTime();
      if (lastSyncedTs.current === target) return;
      lastSyncedTs.current = target;
      const { mi, di, ti } = closestValidIndices(target, monthSlots, rangeMinMs, rangeMaxMs, compareMode);
      setMonthIndex(mi);
      setDayIndex(di);
      setTimeIndex(ti);
    }, [rangeMinMs, rangeMaxMs, compareMode, monthSlots, value]);

    React.useEffect(() => {
      if (!slot) return;
      const d = days[dayIndex];
      if (d === undefined) {
        setDayIndex(0);
      }
    }, [slot, days, dayIndex]);

    React.useEffect(() => {
      if (timeIndex >= timeLabels.length) {
        setTimeIndex(0);
      }
    }, [timeIndex, timeLabels.length]);

    if (!monthSlots.length) {
      return (
        <div ref={ref} className={cn("arm-wheel-empty", className)} {...props}>
          Нет доступных дат в допустимом диапазоне
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          config.gap,
          config.fontSize,
          disabled && "opacity-50 pointer-events-none",
          className,
        )}
        style={{ perspective: "1000px" }}
        role="group"
        aria-label="Дата и время напоминания"
        {...props}
      >
        <WheelColumn
          items={days}
          value={Math.min(dayIndex, Math.max(0, days.length - 1))}
          onChange={(i) => {
            setDayIndex(i);
            setTimeIndex(0);
            applyIndices(monthIndex, i, 0);
          }}
          itemHeight={config.itemHeight}
          visibleItems={VISIBLE_ITEMS}
          disabled={disabled}
          className="w-14"
          ariaLabel="День"
        />
        <WheelColumn
          items={monthSlots.map((m) => m.label)}
          value={Math.min(monthIndex, monthSlots.length - 1)}
          onChange={(i) => {
            setMonthIndex(i);
            setDayIndex(0);
            setTimeIndex(0);
            applyIndices(i, 0, 0);
          }}
          itemHeight={config.itemHeight}
          visibleItems={VISIBLE_ITEMS}
          disabled={disabled}
          className="w-36 min-w-[9rem]"
          ariaLabel="Месяц"
        />
        <WheelColumn
          items={timeLabels}
          value={Math.min(timeIndex, Math.max(0, timeLabels.length - 1))}
          onChange={(i) => {
            setTimeIndex(i);
            applyIndices(monthIndex, Math.min(dayIndex, days.length - 1), i);
          }}
          itemHeight={config.itemHeight}
          visibleItems={VISIBLE_ITEMS}
          disabled={disabled}
          className="w-20"
          ariaLabel="Время"
        />
      </div>
    );
  },
);

AuctionReminderWheelPicker.displayName = "AuctionReminderWheelPicker";
