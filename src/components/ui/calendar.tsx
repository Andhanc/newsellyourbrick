"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "./TestDriveRangeCalendar.css";

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

  const legend =
    locale === "ru"
      ? {
          free: "Свободно",
          picked: "Выбрано",
          mine: "Ваша бронь",
          taken: "Занято",
        }
      : {
          free: "Available",
          picked: "Selected",
          mine: "Your booking",
          taken: "Booked",
        };

  const selectedDays =
    confirmedRange && anchor && rangeEnd
      ? daysInclusive(anchor, rangeEnd)
      : anchor && rangeEnd
        ? daysInclusive(anchor, rangeEnd)
        : null;

  return (
    <motion.div
      initial={{ scale: 0.98, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("td-range-cal", maxWidth, className)}
    >
      <div className="td-range-cal__header">
        <div className="td-range-cal__heading">
          <button
            type="button"
            className="td-range-cal__nav"
            onClick={prevMonth}
            aria-label={locale === "ru" ? "Предыдущий месяц" : "Previous month"}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <AnimatePresence mode="wait">
            <motion.h2
              key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
              className="td-range-cal__month"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {monthNames[currentDate.getMonth()]}
            </motion.h2>
          </AnimatePresence>
          <button
            type="button"
            className="td-range-cal__nav"
            onClick={nextMonth}
            aria-label={locale === "ru" ? "Следующий месяц" : "Next month"}
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="td-range-cal__meta">
          <span className="td-range-cal__meta-days">
            {selectedDays != null
              ? `${selectedDays} ${locale === "ru" ? "дн." : "days"}`
              : locale === "ru"
                ? "5–21 дн."
                : "5–21 days"}
          </span>
          <span className="td-range-cal__meta-label">
            {locale === "ru" ? "Диапазон" : "Range"}
          </span>
        </div>
      </div>

      <div className="td-range-cal__weekdays" aria-hidden>
        {weekShort.map((day) => (
          <div key={day} className="td-range-cal__weekday">
            {day}
          </div>
        ))}
      </div>

      <div
        className="td-range-cal__grid"
        role="grid"
        aria-label={monthNames[currentDate.getMonth()]}
      >
        {days.map((day, index) => {
          const ymd = toYmd(day.date);
          const isBooked = bookedSet.has(ymd);
          const isMyBooked = isBooked && myBookedSet.has(ymd);
          const past = startOfDay(day.date) < startOfDay(new Date());
          const disabled = past || isBooked;
          const inRange = Boolean(anchor && rangeEnd && isInPreviewRange(day.date));
          const isStart = Boolean(anchor && ymd === toYmd(anchor));
          const isEnd = Boolean(rangeEnd && ymd === toYmd(rangeEnd));
          const isEndpoint = isStart || isEnd;
          const isPicked = Boolean(
            confirmedRange && inRange && !isBooked
          );
          const stateClass = [
            "td-range-cal__cell",
            !day.isCurrentMonth ? "is-outside" : "",
            past && !isBooked ? "is-past" : "",
            day.isToday && !disabled ? "is-today" : "",
            inRange && !isBooked && !isPicked ? "is-in-range" : "",
            (isEndpoint || isPicked) && !isBooked ? "is-endpoint" : "",
            isMyBooked ? "is-my-booked" : "",
            isBooked && !isMyBooked ? "is-other-booked" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              type="button"
              key={`${ymd}-${index}`}
              className={stateClass}
              disabled={disabled}
              onClick={() => handleDayClick(day.date)}
              aria-label={day.date.toLocaleDateString(
                locale === "ru" ? "ru-RU" : "en-US",
                { day: "numeric", month: "long", year: "numeric" }
              )}
              aria-pressed={Boolean(isEndpoint || isPicked || (inRange && !disabled))}
            >
              <span className="td-range-cal__day">{day.date.getDate()}</span>
              <svg
                className="td-range-cal__check"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3.5 8.2 6.4 11l6.1-6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>

      <div
        className="td-range-cal__legend"
        aria-label={locale === "ru" ? "Обозначения" : "Legend"}
      >
        <span>
          <i className="is-free" aria-hidden />
          {legend.free}
        </span>
        <span>
          <i className="is-picked" aria-hidden />
          {legend.picked}
        </span>
        <span>
          <i className="is-mine" aria-hidden />
          {legend.mine}
        </span>
        <span>
          <i className="is-taken" aria-hidden />
          {legend.taken}
        </span>
      </div>

      {error ? <p className="td-range-cal__error">{error}</p> : null}
    </motion.div>
  );
};
