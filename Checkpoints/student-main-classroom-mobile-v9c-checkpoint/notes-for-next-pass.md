# Notes for next pass — Student Main Classroom Mobile (from v9c)

This base is frozen at v9c. Continue from a copy of `index.html` under a new versioned filename;
never edit files inside this checkpoint folder.

## Open notes

1. **Volunteer flow integration**
   - Connect the teacher/cockpit "Start Demonstrating" action to the student volunteer popup.
   - Connect a real volunteer pool / random draw to the existing demo visual states.
   - No second confirmation popup.
   - No student-facing no-volunteers state.

2. **Demonstration behavior**
   - The selected student enters the split.
   - Other students watch the split.
   - End demo returns everyone to the Main Room.
   - The selected student returns to muted / non-broadcasting.

3. **Carousel**
   - Replace the placeholder with final character-cue artwork.
   - Keep it visual-only.
   - No text labels such as male/female/singular/plural or זכר/נקבה/יחיד/רבים inside the phone UI.
   - Final artwork should be swappable through the existing image slot / object-fit:contain.

4. **Timer polish**
   - Optional: make the demo timer and the default timer visually identical in halo/shadow treatment.
   - Do not redesign the timer.

5. **Final cleanup**
   - Remove dead CSS / old comments only after the feature states are stable.
   - Keep the persistent rail rule documented as product behavior.

## Scope discipline reminders

- One pass = one bounded scope. Do not touch Teacher Cockpit, Practice Rooms, or Desktop files
  during a mobile pass.
- Additive-only CSS in later-wins override blocks; do not modify established rules except where a
  pass explicitly mandates a removal.
- Validate every pass with `node --check` plus a headless DOM-stub harness before delivery, and
  checksum this checkpoint's files before/after to confirm they were not touched.
- Create a new checkpoint only on explicit approval.
