# Notes for next pass — Student Main Classroom Mobile (from v6b)

This base is frozen at v6b. Continue from a copy of `index.html` under a new versioned filename;
never edit files inside this checkpoint folder.

## Recommended next passes (in order)

1. **Demonstration visual states (demo split)**
   - Add the demonstration / paired-demo presentation state to the Main Room.
   - Active/demo framing uses brand yellow, not green; no "SPEAKING" label.
   - Keep it a Main Room state — do not import Practice Rooms layout or routing.

2. **Volunteer popup flow**
   - Add the volunteer invitation + acknowledgement flow.
   - Confirm the no-volunteers state is never shown to students.

3. **Carousel / activity visual aids**
   - Add the Carousel activity visual aids. Grammar cues (Masculine / Feminine / Plural) are
     confirmed — it is not a roleplay character deck. Final artwork for the visual placeholder
     slot is still pending.

## Carry-over open questions (do not silently resolve)

- **Live countdown vs discrete states:** the activity timer currently exposes discrete states
  (running / final-5 / Done) via debug buttons, with smooth arc/ball motion during running/final
  driven by an in-place rAF (no re-render). Decide whether a real end-to-end countdown that
  auto-advances running -> final -> Done is wanted, and whether the main-room countdown should be
  3-2-1 or 5 seconds to match the activity recipes.
- **Timer/activity source of truth:** if the activity timer later needs to be driven by real
  activity data (not debug), define where that state comes from without importing Practice Rooms
  routing.
- **Ephemeral seed persistence:** the three seed messages in the passive overlay are persistent so
  the default base looks unchanged; only sent/injected messages expire. Decide whether seeds should
  also auto-expire.
- **Real-device QA:** safe areas, Dynamic Island, and thumb reach not yet validated on hardware
  (no live browser in the build environment). Re-check the v6b timer safe-zone on real devices.
- **FedraSerifPro export:** not embedded on this surface; if added later, a git-safe base64
  export/stripping step will be needed.

## Scope discipline reminders

- One pass = one bounded scope. Do not touch Teacher Cockpit, Practice Rooms, or Desktop files
  during a mobile pass.
- Additive-only CSS in later-wins override blocks; do not modify established rules.
- Validate every pass with `node --check` plus a headless DOM-stub harness before delivery, and
  checksum this checkpoint's files before/after to confirm they were not touched.
- Create a new checkpoint only on explicit approval.
