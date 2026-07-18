# Eccentric Viewing Training App — Initial Brief for Claude Code

## Project overview

Build a clinical tool + patient exercise app for a low-vision specialist who provides **eccentric viewing (fixation) training** to patients with macular degeneration and other central retinal conditions.

**Clinical background (important — read carefully):**
- In macular degeneration, the central retina (macula) is damaged, so patients cannot see what they look at directly.
- Treatment: identify a **healthy patch of retina** near the damaged area — the **PRL (Preferred Retinal Locus)** — and train the patient to point their eyes slightly *away* from a target so its image lands on that healthy patch. They then read/see using this trained off-center vision.
- The clinician uses a **MAIA microperimeter** to map retinal sensitivity across the central 10 degrees of vision. Its output is a color-coded sensitivity map: **green = good sensitivity, orange/red = reduced, black = no function (scotoma)**, plotted on a degree grid over a retinal photograph.
- PRL selection has clinical logic: prefer areas of best (green) sensitivity, **not adjacent to the degeneration edge** (the disease may spread there), and generally **inferior field is first preference**. Directional terms: nasal / temporal / superior / inferior. Distances are measured in **degrees** from current fixation.
- Traditional home training uses paper templates: a colored dot placed a set distance from a word; the patient fixates on the dot and reads the word with peripheral vision.

## Users

1. **Clinician** (the specialist) — analyzes retinal images, sets each patient's training parameters, reviews progress.
2. **Patients** — mostly older adults with **significant central vision loss**. Some are remote (interstate) and can only visit occasionally.

## Platform & architecture

- **Responsive web app** — single codebase serving both target devices: **iPad (Safari)** for patient exercises and **desktop browser** for the clinician workstation. No app-store deployment needed for v1.
- Suggested stack: React + TypeScript, works fully in-browser. Keep the backend minimal for v1 (see Data section).
- **Claude API (vision)** used for image analysis (Module 1).

## Module 1 — Clinician tool: MAIA image analysis & PRL setup

**Workflow:**
1. Clinician uploads a MAIA output image for a patient (assume a screenshot/exported image of the sensitivity map for now — format TBD).
2. **AI analysis (Claude API with vision):** interpret the sensitivity map — identify green/orange/red/black zones and their positions on the degree grid; identify the scotoma/degeneration area and its borders.
3. **AI suggests 1–3 candidate PRL locations**, each with **explicit written reasoning** the clinician can show the patient, e.g.: "Inferior-nasal, ~2 degrees from current fixation: consistent green sensitivity, more than 1 degree clear of the lesion border." Reasoning criteria (encoded as rules the AI must follow):
   - Best available sensitivity (green preferred)
   - NOT immediately adjacent to the degeneration border
   - Preference order for direction: inferior first, then per-patient judgment
   - Practical eccentricity — closer to fixation is easier to train, all else equal
4. **Clinician confirms or overrides** — this is mandatory, the AI never finalizes. The clinician can click directly on the map to place/move the PRL point, adjust in steps ("nasal 2 steps more"), where **1 step = 1 degree** on the grid.
5. The confirmed PRL (direction + eccentricity in degrees) becomes the patient's **training prescription**, which drives Module 2 automatically.
6. Store the annotated image + prescription + reasoning in the patient record.

**Notes:**
- The clinician must always be able to see and edit the degree grid overlay.
- All AI reasoning must be visible and editable — it doubles as patient-education material and clinical documentation.

## Module 2 — Patient home exercises

Driven by the clinician's prescription (PRL direction + eccentricity). Digital version of the traditional dot-template method, plus progress logging.

**Exercise types (v1):**
1. **Dot-fixation reading (core exercise):** a colored fixation dot (red/blue/orange, clinician-selectable) on screen; a word or text target placed at the prescribed direction and eccentricity relative to the dot. Patient fixates on the dot and reads the word peripherally. Progression: word length, text size, then short sentences.
2. **Smallest-letter / disappearing-letter test:** patient views the smallest letter they can see; taps/reports when it disappears (i.e., when it falls into the scotoma). Used as a self-monitoring measure over time.
3. **Steady-fixation drills:** hold fixation on a target for a timed interval; patient self-reports or taps when the target fades or they lose it. (True gaze tracking is out of scope for v1 — see below.)

**Requirements:**
- **Eccentricity must render accurately in degrees**: on first use, calibrate by asking screen size and viewing distance (or use a credit-card-on-screen sizing step), then convert degrees → pixels.
- Session logging: date, exercise, level, accuracy/self-reported results, duration.
- Simple progress view for the patient; full history for the clinician.

## Accessibility (critical — the users have low vision)

- Very large touch targets and text throughout; minimum interactive element ~60px
- High contrast mode by default; adjustable contrast/polarity (white-on-black option)
- Optional audio prompts/instructions for exercise flow
- Zero clutter — one action per screen in patient mode
- Works with iPad accessibility zoom without breaking layouts

## Data & privacy

- Patient data is **medical data**. For v1, keep it simple and safe: local-first storage with export, OR a minimal backend with authentication — decide at kickoff.
- Clinician needs to see patient exercise history; simplest v1 mechanism may be an export/share code from the patient device rather than a live synced backend.
- No patient images or data sent to any third party except the Claude API call for image analysis (flag this for consent handling).

## Explicitly OUT of scope for v1

- Camera-based eye/gaze tracking (consumer hardware cannot approach microperimeter precision; fixation stability is self-reported in v1)
- CVI (cortical visual impairment) module — visual scanning/attention training (planned Module 3)
- Resource portal (exercises, books, app links) — planned later
- Multi-clinic / multi-clinician support

## Open questions (resolve before/at kickoff)

1. What exact format does the MAIA export come in — PDF report, image export, or photo of the screen? (Get 2–3 sample de-identified images to develop against.)
2. Where will this be hosted, and does patient data need to stay in Australia?
3. Does the patient log in to an account, or is each iPad set up per-patient by the clinician?
