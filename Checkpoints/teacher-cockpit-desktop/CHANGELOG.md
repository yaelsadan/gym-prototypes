# Teacher Cockpit — Changelog

History of the prototype from the first PRD-aligned build (v02) to the approved checkpoint source (v15). Each pass was additive on top of the previous named file; no pass rebuilt from scratch.

**Checkpoint v1 source = v15** (`teacher-cockpit-v15-scale-restore-board-stability.html`).

---

## v15 — Scale restore + board stability (checkpoint source)
- Restored the larger visual scale after v14's shrinkage (bigger stage; Rooms controls back to a present size).
- Fixed the board-mode bug where the collapsed bar's **Camera** button was clipped, using constraints rather than shrinking: slightly narrower side columns (Lesson still dominant ≈410 vs right ≈300), a higher center minimum (500), and trimmed bar spacing — so all five controls fit one row at full size, at default and down to the resize floor.
- Kept the v14 light HUD, no camera/mic tooltip, smooth ring, and Spark asset.

## v14 — Rollback + stabilization
- Rolled back the v13 Rooms-panel sizing that caused clipping (controls pushed out of the panel); restored a layout that fits one view with Close always visible.
- Removed the native `title` tooltip on Camera/Mic (stray "Camera"/"Microphone" on hover); kept `aria-label`.
- Made the running-timer HUD lighter: the timer circle stands alone (~86px, no dark banner) with a context caption below it.

## v13 — Visual regression fix + timer polish
- Restored visual presence (larger stage / bar / rooms controls) after earlier reductions.
- Fixed Rooms-panel bottom dead space (panel body now fills the card).
- Refactored the countdown to a **smooth continuous progress ring** with in-place number updates (no per-tick rebuild / flicker).
- Introduced the **Spark** helper-message asset.

## v12 — Stability + correctness
- Added **Reset layout** inside Edit layout (layout-only reset).
- Moved the running timer to a top-right HUD (off the teacher's face); cleaned the Done state (green check, no gray ring).
- Fixed a manual-override bug so the selected duration actually drives the countdown (including both Dialogue rounds).
- Switched Dialogue starters to generic **Partner A / Partner B**; confirmed no "Speaking" copy.
- (Bug caught & fixed in-pass: an accidentally removed helper function was restored.)

## v11 — Recipe timers + layout constraints
- Made Lesson Plan dominant by default.
- Removed the clock entrance animation that caused per-tick flicker.
- Introduced **recipe-driven timers** (activity → default duration + recipe) with a manual-override tag.
- Built the full **Dialogue** runner (two rounds, automatic starter switch).
- Vertical resize reserves each below-sibling's minimum footprint (panels can't push each other off-screen).

## v10 — Stability + dialogue alignment
- Made **Option B (Collapsed) the default** on load.
- Locked the collapsed-bar button layout so the active state changes color only (no label drop / bar jump); forced the popover to absolute positioning.
- Constrained vertical resize to the visible workspace bottom.
- Improved modal typography.
- Represented Dialogue as turn-based; adopted **"Turn", not "Speaking"** language.

## v09 — Hard bugfixes
- Bulletproof camera/mic icon sizing (fixed size, explicit icon size, no inherited shrink) across states and presentation.
- Fixed the collapsed action-bar active state to fixed-height buttons (color-only change).
- Fixed horizontal resize so Lesson Plan can expand well beyond default (borrows from the opposite side and center down to a safe minimum; no overflow).
- Made vertical resize reversible (viewport-based max; double-click reset).
- Lightened Rooms timer typography.

## v08 — Micro-polish + stability
- More presence for the core center (taller stage + bar, bigger buttons).
- Fixed camera/mic icons in presentation mode.
- Fixed the vertical-resize "trapped height" bug; added double-click-to-reset.
- Simplified Edit layout to direct manipulation (removed per-panel S/M/L / arrows / swap buttons).
- Chevron collapse/expand for Chat + Participants.
- Aligned Rooms timer controls to one pill-height row.

## v07 — Hierarchy + bugfix
- Cleaned and aligned the header status cluster (only Edit layout looks clickable; dry session timer; Rooms threshold pill).
- Rooms panel truly one view: one-row timer controls + Broadcast/Close on one row; Close always visible.
- Chat and Participants both collapse/expand; right column auto-rebalances.
- Constrained the grid to prevent horizontal overflow.
- Removed a stray decorative line under the collapsed action bar; fixed camera/mic sizing.

## v06 — Scale + layout balance
- Presentation-mode viewport scaling (clamp-based).
- Participants collapsed = quiet metadata-first.
- Edit-layout resize handles (width + height, min/max).
- Rooms stats as quiet metadata (not button-like cards).
- Header refinements: light ON AIR, dry session countdown, Rooms threshold pill.

## v05 — Usability polish
- Participants collapsed by default; width-flexible side columns.
- Rooms: one dynamic timer button (Start / Pause / Resume / Start again) + Reset.
- Header redistributed (icon exit, session center, live/timers/edit right); teacher name as a variable.
- Chat send activates on typing.

## v04 — Layout refinement
- Collapsed-mode stage grows to fill the center; small calm Rooms indicator chip.
- Rooms panel redesigned as a compact one-view with its own timer-duration controls.
- Demo button becomes state-aware in collapsed mode.
- Modular panel controls moved behind an **Edit layout** toggle with drag-and-drop.

## v03 — Layout options
- Introduced the two Control Panel options (A Expanded / B Collapsed with popovers) with a debug toggle.
- Separated Lesson Plan from the Control Panel; made the side panels modular.
- Aligned the on-stage countdown to the student-room clock.

## v02 — PRD alignment (baseline)
- Established the three states (Basic / Demonstration / Students in Rooms), the always-visible header, the Basic Control Panel (Countdown / Demonstration / Activities), Activities → rooms with confirmation, the Rooms Status & Control panel (Broadcast only here), camera/mic confirmations, Lesson Plan, Chat, and Participants.

---

*Note:* the earliest control-model exploration (`teacher-cockpit-control-model-prototype.html`) predates v02 and is not part of this numbered line; it is kept for reference only.
