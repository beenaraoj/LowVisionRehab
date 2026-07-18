/**
 * Optional spoken prompts (REQUIREMENTS: "Optional audio prompts/instructions
 * for exercise flow"). Uses the browser's built-in speech synthesis — no
 * network, works offline in iPad Safari. Calls are triggered from user
 * gestures (taps), which satisfies iOS autoplay rules.
 *
 * Voice choice: the platform default is often robotic. Apple devices ship
 * much nicer voices, so we pick the best available English voice, preferring
 * Australian English (the clinic's locale), then enhanced/premium variants.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet — try again next call

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    const name = v.name.toLowerCase();
    const uri = v.voiceURI.toLowerCase();
    if (v.lang.toLowerCase().startsWith('en-au')) s += 8; // Australian first
    else if (v.lang.toLowerCase().startsWith('en-gb')) s += 4;
    else if (v.lang.toLowerCase().startsWith('en-us')) s += 3;
    // Apple's higher-quality tiers advertise themselves in the name/URI.
    if (name.includes('premium') || uri.includes('premium')) s += 6;
    if (name.includes('enhanced') || uri.includes('enhanced')) s += 5;
    // Karen is the well-regarded Australian voice on Apple platforms;
    // Samantha the best common US fallback.
    if (name.includes('karen')) s += 3;
    if (name.includes('samantha')) s += 2;
    if (v.localService) s += 1; // offline-capable
    return s;
  };

  return english.sort((a, b) => score(b) - score(a))[0];
}

// Voices load asynchronously in Safari — refresh the cache when they arrive.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined;
  });
}

export function speak(text: string, enabled: boolean): void {
  if (!enabled || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel(); // never queue overlapping prompts
    if (cachedVoice === undefined) cachedVoice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = 0.92; // unhurried, for older listeners
    u.pitch = 1.05; // slightly warmer than the flat default
    u.volume = 1;
    speechSynthesis.speak(u);
  } catch {
    // audio is a nice-to-have; never let it break the exercise
  }
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}