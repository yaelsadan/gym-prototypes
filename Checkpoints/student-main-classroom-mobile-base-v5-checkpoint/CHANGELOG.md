# CHANGELOG — Student Main Classroom Mobile (base line)

Progression that produced this v5 checkpoint. Each pass was explicitly scope-bounded and
validated (`node --check` + headless DOM-stub harness) before delivery.

## Base — Default Main Room Mobile
- Established the pre-activity classroom base: status bar, header (session meta + persistent
  session timer, quiet REC), now-chip, teacher video stage with scrims, right rail, always-visible
  composer, and the floating self-view.
- No activity / timer / Done / Carousel / volunteer / transitions.

## Rail activation — Chat / Timeline / Participants sheets
- Added the three rail sheets opening above the Main Room (Chat, Timeline, Participants), each
  closable via X or backdrop. Rooms/rail panel never scrolls.
- Static passive chat overlay with hide/show; browse-only Participants; current + later-today Timeline.

## Chrome reduce/reveal
- Added passive-chrome reduce/reveal: orientation chrome (title, now-chip, REC, rail opacity)
  fades after inactivity and reveals on tap; an open sheet or the mic tooltip pins chrome on.
- Session timer made persistent — it never fades with the rest of the chrome.

## Interactive chat behavior (v4)
- Made both composers functional. Main composer converted from a static placeholder to a real
  input; typing activates Send (brand yellow); Enter sends; input clears after send.
- Chat sheet composer wired to send into the same shared history with scroll-to-newest.
- Introduced the ephemeral live overlay engine (FEED): sent/injected messages enter bottom-left,
  newest at the bottom, older rise/fade/expire after a few seconds; helper keeps yellow rule + Spark;
  hidden passive chat is not reopened by new messages; no badge/counter/pulse.
- Added outside-the-phone debug injectors: Inject classmate / Inject helper / Clear ephemeral.

## Branded avatars / identity surfaces (v5)
- Replaced the generic beige initial-circles with the Citizen "layered soft avatar" reused
  exactly from Desktop Main Room (white front + 1.5px charcoal stroke + offset yellow/charcoal
  back via double box-shadow). Initials retained inside.
- Applied to the passive overlay, full Chat sheet, and Participants sheet; level dots carry the
  charcoal stroke. Helper / teacher / classmate / You identities all use this language.
- CSS-only, additive (later-wins). Behavior JS unchanged (byte-identical to v4).

---

**This checkpoint = v5 frozen.** Next passes (activity timer + final 5 seconds + Done;
demonstration visual states; volunteer popup; Carousel visual aids) are documented in
`notes-for-next-pass.md` and are intentionally NOT in this base.
