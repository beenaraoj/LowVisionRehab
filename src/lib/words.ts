/**
 * Default starter word list: common, concrete 3–4 letter words.
 * The clinician edits this per patient/level in Settings —
 * progression is word length, then text size, then short sentences.
 */
export const DEFAULT_WORDS: string[] = [
  'cat',
  'dog',
  'sun',
  'hat',
  'bed',
  'cup',
  'pen',
  'car',
  'map',
  'key',
  'door',
  'milk',
  'hand',
  'book',
  'rain',
  'shoe',
  'tree',
  'fish',
  'cake',
  'bird',
];

/** Fisher–Yates shuffle (non-mutating). */
export function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
