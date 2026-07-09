# Changelog — Student Main Classroom MVP Cleanup v1

All work below applies to `classroom-selfview-default-v1.html`. Earlier phase‑1 self‑view/turn/LIVE refinements predate this checkpoint and are baked into the base.

## A1 — Classroom cleanup + Demonstration state
- Self‑view **mic** changed to a static **muted / teacher‑controlled** affordance (no free student toggle); camera stays interactive; green dot only on the collapsed tab.
- Removed the **Followed‑Message** treatment; reassigned the **yellow left rule + sparkle** to **Helper** messages, inline in the chat stream.
- Added the **Demonstration state** as a pinned/staged **split‑view** (teacher + selected student), with the selected student's self‑view folded. Defined as a layout state, not a self‑view state.
- **Whiteboard** scaffold and stale references removed. Confirmed no counter / LIVE‑locked / trio / C‑role / free mic toggle remained.

## A1.5 — Integration cleanup
- **Removed chat tabs** (All / Mine / Helper) → one group chat; Helper stays inline.
- Confirmed **camera default ON**; mic muted/teacher‑controlled; green dot only on collapsed tab.
- **Wired the right rail** so Timeline / Chat / Participants open their sheets interactively (toggle to close); active rail icon reflects the open surface.
- **Ported the Timeline and Participants sheets** into the classroom from the clean component files (`reference/`), as theme‑aware bottom sheets.
- Added a **Dark / Light app‑brand toggle**; Light uses warm Neutral‑100 (#F7F6EF) with subtle strokes; Helper keeps the yellow rule + sparkle in both themes.
- Demonstration state kept minimal (no LIVE‑locked / red ring / lock glyph / live pill on self‑view).

## Timeline integration fix
- Root cause: ported Timeline CSS relied on spacing tokens (`--s14`, `--s28`, `--s4`) that weren't defined in the classroom file, so several `padding`/`margin` declarations were dropped — causing left‑clipped text, a clipped "Later today" label, overlapping dots/cards, and a cramped body. **Added the missing tokens.**
- Restructured the Timeline sheet into a clear **Current session** block (aligned dots; completed / live / upcoming steps; "Live now") and a **Later today** section with **multiple same‑day upcoming session cards, collapsed by default** and independently expandable.
- Confirmed the internal **right gutter** reserves space so content clears the rail; header/handle stay fixed while the body scrolls. Verified in Dark and Light.

## Light rail active state + chat composer parity (final polish)
- **Light rail active state**: in Light, the active rail icon/count now reads through **bold white (full opacity + heavier stroke)** instead of yellow, keeping yellow semantic‑only. Dark keeps yellow active.
- **Chat composer parity**: added the **emoji/reaction button** to the sheet composer and wired the input so the **send button is grey when empty and turns yellow/primary when text is present**. Verified keyboard‑open state, overlay stacking/fade, helper inline treatment, and absence of chat tabs.
  - (Note: emoji affordance visibility in the integrated demo is still flagged for a later chat micro‑pass — see README "What remains open.")

## Final demo‑state label cleanup
- Moved the **selected‑student label to the top‑left** of the student panel and set it to **"You"**.
- Kept the **teacher label** ("Niv (teacher)") in the teacher panel.
- **Removed** the bottom "You're live…" caption and the **LIVE pill** (and its blinking red dot). No red/danger element; no LIVE‑locked language, lock icon, or red ring.
- Result: a calm pinned/staged split — Teacher + selected student.
