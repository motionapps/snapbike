/** Job cards per row (Jobb): one on phones, more on wider screens. */
export function jobCardColumns(width: number): number {
  // A 15–16" MacBook (up to ~1730 px wide) gets two; only bigger screens get three.
  if (width >= 1900) return 3;
  if (width >= 700) return 2;
  return 1;
}

/** Task cards per row (Mottagning, Jobblista): two on big screens, otherwise one. */
export function taskCardColumns(width: number): number {
  return width >= 1200 ? 2 : 1;
}
