# Student Main Classroom — Desktop · v1 Checkpoint

Stable, self-contained desktop prototype for the Citizen Café / Vitamin Sessions **Student Main Classroom** (the teacher-led class view, before/around practice rooms). This checkpoint captures the state after the v5 layering-cleanup pass.

- **File:** `student-main-classroom-desktop-v1-checkpoint.html`
- **Type:** single standalone HTML (embedded assets + matkot Lottie). No build step.
- **Validation:** `node --check` passes on all script blocks; renders across all scenes/panels without runtime error.

> This is a **checkpoint/export** only. No behavior or styling was changed relative to `student-classroom-desktop-main-room-v5-layering-cleanup.html` (byte-identical content, renamed file).

---

## Font handling — read before pushing to a public repo

This file **embeds the licensed font `FedraSerifPro` as base64** inside a `@font-face` block (used for brand headlines). Do **not** push this embedded font data to a public GitHub repository — it would publish licensed font binaries.

Before any public commit: strip or externalize the base64 `FedraSerifPro` `@font-face` (host it privately / behind the licensed CDN, or swap a placeholder for public demos). The other typeface, **Assistant**, is loaded from Google Fonts (external link, open-licensed) and is fine to keep.

---

## What this checkpoint covers

The **desktop Main Classroom**: the teacher-led broadcast view a student sees during a live Vitamin Session — teacher full-bleed video, foldable self-view, the far-right rail with overlay sheets (Chat / Participants / Timeline), the footer-left Ask composer and footer-right student controls, and the in-class moments (activity timer, intermission, the Short transition into rooms, the demonstration/volunteer flow, the room-consent bridge, and the Dialogue / Operation Grandma explorations).

Out of scope here: Student Practice Rooms (separate checkpoint), Teacher Cockpit, mobile, and any new activity system.

---

## Main states (scenes)

- **Default** — teacher full-bleed broadcast stage; foldable student self-view; rail visible.
- **Activity timer** — standalone round timer (top-center vs corner variants) over the class.
- **Intermission** — calm branded "next session starts in" card.
- **Short transition** — full dark takeover with the matkot Lottie hero (into rooms).
- **Volunteer** — single demonstration popup (consent included, 10-second timer).
- **Demonstrate** — teacher + chosen-student split view; the chosen student's self-view folds.
- **Room consent** — pre-room bridge (camera/mic required → Short transition; "Not now" → Main Room).
- **Dialogue · MVP** — two-round turn-based split (neutral labels; timer upper-right).
- **Operation Grandma** — turn-based drill with the cinematic 3→2→1 handoff.

## Key behaviors

- **Demonstration = one popup:** "Who wants to volunteer for class demonstration?" + consent, buttons "Yes, let's go!" / "Not this time", 10-second timer; **no second confirmation**. Yes → split view; a 10s timeout with no volunteer returns to the normal Main Room (no student-facing no-volunteers state).
- **Teacher video is full-bleed** in the default room (broadcast background); the teacher name is in the header (no on-video chip). Teacher/chosen-student chips ("Niv · Teacher") appear only in split/demo tiles.
- **Right sheets are overlays:** Chat / Participants / Timeline float over the stage (no push/resize), with soft class-facing rounded corners, milky-dark/blur; they render **above** the transition overlay and stay usable during transitions. The rail stays visible (and clickable) at all times, including transitions.
- **Controls:** student camera/mic are neutral (never green in the Main Room); red slash = off/unavailable; the teacher-controlled mic shows a calm popover ("your mic will open during class activities") and routes nowhere.
- **Turn/active framing is brand yellow** everywhere (active-turn frame and the 3→2→1 handoff blink); there is no green active/handoff/"speaking" frame and no "SPEAKING" or "You're on stage" label. Green is reserved for success only.
- **Timers** are neutral/functional: the circular activity/turn timer sits upper-right; the session timer is a calm neutral pill (not a name chip).
- **Brand layer:** layered Citizen name chips and avatars (chat + participants), helper yellow rule + Spark.svg sparkle, level·semester metadata; yellow used as an accent.

## Debug controls

Scene row (Default / Activity / Intermission / Short transition / Volunteer / Room consent / Dialogue / Operation Grandma), a Demonstration row (Split · chosen = me / other student), Panel, Perspective, Phase, Speaker, Activity A/B, Grandma step, Video-bg (flat/realistic), width, plus **Presentation mode**. These are prototype affordances, not product UI.

---

## Known open questions / future passes

- **Teacher Cockpit alignment** still pending (this file is the student side only).
- **Mobile alignment** still pending (desktop only here).
- **Carousel** activity is parked / not built (turn-based image/filter reel — open product question).
- **Final presentation-mode scaling polish** may still be needed later (today's scale is tuned per component).
- Student mic/audio model, and which teacher actions auto-emphasize a student, remain product decisions.
- Copy across volunteer / room-consent / intermission is placeholder pending final wording.
