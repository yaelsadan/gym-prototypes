# Teacher Cockpit — Checkpoint v1 Validation

How the checkpoint file was verified. **No UI, layout, copy, behavior, or logic was changed for this checkpoint** — the deliverable HTML is a byte-identical copy of the approved source.

---

## 1. Provenance / integrity (byte-identical)

- **Approved source:** `teacher-cockpit-v15-scale-restore-board-stability.html`
- **Checkpoint HTML:** `teacher-cockpit-checkpoint-v1.html`
- **MD5 (both):** `2b17bac7676b1dcc8876d4254021ad52`
- **Size (both):** 382,333 bytes

The checkpoint HTML is a verbatim copy of the approved file (identical MD5 and byte count). No edits were made.

---

## 2. Structural integrity

- Balanced tags: `<style>` 1/1, `<script>` 2/2, `</html>` present.
- Self-contained assets: Fedra Serif Pro embedded via base64 `@font-face`; teacher/student portraits embedded as data-URI JPEGs; all CSS and JS inline.
- No unresolved build markers (`__FONTFACE__` / `__PORTRAITS__`): 0.
- No external `<script src>`: 0.

---

## 3. External dependency (documented, not a defect)

- One external resource: the **Assistant** UI font from Google Fonts (`fonts.googleapis.com`).
  - **Online:** loads the intended UI font.
  - **Offline:** falls back to a system sans-serif; layout and behavior are unaffected.
- The only other URL in the file is the SVG XML namespace (`http://www.w3.org/2000/svg`), which is not a network request.

*Recommendation for a fully offline handoff (optional, not done here to keep the file byte-identical): embed the Assistant font as base64 as well. This would be a change and is therefore out of scope for a checkpoint-only task.*

---

## 4. Prototype behavior (verified on the v15 source during development)

The approved v15 build passed a headless verification pass (25/25 checks) plus a step-through of the Dialogue recipe. Because the checkpoint HTML is byte-identical, those results carry over. Key checks that passed:

- **Layout / board fit:** Lesson Plan dominant (≈410) vs right column (≈300); center minimum 500; the collapsed 5-button bar (Activities · Timer · Demo · Camera · Mic) fits at full size with no camera clip, at default and down to the resize floor; no horizontal overflow even with a wide Lesson Plan.
- **States:** Basic / Demonstration / Students in Rooms render; Demo → End demo works.
- **Rooms panel one-view:** body fills the card; Close rooms visible; Broadcast + Close on one row; timer chips + primary action + Reset inside the panel.
- **Timers:** recipe defaults apply on activity select; manual/custom duration drives the countdown; Dialogue runs the full two-round recipe from one Start with generic Partner A / Partner B labels and an automatic switch, returning to Ready; no "Speaking" copy.
- **Timer visuals:** running timer in the light top-right HUD (no dark banner, ~86px); 3-2-1 prep centered; Done is a clean green check with no gray ring; the smooth-ring engine (in-place number update, no per-tick rebuild) is present.
- **Devices:** Camera/Mic are clean circular icon buttons with `aria-label` and no `title` tooltip; clicking opens the active-session confirmation with the safe option primary; device icon size stable.
- **Product rules:** Option B default; Reset layout present in Edit layout (layout-only); Participants collapsed / Chat open by default; Broadcast only in rooms; Spark helper asset on helper messages; dry session timer with no "Session" label.

*(These were validated with a Node-based DOM-stub render harness and `node --check` on the extracted script during the v15 build. The harness cannot evaluate CSS layout pixel sizes or CSS animation — see limitations.)*

---

## 5. Recommended manual QA before handoff

1. Open in Chrome/Edge/Safari/Firefox (desktop). Confirm the cockpit renders and the debug board works.
2. Enter **Presentation mode** (button or `?mode=presentation`) — this is the visual source of truth. Confirm scale, hierarchy, and that the collapsed bar fits and breathes on your target screen sizes.
3. Cycle the three states and both Control Panel options.
4. Run a **Dialogue** activity and watch the full recipe (Round 1 → Switching starters → Round 2 → done) — confirm the **progress ring animates smoothly** (this is the one thing the automated harness cannot verify).
5. Toggle **Edit layout**: drag to reorder, resize width/height (double-click to reset), collapse/expand Chat and Participants, then **Reset layout** and confirm session/rooms/timer/chat/devices are untouched.
6. Test Camera/Mic: confirm no hover tooltip and that the confirmation appears with the safe option as primary.

---

## 6. Known limitations of automated validation

- The headless harness does **not** render CSS, so it cannot measure pixel dimensions, confirm no visual clipping in practice, or verify animation smoothness. Those require the browser QA above.
- Board mode is a fixed 1280×820 review frame; presentation mode is the intended product scale and should be the primary review context.
- This is a low-to-mid fidelity prototype: no real data, no backend, no streaming, no mobile layout.
