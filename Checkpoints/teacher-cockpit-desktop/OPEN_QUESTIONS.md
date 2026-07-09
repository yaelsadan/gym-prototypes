# Teacher Cockpit — Open Questions

Decisions intentionally **not** locked at this checkpoint. Each needs product and/or dev alignment before higher-fidelity design or implementation. Nothing here blocks reviewing the checkpoint; these are the next choices to make.

---

## Product / model decisions

1. **Activity Launcher vs. Lesson Plan auto-sync as the MVP model.**
   Today the Lesson Plan and Control Panel are deliberately independent (activities are chosen from the Control Panel, not driven by the plan). Should the MVP keep them independent, or should selecting a Lesson Plan step auto-configure the activity/timer? Decide before we commit the interaction.

2. **Pair Room prompt model.**
   How is a duo prompt shown to students — "Your line / Partner line", "Ask / Answer", or "A / B"? The cockpit currently represents Dialogue turns generically (Partner A / Partner B, "You start"); the student-side prompt model needs to be chosen and then reflected here.

3. **Student mic / audio model in rooms.**
   What is the mic/audio behavior inside breakout rooms (who can hear whom, push-to-talk, always-on, teacher broadcast override)? The cockpit assumes teacher Broadcast exists but does not define the student audio model.

4. **Helper role.**
   Does the Helper get the **same cockpit with a preset**, or a **distinct layout**? Participants currently lists a Helper; the Helper's own view is not designed.

5. **Student Preview / Inspector emphasis.**
   Which teacher actions should auto-emphasize a Student Preview (a confidence monitor of what the teacher just did, not a duplicate student feed)? This surface is referenced conceptually but not built here.

---

## Prototype-specific open items

6. **Dialogue starter naming.**
   "Partner A / Partner B" are generic placeholders (deliberately not fake names, not "Speaking"). Confirm the final teacher-facing labels and whether they should reflect real seat/role names.

7. **Round indicator in the Rooms panel.**
   Should the Rooms panel show a compact round indicator (e.g. *Round 1 · Partner A starts → Round 2 · Partner B starts*) alongside the timer, or is the stage HUD context enough? Currently the round/turn context lives in the stage HUD + status label only.

8. **Recipe placeholder values (TBS).**
   The recipe timings are placeholders: Operation Grandma `10 · 5 · 10 · 5 · TBS`, Quick drill "timed rounds · TBS", Flashcards "solo fallback". Real durations/structures need to be provided per activity.

9. **HUD context caption scope.**
   The running-timer HUD shows one context line under the clock. Should it also show a small secondary "Students see" line (without bringing back a dark banner), or is the single line enough?

10. **Reactions wiring.**
    Reaction handling for the classroom was deferred to a separate focused pass in the student work; its final status in the teacher cockpit is not confirmed here and should be verified before reactions are relied upon.

11. **Board mode as a review artifact.**
    Presentation mode is the source of truth; board mode (fixed 1280×820) is secondary. Confirm which target widths board mode must stay clean at, or whether board mode is review-only.

---

## Explicitly out of scope for this prototype

- Real activity rules and real pairing/room-assignment logic.
- Mobile / responsive teacher layout (desktop only here).
- A separate, purpose-built Helper view.
- Student video grids in Basic Teaching (by design — teacher sees self-view only).
- Any backend, real-time, or streaming integration.

---

## Needs visual QA in a browser (couldn't be verified headlessly)

- **Smooth progress-ring motion** — the ring logic is built for continuous animation, but CSS animation can't be verified in the headless render harness. Confirm the motion reads smooth in a real browser and in presentation mode.
- **Collapsed action-bar breathing at very wide viewports** — the board fit is guaranteed; confirm the bar spacing feels right (grouped, not over-stretched) on large presentation screens.
