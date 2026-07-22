# Gym Current Handoff Status v1

## Source of truth for development

Use the files under `Current/`:

- `Current/student-main-classroom-desktop/index.html`
- `Current/student-main-classroom-mobile/index.html`
- `Current/student-practice-rooms-desktop/index.html`
- `Current/student-practice-rooms-mobile/index.html`
- `Current/teacher-cockpit-desktop/index.html`

Do not use files from Downloads.
Use `Checkpoints/` only for rollback/history.

## Current status

### Student Main Classroom Desktop
Current includes:
- Main Room desktop state
- Demonstration split
- Demonstration + Carousel
- Demonstration + Timer
- Demonstration + Carousel + Timer centered in the gutter
- General activity timer positioned upper-left
- Practice Room transfer screen
- Room consent
- Waiting-return screen

### Student Main Classroom Mobile
Current includes:
- Main Room mobile v9/v10 behavior
- Volunteer popup flow
- Practice Room entry bridge
- Room consent
- Yes → transfer screen
- Not now / timeout → waiting-return

### Student Practice Rooms Desktop
Current includes:
- Duo room
- Room consent
- Practice Room transfer
- Waiting-return with room countdown
- Camera/mic off confirmation
- Leave room / report routing
- Partner-left → Solo after acknowledgement
- Dialogue / Intensive / Operation Grandma / Carousel activity states

### Student Practice Rooms Mobile
Current includes:
- Mobile Duo room
- Room consent
- Practice Room transfer
- Waiting-return with room countdown
- Camera/mic off + leave → waiting-return with countdown
- Partner-left → Solo after acknowledgement
- Report screen polish
- Dialogue / Intensive / Operation Grandma / Carousel activity states

### Teacher Cockpit Desktop
Current includes:
- Teacher Cockpit desktop
- Activity controls
- Room preview / helper-related states
- Instructor Notification:
  - assigning in progress
  - all students placed successfully

## Known simulation / not production logic

These prototypes are still standalone HTML simulations.

Not yet production/back-end logic:
- Real student pairing
- Real room assignment
- Real media routing
- Real camera/mic permissions
- Real Teacher Cockpit → Student event dispatch
- Real volunteer pool/random draw
- Real timer synchronization across clients
- Real TIP recording/playback integration

## Remaining product/dev gaps to audit

1. Practice Rooms activity timing:
   - Intensive Exercise = 75 seconds
   - Dialogues = 80 seconds
   - Carousel = 60 seconds

2. Teacher → Student event contract:
   - send to rooms
   - consent yes/no/timeout
   - students assigned
   - instructor notification
   - room start/end
   - return to main room

3. Final copy pass:
   - consent copy
   - waiting-return copy
   - partner-left copy
   - report copy

4. Final visual polish:
   - Carousel final artwork
   - timer consistency
   - brand identity pass
