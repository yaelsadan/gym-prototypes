# Notes for the next pass

Frozen at **v21** (`student-practice-rooms-desktop-v21.html`, md5
`a02b8078c64096dc31df3c2f1b5702bc`). Nothing below was changed in the packaging
task — these are the things the next pass should pick up.

---

## 1. Carousel — still future, not a real activity

Carousel exists in this file as a **wired prototype**, not as the real activity:

- The turn structure and timing are real: 5s prep → You 20s → 5s transition →
  Dana 20s → Done, with the cue switching every 5s and another set started manually.
- Everything *content-side* is placeholder. The three cues are **built-in SVG
  silhouettes** (masculine / feminine / plural) drawn inline in the file — they are
  stand-ins for real art. The cue rotation is a fixed `['m','f','p']` cycle, not a
  content model. There is no pedagogy behind which cue appears when, no difficulty
  curve, no link to the lesson plan, and no teacher control over the deck.

**Treat Carousel as an open product question, not a shipped activity.** Before it is
real it needs: the final visual language for the cues, a content/deck model, a
decision on whether the cue carries a word label at all (currently it does not — the
picture *is* the cue), and a Teacher Cockpit surface for selecting/authoring the deck.

## 2. Copy is still placeholder in several states

Explicitly marked `[Placeholder copy]` or written as prototype filler:

- **Waiting / return screen** — “Camera and mic are needed for room practice. You’ll
  wait here until the room activity ends. [Placeholder copy]”
- **Partner-left popup** — “Oh no — it looks like your partner left the room. We’ll
  move you into solo practice shortly. [Placeholder copy]”
- **Report screen** — “Tell us what happened in the room. The teacher/helper will be
  able to review it. [Placeholder copy]”
- **Solo Room** — the heading is “Solo activity”, the body is a one-liner, and the
  activity itself is literally tagged `Activity TBD`.
- The TIP player’s duration (`0:12`) and waveform are simulated.

None of this has been through a copy pass. It should not ship as-is.

## 3. The Lottie yellow is baked as `#FEE300`

Every yellow in the UI was unified to the brand token **`#F9E24C`** in v14 —
including Spark.svg, whose baked `#FFE300` was repainted at the icon source.

The **matkot ball inside the Lottie is the one remaining exception**. It is a raster
`image_0` asset (base64 PNG, 231×231) whose fill is baked at **`#FEE300`**. In v21
that asset was regenerated to add the charcoal stroke, and the original yellow was
**deliberately preserved**, because that pass was scoped to the stroke only.

**Future asset cleanup pass:** repaint the ball’s fill to `#F9E24C` in the same
asset, and while in there, audit the paddle assets (`image_1`, `image_2`) and the
base64 reaction SVGs (`RX.clap` / `RX.cheers` / `RX.heart`), which have not been
colour-audited at all. This is a one-file, no-behavior change.

## 4. Mobile adaptation

This surface is **desktop only**. There is no mobile layout, no touch target pass and
no responsive behavior below the `w-narrow` (820px) debug width. The Duo split view,
the tile-attached timer, the Carousel cue on the seam, and the footer dock all assume
a wide landscape frame.

A mobile pass needs its own decisions on: split view vs stacked tiles, where the
activity timer lives when there is no seam, whether the Carousel cue becomes an
overlay, and how Leave & report survives a thumb-reachable footer.

## 5. Teacher Cockpit integration

**Every teacher event in this file is simulated by a debug button.** The student room
has no real channel. The next pass should define the actual contract:

- `Teacher started the timer` → the event that moves an activity from `prepared` to
  `running`. Today it is a button.
- **TIP** replays “the teacher’s recorded instruction”, recorded in Cockpit via
  *Broadcast & record instructions*. Today the player is a placeholder with a
  simulated 12-second clip.
- **Start another set** (Intensive / Grandma / Carousel) is a manual teacher action
  with no wire behind it.
- The **room clock** (`ST.roomLeft`, 01:48) is local to this file. In the product it
  is owned by the session, not the student.
- Camera/mic enforcement, partner-left and uneven-student events all arrive from
  outside in the real product; here they are debug triggers.
- Still open from earlier passes: **Activity Launcher vs. Lesson Plan auto-sync**,
  and which teacher actions auto-emphasise the Student Preview Inspector.

---

## Smaller items worth a line

- **Dead CSS.** The superseded `.clock.v11` and `.clock.vt` rule blocks from v11–v18
  are inert (the timer emits `.vt3`) but still sit in the file. A sweep is safe and
  would shrink the stylesheet, but it was deliberately not done inside a packaging
  task.
- **Grandma turn length** is 10s per student, carried over from an early recipe note.
  It has never been confirmed against the PRD.
- **No intra-round handoff in Grandma.** The PRD lists only a 5s break *between*
  rounds, so within a round the yellow frame simply moves from You to Dana with no
  countdown. Confirm that is intended.
- **Dialogue auto-returns** after Done; the other activities stay on Done and wait for
  another set. That asymmetry is faithful to the PRD but reads inconsistent.
- **The “time’s up” screen is terminal** in this prototype — there is no Main Room to
  return to, so it simply sits there.
- **Presentation-mode scaling** for the student prototypes as a whole has never had a
  dedicated pass; only the timer was solved properly.
- **No live browser was ever available** during these passes. Everything was validated
  with `node --check`, a headless DOM-stub harness (163 assertions), offline SVG
  rasterisation with pixel probes, a CSS cascade resolver, and diffs. A human should
  still open this in Chrome and Safari before it is treated as final.
