"use client";

import { useState, useCallback } from "react";

export const SLOTS = [
  "9:00","9:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30",
];

export const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export const DAY_NAMES_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

/** Current time in VET (UTC-4) */
function vetNow(): Date {
  const n = new Date();
  return new Date(n.getTime() + n.getTimezoneOffset() * 60_000 - 4 * 3_600_000);
}

export interface CalendarDay {
  day: number;
  date: Date;
  disabled: boolean; // past or weekend
  isToday: boolean;
}

export interface UseVETCalendarReturn {
  year: number;
  month: number;
  blanks: number;
  days: CalendarDay[];
  selectedDate: Date | null;
  selectedSlot: string | null;
  scheduleLabel: string;
  pickDate: (date: Date) => void;
  pickSlot: (slot: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  confirm: () => void;
  cancel: () => void;
}

export function useVETCalendar(): UseVETCalendarReturn {
  const vet = vetNow();
  const [year, setYear] = useState(vet.getFullYear());
  const [month, setMonth] = useState(vet.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const today = new Date(vet.getFullYear(), vet.getMonth(), vet.getDate());
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    const dow = date.getDay();
    return {
      day,
      date,
      disabled: date < today || dow === 0 || dow === 6,
      isToday: date.toDateString() === today.toDateString(),
    };
  });

  const scheduleLabel = (() => {
    if (selectedDate && selectedSlot) {
      const ds = selectedDate.toLocaleDateString("es", {
        weekday: "long", day: "numeric", month: "long",
      });
      return `${ds} · ${selectedSlot} VET`;
    }
    if (selectedDate) {
      return `${selectedDate.toLocaleDateString("es", { day: "numeric", month: "long" })} — elige hora`;
    }
    return "";
  })();

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const pickDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const pickSlot = useCallback((slot: string) => {
    setSelectedSlot(slot);
  }, []);

  const confirm = useCallback(() => {
    // label is derived — no state needed; caller closes the calendar
  }, []);

  const cancel = useCallback(() => {
    setSelectedDate(null);
    setSelectedSlot(null);
  }, []);

  return {
    year, month,
    blanks: firstDow,
    days,
    selectedDate, selectedSlot,
    scheduleLabel,
    pickDate, pickSlot,
    prevMonth, nextMonth,
    confirm, cancel,
  };
}
