# Study Planner — Change Log

A running record of schedule changes, fixes, and problem areas. Claude reads this at the start of each session to catch issues quickly.

---

## 2026-04-26 — Session: Phase 1 Overhaul

### Schedule Changes

#### Apr 26 (Sunday)
- **Removed** `14:00–15:00 — Homework` (no homework needed from Apr 26 onwards)
- **Shifted** English Lit from `15:00–17:00` → `14:00–16:00` (fills the freed homework slot)
- **Added** `16:30–17:30 — Break 🛑` (user requested rest period)
- **Added** `18:00–19:30 — Economics: Essay practice` (user's study block, previously pinned via UI)
- **Rescheduled** Add Math from `17:00–19:00` → `19:30–21:30` (pushed past the eco block)
- **Shortened** English Language from 90 min → 30 min (`21:30–22:00`) — 60 min carried forward
- **Updated** `freeWindows`: `['10:00–10:45 (45 min)','14:00–16:30 (2.5 hrs)','19:30–22:00 (2.5 hrs)']`
- **Note**: `Break 16:30–17:30. English Language shortened by 60 min — carried forward to Apr 27.`

#### Apr 27 (Monday)
- **Correction** (same session): School runs until **16:00**, travel to Economics tuition starts 16:15 — no usable afternoon window. Reverted to original `freeWindows: ['18:45–22:30 (3.75 hrs)']`.
- **Removed** `22:15–22:30 — French Speaking` (too short, too late — covered by Apr 28 morning instead)
- Carry-forward sessions (English Language + French Speaking) moved to **Apr 28** which is study leave.

#### Apr 28 (Tuesday — Study Leave)
- **English Language** `21:15–22:30` updated to note it covers the Apr 26 carry-forward.
- French Speaking already has a 2-hour mock oral block `10:00–12:00` — no extra session needed.

### Bug Fixes
- **Firebase stale override bug**: When user added a break + eco block via pinned-time mode on Apr 26, conflicting sessions (English Lit, Add Math, Economics) were NOT displaced. Root cause: a previous broken attempt had written a `plannedOverride` to Firebase that was overriding the hardcoded DATA. Fix: (1) corrected the hardcoded DATA above, (2) added **🔄 Reset Day to Original** button in the edit panel to clear stale overrides.

### New Features
- **🔄 Reset Day button**: Appears in the edit panel (✏️ Edit Plan mode) when a day has a saved override. Clears the Firebase/localStorage override and reverts the day to its hardcoded schedule. Undo-able.
- **⏳ Make-up / Carry-forward tracker**: Sessions that are displaced by a pinned item and can't be auto-rescheduled are now logged as "debts" in Firebase (`_debts` key). The amber **⏳ Make-up Needed** panel appears at the top of the schedule when debts exist, with **📅 Schedule** (prefills the Add Task panel) and **✓ Dismiss** buttons.
- **`applyPatches` null-delete**: Patches with `null` values now delete the key from overrides rather than setting it to null — this ensures a clean reset.

### Problem Areas to Watch
- English Language is split across Apr 26 (30 min) and Apr 27 (60 min carry-forward). Check that both sessions are marked complete.
- Apr 27's afternoon slot (`14:00–16:15`) is NEW and may not sync correctly if there is a stale Firebase override for Apr 27. Use **🔄 Reset Day to Original** if it doesn't appear.
- French Speaking exam is Apr 29–30. Make sure all 5 topic areas are covered in Apr 26–28 sessions.
- Add Math no-calc revision is split across Apr 27 (20:30–22:15) and Apr 28 (15:00–16:30). Ensure both are done before the Apr 28 exam window.

---

## Future Sessions — Things to Implement

- **Phase 2: Verification system** — before marking a session complete, user must either (a) upload a photo of their notes/work, or (b) answer a short quiz on the subject. Questions to ask Alissa first:
  - Which subjects should require verification (all or just high-priority 🔴)?
  - Upload vs quiz — which does she prefer? Both?
  - What happens if she skips verification? Just a warning, or block the tick?
  - Quiz questions: pre-written by Claude per subject? or AI-generated on the fly?
  - Does she want to save quiz scores to track over time?
