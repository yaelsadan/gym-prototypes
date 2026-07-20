# CHANGELOG — Student Practice Rooms · Desktop

From the first room pass through the frozen checkpoint at **v21**.

Versions **v02–v09** are reconstructed from the design notes carried inside the
file itself. **v10–v21** were built in sequence, each on top of the previous
stable file, with the source file left byte-identical and a diff proving every
change was confined to its intended region.

---

## v02 — brand + behavior pass

- Dialogue became two automatic rounds, 20s + 20s.
- All speech-detection language replaced with **turn** language. The tile frame
  became **brand yellow** (was green) — the frame is an exercise cue, not speech
  detection. Green kept only for camera / on-air / success.
- Room consent (Yes/No, ~10s) added. **No → waiting / return, not Solo.**
- Solo Room reserved for partner-left / partner-unavailable.
- Leave & report added as a ghost escape in the room footer.
- Layered name chips and avatars, Spark.svg helper sparkle, branded reaction set
  (placeholder).

## v03 — room-focus cleanup

- **Removed from Rooms:** the Chat / Participants / Timeline rail and panels, the
  Ask input, the reaction row and the ephemeral chat overlay. These are Main-Room
  chrome.
- The room footer became a **Room Controls dock**: Tip · Camera · Mic centred, with
  **Leave & report** separated at lower-right.
- Controlled scale-up of the room UI for laptop/presentation readability.

## v04 — timer model

- **Room timer** = always-present top pill; neutral normally, branded yellow in the
  final 10s. **No red, no final-3s emergency state.**
- **Activity timer** = activity-specific: none / central / attached to the active
  speaker’s tile.
- v04.2: Operation Grandma turn handoff reused the Main Room cinematic transition.

## v05 — report + waiting polish

- Report issue got its own dedicated screen instead of routing into the return
  transition.
- Leaving, and Submit/Skip report, route to **waiting / return-to-main** while rooms
  are active.
- The waiting screen became the branded **matkot** transition with a room countdown.

## v06 — wait-countdown fix (rebased on v05)

- The v06 scale changes were treated as a regression and discarded.
- Two transition states kept explicitly separate: **room-ended** (“Time’s up”) vs
  **waiting while rooms are active** (countdown).

## v07 — turn chip + numeric countdown

- The waiting countdown became a plain number, replacing the loader line.
- The separate “YOUR TURN” badge was removed; the **name chip itself became
  stateful** and carries the turn state.

## v08 — waiting-default countdown + header breathing

- Every user path into waiting now turns the room timer on, so the countdown is the
  default and the loader is the exception.
- Header breathing room added with **zero shrink** to the tiles.

## v09 — Duo Room device behavior

- Turning off **your own** camera or mic turns the device off immediately, then shows
  “Turning off your camera or mic means you can’t stay in this practice room.”
  **Stay in room** → device back on, stay. **Leave room** or a 10s timeout →
  waiting / return, **never Solo**.
- **Partner** off / left → calm popup → Solo.
- The routing matrix was confirmed and documented.

*(The first checkpoint of this surface was cut here.)*

---

## v10 — PRD activity alignment ⭐ behavior

- **Activities became teacher-triggered.** Selecting an activity only *prepares* it;
  the timer starts on a simulated Teacher Cockpit **Start timer** event. Nothing
  auto-starts on room entry.
- **5-second prep countdown** replaced 3-2-1 in every room activity. The yellow frame
  is on from the first tick.
- Dialogue (5 / 20 / 5 / 20), **Intensive Exercise** (5 / 10 / 5 / 10) and
  **Operation Grandma** (5 → R1 → R1 → 5s break → R2 → R2, **one automatic set**)
  wired end to end.
- **Carousel** added as a real room activity: masculine / feminine / plural
  silhouettes (built-in SVG, no external assets) switching every 5s. Behavior shown,
  not explained.
- **TIP** became a replay of the teacher’s recorded instruction, not a tip toast.
- **Uneven-students → Solo** case added. Own camera/mic off, consent decline, own
  leave and report submit/skip all confirmed as **waiting / return, never Solo**.
- The old Grandma and Dialogue engines were replaced by one unified activity engine.

## v11 — visual polish

- Carousel cue: the answer word removed; silhouette + 5s loader only.
- TIP card: one serif title, **“Replay instruction”**, with a yellow sparkle. The
  uppercase eyebrow and the “Recorded by…” line removed.
