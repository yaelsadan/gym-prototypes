> **Shell-sync pass (2026-06-21) — visual only, behavior unchanged.**
> The right-side CTA rail in this screen's preview was synced to the current classroom shell: the old base64-PNG rail icons were replaced with the current **inline-SVG icons** (`RAIL_SVG` map, `stroke=currentColor`), and the current **tone-aware active/inactive** treatment (tone-white → yellow active; tone-dark → charcoal + heavier stroke; inactive muted, never pure black). **Rail order is unchanged** (Timeline · Chat · Participants) and the **active-state wiring is unchanged** (Chat active = sheet open; Timeline/Participants inactive). No Self-view behavior was modified — every rule below still holds exactly. Full restore checkpoint intentionally deferred.


# Self-view behavior — v1

**Checkpoint files (current source of truth):**
- `screens/classroom-selfview-default-v1.html` — **Default Classroom Self-view = corrected working base** (built on the real Chat System v1 + Classroom Chrome v1; no placeholder chat/chrome).
- `screens/classroom-selfview-whiteboard-v1.html` — **Whiteboard small-video behavior = corrected behavior scaffold**, locked and ready for the full **Whiteboard Mode v1** batch.

**Archive (NOT source of truth):** `screens/archive/classroom-selfview-DRAFT.html`, `screens/archive/classroom-whiteboard-DRAFT.html` — earlier explorations on a simplified placeholder classroom/chat. Superseded; kept for history only.

**Status:** Default = corrected working base · Whiteboard small-video = corrected scaffold · **Built on:** Chat System v1 + Classroom Chrome v1.
**UX source:** attached self-view + Whiteboard reference screens — used for **behavior logic / boundaries**, not 1:1 visual style. Current Vitamin Sessions visual system is preserved.

## Completed states (board + demo)
1. **Open — default** (top-right, camera ON, shading layer, rounded frame).
2. **Zones** — green safe zone + left/right yellow collapse edges (annotated).
3. **Open — dragged into safe zone** → stays open.
4. **Open — released in edge zone** → collapses toward that side.
5. **Collapsed — docked right** (camera ON).
6. **Collapsed — dragged vertically** along its track.
7. **Collapsed — drift <30px** → snaps back to its axis.
8. **Collapsed — dragged >30px inward** → reopens on the docked side.
9. **Collapsed — docked left.**
10. **Camera OFF** — separate state (avatar, no preview).
11. **With chat sheet open** — self-view stays above the sheet.
12. **With keyboard open** — self-view clamps above the composer (rail hidden).
13. **Whiteboard scaffold** — self-view relocated to the lower area (documented only).

## Behavior rules
### Open
- Open **by default**; same rounded frame + shading layer as today.
- **Z-index = second-highest**: above all classroom content, **below the Active header**.
- Draggable **only inside the green safe zone**; must not overlap input/composer, must not conflict with the active header, must not block the right-side CTA rail.

### Collapse
- The open self-view **collapses only when released into the left or right yellow edge zone**.
- Released **inside the safe zone** → **stays open** (clamped to the green area).
- Released **inside an edge zone** → **collapses toward that side**.

### Collapsed
- Lives on its **original vertical track** as an edge tab; can move **up/down** along that axis.
- **Small horizontal drift does not move it sideways** (locked to the track).
- Released after **<~30px** horizontal drift → **snap back** to the edge.
- Dragged **>~30px** inward (away from its axis) → **reopen**; **reopen side = docked side**. (Tap also reopens.)
- **Collapsed ≠ camera off:** the student loses only their own preview; the **teacher still sees** the student (green camera dot on the tab).

### Camera off
- A **separate** state: the camera is actually off (avatar + "Camera off"); not to be confused with collapsed.

### Context
- **Chat sheet open** → self-view remains visible **above the sheet**; never blocks sheet content/composer.
- **Keyboard open** → self-view **clamps above the composer** (never over the keyboard/composer); rail hidden; typing prioritized.

## Drag boundaries (geometry)
- Screen ~378×832 (inner). Self-view 88×116; collapsed tab 30×72.
- **Safe (green) zone:** top = below header (~150px), bottom = above input line (overlay) or above composer (keyboard ~SH−248−58); left/right padding 8px.
- **Edge (yellow) zones:** ~26px strips at far left/right within the safe band.
- **Thresholds:** collapse on edge release; reopen at **>30px** inward; **<30px** snaps back.

