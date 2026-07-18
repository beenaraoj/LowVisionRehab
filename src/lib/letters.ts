/**
 * Sloan letter set (the ten letters used on clinical acuity charts).
 * Rendered in the app's bold sans face — consistent within the app for
 * trend tracking, though not true Sloan optotype geometry.
 */
export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;

/** Random Sloan letter, never repeating the previous one (prevents memorising). */
export function nextLetter(previous: string | null): string {
  const pool = SLOAN_LETTERS.filter((l) => l !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}