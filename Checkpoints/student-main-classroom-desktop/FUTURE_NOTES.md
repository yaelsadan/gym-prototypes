# Future notes — Student Main Classroom (Desktop)

Short, honest list of what's still open after this checkpoint.

- **Teacher Cockpit alignment — still pending.** This checkpoint is the *student* side of the Main Classroom only. The Teacher Cockpit is a separate surface and has not been aligned to this state; a dedicated pass is needed so the two match (shared language, states, and timing).
- **Mobile alignment — still pending.** Everything here is desktop-only. Mobile layout, stacking, sheet/drawer behaviour, and control placement have not been designed for this surface yet.
- **Carousel activity — parked / not built.** A future turn-based image/filter reel (general room timer → 5s blink cue → X-s framed → auto-switching random pictures every 5s per student). It is documented as an open product question and is intentionally not built. Blocking questions before building: what "images/filters" means visually (AR filters on the framed student vs. prompt images), who triggers the button, and the X values.
- **Final presentation-mode scaling polish — may still be needed later.** Presentation mode now uses the available stage width, but the scale is tuned per component (videos, timers, chips). A final polish pass across resolutions may still be wanted before it's considered done.

## Working rules to keep
- Source-first, surgical, additive. Copy the latest stable file; prove the diff is confined to intended regions.
- Never modify the protected sources (`student-classroom-desktop-main-room-v1.html`, `student-practice-rooms-v1.html`), Teacher Cockpit, or the Practice Rooms files.
- Validate every pass: `node --check` + a headless render smoke test; keep turn framing yellow (no green active frame) and no "SPEAKING"/"on stage" labels.
- Checkpoint gating is deliberate — only bundle a checkpoint when explicitly asked.
- **Font handling:** the HTML embeds licensed `FedraSerifPro` as base64 — strip/externalize before any public GitHub push (see README). Assistant via Google Fonts is fine.
