/**
 * Universal Date Formatting Utilities for Charts
 * 
 * Standardized date formatting for graphs following Minter.io conventions:
 * - Short periods (≤30 days): "12 Jan"
 * - Medium periods (≤365 days): "12 Jan" 
 * - Long periods (>365 days): "Jan 2026"
 */

import { format, parseISO, startOfWeek, isValid } from 'date-fns';
import { enUS } from 'date-fns/locale';

export type DateGrouping = 'day' | 'week' | 'month' | 'year';

/**
 * Format date for graph X-axis based on the viewing period
 * @param date - Date object or ISO string
 * @param totalDays - Total days in the viewing period
 * @returns Formatted date string
 */
function toValidDate(value: Date | string): Date | null {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

export function formatDateForGraph(date: Date | string, totalDays: number): string {
  const d = toValidDate(date);
  if (!d) return '--';
  
  if (totalDays <= 365) {
    // Short to medium periods: "12 Jan"
    return format(d, 'dd MMM', { locale: enUS });
  } else {
    // Long periods: "Jan 2026"
    return format(d, 'MMM yyyy', { locale: enUS });
  }
}

/**
 * Format date for tooltips with full detail
 * @param date - Date object or ISO string
 * @returns Full formatted date string
 */
export function formatDateForTooltip(date: Date | string): string {
  const d = toValidDate(date);
  if (!d) return '--';
  
  return format(d, 'dd MMM yyyy', { locale: enUS });
}

/**
 * Get the date key for grouping (YYYY-MM-DD format)
 * Uses local timezone to avoid UTC shift issues
 * @param date - Date object or ISO string
 * @returns Date key in YYYY-MM-DD format
 */
export function getDateKey(date: Date | string): string {
  const d = toValidDate(date);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

export function getDateKeyInTimezone(date: Date | string, timezone: string): string {
  const d = toValidDate(date);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return format(d, 'yyyy-MM-dd');
  }
}

export function getWeekdayInTimezone(date: Date | string, timezone: string): number {
  const d = toValidDate(date);
  if (!d) return 0;
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(d);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekday] ?? d.getDay();
  } catch {
    return d.getDay();
  }
}

export function getHourInTimezone(date: Date | string, timezone: string): number {
  const d = toValidDate(date);
  if (!d) return 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
    const hour = Number(hourPart);
    return Number.isFinite(hour) ? hour : d.getHours();
  } catch {
    return d.getHours();
  }
}

/**
 * Get the week key for grouping (start of week in YYYY-MM-DD format)
 * @param date - Date object or ISO string
 * @returns Week start key in YYYY-MM-DD format
 */
export function getWeekKey(date: Date | string): string {
  const d = toValidDate(date);
  if (!d) return '';
  
  const weekStart = startOfWeek(d, { weekStartsOn: 0 }); // Sunday
  return format(weekStart, 'yyyy-MM-dd');
}

/**
 * Get the month key for grouping (YYYY-MM format)
 * @param date - Date object or ISO string
 * @returns Month key in YYYY-MM format
 */
export function getMonthKey(date: Date | string): string {
  const d = toValidDate(date);
  if (!d) return '';
  
  return format(d, 'yyyy-MM');
}

/**
 * Determine the best grouping based on the number of days
 * @param totalDays - Total days in the range
 * @returns Recommended grouping type
 */
export function getRecommendedGrouping(totalDays: number): DateGrouping {
  if (totalDays <= 30) return 'day';
  if (totalDays <= 90) return 'week';
  if (totalDays <= 365) return 'month';
  return 'year';
}

/**
 * Format week range for display
 * @param weekStartDate - Start date of the week
 * @returns Formatted week string
 */
export function formatWeekLabel(weekStartDate: Date | string): string {
  const d = toValidDate(weekStartDate);
  if (!d) return '--';
  
  return format(d, 'dd MMM', { locale: enUS });
}

/**
 * Format month for display
 * @param date - Date object or ISO string
 * @returns Formatted month string
 */
export function formatMonthLabel(date: Date | string): string {
  const d = toValidDate(date);
  if (!d) return '--';
  
  return format(d, 'MMM yyyy', { locale: enUS });
}

/**
 * Standard graph data point structure
 */
export type GraphDataPoint = {
  x: string;           // Formatted date for display
  y: number;           // Value
  timestamp: string;   // ISO format for sorting
};

/**
 * Create a graph-ready data point
 * @param date - Date object or ISO string
 * @param value - Numeric value
 * @param totalDays - Total days in the viewing period
 * @returns GraphDataPoint
 */
export function createGraphDataPoint(
  date: Date | string,
  value: number,
  totalDays: number
): GraphDataPoint {
  const d = toValidDate(date);
  return {
    x: d ? formatDateForGraph(d, totalDays) : '--',
    y: value,
    timestamp: d ? format(d, 'yyyy-MM-dd') : '',
  };
}
