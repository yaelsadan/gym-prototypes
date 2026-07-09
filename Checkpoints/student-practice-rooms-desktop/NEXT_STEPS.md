# Notes for future passes — Student Practice Rooms (Desktop)

Short, practical guidance for whoever picks this up next.

## Working rules (keep these)
- **Source-first, surgical, additive.** Copy the latest stable file; apply targeted edits only; prove the diff is confined to the intended regions.
- **Never modify** the two protected source files (`student-practice-rooms-v1.html`, `student-classroom-desktop-main-room-v1.html`), Teacher Cockpit, or the Main Room source.
- **Validate every pass:** `node --check` on the app script + a headless render smoke test across scenes; verify zero "Speaking" in UI; confirm protected-file checksums unchanged.
- **Don't rebuild from scratch** and don't restyle globally. Scale changes are high-risk — prefer zero-shrink techniques (shift reserve, use max-height bounds) over shrinking.
- **Checkpoint gating is deliberate** — only bundle a checkpoint when explicitly asked.

## Next candidates (not built)
- **Carousel activity.** Turn-based image/filter reel per student: general room timer → 5s countdown + blinking frame around Student 1 → X-s framed → images/filters auto-switch every 5s (random) via a button → repeat for Student 2 → back to Main Room. Blocking product questions before building: (1) are "images/filters" AR filters on the framed student's video, or prompt images in a separate area? (2) who presses the button and does it start vs. advance the reel? (3) values for the room timer and per-student X. Reuse the existing two-tile + turn-frame + countdown primitives and the automatic runner (as Dialogue does); add a distinct **blinking** cue for the 5s (separate from the steady turn frame) and an image/filter component.
- **Presentation-mode scaling** — a dedicated global pass may still be wanted; today's scale is tuned per component.
- **Reactions** — currently branded placeholders and intentionally absent from rooms; a real reaction system is future / Main-Room work.
- **Name-chip extension** — decide whether the layered chip extends to Main Room / Demo tiles.
- **Panels** — overlay vs. push (rooms have none; relevant to Main Room).
- **Copy** — waiting / report / consent strings are placeholders pending final wording.

## Things that are easy to tune
- Header-to-video breathing and footer reserve are driven by `--footer-h` and the `.demo-stage` paddings (board / narrow / presentation) — single, well-isolated knobs.
- Waiting-screen behavior is centralized in `backToMain()` (turns the room timer on unless rooms have ended) and `transitionScene('wait')`.
- Duo device behavior lives in `deviceOff` / `deviceBackOn` / `enforcePopup` / `leaveToWait`; partner-left in `showPartnerLeft` / `goSoloPartner` / `routeToSolo('partner')`.
