# Student Practice Rooms — Desktop · v1 Checkpoint

Stable, self-contained desktop prototype for the Citizen Café / Vitamin Sessions **Student Practice Rooms** experience. This checkpoint captures the state after the v9 Duo Room device-behavior pass.

- **File:** `student-practice-rooms-desktop-v1-checkpoint.html`
- **Type:** single standalone HTML (embedded fonts, portraits, matkot Lottie JSON). No build step, no external app dependencies (only Google Fonts + the Lottie CDN, as in the original source).
- **Validation:** `node --check` passes on all script blocks; renders across all scenes/activities without runtime error.

> This is a **checkpoint/export** only. No behavior or styling was changed relative to `student-practice-rooms-v9-duoroom-device-behavior.html` (byte-identical content, renamed file).

---

## What this checkpoint covers

The **desktop Student Practice Rooms** flow: what a student sees once the teacher sends the class into practice rooms — entering a Duo (Couples) Room, running an activity, and every calm exit/edge path (declining, leaving, partner leaving, reporting, room ending). It deliberately excludes Main-Room chrome (no chat rail, participants, timeline, reactions, or chat input in rooms).

Not in scope here: Teacher Cockpit, the Main Room source file, and any new activity system (see Open questions).

---

## Main states (scenes)

- **Room consent (pre-room):** "Camera & mic needed — do you agree?" Yes → enter room; No → waiting/return (not Solo). 10-second auto-decline.
- **Duo / Couples Room:** two video tiles, room-timer-only header, an in-room activity, and the Room Controls footer.
- **Enforcement (own camera/mic off):** "Leave the practice room?" popup — Stay in room / Leave room, 10-second timer.
- **Partner left:** calm popup, then auto-route to Solo shortly.
- **Waiting / return-to-main:** branded matkot transition + a **numeric room countdown** (loader only in the explicit debug "no room timer" state). Used for consent-decline, own camera/mic off, Leave room, and report submit/skip while rooms are active.
- **Report:** dedicated "Report an issue" screen (textarea, Submit / Skip) — calm, not a red destructive screen.
- **Solo Room:** supportive independent practice (partner-left / partner-unavailable only).
- **Return to Main Room:** "Time's up — heading back to class" (room ended), student returns muted.

## Main behaviors

- **Activities:** None / Timed round (central) / **Dialogue** (two automatic rounds, 20s + 20s, with a stateful name chip and the large white START cue) / Operation Grandma (turn language, prototype-level recipe documented in-app).
- **Turn language only** — no "Speaking" labels anywhere. Turn state is carried by the **yellow turn frame + the stateful name chip** ("You start" / "Dana starts" → "Your turn" / "Dana's turn"); there is no separate bottom badge.
- **Brand layer:** layered white/yellow name chips with charcoal stroke (active inverts to yellow-front), layered avatars, Spark.svg helper sparkle, branded reaction placeholders (documented as future / not in rooms), milky-dark sheets.
- **Room Controls footer:** Tip · Camera · Mic (centered) + Leave & report (separated ghost safety action). Tip plays a teacher-example toast (not chat).
- **Timer hierarchy:** name chips are the most branded; the in-room activity/turn timer is a charcoal circle with white number + yellow ring; the waiting countdown is a plain neutral number; the header room pill stays calm and only turns branded-yellow in the final 10s. Session timer is hidden in room/waiting/transition/solo contexts.

## Routing rules (authoritative)

| Trigger | Destination |
|---|---|
| Consent decline (pre-room) | Waiting / return-to-main (not Solo) |
| My camera/mic off → Leave room / timeout | Waiting / return-to-main (not Solo) |
| Leave room (from Leave & report) | Waiting / return-to-main (not Solo) |
| Report submit / skip (rooms active) | Waiting / return-to-main |
| **Partner leaves / off / unavailable** | **Solo Room** |
| Room time ends | Return to Main Room (muted) |

## Debug / presentation

Every prototype includes a debug control board (scene, activity, Dialogue runner, Grandma handoff, Duo device states — My camera off / My mic off / Partner left-cam off — room-timer active / no room timer, toggle rooms ended, width, video-bg) and a presentation mode. These are prototype affordances, not product UI.

---

## Known open questions

- **Carousel** — a future turn-based image/filter activity (5s blink cue → X-s framed → auto-switching random pictures every 5s per student). **Not built.** Open product questions: what "images/filters" means visually (AR filters on the framed student vs. prompt images), who triggers the button, and the X values.
- Whether the layered name chip should extend to Main Room / Demo tiles.
- Panels: overlay vs. push (rooms currently have no panels; documented for Main Room).
- Final reaction system (placeholder only; not present in rooms).
- Global student **presentation-mode scaling** may still warrant a dedicated future pass.
- Copy across waiting / report / consent is placeholder and needs final wording.
