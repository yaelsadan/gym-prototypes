# Student Main Classroom — Mobile · v6b (Timer + Done) Checkpoint

**Surface:** Student Main Classroom (Mobile)
**Checkpoint:** `student-main-classroom-mobile-v6b-timer-done-checkpoint`
**Frozen file:** `index.html` (byte-identical to `student-main-classroom-mobile-base-v6b-timer-placement.html`)
**Status:** Frozen. Do not modify files in this folder.

Single self-contained HTML file. All assets are embedded (base64 video-placeholder still,
base64 Spark raster for helper chat, inline SVG icons including the vector Done sparkle). No
external runtime dependencies apart from the Assistant webfont loaded from Google Fonts.

---

## This checkpoint INCLUDES

- **Main Room Mobile base** — the classroom base (status bar, header with session meta
  "Gym · with Niv Rubin" and persistent session timer, Now chip, teacher video stage, scrims).
- **Rail sheets** — Chat / Timeline / Participants, opening above the room; close via X or backdrop.
  The rooms/rail panel never scrolls.
- **Chrome reduce/reveal** — passive orientation chrome (title, Now chip, REC, rail opacity) fades
  after inactivity and reveals on tap; an open sheet or the mic tooltip pins chrome on. The header
  session timer never fades.
- **Interactive chat** — functional main composer and Chat sheet composer; typing activates Send
  (brand yellow); Enter sends; input clears after send; both post to one shared history.
- **Ephemeral chat** — new messages enter bottom-left over the stage, newest at the bottom, older
  rise/fade and disappear after a few seconds; helper keeps the yellow left rule + Spark; hidden
  passive chat is not reopened by new messages; no badge/counter/pulse.
- **Branded avatars** — the Citizen layered soft avatar (white front, 1.5px charcoal stroke, offset
  yellow/charcoal back) across the passive overlay, full Chat sheet, and Participants sheet;
  level dots carry the charcoal stroke; helper/teacher/classmate/You all use this language.
- **Self-view drag / collapse / expand** — floats and is draggable; releasing near a left/right
  edge collapses it to an edge tab (camera stays on); the tab expands it back.
- **Mic tooltip** — tapping the teacher-controlled muted mic shows an informational tooltip
  (no modal, no routing, no enforcement).
- **Activity timer** — the approved Citizen timer component: milky circular face, thin charcoal
  track, yellow fill-forward arc + leading ball, charcoal number, smooth movement; no SVG
  filter/drop-shadow artifacts; one timer style only.
- **Final 5 seconds** — the arc and leading ball turn coral (#F9746B) and the clock pulses; the
  number stays charcoal.
- **Done state** — the approved Done component: milky pill, thin charcoal stroke, yellow circular
  check icon, "Done!", one sparkle, no green.
- **Approved stable timer placement** — dedicated upper-left Main Room activity safe-zone
  (top:176px, left:16px, 90px clock): below the Now chip, off the teacher's face, clear of
  self-view, rail, and composer; never clipped; taps pass through (pointer-events:none). The timer
  stays visible when chrome is reduced.

---

## This checkpoint DOES NOT include

- **Demo split** — no split-view demonstration state.
- **Volunteer popup** — no volunteer invitation / acknowledgement flow.
- **Carousel** — no Carousel activity or grammar-cue visual aids.
- **Practice Rooms routing / footer / enforcement / waiting / solo** — none of the Practice Rooms
  behaviors (routing, footer, mic enforcement, waiting screens, Solo room) are present.

These are intentionally out of scope for this base. See `notes-for-next-pass.md`.

---

## Validation performed at checkpoint

- `node --check` passes on the script block.
- `index.html` is byte-identical to the approved `student-main-classroom-mobile-base-v6b-timer-placement.html` (md5 verified).
- `index.html` opens well-formed.
- Default state matches the approved base (no activity overlay until triggered).
- Rail sheets, chat send (main + Chat sheet), ephemeral appear/fade, chrome reduce/reveal,
  branded avatars, self-view drag/collapse/expand, mic tooltip, activity timer, final 5 seconds
  (coral #F9746B), Done, and the approved timer placement all confirmed intact.
- No demo / volunteer / Carousel added.
