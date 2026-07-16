# Student Main Classroom — Mobile · Base v5 Checkpoint

**Surface:** Student Main Classroom (Mobile)
**Checkpoint:** `student-main-classroom-mobile-base-v5-checkpoint`
**Frozen file:** `index.html` (byte-identical to `student-main-classroom-mobile-base-v5-chat-avatars.html`)
**Status:** Frozen. Do not modify files in this folder.

This is a single self-contained HTML file. All assets are embedded (base64 video-placeholder
still, base64 Spark icon, inline SVG icons). No external runtime dependencies apart from the
Assistant webfont loaded from Google Fonts.

---

## This checkpoint INCLUDES

- **Default Main Room Mobile** — the pre-activity classroom base (status bar, header with
  session meta "Gym · with Niv Rubin", now-chip, teacher video stage, scrims).
- **Working rail sheets: Chat / Timeline / Participants** — open above the room; close via the
  X button or the backdrop. The rooms/rail panel never scrolls.
- **Passive chat hide/show** — the passive overlay can be hidden and restored via a quiet
  affordance (no badge, no counter, no pulse).
- **Interactive main composer** — real text input; typing activates the Send button (brand
  yellow = active/CTA); sending posts to history, clears the input, and flashes the overlay.
  Enter also sends.
- **Interactive Chat sheet composer** — real input inside the Chat sheet; typing activates its
  Send; sending appends to the same shared chat history and scrolls to the newest message.
- **Ephemeral live chat overlay** — new messages enter bottom-left over the stage, newest at the
  bottom, older ones rise, fade, and disappear after a few seconds. Helper messages keep the
  yellow left rule + Spark. If the passive chat is hidden, new messages do NOT reopen it.
  Debug injectors (classmate / helper / clear) live outside the phone frame.
- **Branded avatars / identity surfaces** — the Citizen "layered soft avatar" (white front
  circle + 1.5px charcoal stroke + offset yellow/charcoal back) reused from Desktop Main Room,
  applied to the passive overlay, full Chat sheet, and Participants sheet. Initials stay inside.
  Level dots carry the charcoal stroke; helper/teacher/classmate/You identities all use this
  language.
- **Chrome reduce/reveal behavior** — passive orientation chrome (title, now-chip, REC, rail
  opacity) fades after inactivity and reveals on tap; an open sheet or the mic tooltip pins
  chrome on.
- **Persistent session timer** — the header session timer never fades with the rest of the
  chrome; it stays readable in the reduced state.
- **Self-view drag / collapse / expand** — the self-view floats and is draggable; releasing near
  a left/right edge collapses it to an edge tab (camera stays on); the tab expands it back.
- **Mic tooltip** — tapping the teacher-controlled muted mic shows an informational tooltip
  (no modal, no routing, no enforcement).

---

## This checkpoint DOES NOT include

- **Volunteer popup** — no volunteer invitation / acknowledgement flow.
- **Demonstration split** — no split-view demonstration state.
- **Activity timer** — no activity countdown / timer recipe on this surface.
- **Final 5 seconds** — no final-countdown state.
- **Done state** — no activity-complete / Done control.
- **Carousel** — no Carousel activity or grammar-cue visual aids.
- **Practice Rooms routing / footer / enforcement / waiting / solo** — none of the Practice
  Rooms behaviors (routing, footer, mic enforcement, waiting screens, Solo room) are present.

These are intentionally out of scope for this base. See `notes-for-next-pass.md` for the
recommended sequence of future passes.

---

## Validation performed at checkpoint

- `node --check` passes on the script block.
- `index.html` is byte-identical to the approved `student-main-classroom-mobile-base-v5-chat-avatars.html` (md5 verified).
- Default state matches approved v5 (branded avatars present; nothing else changed).
- Rail sheets, passive chat hide/show, main composer send, Chat sheet composer send, ephemeral
  appear/fade, chrome reduce/reveal, self-view drag/collapse/expand, and mic tooltip all confirmed intact.
- No demo / timer / Done / Carousel / volunteer added.
