"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface CalendarProps {
  initialDate?: Date;
  onDateSelect?: (date: Date) => void;
  showSelectedDateInfo?: boolean;
  className?: string;
  maxWidth?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  initialDate = new Date(),
  onDateSelect,
  showSelectedDateInfo = true,
  className = "",
  maxWidth = "max-w-2xl",
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      days.push({
        date: d,
        isCurrentMonth: d.getMonth() === month,
        isToday: d.toDateString() === today.toDateString(),
        isSelected: selectedDate
          ? d.toDateString() === selectedDate.toDateString()
          : false,
      });
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <motion.div
      initial={{ scale: 0.9, y: 10, filter: "blur(10px)" }}
      animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-white rounded-2xl shadow-2xl p-8 w-full",
        maxWidth,
        className
      )}
    >
      <motion.div
        initial={{ y: -10, filter: "blur(5px)" }}
        animate={{ y: 0, filter: "blur(0px)" }}
        className="flex items-center justify-between mb-8"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>

        <motion.h1
          key={currentDate.getMonth()}
          initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="text-3xl font-bold text-gray-800"
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </motion.h1>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, filter: "blur(3px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            className="p-3 text-center font-semibold text-gray-600"
          >
            {day}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        <AnimatePresence mode="wait">
          {days.map((day, index) => (
            <motion.button
              type="button"
              key={`${day.date.toDateString()}-${index}`}
              initial={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
              transition={{ delay: index * 0.001 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day.date)}
              className={cn(
                "p-4 rounded-lg text-center transition-all duration-200",
                day.isCurrentMonth
                  ? "text-gray-800 hover:bg-blue-50"
                  : "text-gray-400 hover:bg-gray-50",
                day.isToday ? "bg-blue-500 !text-white hover:bg-blue-600" : "",
                day.isSelected && !day.isToday
                  ? "bg-blue-200 text-blue-800 hover:bg-blue-200"
                  : ""
              )}
            >
              {day.date.getDate()}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {showSelectedDateInfo && selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="mt-8 p-4 bg-gray-50 rounded-lg"
        >
          <p className="text-gray-600">
            Selected:{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Calendar;

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInclusive(a: Date, b: Date): number {
  const s = startOfDay(a).getTime();
  const e = startOfDay(b).getTime();
  return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

export interface TestDriveRangeCalendarProps {
  /** Все занятые дни (ваши и чужие) — блокируют выбор */
  bookedDates: string[];
  /** Подмножество: дни текущего пользователя — подсветка зелёная */
  myBookedDates?: string[];
  locale?: "ru" | "en";
  /** Вызывается, когда выбран допустимый диапазон 5–21 дня, или null при сбросе выбора */
  onRangeSelected?: (
    range: { start: string; end: string } | null
  ) => void;
  className?: string;
  maxWidth?: string;
  /** Предварительно выбранный диапазон, например со страницы каталога тест-драйва. */
  initialRange?: { start: string; end: string } | null;
}

function fromYmd(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const TestDriveRangeCalendar: React.FC<TestDriveRangeCalendarProps> = ({
  bookedDates,
  myBookedDates = [],
  locale = "ru",
  onRangeSelected,
  className = "",
  maxWidth = "max-w-2xl",
  initialRange = null,
}) => {
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const myBookedSet = useMemo(() => new Set(myBookedDates), [myBookedDates]);
  const initialStart = fromYmd(initialRange?.start);
  const initialEnd = fromYmd(initialRange?.end);
  const [currentDate, setCurrentDate] = useState(() => initialStart || new Date());
  const [anchor, setAnchor] = useState<Date | null>(() => initialStart);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => initialEnd);
  /** Диапазон подтверждён визуально; следующий клик по свободному дню начинает новый выбор */
  const [confirmedRange, setConfirmedRange] = useState<{
    startYmd: string;
    endYmd: string;
  } | null>(() =>
    initialStart && initialEnd
      ? { startYmd: toYmd(initialStart), endYmd: toYmd(initialEnd) }
      : null
  );
  const [error, setError] = useState<string | null>(null);

  const monthNames =
    locale === "ru"
      ? [
          "Январь",
          "Февраль",
          "Март",
          "Апрель",
          "Май",
          "Июнь",
          "Июль",
          "Август",
          "Сентябрь",
          "Октябрь",
          "Ноябрь",
          "Декабрь",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

  const weekShort =
    locale === "ru"
      ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const out: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] =
      [];
    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      out.push({
        date: d,
        isCurrentMonth: d.getMonth() === month,
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    return out;
  };

  const days = getDaysInMonth(currentDate);

  const isInPreviewRange = (d: Date): boolean => {
    if (!anchor || !rangeEnd) return false;
    const a = startOfDay(anchor).getTime();
    const b = startOfDay(rangeEnd).getTime();
    const t = startOfDay(d).getTime();
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return t >= lo && t <= hi;
  };

  const handleDayClick = (d: Date) => {
    setError(null);
    const ymd = toYmd(d);
    const today = startOfDay(new Date());
    if (startOfDay(d) < today) {
      setError(
        locale === "ru"
          ? "Нельзя выбрать прошедшую дату"
          : "Cannot select a past date"
      );
      return;
    }
    if (bookedSet.has(ymd)) {
      setError(
        locale === "ru"
          ? "Эта дата уже занята"
          : "This date is already booked"
      );
      return;
    }

    if (confirmedRange) {
      setConfirmedRange(null);
      onRangeSelected?.(null);
      setAnchor(d);
      setRangeEnd(d);
      return;
    }

    if (!anchor) {
      setAnchor(d);
      setRangeEnd(d);
      return;
    }

    setRangeEnd(d);
    const n = daysInclusive(anchor, d);
    if (n < 5 || n > 21) {
      setError(
        locale === "ru"
          ? "Выберите подряд от 5 до 21 дня (первая и последняя дата)"
          : "Pick 5 to 21 consecutive days (first and last day)"
      );
      setAnchor(d);
      setRangeEnd(d);
      return;
    }

    const lo = startOfDay(anchor).getTime() <= startOfDay(d).getTime() ? anchor : d;
    const hi = startOfDay(anchor).getTime() > startOfDay(d).getTime() ? anchor : d;
    let blocked = false;
    const cur = new Date(startOfDay(lo));
    const end = startOfDay(hi);
    while (cur <= end) {
      if (bookedSet.has(toYmd(cur))) {
        blocked = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (blocked) {
      setError(
        locale === "ru"
          ? "В диапазон попадает занятая дата"
          : "Range overlaps a booked date"
      );
      setAnchor(d);
      setRangeEnd(d);
      return;
    }

    const startY = toYmd(lo);
    const endY = toYmd(hi);
    setAnchor(lo);
    setRangeEnd(hi);
    setConfirmedRange({ startYmd: startY, endYmd: endY });
    onRangeSelected?.({ start: startY, end: endY });
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  return (
    <motion.div
      initial={{ scale: 0.96, y: 8, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "rounded-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-indigo-50/40 p-7 md:p-10 w-full",
        maxWidth,
        className
      )}
    >
      <div className="flex items-center justify-between mb-10 md:mb-12">
        <button
          type="button"
          onClick={prevMonth}
          className="p-3 rounded-2xl bg-white/80 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all"
          aria-label={locale === "ru" ? "Предыдущий месяц" : "Previous month"}
        >
          <ChevronLeft className="w-7 h-7 text-slate-700" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight px-2 text-center">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="p-3 rounded-2xl bg-white/80 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all"
          aria-label={locale === "ru" ? "Следующий месяц" : "Next month"}
        >
          <ChevronRight className="w-7 h-7 text-slate-700" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-4 md:mb-5">
        {weekShort.map((day) => (
          <div
            key={day}
            className="p-2.5 text-center text-sm font-semibold text-slate-500 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {days.map((day, index) => {
          const ymd = toYmd(day.date);
          const isBooked = bookedSet.has(ymd);
          const isMyBooked = isBooked && myBookedSet.has(ymd);
          const past = startOfDay(day.date) < startOfDay(new Date());
          const disabled = past || isBooked;
          const inRange = anchor && rangeEnd && isInPreviewRange(day.date);
          return (
            <motion.button
              type="button"
              key={`${ymd}-${index}`}
              whileHover={!disabled ? { scale: 1.04 } : undefined}
              whileTap={!disabled ? { scale: 0.97 } : undefined}
              disabled={disabled}
              onClick={() => handleDayClick(day.date)}
              className={cn(
                "p-3 md:p-4 rounded-2xl text-center text-base md:text-lg font-semibold transition-all duration-150 min-h-[52px] md:min-h-[58px] flex items-center justify-center",
                !day.isCurrentMonth && "text-slate-300",
                day.isCurrentMonth && !disabled && "text-slate-800",
                disabled && "opacity-40 cursor-not-allowed line-through",
                isBooked &&
                  isMyBooked &&
                  "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
                isBooked &&
                  !isMyBooked &&
                  "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
                day.isToday && !disabled && "ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent",
                inRange && !disabled && !isBooked && "bg-sky-100 text-sky-950",
                anchor &&
                  rangeEnd &&
                  toYmd(day.date) === toYmd(anchor) &&
                  "bg-[#0099A9] text-white ring-0 shadow-md shadow-teal-500/25"
              )}
            >
              {day.date.getDate()}
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p className="mt-5 text-sm text-red-600 text-center font-medium">{error}</p>
      )}
    </motion.div>
  );
};
