# Student Main Classroom — MVP Cleanup v1 (Checkpoint)

**Scope of this checkpoint:** the **Student Main Classroom** surface only, cleaned up and integrated for MVP.

This is **not** a Pair Rooms checkpoint, **not** a Teacher Cockpit checkpoint, **not** a Practice Primitives checkpoint, and **not** a full‑product checkpoint. Those remain separate, later passes.

---

## What this checkpoint includes

```
Student_Main_Classroom_MVP_Cleanup_v1_Checkpoint/
├── classroom-selfview-default-v1.html   ← the deliverable (integrated classroom shell)
├── reference/
│   ├── timeline-v1.html                 ← Timeline sheet, clean component (visual source of truth)
│   └── participants-v1.html             ← Participants sheet, clean component (visual source of truth)
├── docs/
│   ├── CHAT_SYSTEM_V1.md                ← Chat overlay/sheet/keyboard/rail behavior
│   ├── TIMELINE_PARTICIPANTS_SHEETS_V1.md
│   └── SELF_VIEW_BEHAVIOR_V1.md         ← self‑view open/collapsed/drag + camera/mic model
├── README.md
└── CHANGELOG.md
```

The single deliverable is **`classroom-selfview-default-v1.html`**. The `reference/` files are the clean component files that the Timeline and Participants sheets were ported from — kept for traceability, not as separate apps. The `docs/` files are the behavior specs the classroom was rebuilt on.

---

## What is confirmed in the MVP classroom

- **Teacher‑video stage** is the dominant surface; classroom chrome (status bar, header, REC, Now chip) is the Chrome v1 system.
- **Self‑view** is the student's own small video: open ↔ collapsed, draggable within a safe zone, snaps to a left/right edge tab. **Collapsed ≠ camera off.**
- **Camera** opens **ON** by default and is the student's quick control (on/off available).
- **Mic** is shown **muted / teacher‑controlled** — not a free student toggle in the main room. Green camera dot appears only on the collapsed tab.
- **Chat** stays in the main room: ephemeral overlay bubbles that stack upward and fade progressively, plus a chat sheet and a keyboard‑open state. **Helper messages are inline** with the **yellow left rule + sparkle** treatment.
- **Timeline / Progress sheet** shows the **current session** steps (completed / live / upcoming, with a "Live now" indicator) and a **"Later today"** section with **multiple same‑day upcoming session cards, collapsed by default** and independently expandable.
- **Participants sheet** is browse‑only (Teaching team → You → Classmates) with role chips and level dots. No DM.
- **Demonstration state** is a calm pinned/staged split‑view: **Teacher (top) + selected student (bottom)**. The selected student's own self‑view folds; all other students stay muted; the sidebar is unchanged. Labels: teacher panel = "Niv (teacher)", student panel = "You" (top‑left). It is a **layout state, not a self‑view state.**

---

## What was removed / frozen

Removed from the student classroom for MVP:

- All / Mine / Helper **chat tabs** (one group chat only; Helper stays inline).
- **Followed‑message** treatment (the yellow rule + sparkle is now the Helper treatment).
- **Whiteboard** scaffold and references.
- In the demo state: the **LIVE pill / blinking red dot**, the bottom **"You're live…" caption**, and any **LIVE‑locked language, lock glyph, or red live ring**. None of these are present.
- **Counter** UI, **trio / C role**, and other out‑of‑MVP constructs — confirmed absent.

Frozen (not part of this pass, intentionally untouched): Pair Rooms, Teacher Cockpit, Practice Primitives, AI feedback / button practice, carousel / TIP.

---

## Which surfaces are interactive in the integrated demo

Open from the right rail (toggle back by tapping the active item again):

- **Chat** → chat sheet
- **Timeline / Progress** → timeline sheet
- **Participants** → participants sheet

Also interactive: self‑view drag / collapse / reopen, camera on/off, demonstration state toggle, header active/faded, chat overlay → keyboard, and the chat sheet composer (input toggles the send button state). A review board at the top of the file shows the key states statically; the live phone below is fully interactive via the controls panel.

---

## Dark / Light support

A **Dark / Light app‑brand toggle** ("App brand: Dark / Light") is available in the demo controls. Both themes work across Chat, Timeline, and Participants sheets.

- **Dark** is the primary classroom reference. Active rail icon/count may be **yellow**.
- **Light** uses warm **Neutral‑100 (#F7F6EF)**, not pure white, with subtle 0.5px / 1px strokes. In Light, the **active rail state is bold white (higher opacity + heavier stroke), not yellow**, so yellow stays reserved for semantic emphasis (Live now, Helper, send CTA). Helper keeps the yellow left rule + sparkle in both themes.

**Scope note:** the theme styles the **sheet surfaces**. The live teacher‑video stage, self‑view, rail, and demo split sit over video and are intentionally left unthemed — a fully recolored light *classroom backdrop* is a larger exploration, not part of this cleanup.

---

## What remains open (later passes)

- **Chat micro‑pass:**
  - Reactions / emoji affordance in the composer is **not currently visible** in the integrated demo and should be revisited.
  - Revisit chat composer states later, including **empty / typing / keyboard open / send active / reactions**.
  - Keep the **Helper message treatment as yellow left rule + sparkle**.
- **Timeline (A2):** drive the number of "Later today" cards from real schedule data; hide the section when the current session is the day's last; scroll‑to‑current on open.
- **Participants (A2):** behavior beyond browsing (search wiring, presence), if needed.
- **Mic model:** decisions beyond the demo (the biggest cross‑surface unblocker).
- **Separate checkpoints:** Pair Rooms, Teacher Cockpit, Practice Primitives.
- **Light theme:** optional fuller light classroom shell beyond the sheets.
