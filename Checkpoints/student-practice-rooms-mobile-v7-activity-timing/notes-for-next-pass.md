# Notes for the next pass — Student Practice Rooms · Mobile

Frozen at **v6** (`index.html`, md5 `24b67a1f82091965e72c271e5b42db34`). Nothing below was changed in the
packaging task.

---

## Part 1 — Decisions that are now locked

These are the calls this checkpoint makes. A future pass should not quietly reverse them.

### Layout

- **Mobile rooms use a vertical Duo stack: partner on top, self on the bottom.** Self sits closest to the
  thumb. There is no two-column layout on mobile.
- **The seam between the two videos is the main activity UI zone.** The 5s countdown, the activity timer,
  the *waiting for your teacher* pill, the Carousel cue and the Done badge all live there — because that
  band (y 344–488 on a 378×832 screen) is precisely where neither face is. Anything new that belongs to
  the activity belongs on the seam.
- **TIP / Camera / Mic / Leave & report are bottom controls**, in the thumb zone.

### Persistence

- **Name chips stay always visible.** The chip is not optional chrome. It is *identity* UI, because
  students may not know each other, and it is *turn-state* UI, because the active turn lives inside it
  (You / Dana / Your turn / Dana's turn / You start / Dana is next). It also **never moves** — one `top`
  value across every chrome and reveal state.
- **The room timer stays always visible.** It is **persistent status**, not chrome. It must not move when
  the chrome appears or disappears, and it must not reserve space for anything.
- **The X is chrome**, not part of the persistent room status. It fades with everything else and it is a
  floating overlay action, absolutely positioned, so it cannot push the timer.
- **Other chrome can auto-hide and reappear on tap** — 3s on entry, 3.8s after a tap, opacity-only, no
  hover.

### The activity timer

- **Fill-forward model:** charcoal track → yellow progress → **brand red/coral `#F9746B` in the final
  seconds**. The number stays charcoal.
- **Timer movement must stay smooth using `requestAnimationFrame`.** The number ticks once a second; the
  arc and the ball are interpolated every frame. They must not jump once per second.

### The room clock and the transition

- **The waiting / return screen uses the same `roomLeft` source of truth as the room timer.** There is one
  room-time value in the file. Do not introduce a second.
- **The matkot animation must not restart every tick.** The room clock writes the countdown DOM in place
  and never re-renders the frame — a re-render destroys the Lottie node and reloads the 6-second loop from
  frame 0, which is the "scratched disc" bug. `mountLottie()` is idempotent and playhead-preserving.
  **Any future change that makes the room clock call `render()` will bring the bug back.**

### Out of scope inside the room

- **No chat, no reactions, no participant rail, no written dialogue prompts.**

### Solo

- **Solo currently remains a placeholder and needs a future product pass.**

---

## Part 2 — Open questions

### 1. Solo Room should not stay a full static screen

Right now Solo is a single static surface: a chip, a heading, a one-line reason and an *Activity TBD* tag.

It should become a **short popup / acknowledgement flow** — a brief "your partner isn't here, you'll
practice on your own" moment that the student acknowledges — **before moving into a simple activity**. Not
a dead-end screen.

**This should also be aligned later on desktop**, where Solo has exactly the same shape and the same
problem. The two surfaces should get the same flow, not diverge.

### 2. The exact Solo activity is TBD

There is no pedagogy behind Solo yet: no content model, no link to the lesson plan, no teacher control.
Deciding what a student actually *does* alone is a product question, not a design one, and it blocks the
flow above.

### 3. Transition copy is still placeholder

Explicitly marked `[Placeholder copy]` or written as prototype filler:

- **Waiting / return** — "Camera and mic are needed for room practice. You'll wait here until the room
  activity ends. [Placeholder copy]"
- **Partner-left sheet** — "Oh no - it looks like your partner left the room. We'll move you into solo
  practice shortly. [Placeholder copy]"
- **Report screen** — "Tell us what happened in the room. The teacher/helper will be able to review it.
  [Placeholder copy]"
- **Solo** — the body is a one-liner and the activity is literally tagged `Activity TBD`.
- The TIP player's duration (`0:12`) and waveform are simulated.

None of this has been through a copy pass.

### 4. Real-device QA is required

Everything in this file was validated headlessly — `node --check`, a 177-assertion DOM-stub harness, CSS
cascade resolution and computed collision maps. **No live browser was ever available.** The following can
only be checked on hardware:

- **Safe areas.** The file assumes a flat 48px status bar. It does not use `env(safe-area-inset-*)`.
- **Dynamic Island / notch.** The partner name chip sits at y 64–93 and the room timer at y 52–83 — both
  in the region an Island can intrude on. This needs a look on a real iPhone.
- **Thumb reach.** The bottom controls are 58px and sit ~90px from the bottom; Leave & report is a 34px
  ghost pill below them. Reachability on a large phone is unverified.
- **The auto-hide timing** (3s / 3.8s) and the 200ms fade were chosen, not tested with people.
- **Tap targets on the seam.** The seam zone is `pointer-events:none`, so taps there reveal the chrome —
  intended, but worth confirming it doesn't feel like a dead area.

### 5. FedraSerifPro — export licensing

`index.html` embeds **FedraSerifPro** as a base64 `@font-face`. It is a **licensed** face, and it is used
for exactly one element: the transition headline (`.t-headline`).

**For a git-safe or public export:** strip the `@font-face` block at the top of the `<style>` and repoint
`--font-brand` to `Georgia, "Times New Roman", serif`. Nothing else changes — every other string in the
file is on Assistant, loaded from Google Fonts.

The desktop checkpoint carries the same face and the same caveat. If a git-safe export process is ever
formalised, it should cover both surfaces with one script.

---

## Part 3 — Smaller items worth a line

- **The close X sits *below* the room timer** (y 92–124, right corner). That is an unusual pattern — the
  conventional place is the corner itself. It was the only arrangement that satisfied "the timer hugs the
  top-right edge" + "the X must not push the timer" + "they must not overlap" at the same time. Two
  alternatives exist if it reads wrong: put the X to the *left* of the timer on the same row (still
  absolute), or return it to the top-left — but that last one would push the name chip back down and undo
  v5.

- **Carousel is a prototype activity, not a real one.** The turn structure and timing are real; the three
  silhouettes are built-in SVG placeholders, the cue rotation is a fixed `['m','f','p']` cycle rather than
  a content model, and there is no pedagogy behind which cue appears when. Same status as on desktop.

- **Every teacher event is simulated by a debug button.** *Start timer*, *Start another set* and the TIP
  recording all need a real Cockpit contract. The room clock (01:48) is local to this file; in the product
  it belongs to the session.

- **Grandma's turn length is 10s per student**, carried from an early recipe note and never confirmed
  against the PRD.

- **Dialogue auto-returns after Done**; the other activities stay on Done and wait for another set. That
  asymmetry is faithful to the PRD but reads inconsistent.

- **The "time's up" screen is terminal** in this prototype — there is no Main Room to return to.

- **Variant B (contained video tiles) was explored and stopped.** If it is ever revived, the number that
  killed it is worth remembering: containing the tiles dropped the face clearance around the seam UI from
  76–92px to **22–28px**.

- **Landscape is not handled at all.** The layout assumes portrait.
