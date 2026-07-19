# Student Main Classroom — Mobile · v9c Checkpoint

**Surface:** Student Main Classroom (Mobile)
**Checkpoint:** `student-main-classroom-mobile-v9c-checkpoint`
**Frozen file:** `index.html` (byte-identical to `student-main-classroom-mobile-base-v9c-popup-copy.html`)
**Status:** Frozen. Do not modify files in this folder.

Single self-contained HTML file. All assets are embedded (base64 video-placeholder still, base64
Spark raster for helper chat, inline SVG icons and Carousel placeholder art). No external runtime
dependencies apart from the Assistant webfont loaded from Google Fonts.

---

## This checkpoint INCLUDES

- **Main Room Mobile default state** — the pre-activity classroom base.
- **Gym header and session timer** — session meta ("Gym · with Niv Rubin") with a persistent
  session timer that never fades with the rest of the chrome.
- **Chrome reduce/reveal behavior** — orientation chrome fades after inactivity and reveals on tap;
  an open sheet or the mic tooltip pins chrome on.
- **Persistent vertical right-side rail** — the rail is persistent chrome: vertical, right side,
  lower-right, in the same position as default Main Room.
- **Rail sheets: Chat / Timeline / Participants** — open above the room.
- **Rail remains visible and tappable above sheets** — raised above the sheet and scrim, in the
  same right-side position. Never moved into the sheet header, never a horizontal row.
- **Tapping the active rail item closes the current sheet.**
- **Tapping another rail item switches sheets directly.** The X remains an additional close option.
- **Interactive main chat composer** — typing activates Send (brand yellow); Enter sends; input
  clears; posts to the shared history and flashes the overlay.
- **Interactive Chat sheet composer** — sends into the same shared history with scroll-to-newest.
- **Ephemeral live chat overlay that fades** — all passive overlay messages (including the seeded
  ones) fade out after ~6 seconds; newest at the bottom, older rise and disappear. Helper messages
  keep the yellow left rule + Spark. Hidden passive chat is never reopened by new messages; no
  badge, counter or pulse. In demo it shows one compact message so it does not cover the student.
- **Full Chat sheet message history** — the sheet keeps the complete history even after the passive
  overlay messages have faded.
- **Branded avatars / identity surfaces** — the Citizen layered soft avatar across the passive
  overlay, Chat sheet, and Participants sheet; helper/teacher/classmate/You identities.
- **Self-view drag / collapse / expand** — floats, draggable; release near a left/right edge to
  collapse to an edge tab (camera stays on).
- **Collapsed self-view reopens from the on-screen tab in normal viewer states** — a tap on the
  collapsed tab expands it (both left and right), including in "Demo: someone else selected". In
  "Demo: I am selected" the folded selected-self state stays quiet/disabled to avoid duplicate
  self video.
- **Mic tooltip** — tapping the teacher-controlled muted mic shows an informational tooltip.
- **Activity timer** — the approved Citizen timer component (milky face, thin charcoal track,
  yellow arc + leading ball, charcoal number; one style, one component). Default placement:
  upper-left safe-zone. Demo placement: centered, lower third of the teacher tile. Only placement
  differs between the two.
- **Final 5 seconds state** — arc + leading ball turn coral (#F9746B) and the clock pulses; the
  number stays charcoal.
- **Automatic timer-to-Done behavior** — when a running/final timer reaches 0 it automatically
  transitions to the Done component (no click needed); final-5 still happens before Done. Works in
  default and demo.
- **Done state** — milky pill, thin charcoal stroke, yellow circular check, "Done!", one sparkle,
  no green. Done wins over the Carousel.
- **Demonstration visual states** — Main Room (not Practice Room): teacher + selected student in a
  portrait split; yellow current-turn frame (2px); branded name chip / avatar placeholder. No
  "Speaking" label, no "YOUR TURN" badge, no teacher label.
- **Carousel visual placeholder** — a visual-only activity-cue overlay (translucent panel +
  provisional dashed SLOT + 5s progress bar).
- **Carousel cue switching / placeholder slot** — one cue at a time, auto-switches every 5s, with
  Show / Next / Hide debug controls outside the phone. Token-driven size/position.
- **Carousel is visual-only and intended for future character cue artwork** — final artwork swaps
  into the existing image slot with object-fit:contain. No text labels inside the phone.
- **Volunteer popup flow** — compact Citizen/Gym modal with a soft scrim, milky surface, charcoal
  stroke, yellow primary and neutral secondary button, and a visible 10-second countdown. The
  consent line appears above the action buttons.
- **Volunteer Yes / Not this time / timeout behavior** — "Not this time" closes quietly; timeout at
  0 closes quietly; there is no second confirmation popup and no student-facing no-volunteers state.
- **Quiet "waiting to be picked" state after Yes** — "Yes" enters the volunteer pool only; it does
  not enter the demo split. A calm chip reads "You're in · waiting to be picked" and clears on Pick
  me / Pick someone else / No volunteers / End demonstration.
- **Pick me / Pick someone else debug transitions into the existing demo visual states** — Pick me
  goes to "Demo: I am selected"; Pick someone else goes to "Demo: someone else selected"; End
  demonstration returns to the Main Room with the selected student muted / non-broadcasting.
- **v9c popup copy polish** — shortened body and consent copy plus a small type-scale bump to avoid
  orphan last words.

### Final volunteer popup copy

**Title:** "Want to give it a go?"

**Body:** "Niv is looking for one volunteer."

**Consent:** "If you're chosen, your camera and audio will be shared with the class."

**Buttons:** "Yes, let's go!" · "Not this time"

---

## This checkpoint DOES NOT include

- **Live teacher-side random volunteer draw**
- **Real backend volunteer pool**
- **Real participant video streams**
- **Final Carousel artwork**
- **Written dialogue**
- **Pedagogy text labels inside the Carousel** (no male/female/singular/plural or זכר/נקבה/יחיד/רבים in the phone UI)
- **Practice Rooms routing**
- **Practice Rooms camera/mic enforcement**
- **Waiting room**
- **Solo room**
- **Report flow**
- **Teacher cockpit integration**

These are intentionally out of scope for this base. See `notes-for-next-pass.md`.

---

## Validation performed at checkpoint

- `node --check` passes on the script block.
- `index.html` is byte-identical to the approved `student-main-classroom-mobile-base-v9c-popup-copy.html` (md5 verified).
- `index.html` opens well-formed.
- Default Main Room matches approved v9c (no overlays until triggered).
- Rail stays vertical on the right above sheets; active-tap closes; other-tap switches; X closes;
  never in the sheet header and never horizontal.
- Chat/Timeline/Participants sheets, both composers, ephemeral appear/fade, full Chat sheet history,
  self-view drag/collapse/expand plus tap-to-reopen, mic tooltip, activity timer, final-5 coral,
  automatic timer-to-Done, Done, demo states, Carousel show/switch/hide, and the full volunteer flow
  (popup copy, consent above buttons, Yes → waiting, Not this time, timeout, Pick me, Pick someone
  else) all confirmed intact.
- No second confirmation popup and no Practice Rooms behavior.
