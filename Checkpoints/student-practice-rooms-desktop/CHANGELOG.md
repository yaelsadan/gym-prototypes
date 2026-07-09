# Changelog — Student Practice Rooms (Desktop)

All passes are surgical and additive on top of the previous stable file. Two source/checkpoint files were never modified: `student-practice-rooms-v1.html` (md5 d4d7cbdc…) and `student-classroom-desktop-main-room-v1.html` (md5 d5fdb4f1…). Teacher Cockpit and the Main Room source were never touched.

## v1 — source of truth (checkpoint)
Baseline desktop Practice Rooms prototype: Duo/Couples room, enforcement + Solo routing, Short/return transitions with the matkot Lottie, debug board and presentation mode. Used as the immutable base for every pass below.

## v2 — brand + behavior pass
- Dialogue two-round flow (20s + 20s, automatic): starter cue → 3-2-1 → 20s → auto-switch → 3-2-1 → 20s → return. No teacher broadcast between rounds.
- Replaced all "Speaking" language with turn language; yellow active-turn frame replacing green.
- Pre-room camera/mic **consent** bridge; decline routes to a waiting screen (not Solo).
- **Leave & report** ghost escape action.
- Brand layer: layered white/yellow name chips (active inverts), layered avatars with charcoal-stroked level dots, Spark.svg helper sparkle, branded reaction placeholders (Clap/Cheers/Heart assets + Flame/Thinking placeholders + Yalla word button), milky-dark sheets, room-timer-only header, larger popups.

## v3 — room-focus cleanup
- Removed Main-Room chrome from rooms: Chat / Participants / Timeline rail + panels, Ask/chat input, reaction row, ephemeral chat overlay.
- Footer became a Room Controls dock: Tip · Camera · Mic + Leave & report.
- Tip = teacher-example playback toast (not chat, no panel).
- Camera/mic off routes to waiting/return-to-main (not Solo); Solo reserved for partner-left.
- Controlled UI scale-up for readability.

## v4 — layout regression fix
- Fixed footer clipping and video/footer overlap (fixed footer height reserved below the tiles).
- Rebuilt the dock into stable column items (in-flow captions, clean circular Camera/Mic buttons, no native tooltips).
- Restored a clickable Leave & report modal (was inheriting pointer-events:none).
- Waiting/return restored to the branded matkot transition + countdown; header simplified to **Gym** + teacher name (variable); removed the "Answer before time runs out" instruction line; added header breathing room.

## v5 — report + waiting polish
- **Report issue** opens a dedicated write-what-happened screen (title, body, textarea, Submit / Skip) — calm, not a red destructive screen — instead of the return transition.
- Leave room and report submit/skip route to waiting while rooms are active, or the standard return transition once rooms have ended.
- Kept the partner-left → Solo vs. own-off → waiting distinction clean; enlarged the turn label; final-10s room-timer treatment.

## v6 — wait-countdown fix (rebased on v5)
- The earlier v6 scale attempt was discarded as a regression; rebased on stable v5.
- Waiting screen keeps matkot and shows a compact room countdown when a room timer exists; loader only when none; room-ended screen still says "Time's up — heading back to class".
- Session timer hidden across room + waiting/transition/solo contexts.

## v7 — turn-chip + numeric countdown
- Waiting countdown reduced to the plain number (no pill/label/icon), where the loader line sat.
- Turn state moved into the name chip itself (default white → active yellow-front, "You start" / "Dana starts" → "Your turn" / "Dana's turn"); the separate bottom badge removed.
- Restored header-to-video breathing room.

## v8 — waiting default countdown + header breathing
- The numeric countdown is now the **default** on the waiting screen for every user path; the loader shows only via the explicit debug "no room timer" state.
- Header breathing added with a **zero-shrink** technique (vertical reserve shifted from bottom to top — tile size, width, and gap unchanged).

## v9 — Duo Room device behavior (this checkpoint)
- **Own camera/mic off:** device turns off immediately, then a "Leave the practice room?" popup (Stay in room / Leave room, 10-second timer). Stay → device back on, remain; Leave/timeout → waiting/return with numeric countdown (never Solo).
- **Partner off / left:** calm "your partner left" popup, then auto-route to Solo shortly (only case that routes to Solo).
- Confirmed the full routing matrix; added explicit Duo device-state debug controls.
- **Carousel** parked as a future activity — not built.