## Whiteboard-related rules — BUILT & CONFIRMED (see Whiteboard Mode v1)
These were scaffolded here and are now **built and locked** in `screens/classroom-whiteboard.html` (doc: `docs/WHITEBOARD_MODE_V1.md`). Behavior is confirmed by the attached UX refs + control-hierarchy decisions — no longer a product-validation item.
- When **Whiteboard** is active it occupies the **upper region**; the teacher video relocates to the **lower** region (split layout) and the self-view/stream container sits in the **lower safe area**.
- Chat/icon repositioning + **status-bar contrast** switch are implemented in the Whiteboard batch.

## OPEN ISSUES / PRODUCT DECISIONS
- Exact **edge-zone width** and **30px threshold** to validate on-device (touch ergonomics).
- **Snap-back animation** + reopen easing (currently instant on release).
- **Collapsed-tab affordance** copy/icon — communicate "hidden from myself, camera still on" more explicitly (tooltip/label on first collapse?).
- **Remember last open position** per side vs always re-dock to corner.
- **Per-device safe-zone insets** (notch/home-indicator, small screens, landscape).
- **Self-view size variants** (default vs enlarged) — TBD.
- Interaction when **both** sheet + keyboard transitions happen quickly (clamp order).

---

# Small-video logic — self-view vs Me/Teacher stream container

UX references attached for **behavior**, not visual style — current Vitamin Sessions system is preserved.

## A. Default classroom (no Whiteboard) — small video = SELF-VIEW
- The small video is **primarily the student's own self-view**; the student sees themselves.
- States: **open**, **collapsed**, **camera off** (all defined in v1.1 above).
- **Camera controls are visible and quickly accessible directly on the self-view** (see control hierarchy).

## B. Whiteboard active — small video = Me/Teacher STREAM CONTAINER
- When Whiteboard is active, the small video becomes a **secondary stream container** that can show **Me** (self-view) **or Teacher**.
- The student can **switch between Me and Teacher** (two ways — see Stream switching).
- All open/collapsed/camera-off behavior still applies to the container.

## C. Whiteboard + bottom sheet both open
- The small video **moves to a safe lower area** so it does **not overlap the Whiteboard** and does **not block sheet content or the composer** (UX ref image 3: lower-right above the rail). This relocation applies to **both** closed (collapsed) and open small video.
- **Auto-switch to Teacher** in this constrained state: documented as a **product decision under TESTING — NOT implemented** (UX ref labels it "Testing"). Rationale: when the student is reading the whiteboard + chat, their own preview is least useful; defaulting to Teacher may aid focus. To be validated before building.

# Control hierarchy — quick vs contextual

## PRIMARY quick controls (always visible, even in Whiteboard)
- **Camera on/off**, **mic/mute**, **collapse/expand** self-view — on the small-video surface (lower corners), both default and Whiteboard.
- These are urgent classroom controls and **must NOT be buried in the more menu**.
- **The camera button always controls the student's OWN camera** — even when the small video is currently showing the **Teacher** stream, the camera button still turns the student's own camera on/off. **Switching Me ↔ Teacher is separate from camera on/off.**

## SECONDARY contextual controls (inside three-dot / more menu)
- **Switch stream Me ↔ Teacher — ONLY.** No primary controls (camera/mic) are duplicated inside the menu.

# Stream switching (Whiteboard) — two ways

## A. More menu
- Tapping the **top hit area (top ~18% of the video height, "18vh")** or the **three-dot** opens the stream-switch menu (options: **Teacher / Me** only).
- **Tap outside closes** the menu. Menu **fades after ~3s of no interaction**.
- While the menu is open: **fade out** the 'more' CTA, mic, and camera affordances; **fade them back in** when the menu closes. **Close the more menu when the small video is closed/collapsed.**

## B. Subtle vertical swipe
- A **subtle vertical swipe over the video container** also switches **Me ↔ Teacher** — lightweight, same transition effect as the menu. Must **not** interfere with drag/collapse.

# Gesture priority (resolve conflicts in this order)
1. **Drag self-view** (reposition within the green safe zone) — highest.
2. **Collapse / expand** (release into edge zone → collapse; tab drag inward > 30px → reopen).
3. **Swipe to switch stream** (vertical swipe Me ↔ Teacher) — only when not part of a reposition drag.
4. **Tap to open menu** (top 18% hit area / three-dot) — lowest.

Disambiguation: a movement that travels into a collapse edge zone or beyond the drag threshold is a **drag/collapse**, not a stream-swipe; a short vertical swipe that stays within the container and under the drag threshold is a **stream-switch**; a stationary tap in the top 18% opens the **menu**.

# Distinctions to keep explicit in the state system
- **collapsed ≠ camera off** — collapsed hides only the student's own preview; the **teacher still sees** the student (green camera dot on the tab).
- **camera off** = the camera is **actually off** (avatar, no video sent).
- **teacher stream stays relevant even when the student's camera is off** (student can still view Teacher in the container).
- **switching Me ↔ Teacher ≠ camera on/off** — it only changes what the container displays.

