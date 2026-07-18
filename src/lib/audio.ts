/**
 * Optional spoken prompts (REQUIREMENTS: "Optional audio prompts/instructions
 * for exercise flow"). Uses the browser's built-in speech synthesis — no
 * network, works offline in iPad Safari. Calls are triggered from user
 * gestures (taps), which satisfies iOS autoplay rules.
 */
export function speak(text: string, enabled: boolean): void {
  if (!enabled || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel(); // never queue overlapping prompts
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; // slightly slower for older listeners
    speechSynthesis.speak(u);
  } catch {
    // audio is a nice-to-have; never let it break the exercise
  }
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}