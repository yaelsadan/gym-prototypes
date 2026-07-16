# CHANGELOG — Student Main Classroom Mobile (base line)

Progression that produced this v6b checkpoint. Each pass was explicitly scope-bounded and
validated (`node --check` + headless DOM-stub harness) before delivery.

## Base — Default Main Room Mobile
- Classroom base: status bar, header (session meta + persistent session timer, quiet REC),
  Now chip, teacher video stage with scrims, right rail, always-visible composer, floating self-view.

## Rail activation — Chat / Timeline / Participants sheets
- Three rail sheets open above the Main Room, closable via X or backdrop. Rooms/rail panel never scrolls.

## Chrome reduce/reveal
- Passive orientation chrome fades after inactivity and reveals on tap; an open sheet or the mic
  tooltip pins chrome on. Session timer made persistent (never fades).

## Interactive chat behavior (v4)
- Both composers made functional (typing activates Send; Enter sends; input clears; shared history).
- Ephemeral live overlay engine: sent/injected messages enter bottom-left, newest at the bottom,
  older rise/fade/expire; helper keeps yellow rule + Spark; hidden chat not reopened; no badge/counter/pulse.
- Outside-the-phone debug injectors: classmate / helper / clear.

## Branded avatars / identity surfaces (v5)
- Replaced generic beige initial-circles with the Citizen layered soft avatar (white front, 1.5px
  charcoal stroke, offset yellow/charcoal back), reused exactly from Desktop Main Room, across the
  passive overlay, Chat sheet, and Participants sheet; level dots get the charcoal stroke.
- v5 checkpoint frozen.

## Activity timer + Final 5 seconds + Done (v6)
- Added the approved Citizen timer component (milky face, thin charcoal track, yellow arc + leading
  ball, charcoal number, no SVG-filter artifacts; one style), reused from Practice Rooms Mobile.
- Final 5 seconds: arc + ball turn coral (#F9746B) and the clock pulses; number stays charcoal.
- Done: milky pill + thin charcoal stroke + yellow circular check + "Done!" + one sparkle, no green.
- Discrete states via outside-the-phone debug buttons; smooth arc/ball movement via in-place rAF
  (no re-render). Behavior JS is additive; chat/chrome/rail/self-view/mic/avatars unchanged.

## Timer placement fix (v6b)
- Placement-only. Moved the activity overlay out of top-center (off the teacher's face) into a
  dedicated upper-left Main Room safe-zone (top:176px, left:16px), below the Now chip, over calmer
  background; clock scaled 100px -> 90px. Clears face, Now chip, self-view, rail, composer; not
  clipped; pointer-events:none; stays visible when chrome is reduced.
- Additive later-wins CSS only; JS byte-identical to v6. No change to component language or colors.

---

**This checkpoint = v6b frozen.** Next passes (demonstration split; volunteer popup; Carousel
visual aids) are documented in `notes-for-next-pass.md` and are intentionally NOT in this base.