# Whiteboard implementation — BUILT (see Whiteboard Mode v1)
The Me/Teacher container, lower-relocation wiring, status-bar/header contrast switch, more-menu (18vh hit area + three-dot, fade rules, 3s auto-close), and vertical swipe-switch are now **built interactively** in `screens/classroom-whiteboard.html` (doc: `docs/WHITEBOARD_MODE_V1.md`). The earlier "student-side whiteboard rendering needs product validation" flag is **resolved** by the attached UX screens. Auto-switch-to-Teacher (Whiteboard + sheet both open) remains **TESTING / not implemented**.

---

# v1.2 CORRECTIONS (these OVERRIDE the sections above where they conflict)

These clarifications correct the earlier scaffold. Where the older UX reference (ref image 4) showed an "Open Menu" in the default classroom, that is **superseded** by the rules below.

## 1. Context UI stays on the working bases
When the self-view is shown in context, the surrounding classroom UI **must remain Chat System v1 + Classroom Chrome v1 + Self-view v1** — do not simplify or drift. If a chat region is only a placeholder in a given board, it is **labeled "placeholder"** but stays visually/structurally aligned with Chat v1 (dark translucent sheet, All / Mine / Helper tabs, etc.). New batches must not dilute prior decisions.

## 2. Whiteboard is a SPLIT layout, not an overlay
When Whiteboard is active the classroom is a **split layout**, not a translucent overlay on the full-screen teacher video:
- **Upper ~50% of the screen = Whiteboard area.**
- **Lower ~50% = live teacher video** (the main teacher stream is **pushed/relocated into the lower half**).
- The small self-view / secondary video **adapts around this split** (sits in the lower region, clear of header, rail, composer; relocates further when the chat sheet opens).
- Do NOT render Whiteboard as a see-through layer over a full-bleed teacher video.

## 3. Small-video role — strict separation
**Default classroom (no Whiteboard):**
- Small video is **only the student self-view**. The student sees themselves.
- **No Me/Teacher switch. No three-dot / stream-switch menu in this state.**
- Quick self-view controls live **directly on the surface**: camera on/off, collapse/hide, mic/mute (if relevant).

**Whiteboard active:**
- Small video may become a **secondary stream container** showing **Me** or **Teacher**.
- This is the **only** context where the **Me/Teacher switch menu** exists (three-dot / top-18vh hit area).

## 4. Control hierarchy (unchanged intent, restated)
Never buried in the three-dot menu — visible and quick **even in Whiteboard**: **camera on/off, collapse/expand, mic/mute**. The camera button **always controls the student's own camera**, even when the small video shows Teacher. The **three-dot / more menu carries the Me / Teacher switch ONLY** — no primary controls are duplicated inside it.

## 5. Swipe to switch stream — Whiteboard ONLY
A subtle swipe on the small video switches **Me ↔ Teacher**, but **only when Whiteboard is active**. It does **not exist** in the default classroom. It must not interfere with drag/collapse.
**Gesture priority (Whiteboard):** 1) drag / reposition self-view → 2) collapse / expand → 3) swipe to switch stream → 4) tap top-18vh hit area / three-dot to open stream menu. In the **default classroom only 1 & 2 apply** (no swipe, no menu).

## 6. State definitions (corrected)
**Default classroom**
- `selfview.open` (camera ON) — quick controls on surface, NO menu
- `selfview.collapsed` — edge tab, camera still ON (teacher sees you), NO menu
- `camera.off` — avatar, no preview
- (no Me/Teacher menu in any default state)

**Whiteboard active** — layout: `whiteboard.upper` + `teacherVideo.lower`
- `smallVideo.me` (camera ON / OFF)
- `smallVideo.teacher`
- `streamMenu.open` (Teacher / Me only — no duplicated primary controls)
- `streamSwipe` (Me ↔ Teacher transition)
- `smallVideo.collapsed` (camera still ON)
- `camera.off`

## OPEN ISSUES / PRODUCT DECISIONS (not assumed)
- **Auto-switch to Teacher** when Whiteboard + bottom sheet both open → **product decision under TESTING, not implemented**.
- Exact **split ratio** (is it strictly 50/50, or does the whiteboard expand/contract?) → to validate on-device.
- Whether the **teacher lower video** is tappable/has its own controls in split mode → open.
- Whether **mic/mute** belongs on the self-view surface at all (depends on whether students are unmuted in broadcast) → open.
- Default-classroom **"Open Menu"** from the old ref is intentionally dropped → resolved (no menu in default); flag if product disagrees.
- Swipe vs drag disambiguation thresholds in split layout (smaller vertical room) → validate.
