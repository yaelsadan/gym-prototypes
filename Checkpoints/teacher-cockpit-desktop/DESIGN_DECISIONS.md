# Teacher Cockpit — Design & Interaction Decisions (Checkpoint v1)

These are the decisions that are considered **locked** for this checkpoint, with the reasoning behind each. They should be treated as the interaction contract for higher-fidelity design and development, unless a decision is explicitly reopened (see `OPEN_QUESTIONS.md`).

---

## 1. Teacher sees only their own self-view
The teacher streams their self-view, plus exactly one student **only** during a Demonstration. There is no student video grid in Basic Teaching.
**Why:** matches the streaming-session model and keeps the teacher focused on presenting, not monitoring a wall of faces. The class status lives in Participants (status, not video).

## 2. Three explicit states
`Basic Teaching`, `Demonstration`, `Students in Rooms`. Each has its own control surface. Demonstration is its own control area and is not merged into Activities.
**Why:** the teacher's job is different in each phase; separating them keeps each surface simple.

## 3. Lesson Plan and Control Panel are separate (NOT smart-linked)
Selecting a Lesson Plan item does not drive the Control Panel. The teacher chooses an activity directly from the Control Panel regardless of the Lesson Plan.
**Why:** deliberately avoids an auto-sync coupling that hasn't been validated as the MVP model (see `OPEN_QUESTIONS.md`). Keeps the two mental models independent for now.

## 4. Activities are the only path to rooms
Opening breakout rooms happens only by choosing an Activity in the Control Panel, which asks for confirmation and then sends students to rooms. There is no separate generic "breakout rooms" launcher.
**Why:** one predictable path; the activity is what defines the room structure and recipe.

## 5. Broadcast lives only in rooms
The Broadcast control appears only in the Rooms Status & Control panel. It is never present in Basic.
**Why:** broadcasting is meaningful only when students are dispersed in rooms; showing it elsewhere would be a dead/confusing control. This is a locked interaction constraint.

## 6. Two Control Panel options, Option B is the default
Option A (Expanded) and Option B (Collapsed 5-button bar) both ship in the file; **Option B is the default** on load. Option A remains for side-by-side comparison via the debug board.
**Why:** Option B keeps the everyday cockpit clean and gives the stage more presence; Option A is kept so product can compare fast-access vs. clean-bar tradeoffs.

## 7. Camera / Mic never toggle instantly
Clicking Camera or Mic during an active session opens a confirmation — *"You are in an active session! Are you absolutely sure you want to turn off your camera/mic?"* — with the **safe option (keep it on) as the primary** button.
**Why:** accidental device-off during a live class is high-cost; the confirmation + safe default prevents it. Camera/Mic are clean circular **icon-only** buttons with no visible label and no native tooltip.

## 8. One primary live timer, on the stage
There is a single live countdown and it lives on the stage in the student-room timer language (96px clock, ring, 3-2-1 prep, final-3s red, done ✓). The Rooms panel does not duplicate a second full live countdown; it carries the actionable duration controls + a lightweight status label only.
**Why:** two live timers competing for attention is confusing; the stage timer is what students effectively see, so it is the source.

## 9. Running timer sits in a light HUD, off the teacher's face
While running, the countdown moves to a compact, light top-right HUD (~86px, no dark banner) with a small context caption below it. The 3-2-1 prep stays large and centered; the Done state is a clean green check with no gray ring.
**Why:** a centered running timer covered the presenter's face; the HUD keeps it visible and legible without blocking the video.

## 10. Recipe-driven timers, manual override allowed
Choosing an activity sets its default duration and recipe (Dialogue 30s; Operation Grandma 10s; Quick drill 10s; Flashcards generic). The teacher typically just clicks Start. Manual chips / Custom override the default and the row labels it *manual override* vs *recipe default*. Timers never auto-start.
**Why:** removes repetitive setup for the common case while preserving teacher control. "recipe default vs manual override" makes the current source explicit.