- First branded timer skin: milky disc, charcoal rim, yellow progress, travelling
  bead. Done became the completion state of the same family.

## v12 — timer / Done / Carousel-cue correction

- Timer moved to a precise light skin; no blue artifacts, no green, no red.
- **Timer ↔ Carousel-cue collision fixed**: the timer got a protected safe zone in
  the tile’s top-right corner and the cue dropped onto the seam below it.
- Done lost the yellow offset back layer (that treatment belongs to name chips) and
  gained three sparkles.

## v13 — timer rebuilt to the reference

- Geometry and colour sampled **pixel-for-pixel** from `Timer_referance.png`.
- Two beads: a fixed anchor at 12 o’clock plus the travelling leading ball.
- Done: one milky pill, thin charcoal stroke, “Done!”, and **one** sparkle outside
  the badge that spins and settles.

## v14 — coral warning + one yellow

- **Final seconds turn coral `#F9746B`** — a deliberate, scoped override of the
  earlier “no red” rule, for this warning state only.
- **All yellows unified to `#F9E24C`.** Spark.svg carried a baked `#FFE300`; it was
  repainted at the icon source, which fixed the TIP, Done, helper and chat sparkles
  in one place.

## v15 — the balls, the header timer, the cue

- The stream now runs **between** two balls, both larger than the band and painted
  last, so no arc ending can be exposed.
- The **header room timer lost its pill** — it is flat text by default and simply
  turns brand yellow, bolder, with a glow and a calm pulse in the final 10s.
- The Carousel cue moved onto a lighter, more transparent surface.

## v16 — presentation-mode timer fix

- Diagnosed with a **CSS cascade resolver**: the geometry was already identical in
  both modes. The break was **rasterisation** — four `filter: drop-shadow()` rules
  pushed the timer into offscreen raster buffers, and presentation composites at a
  coarser layer scale, eating the sub-pixel hairlines.
- **Every filter removed from the timer.** Separation and the coral glow became
  box-shadows on the circular disc — resolution-independent.
- Presentation reduced to **one differing token**: `--d`.

## v17 — timer balance, START, the room clock

- The ball outline was reverted to the rim/face weight; the **fill** does the
  covering, not a heavier stroke. Both balls identical.
- **START restored** as a brief cue, then retired to a chip in v18.
- **The room clock became real**: `ST.roomLeft` is the single source of truth for the
  header *and* the waiting screen. At 00:00 it returns the student to the Main Room.
- The generic “ACTIVITY” caption was replaced by real metadata.

## v18 — timer rebuilt from `Timer_referance3.png`

- A **different construction**: no band, no grey track. A milky face carries a thin
  charcoal outline, that outline *is* the track, the yellow arc rides the same path,
  and one large ball leads the endpoint. Fresh isolated component (`.vt3`).
- The giant START overlay retired for a **small chip** under the name chip.

## v19 — fill-forward + smooth motion

- The model flipped to **colouring forward**: charcoal track → yellow fills it →
  coral in the final 5 seconds.
- **`requestAnimationFrame` interpolation** — the arc and the ball move continuously
  from the wall clock; only the number ticks once a second.
- Generic “Timed round” / “Activity” captions removed. Turn chips confirmed across
  all four activities.

## v20 — timer visual weight

- The 0.85 stroke rendered as a ~1.9px hairline, so the timer read as an empty disc.
  **One stroke weight raised to 1.4** (3.2px at 144px) for the track, the arc and the
  ball, and the **ball fill grew to r 4.6** (21px). The band radius pulled in to 26.5
  so the bigger ball still clears the box.

## v21 — matkot transition fix (this checkpoint)

- **The matkot ball got a charcoal stroke.** The ball and paddles are Lottie *image*
  layers, so the `image_0` asset was regenerated — same canvas, same baked yellow,
  same outer radius, with a 12px charcoal ring drawn **inside** the edge. It renders
  as a 1.78px stroke on a 28px ball, so the ball stays visible over the white
  paddles. The paddle assets are byte-identical.
- **The “scratched disc” glitch fixed at its root.** `roomTick()` was calling
  `render()` once a second; `render()` rebuilds `frame.innerHTML`, which destroys the
  Lottie node and reloads the 6-second loop **from frame 0**. The clock now writes
  the countdown DOM in place and **never re-renders**. `mountLottie()` is idempotent
  and playhead-preserving.
- The two waiting states are now explicit: **room active** (synchronised countdown)
  vs **time’s up** (the return transition, no countdown).
