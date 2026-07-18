# LowVisionRehab — Project Status & Handoff

Eccentric-viewing training app for a low-vision clinician and her macular
degeneration patients. **Read REQUIREMENTS.md first** — it has the clinical
background. This file tracks build state and decisions so work can resume
at any time.

## Current state (as of 2026-07-18)

**Phases 1 and 2 are COMPLETE, reviewed, and deployed. Next up: Phase 3.**

- Live app (GitHub Pages): https://beenaraoj.github.io/LowVisionRehab/
- Repo: https://github.com/beenaraoj/LowVisionRehab (`main` = code, `gh-pages` = built site)
- Stack: Vite + React + TypeScript, **no backend** — all data in localStorage on each device
- Local dev: `npm run dev` (serves with `--host`; open the Network URL in iPad Safari)
- Deploy: `npm run build`, then push `dist/` contents to the `gh-pages` branch (init a temp git repo inside `dist/`, commit, force-push to `gh-pages`, delete `dist/.git`)

## Critical clinical conventions (do not change without the clinician)

1. **Direction convention (confirmed with clinician):** prescription direction =
   GAZE direction relative to the word. "Inferior 2°" means the patient looks
   BELOW the word → the word renders 2° ABOVE the fixation dot. Encoded in
   `wordOffsetPx()` in [src/lib/geometry.ts](src/lib/geometry.ts). The settings
   screen shows a live preview + plain-English description as a cross-check.
2. **All distances/sizes are TRUE visual angles**: px = tan(deg) × viewingDistanceCm × pxPerCm.
   Calibration (card-match or screen-diagonal + viewing distance) is required
   before any exercise. Never render a stimulus with unverified geometry —
   the app blocks/pauses instead (fit checks, pinch-zoom detection,
   display-change detection). Preserve this property in everything new.
3. **Patient-mode accessibility:** huge targets (≥60px, mostly much larger),
   high contrast (white-on-black default, polarity toggle), one decision per
   screen, ghost-tap defences (advance on click + 300ms button arming),
   optional spoken prompts. The users have central vision loss — design for
   the failure paths, not just the happy path.
4. **Never silently lose a session:** stable session ids, pagehide/background
   partial saves (upsert by id), every *started* session is recorded (even
   abandoned-at-zero-answers — that's a clinical signal), guarded localStorage
   writes with user-visible failure messages.

## What's built

### Phase 1 — Dot-fixation reading (core exercise) ✅
- Calibration screen (card-match primary / screen-size fallback + viewing distance, stores screen dims for staleness detection)
- Settings (clinician area): gaze direction in prescription language, eccentricity, dot colour, angular letter height, word list, session minutes, polarity, audio prompts, live placement preview
- Exercise: dot + word stimulus → tap anywhere → giant Yes/No self-report; timed session; fit-gated on the longest word; zoom/rotation-safe
- Local session History (clinician-facing)

### Phase 2 — Remaining patient exercises + progress ✅
- **Letter Check** (disappearing-letter test): central Sloan letter viewed DIRECTLY (central scotoma self-monitoring — clinician's choice); up-down staircase, 3 reversals → threshold in degrees; ceiling (can't see max → flagged null) and floor (sees 0.2° → recorded, celebrated) both handled
- **Hold Steady** (steady-fixation drill): tap ENDS the trial (clinician's choice) → outcome = hold seconds, target auto-completes as full success; N trials with rest screens; interrupted-state machine voids zoomed holds
- **My Progress** (patient-facing): gentle trend cards (reading %, letter threshold, best hold) — clinician chose performance-trend emphasis; plateaus read as "steady", never failure
- Shared infra: `useSessionSaver` + `useCalibrationGuards` hooks ([src/lib/useSession.ts](src/lib/useSession.ts)) used by all three exercises; `SessionRecord` discriminated union
- Speech: best-installed-voice picker (prefers en-AU enhanced, e.g. Karen), test button in Settings

### Quality process used (worth repeating for Phase 3+)
Each phase: build → multi-angle adversarial review (subagent finders + verifiers)
→ fix → re-verify the fixes (this caught real regressions every time).
Phase 1 review found 10 confirmed issues (all fixed); Phase 2 found 5 (all fixed).

## Known limitations / accepted for now
- Letters are the app's bold sans face, NOT true Sloan optotypes — thresholds are internally consistent for trends, not clinical acuity values. (Possible later: embed a real optotype font.)
- Letter Check asks the patient to tap even when the screen looks blank (letter invisible) — intro + audio explain it; **watch this in real patient testing**.
- Fixed centre dot position (matches paper method; clinician may want a "varied dot position" progression option later — geometry already supports it).
- Speech quality depends on the device's installed voices (iPad: download Enhanced voice under Accessibility → Spoken Content). Pre-generated audio files are the upgrade path if needed.
- Clinically cleared for **supervised trials only**; unsupervised home use needs real-patient usability testing + the data/consent decisions below.

## Phase 3 — Clinician tool (NEXT — not started)
MAIA image upload → degree-grid overlay → click-to-place/adjust PRL point
(1 step = 1 degree) → prescription editor that writes the same
`ExerciseSettings` the patient exercises already consume. Manual marking
first; AI comes in Phase 4.

**Blocked on / needed from the clinician at kickoff:**
1. 2–3 de-identified sample MAIA exports + the actual export format (PDF report / image / photo of screen)
2. Data decision: stay local-first with export/share-code, or minimal backend with auth (drives patient records, multi-device, and the friend/colleague sharing story)
3. Hosting + privacy: does patient data need to stay in Australia; consent handling for Phase 4's Claude API image analysis
4. Open question from REQUIREMENTS.md: per-patient login vs clinician-provisioned iPads

**Design notes for Phase 3 (from earlier reviews):**
- The 4-value `GazeDirection` union won't survive Module 1 — MAIA-derived PRLs
  sit at arbitrary polar angles (e.g. infero-nasal). Plan: generalise to an
  angle-based direction (one source of truth in geometry.ts) with the 4 named
  directions as presets, BEFORE building the PRL editor on top.
- App.tsx's switch-based routing has no screen params; Phase 3's
  patient-scoped clinician screens will need a real screen-descriptor (or a
  router, if shareable URLs are wanted on desktop).

## Phase 4 — AI analysis (after Phase 3)
Claude API (vision) suggests 1–3 candidate PRLs with written, editable
reasoning per the rules in REQUIREMENTS.md (green sensitivity, clear of
lesion border, inferior preference, practical eccentricity). The AI NEVER
finalises — clinician confirmation is mandatory. Develop against the
de-identified samples.

## Workflow notes
- Commits: user prefers being asked before each commit; commit at phase/checkpoint boundaries with detailed messages
- After each phase: short summary + how to test on iPad
- Ask the clinician rather than guess on any ambiguous clinical requirement (this has mattered every phase — direction conventions, test placement, staircase style, trial-ending semantics were all clinician decisions)
- A full pre-wipe backup of an earlier unrelated prototype lives at `~/LowVisionRehab-backup-2026-07-18/` (git bundle + tarball) — unrelated to this codebase, don't restore it
