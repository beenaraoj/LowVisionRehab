import type { DotColor } from '../types';

/**
 * Dot colours tuned for visibility on both black and white backgrounds.
 * (Pure blue is too dark against black for low-vision users.)
 */
export const DOT_COLORS: Record<DotColor, string> = {
  red: '#ff3b30',
  blue: '#409cff',
  orange: '#ff9500',
};
