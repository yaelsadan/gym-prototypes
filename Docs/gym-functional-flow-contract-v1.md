# Gym – Functional Flow Contract v1

Status: FINAL SYNC IN PROGRESS
Source of truth: Final PRD + confirmed product decisions
Working branch: prd-final-sync

This document defines the behavior that the active prototypes in /Current must follow.

Do not infer or invent behavior that is not specified here.
Do not modify items marked OPEN until a final product decision is added.

---

## 1. Active prototypes

The active prototypes are:

- student-main-classroom-desktop
- student-main-classroom-mobile
- student-practice-rooms-desktop
- student-practice-rooms-mobile
- teacher-cockpit-desktop

Files in Archive, Checkpoints, or playground files are not source of truth.

---

## 2. Activity recipes — FINAL

The four predefined activities have fixed timing.
Teachers cannot manually override their duration.

Custom duration exists only in Custom Rooms.

### Intensive Exercise — 80 sec

- 10 sec — Activity Start Countdown
  - final 3 sec: Student 1 frame blinks
  - text: “[Student 1 Name] starts!”
- 10 sec — Student 1 turn
- 5 sec — Switch
  - “Now switch!” for first 2 sec
  - final 3 sec: Student 2 frame blinks
- 10 sec — Student 2 turn
- 10 sec — Round 2 trigger / break
- 10 sec — Student 1 turn
- 5 sec — Switch
- 10 sec — Student 2 turn
- 10 sec — Room closing countdown

### Grandma Operation — 70 sec

- 10 sec — Activity Start Countdown
  - final 3 sec: Student 1 frame blinks
- 10 sec — Student 1 turn
- 5 sec — Switch
- 10 sec — Student 2 turn
- 10 sec — Round 2 trigger / break
- 5 sec — Student 1 turn
- 5 sec — Switch
- 5 sec — Student 2 turn
- 10 sec — Room closing countdown

### Dialogues — 65 sec

- 10 sec — Activity Start Countdown
  - final 3 sec:
    “[Student 1 Name] starts, [Student 2 Name] replies”
- 20 sec — Round 1
- 5 sec — Switch
  - first 2 sec: “Now switch!”
  - final 3 sec:
    “[Student 2 Name] starts, [Student 1 Name] replies”
- 20 sec — Round 2
- 10 sec — Room closing countdown

No participant frames during active Dialogue rounds.

### Carousel — 65 sec

- 10 sec — Activity Start Countdown
  - final 3 sec: Student 1 frame blinks
- 20 sec — Round 1
- 5 sec — Switch
  - text: “Now [Student 2 Name] starts!”
  - Student 2 frame blinks
- 20 sec — Round 2
- 10 sec — Room closing countdown

Practice Room carousel:
- previous / current / next character visual
- characters change automatically and randomly every 5 sec

Main Room / Demonstration carousel:
- characters change automatically every 4 sec
- instructor can pause on a specific character

---

## 3. General room timing — FINAL

Every predefined activity begins with a 10-second Activity Start Countdown.

During the final 3 seconds:
- sound cue is triggered
- relevant participant frame / instruction behavior follows the activity recipe

The final 10 seconds are always the Room Closing Countdown.

Display:
“Room closes in X seconds”

At zero, all remaining room participants return to the Main Room.

Room timer and activity timer must use one synchronized source of truth.

---

## 4. Camera / microphone off in a couple room — FINAL

### Student A turns camera or mic off

The device is turned off immediately.

A 10-second confirmation / grace popup appears.

Student A can:

#### Stay
- camera/mic turns back on
- popup closes
- student remains in the couple room

#### Leave
- student exits the couple room
- student is routed to the Waiting / Return-to-Main state
- remaining room time is visible
- student waits there until the room activity ends

If the grace period expires without restoring participation, Student A follows the Leave behavior.

Student A must NOT be routed to Solo Room.

### Student B — partner of Student A

Student B receives an informational popup explaining that the partner turned off camera/mic and that Solo Practice will begin if it is not restored.

The acknowledgement button does not control routing.

If Student A restores the device in time:
- popup closes
- couple practice continues

If Student A leaves or grace expires:
- Student B automatically transitions to Solo Room
- Solo activity = Flashcards

---

## 5. Partner leaves / report — FINAL

When a participant is abandoned because their partner leaves the couple room, they are routed to Solo Room.

Solo Room:
- uses Flashcards
- remains yoked to the remaining couple-room time

Leave & Report is available in rooms but should not be visually prominent.

Reporting participant leaves immediately.

The remaining/reported participant receives the same partner-loss handling and transitions to Solo when applicable.

---

## 6. Helper assignment — FINAL

When the number of eligible breakout-room students is uneven:
- send the Helper to a room

When possible:
- avoid pairing the Helper with the same student twice within the same Block

Instructor receives a notification when all students have been successfully assigned and routed to rooms.

---

## 7. Custom Rooms — FINAL

Only Custom Rooms allow teacher-defined duration.

Custom Rooms use:
- total room countdown only
- final 10 sec: “Room closes in X seconds”

They do not use one of the four predefined activity recipes.

---

## 8. Broadcast / TIP / Start — OPEN

DO NOT CHANGE CURRENT IMPLEMENTATION UNTIL PM CONFIRMATION.

Confirmed:
- instructor broadcasts exercise instructions to the rooms
- broadcast is recorded
- recording becomes available to students via the TIP button

Open product decision:

Option currently described in parts of the PRD:
Broadcast ends → recording is saved as TIP → activity begins automatically.

Proposed revised flow awaiting PM confirmation:
Broadcast / Record → Save as TIP → optional Play / Record Again → explicit Start Activity.

Until confirmed:
- do not refactor Broadcast / TIP / Start behavior
- do not remove or add Start controls
- do not change timer initiation logic related to this decision

---

## 9. Main Room Demonstration — FINAL

Teacher activates Demonstration.

Students receive volunteer consent popup.

Popup remains available for 10 seconds.

Only students who consent are eligible.

System randomly chooses one consenting student.

Selected student’s video/audio is shared with the class.

Teacher + selected student appear in split view.

Ending demonstration returns everyone to normal Main Room state.

---

## 10. Scope rule for implementation

Changes must be made incrementally.

Do not redesign approved visual surfaces unless required by this contract.

Prefer:
- shared behavior
- synchronized timing
- explicit state transitions
- minimal local changes

Avoid:
- broad visual rewrites
- unrelated refactors
- changing approved copy unless required for behavior
- modifying Archive / Checkpoints / playground files