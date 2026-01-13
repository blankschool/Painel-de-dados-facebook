/**
 * Utility to check if a metric value is valid (not empty/zero)
 */
export function isValidMetric(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return value !== '--' && value !== '0' && value.trim() !== '';
  }
  return value > 0;
}

/**
 * Filter an array of metric objects, keeping only those with valid values
 */
export function filterValidMetrics<T extends { value: string | number | null | undefined }>(
  metrics: T[]
): T[] {
  return metrics.filter(m => isValidMetric(m.value));
}
