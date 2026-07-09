# Changelog — Student Main Classroom (Desktop)

All passes are surgical and additive on top of the previous stable file. Two protected source/checkpoint files were never modified: `student-classroom-desktop-main-room-v1.html` (md5 d5fdb4f1…) and `student-practice-rooms-v1.html` (md5 d4d7cbdc…). Student Practice Rooms and Teacher Cockpit were never touched.

## v1 — source of truth (checkpoint)
Baseline desktop Main Classroom: teacher large-video stage, foldable student self-view, far-right rail with a single side panel (Chat / Timeline / Participants), footer-left Ask composer, footer-right student controls, ephemeral bottom-left chat overlay, a two-step demonstration/volunteer flow, the room-consent bridge, the Short transition (matkot), and the Activity timer / Dialogue / Operation Grandma explorations. Immutable base for every pass below.

## v2 — Main Room alignment
- **Demonstration = single volunteer popup** with consent included ("Who wants to volunteer for class demonstration?" + "camera and audio will be shared… Do you agree?", "Yes, let's go!" / "Not this time", 10-second timer); **removed the second confirmation popup**. Yes → teacher + student **split view**; the chosen student sees themselves and their self-view folds. No live-locked language, no lock icons, no red/live styling; calm "No volunteers this time" placeholder for the empty case.
- **Main Room mic** reads as teacher-controlled with a calm click popover ("your mic will open during class activities"), no lock icon; camera/mic off use a consistent red slash.
- Popups made more readable. Light brand alignment: Spark.svg helper sparkle + yellow rule; layered Citizen name chips.

## v3 — chrome polish
- Student controls never green in the Main Room (neutral = available/on, red slash = off/unavailable).
- **Right sheets open as floating overlays** anchored by the rail — the stage no longer pushes or reflows (previously only wired for the narrow width).
- Participants: layered soft avatars (white front, yellow back, charcoal stroke), charcoal-stroked level dot, Teacher/Helper role badges, and Level·Semester secondary text.
- Default teacher video contained in a rounded stage card; teacher chip "Niv · Teacher".

## v4 — cleanup + fixes
- Presentation mode shows large videos that use the available stage width (no small centered max-width).
- Default teacher video made more expansive (broadcast stage) rather than a boxed card.
- Overlay sheets got soft rounded class-facing corners; chat avatars switched to the layered Citizen style.
- Active/demo frame is brand **yellow** (no green) and the "SPEAKING" label was removed.
- Circular timer moved to the upper-right and made slightly larger.
- Right rail kept available during transition screens.
- **Removed obsolete student states:** the "No volunteers" state, the Solo fallback (screen + debug + roomconsent routing), and the Written prompt (UI + debug + notes).

## v5 — layering cleanup (this checkpoint)
- **Default teacher video full-bleed** again — edge-to-edge broadcast, no inset/card/containment (split/demo videos stay contained tiles).
- **Removed the teacher name chip** from the full-bleed default video (name is in the header); chips stay in split/demo states.
- **Level-dot stroke thinned** to exactly the avatar stroke (1.5px charcoal), no heavier separator ring; size/colours unchanged.
- **Transition sheet layering fixed:** the rail and any opened Chat / Participants / Timeline sheet render above the transition overlay and are usable; milky-dark/blur kept.
- **Removed the "You're on stage" label** from the demonstrating student video (split view + consent are enough).
- **3→2→1 handoff blink frame is brand yellow from the start** (same as the active-turn frame); no green active/handoff/speaking frame anywhere.
