# CHANGELOG — Student Main Classroom · Desktop

From the earlier Main Classroom versions through to this checkpoint (**v8**).

**v3–v5** are reconstructed from the design notes carried inside the file itself. **v6–v8** were built in
sequence, each on top of the previous stable file, with the source left byte-identical and a diff proving
every change was confined to its intended region.

---

## v3 — chrome polish

- **Student controls are never green in the Main Room.** Neutral = available / on; a red slash = off /
  unavailable. Green stays reserved for true on-air or success states.
- **The right sheets became overlays.** Chat / Timeline / Participants open as floating milky-dark blurred
  sheets anchored by the fixed right rail. The stage underneath is not pushed or resized.
- **Participants avatars** moved to the layered Citizen avatar (white front, yellow back, charcoal stroke)
  with a charcoal-stroked level dot. Teacher / Helper role badges preserved.
- The teacher video sat in a large rounded stage card with Rooms-consistent corners.

## v4 — cleanup + fixes

- **Presentation scale:** the videos use the available stage width. The default teacher video became an
  expansive broadcast stage rather than a small centred card.
- **The active / demo frame became brand yellow**, and the **“SPEAKING” label was removed** — green stays
  for success only.
- The circular timer moved to the upper-right of the stage.
- The right rail stays present and clickable during transition screens.
- **Removed:** the student-facing “no volunteers” state, the Solo fallback (Solo lives only in Practice
  Rooms), and the written prompt.

## v5 — layering cleanup

- **The default teacher video went full-bleed again** — no inset, no card, no containment.
- **No teacher chip on the full-bleed video**; the teacher's name lives in the header.
- The Participants level-dot stroke was thinned to match the avatar outline.
- The right rail and any opened sheet now render **above** the transition overlay and stay usable.
- **Removed the “You're on stage” label** from the demonstrating student's video — the split view and the
  prior consent are enough.
- The 3-2-1 handoff frame is brand yellow from the start.

---

## v6 — system alignment

### Demonstration became a real draw

Before v6, pressing *Yes* chose you **immediately**. There was no draw.

- **One popup, consent included.** Copy fixed to *“…shared with the rest of the **class**.”*, and the
  trailing *“Do you agree?”* removed. **No second confirmation** for the chosen student.
- **The 10s window is a class event.** *Yes* joins the pool and shows a calm *“You're in — picking a
  volunteer…”* state; *Not this time* closes the popup but **the draw keeps running behind it**.
- **After 10 seconds, one student is picked at random** from everyone who said yes. Debug: rig the draw,
  and set how many other students volunteered.

### Demonstration view

- **The chosen student's self-view now folds.** In v5 it simply *disappeared*. It folds into the edge tab
  (*“You · in the demonstration”*) because they are already on the split view and their camera + mic are
  shared **for that state only**.
- **End demonstration** returns everyone to the basic Main Room and the chosen student to muted.

### Mic + visual

- **The locked mic explains itself:** *“Your mic opens only during class activities or when the teacher
  invites you.”* — on hover and in the popover. **No room-style enforcement.**
- **Plain metadata stopped being a chip:** the Session timer became flat text. *Now* and *REC* kept their
  chips, because they are semantic status.

> A calm **no-volunteer fallback card** was added in v6 because the brief asked for one — reversing a v4
> decision. It was flagged as an open question, and **v7 removed it again**.

---

## v7 — final alignment

### The timer is now the Practice Rooms component

- Milky face, **charcoal track**, progress that **fills forward** into brand yellow, and in the final 5
  seconds the arc and the leading ball turn **coral `#F9746B`**. The number stays charcoal.
- R 26.5 · **one stroke weight of 1.4** for track, progress and ball · ball fill r 4.6 painted last so the
  arc endpoint can never be exposed · **no SVG filters**.
- **The ball moves every animation frame** (`requestAnimationFrame`); only the number ticks once a second.
  The phase buttons stay **static review snapshots**, deliberately not interpolated.
- **Activity logic and timings were not changed.** The existing phase model (30s / ≤10s / ≤5s / done) maps
  onto a remaining-seconds value on a 30s total, so the coral state falls out of the ≤5s phase that already
  existed.
- Spark.svg still carried a baked `#FFE300`; it was repainted to the canonical `#F9E24C`.

### Done

The Practice Rooms badge: a milky pill, a thin charcoal stroke, a yellow check disc, **“Done!”** optically
centred, and **one** sparkle outside the pill. No green, no yellow backing layer. It appears wherever the
timer completes.

### The student-facing “no volunteers” state was removed

An empty pool now returns the student **silently** to the normal Main Room. No popup, no card, no toast, no
empty state. Only the teacher / Cockpit would know; in the prototype it surfaces in the **debug note only**.

### Carousel arrived

A Main Room **visual layer** — a character card on the shared stage, auto-switching every 5 seconds, with a
thin loader bar. Silhouette only, no written labels, no pedagogy, no room controls. **It is not a room
transition** and nothing routes anywhere. No Practice Rooms code was copied in.

### Session timer

13.5px → **16.5px / 700**. Still flat status text — no pill, no badge.

### Operation Grandma

Not expanded, not rebuilt. Marked **legacy / debug only**, since the real activity now lives in Practice
Rooms.

---

## v8 — header title + Carousel placeholder slot (this checkpoint)

- **Header title:** *“Vitamin Session”* → **“Gym”**. The subtitle stays **with Niv Rubin**.
- **The Carousel visual became an explicit placeholder slot, not artwork.** Each cue is a standalone
  data-URI dropped into an `<img>` with **`object-fit: contain`**, so the final image or illustration can
  be swapped in by **replacing one string** in `CAR_SLOTS` — no markup change, no CSS change. A different
  aspect ratio will still sit correctly inside the same slot.
- **One token pair drives the size:** `--car-slot-w` / `--car-slot-h`. Resize in one place; the card, the
  narrow width and presentation mode all follow.
- **Slightly larger:** 118×137 → **160×186** (132×154 narrow, **208×242** in presentation).
- **It reads as provisional** — a soft dashed frame around the slot, deliberately not designed as final art.
- Behaviour unchanged: appears on Carousel, auto-switches every 5s, advances with *Next character*,
  disappears on *End Carousel*. It stays **365px clear** of the teacher's face.
