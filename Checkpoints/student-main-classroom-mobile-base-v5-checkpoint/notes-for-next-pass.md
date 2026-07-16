# Notes for next pass — Student Main Classroom Mobile (from v5)

This base is frozen at v5. Continue from a copy of `index.html` under a new versioned filename;
never edit files inside this checkpoint folder.

## Recommended next passes (in order)

1. **Activity timer + final 5 seconds + Done**
   - Add the activity countdown/timer to the Main Room, the final-5-seconds state, and the Done
     (activity-complete) state.
   - Reuse the Teacher Cockpit rule: selecting/preparing an activity prepares the timer; the
     timer is manually started. Keep yellow = turn/active, never running/success; green stays
     reserved for on-air/success only.
   - Open question to carry in: whether the main-room countdown moves from 3-2-1 to 5 seconds to
     match the activity recipes.

2. **Demonstration visual states**
   - Add the demonstration visual states (the paired/demo presentation) as a Main Room state.
     Active/demo framing uses brand yellow, not green; no "SPEAKING" label.

3. **Volunteer popup flow**
   - Add the volunteer invitation + acknowledgement flow. Confirm the no-volunteers state is
     never shown to students.

4. **Carousel / activity visual aids**
   - Add the Carousel activity visual aids. Grammar cues (Masculine / Feminine / Plural) are
     confirmed — it is not a roleplay character deck. Final artwork for the visual placeholder
     slot is still pending.

## Carry-over open questions (do not silently resolve)

- **Ephemeral seed persistence:** in v5 the three seed messages in the passive overlay are
  persistent (they do not auto-expire) so the default base looks unchanged; only sent/injected
  messages expire. Decide whether seed/base messages should also auto-expire.
- **Real-device QA:** safe areas, Dynamic Island, and thumb reach not yet validated on hardware
  (no live browser available in the build environment).
- **FedraSerifPro export:** if the brand serif is later embedded on this surface, a git-safe
  base64 export/stripping step will be needed. (Not embedded in v5.)

## Scope discipline reminders

- One pass = one bounded scope. Do not touch Teacher Cockpit, Practice Rooms, or Desktop files
  during a mobile pass.
- Additive-only CSS in later-wins override blocks; do not modify established rules.
- Validate every pass with `node --check` plus a headless DOM-stub harness before delivery, and
  checksum this checkpoint's files before/after to confirm they were not touched.
- Create a new checkpoint only on explicit approval.
