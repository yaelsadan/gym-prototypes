# CHANGELOG — Student Main Classroom Mobile (base line)

Progression that produced this v9c checkpoint. Each pass was explicitly scope-bounded and
validated (`node --check` + a headless DOM-stub harness) before delivery.

## Base mobile Main Room
- Classroom base: status bar, Gym header (session meta + persistent session timer, quiet REC),
  Now chip, teacher video stage with scrims, right rail, always-visible composer, floating self-view.

## Rail sheets
- Chat / Timeline / Participants sheets open above the Main Room. Rooms/rail panel never scrolls.

## Chrome reduce/reveal
- Passive orientation chrome fades after inactivity and reveals on tap; sheet/tooltip pin it on.
  Session timer made persistent (never fades).

## Interactive chat
- Both composers made functional (typing activates Send; Enter sends; input clears; shared history).
- Ephemeral live overlay engine: messages enter bottom-left, newest at the bottom, older rise/fade;
  helper keeps yellow rule + Spark; hidden chat not reopened; no badge/counter/pulse.

## Branded avatars
- Generic beige initial-circles replaced with the Citizen layered soft avatar across the passive
  overlay, Chat sheet, and Participants sheet; level dots get the charcoal stroke.

## Activity timer / final 5 / Done
- Added the approved Citizen timer component (milky face, thin charcoal track, yellow arc + leading
  ball, charcoal number; one style). Final-5: coral (#F9746B) arc + ball, pulse, charcoal number.
  Done: milky pill + yellow circular check + "Done!" + one sparkle, no green.
- Timer placement stabilised to the upper-left safe-zone.

## Demonstration visual states
- Main Room portrait split: teacher + selected student, yellow current-turn frame, branded name chip
  / avatar placeholder. "I am selected" folds the self-view; "someone else selected" keeps the viewer
  self-view. No "Speaking"/"YOUR TURN"/teacher label. Polished: quiet fold, 2px turn frame, demo
  passive chat reduced to one compact message, selected-student avatar kept clear of chat/composer.

## Carousel placeholder
- Visual-only activity-cue overlay (translucent panel + provisional dashed SLOT + 5s progress bar).
  One cue at a time, auto-switch every 5s, Show/Next/Hide debug controls. Token-driven size/position;
  final art swaps into the slot (object-fit:contain). Documented as strictly visual-only.

## Automatic timer-to-Done
- A running/final timer that reaches 0 automatically transitions to the Done component (no click);
  final-5 still happens first; works in default and demo. Done wins over the Carousel.

## Persistent vertical rail above sheets
- Reversed the earlier in-sheet-header navigation. The rail is persistent chrome: vertical, right
  side, in the same position as default Main Room, raised above the sheet + scrim so it stays
  visible/tappable while a sheet is open. Active-tap closes, other-tap switches, X remains an extra
  close. The in-header sheet-nav was removed entirely.

## Volunteer popup flow
- Compact Citizen/Gym modal above all room chrome: soft scrim, milky card, charcoal stroke, yellow
  primary + neutral secondary button, visible 10-second countdown. "Not this time" and timeout close
  quietly. No second confirmation popup; no student-facing no-volunteers state.
- Debug group added: Start popup / I click Yes / I click Not this time / Timeout / Pick me / Pick
  someone else / No volunteers / End demonstration (consolidated with the old demo buttons).

## Volunteer waiting-to-be-picked state
- "Yes" enters the volunteer pool only — it no longer feels like plain default and never enters the
  demo split directly. A calm chip reads "You're in · waiting to be picked" and clears on Pick me /
  Pick someone else / No volunteers / End demonstration.

## Chat rail safe-zone
- Sheet content now reserves a fixed right-side safe zone where the persistent rail sits, so chat
  messages (especially own/right-aligned ones) and the sheet composer never run under the rail.
  Applied to Chat, Timeline and Participants. The rail itself was not moved.

## Self-view reopen fix
- Root cause: the tab's `pointerup` handler called `render()` on a simple tap, destroying the button
  before the browser could fire `click`, so the reopen handler never ran. A tap (movement < 6px) now
  expands the self-view. Works collapsed-left and collapsed-right and in "Demo: someone else
  selected"; the folded selected-self state in "Demo: I am selected" stays quiet/disabled.

## Passive overlay fade behavior
- Seeded/default overlay messages are no longer persistent: every passive overlay message now fades
  after ~6 seconds, like sent and injected ones. Full history remains in the Chat sheet; hidden chat
  stays hidden and is never reopened by incoming messages.

## v9c popup copy and typography polish
- Body shortened to "Niv is looking for one volunteer." and consent to "…shared with the class." to
  remove the orphan last word; body 14 → 15px, consent 12 → 13px (title unchanged and strong), plus
  a text-wrap orphan guard. No structural, behavioural, button or countdown change.

---

**This checkpoint = v9c frozen.** Next passes (volunteer flow integration with the cockpit, real
volunteer pool/draw, final Carousel artwork, optional timer halo parity, and final cleanup) are
documented in `notes-for-next-pass.md` and are intentionally NOT in this base.