## 11. Dialogue is turn-based and runs the whole recipe from one Start
Dialogue = two rounds of the selected duration with an automatic starter switch: Round 1 (Partner A starts) → prep → run → *Switching starters* → Round 2 (Partner B starts) → run → done. The teacher does not start Round 2 manually.
**Why:** the teacher shouldn't have to babysit round transitions; one Start drives the full pedagogical recipe.

## 12. "Turn", not "Speaking"
The green room cue means **whose turn it is / who starts** — surfaced as *Partner A / Partner B*, *"You start"*, *Round N · Partner A starts*. No UI copy says "Speaking". Starter labels are generic (Partner A/B), not fake names.
**Why:** the cue is a turn prompt, not live speech detection; using "Speaking" would misrepresent the behavior and imply a capability that doesn't exist.

## 13. Modular panels behind an "Edit layout" toggle
Lesson Plan / Chat / Participants are rearrangeable and resizable, but only inside Edit layout (with a clear Done and a Reset layout). Normal mode is clean; direct manipulation (drag header to reorder, edge handles to resize, chevron to collapse) replaced the old row of S/M/L / arrow / swap buttons.
**Why:** everyday use should be uncluttered; power arrangement is opt-in and can't be triggered accidentally during a live session.

## 14. Participants collapsed by default, Chat open
Participants defaults to a quiet metadata line (`8 students · 6 cameras · 1 helper`) with a chevron to expand; Chat is open by default; Lesson Plan is the widest/most dominant side panel.
**Why:** during a session, chat and lesson content matter more moment-to-moment than the full participant list; Participants stays available but out of the way.

## 15. Reset layout is layout-only
Reset layout restores panel order / widths / heights / collapse defaults / center order / Option B — and does not touch session, rooms, activity, running timer, chat content, or mic/camera state.
**Why:** a layout reset should be safe to press mid-session without losing teaching state.

## 16. Constrained, never-overflowing layout
The grid guarantees no horizontal overflow: side panels resize by borrowing width from the opposite side and the center down to a safe minimum, then stop. The center minimum is set high enough that the collapsed 5-button action bar always fits on one row at full size (no clipped camera button).
**Why:** the cockpit must never break or clip its own controls at any resize state or viewport; layout stability is a correctness requirement, not a nicety.

## 17. Header is a quiet status bar; only "Edit layout" looks clickable
Left: icon-only exit + `Gym · with [teacher]`. Center: `Session 2 of 6` + progress. Right: a light green **ON AIR** status, a dry session countdown (`16:42`, no "Session" label), a `Rooms mm:ss` threshold pill (rooms only, warms yellow in the final seconds), and the Edit layout button.
**Why:** the header communicates state at a glance; making status items look like buttons would invite mis-clicks during a live session.

## 18. Smooth timer, no per-tick flicker
The clock's entrance animation was removed and the countdown updates the number in place while the progress ring animates continuously — the clock DOM is not rebuilt every second.
**Why:** the earlier per-tick rebuild caused a visible fade/blink each second; a live timer must read as calm and continuous.

## 19. Presentation mode is the visual source of truth
Sizing scales with the viewport in presentation mode (clamp-based, not image zoom). Board mode is a fixed 1280×820 review frame and is treated as secondary.
**Why:** the product ships full-screen; the presentation render is what should be judged for scale and hierarchy.

---

## Reusable component decisions (for the design system)

- **Clock / countdown** is the same primitive as the student practice rooms: 96px circle, SVG ring (`viewBox 0 0 64 64`, r28, dasharray 175.9), state classes for running / final / done, and the `switch-num` 3-2-1 prep. Reusing it keeps teacher and student timers identical. → candidate shared component.
- **Rooms status metadata** is presented as a quiet text row, not button-like stat cards, so visual weight stays on the actions (timer, broadcast, close).
- **Device buttons** (camera/mic) are a fixed-size circular icon button with an off state — a reusable pattern across the stage dock and the collapsed bar.
- **Helper sparkle** uses the provided `Spark.svg` asset (yellow star, charcoal stroke) next to helper-highlighted chat messages, alongside the yellow left rule.

Anything above that is not yet defined in the Design Bible should be treated as a **prototype recommendation to validate and, if adopted, add to the design system.**
