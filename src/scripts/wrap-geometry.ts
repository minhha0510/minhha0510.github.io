/**
 * Text-wrapping geometry utilities.
 * Local copy of key functions from @chenglou/pretext's wrap-geometry module.
 * Used by the interactive playground for obstacle-aware text layout.
 */

export interface Interval {
  left: number;
  right: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get blocked intervals for a set of rectangles at a given horizontal band.
 * Returns intervals where text cannot be placed.
 */
export function getRectIntervalsForBand(
  rects: Rect[],
  bandTop: number,
  bandBottom: number,
  horizontalPadding: number,
  verticalPadding: number,
): Interval[] {
  const intervals: Interval[] = [];
  for (const rect of rects) {
    if (bandBottom <= rect.y - verticalPadding || bandTop >= rect.y + rect.height + verticalPadding) {
      continue;
    }
    intervals.push({
      left: rect.x - horizontalPadding,
      right: rect.x + rect.width + horizontalPadding,
    });
  }
  return intervals;
}

/**
 * Carve free text slots from a base interval by removing blocked regions.
 * Returns the remaining available slots for text placement.
 */
export function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots: Interval[] = [base];

  for (const interval of blocked) {
    const next: Interval[] = [];
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (interval.left > slot.left) {
        next.push({ left: slot.left, right: interval.left });
      }
      if (interval.right < slot.right) {
        next.push({ left: interval.right, right: slot.right });
      }
    }
    slots = next;
  }

  return slots.filter(slot => slot.right - slot.left >= 24);
}
