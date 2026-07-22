# Notes for the next pass — Teacher Cockpit (Desktop)

Written at the `teacher-cockpit-desktop-v1-checkpoint` freeze.
Nothing here was changed in this checkpoint — it is a list of what to look at next.

---

## 1. Things I could not verify (no browser in the build environment)

Everything below was validated with `node --check` + a headless DOM-stub harness that asserts
behaviour **and** CSS rules. But **no pixels were ever rendered**. These are the things a human
should eyeball first, because they are exactly where a harness cannot help:

| # | What to check | Why it is a risk |
|---|---|---|
| 1 | **Rooms panel fits with no scroll at the narrowest cockpit width** | This is a *hard* constraint that was defended for many passes by removing content rather than adding overflow. It has never been measured in a real browser. If it clips, the fix is to remove something from the default state — **not** to add a scrollbar. |
| 2 | **The four control-panel buttons do not wrap or clip at the minimum width** | The centre-column minimum was raised (500→540, 520→560 presentation) when the 4th button (Visuals) was added. Check board mode too. |
| 3 | **The recipe hover tooltip is not clipped by the panel’s `overflow:hidden`** | It is capped at 250px and wraps to two lines specifically to survive this, but it has never been seen. |
| 4 | **The Room mirror does not collide with the mic/camera dock** | The dock is bottom-centre; the mirror is in the right-hand HUD stack. Should be clear, but worth a look at small heights. |
| 5 | **The HELPER holder (26px) sits well among the 30px header items** | Newly centred in v25. |
| 6 | **`16:42` at 45% opacity reads as *secondary*, not as *broken*** | If it looks too faint, raise to ~55%. |
| 7 | **The three grammar silhouettes are legible as masculine / feminine / plural at card size** | They are abstract by design. If they are not readable, they need sharpening — this is a *pedagogical* requirement, not a decorative one. |

---

## 2. Product questions still open

### Instruction / TIP model
- **Does a live broadcast pause the running activity timer?** Today they are independent — Start is only
  blocked *before* the timer runs, not during. If broadcasting mid-activity should freeze the rooms, that
  is a behaviour change, not a styling one.
- **Does re-recording the TIP also broadcast live?** Today it records only; the teacher is not heard in the
  rooms while re-recording. This may be wrong.
- **TIP review.** The record button is a two-state toggle. Is there a listen-back / discard step before a
  TIP reaches the rooms? Right now the first stop is irreversible.

### Activities
- **Timer duration model.** Currently preset **and** custom, and the override applies to *turn* steps only —
  transitions, breaks and Carousel swaps stay fixed. Confirm this is the intended rule.
- **Can the teacher edit an activity’s timer sequence directly**, or only pick a predefined recipe?
- **Carousel turn length** in Rooms is 20s per student = 4 visuals each. Right number?
- **Naming.** The PRD writes “Grandma Operation”; the build uses **“Operation Grandma”** everywhere,
  including the lesson-plan pool. Pick one and I will make it consistent in a single pass.
- **Sound.** Nothing is defined for timer start or the final 3 seconds.

### Carousel / visuals
- **Room mirror scope.** The mirror exists for Carousel only. Do Dialogue / Intensive / Operation Grandma
  need an equivalent “what the students see” preview? If yes, that is a new component, not a tweak.
- **Carousel visual tool + Rooms Carousel at the same time.** Opening a Rooms activity currently *stops*
  the shared-stage carousel, on the reasoning that the shared stage belongs to Main Room / Demonstration.
  Should the teacher be able to keep it running while rooms are open?
- **Final artwork.** The three grammar cues are inline SVG placeholders. When real art arrives, only
  `CHARS` and `charSVG()` need to change — nothing else reads them directly.

### Helper
- **Does Helper eventually need its own layout?** Today it is the same cockpit with every teacher control
  inert. That was a deliberate “first pass, not a preservation” decision back in v16 and has not been
  revisited.
- **Takeover semantics.** The popup exists, but what actually happens to the displaced teacher is not
  modelled — do they become Helper? Are they warned?

---

## 3. Polish candidates (small, safe, next-pass-sized)

- **Dead CSS.** Several rules are now unreachable and could be swept in a zero-risk pass:
  `.helper-off`, `.rline`, `.recipe-pop`, `.rmeta`, `.rp-chips`, `.tc-timers`, `.tc-rolebtn`, `.cp-dev`,
  `.rpv`, `.car`, `.solo-note`, `.rp-flow`, `.dur-tag`, `.tstate`.
  Also two dead JS helpers: `charCard()` and `recipeText()`.
  **None of this affects rendering** — it is hygiene only, and worth doing before the file grows further.
- **Main-room countdown still uses a 3-2-1 prep**, while all four *activity* recipes now use 5s.
  This was deliberate (the v20 brief scoped the change to activity recipes), but it is an inconsistency
  a teacher could feel. Worth a decision.
- The expanded control panel’s hint still reads *“3-2-1 prep before it starts”* — same point as above.
- **Presentation mode** has not been exercised recently. The `body.present` clamps are all still in place
  but the newer components (activity HUD stack, Room mirror, Instruction status row) have only default
  `clamp()` coverage, not a real review.

---

## 4. Things to be careful about when you touch this file

- **The Rooms panel must never scroll.** This has been the single hardest constraint. Adding a row costs
  ~28px; the panel does not have much slack.
- **`stepTick()` paints in place** (`cdPaint`) rather than re-rendering, so the ring animation is not
  restarted every second. If you add anything to the stage that must update mid-second, it will **not**
  repaint unless you force it — this is exactly the bug the Room mirror hit in v19. The `slideSwapped`
  flag is the existing pattern for that.
- **Colour discipline.** Yellow = active / current turn / handoff / running timer / selected activity.
  Green = success and ON AIR **only**. Device controls on = neutral, never green.
- **Statuses are not buttons.** Flat dot + text. Anything that is not an action should not look tappable.
- **`.info` is global now** — do not re-scope it, or the “TIMER /” slash bug comes straight back.
- **Assets are embedded.** The licensed `FedraSerifPro` `@font-face` is base64-inlined. If this file is
  ever exported to Git, strip it and repoint `--font-brand` to a fallback serif, as was done for the
  student-surface Git-safe exports.
