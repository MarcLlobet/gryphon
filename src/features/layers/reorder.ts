/**
 * Pure list reordering, shared by every affordance that can change paint order.
 *
 * The layer list reads top-down, the way the map paints: the first row is the layer
 * drawn on top. The document stores the opposite — bottom first — so the two views
 * are converted here rather than in each component, where they would drift.
 */

/** Moves one item, clamping rather than wrapping: dragging past the end is a no-op. */
export const moveInList = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (from < 0 || from >= items.length) {
    return [...items];
  }

  const target = Math.max(0, Math.min(items.length - 1, to));
  const next = [...items];
  const [moved] = next.splice(from, 1);

  if (moved === undefined) {
    return [...items];
  }

  next.splice(target, 0, moved);
  return next;
};

/** Document order (bottom first) → the order shown on screen (top first). */
export const toVisualOrder = <T>(documentOrder: readonly T[]): T[] => [...documentOrder].reverse();

/** The order shown on screen → document order. */
export const toDocumentOrder = <T>(visualOrder: readonly T[]): T[] => [...visualOrder].reverse();

/**
 * Where a dragged row lands, given where the pointer is.
 *
 * The comparison is against each *neighbour's* midpoint, never the dragged row's own:
 * measuring against its own midpoint would swap rows after a pixel of movement, which
 * makes the list jitter under the cursor. A row only moves once it has genuinely
 * passed the middle of the one it is displacing.
 */
export const targetIndex = (midpoints: readonly number[], from: number, y: number): number => {
  let target = from;

  if (y > (midpoints[from] ?? 0)) {
    for (let index = from + 1; index < midpoints.length; index += 1) {
      if (y > (midpoints[index] ?? Number.POSITIVE_INFINITY)) target = index;
    }
    return target;
  }

  for (let index = from - 1; index >= 0; index -= 1) {
    if (y < (midpoints[index] ?? Number.NEGATIVE_INFINITY)) target = index;
  }
  return target;
};

/** What a screen reader is told after a move. */
export const describeMove = (title: string, index: number, total: number, above?: string): string =>
  above === undefined
    ? `${title} moved to position ${index + 1} of ${total}, at the bottom.`
    : `${title} moved to position ${index + 1} of ${total}, above ${above}.`;
