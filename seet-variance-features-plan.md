# SEET Variance Dashboard — New Features Implementation Plan

## Top-Level Overview

Three related features are added to the single-file `index.html` (~7 124 lines):

1. **Discrepancy List** — a new admin-only top-level nav item and page (`page-discrepancy-list`).
2. **Detect Variances folder** — a collapsible nav folder inside the admin section containing two sub-pages:
   - `page-wfh-variance` — Monday vs WFH Schedule
   - `page-ilc-variance`  — Monday vs ILC
3. **Search inputs** — a text search box added to the toolbar of six existing/new pages (Monday Attendance, ILC Attendance, Masterlist, WFH Schedule, Monday vs WFH Schedule, Monday vs ILC).

The codebase already contains full CSS for `.nav-parent` / `.nav-sub-list` / `.nav-sub-item` collapsible folders and `toggleNavParent()`. No new CSS framework is needed. Two new Firestore collections will be written: `wfhVariances` and `ilcMondayVariances`.

---

## Discovered Patterns (reference for implementation)

| Pattern | Location |
|---|---|
| Admin nav section | `#admin-nav-section` div, `style="display:none;"`, revealed on line 4479 |
| Collapsible folder CSS | Lines 176–251 (`.nav-parent`, `.nav-sub-list`, `.nav-sub-item`) |
| `toggleNavParent(key)` JS | Line 4313 |
| `PAGE_TITLES` object | Line 4268 |
| `navigate(page)` function | Line 4282 |
| `.nav-sub-item` click binding | Line 4308 |
| Page HTML pattern | `<div class="page" id="page-*">` with `.glow-line`, `.section-header`, `.page-toolbar`, `.admin-table-wrap` |
| `_populateYearDropdown()` | Line 6491 |
| `_populateFilterDropdown()` | Line 6507 |
| `_mondayAttRecords[]` | Line 6020 — fields: `ibmSerialNo`, `name`, `email`, `date`, `group`, `status`, `duration`, `month`, `year` |
| `_monthlyAttRecords[]` | Line 5709 — fields: `ibmSerialNo`, `name`, `email`, `weekending`, `activity`, `monday`…`friday` (hours), `activityByDay`, `month`, `year` |
| `wfhSchedule` collection | Fields: `ibmSerialNo`, `name`, `email`, `daysSelection` (e.g. "Wednesday, Friday"), `wfhStatus` |
| `showToast(msg, icon)` | Used throughout |
| `escapeHtml(s)` | Used throughout |
| `_lastNameKey(name)` | Line 5712 |

---

## Sub-Tasks

---

### Sub-Task 1 — Sidebar: Discrepancy List nav item

**Status:** `[ ] pending`

**Intent:** Add a "Discrepancy List" nav item to the admin-only section so admins can navigate to the new page.

**Expected Outcomes:**
- A nav item with `data-page="discrepancy-list"` appears inside `#admin-nav-section` below existing items.
- It is hidden to non-admins (inherited from parent section's `display:none`).
- Clicking it calls `navigate('discrepancy-list')`.

**Todo List:**
1. Inside `#admin-nav-section` (after the "Role Maintenance" nav-item, around line 3283), add:
   ```html
   <div class="nav-item" data-page="discrepancy-list">
     <span class="nav-icon">⚠️</span> Discrepancy List
   </div>
   ```
2. In `PAGE_TITLES` (line 4268), add: `'discrepancy-list': 'Discrepancy List'`
3. In `navigate()` (line 4291 block), add: `if (page === 'discrepancy-list') loadDiscrepancyList();`

**Relevant Context:** Lines 3266–3283 (admin nav section), lines 4268–4299 (PAGE_TITLES + navigate).

---

### Sub-Task 2 — Sidebar: Detect Variances collapsible folder

**Status:** `[ ] pending`

**Intent:** Add a "Detect Variances" folder inside the admin section using the existing `.nav-parent` / `.nav-sub-list` / `.nav-sub-item` accordion pattern. Contains two sub-page links.

**Expected Outcomes:**
- A collapsible row labelled "Detect Variances" appears in `#admin-nav-section`.
- Clicking the folder header toggles the child list open/closed.
- Two sub-items: "Monday vs WFH Schedule" (`data-page="wfh-variance"`) and "Monday vs ILC" (`data-page="ilc-variance"`).
- Clicking a sub-item navigates to its page and marks it `.active`.

**Todo List:**
1. After the Discrepancy List nav-item (end of `#admin-nav-section`), add the folder block:
   ```html
   <div class="nav-parent" id="nav-parent-detect" onclick="toggleNavParent('detect')">
     <span class="nav-icon">🔍</span> Detect Variances
     <span class="nav-chevron">▾</span>
   </div>
   <div class="nav-sub-list" id="nav-sub-detect">
     <div class="nav-sub-item" data-page="wfh-variance">Monday vs WFH Schedule</div>
     <div class="nav-sub-item" data-page="ilc-variance">Monday vs ILC</div>
   </div>
   ```
2. In `PAGE_TITLES`, add both: `'wfh-variance': 'Monday vs WFH Schedule'` and `'ilc-variance': 'Monday vs ILC'`.
3. In `navigate()`, add:
   - `if (page === 'wfh-variance') loadWfhVariance();`
   - `if (page === 'ilc-variance') loadIlcVariance();`
4. The `document.querySelectorAll('.nav-sub-item')` binding at line 4308 already handles click routing — no change needed there.

**Relevant Context:** Lines 3266–3283 (admin nav), lines 176–251 (folder CSS already present), lines 4308–4320 (sub-item binding + toggleNavParent).

---

### Sub-Task 3 — Page HTML: Discrepancy List page

**Status:** `[ ] pending`

**Intent:** Create the page skeleton for `page-discrepancy-list` in the main content area. The page content/logic will be minimal initially — it displays a saved list of discrepancies (from a future `discrepancies` collection or derived from variance data). This sub-task creates the shell; logic can be fleshed out in a follow-up.

**Expected Outcomes:**
- `<div class="page" id="page-discrepancy-list">` exists in the HTML.
- Has standard `.glow-line`, `.section-header` (title + subtitle + Refresh button).
- Has a `.page-toolbar` with Year, Month, Name, IBM Serial No. filter dropdowns.
- Has an `.admin-table-wrap` table with columns: IBM Serial No., Name, Email, Date, Type, Variance, Reason.
- A Refresh button calls `loadDiscrepancyList()`.

**Todo List:**
1. After `page-monday-attendance` closing `</div>` (line 3628), before the `/main` comment, insert:
   ```html
   <!-- DISCREPANCY LIST PAGE -->
   <div class="page" id="page-discrepancy-list">
     <div class="glow-line"></div>
     <div class="section-header">
       <div>
         <div class="section-title">Discrepancy List</div>
         <div class="section-subtitle">Consolidated list of all detected variances.</div>
       </div>
       <button class="btn btn-ghost btn-sm" onclick="loadDiscrepancyList(true)">↻ Refresh</button>
     </div>
     <div class="page-toolbar">
       <select id="discrepancy-year"   onchange="filterDiscrepancyList()"><option value="">Year</option></select>
       <select id="discrepancy-month"  onchange="filterDiscrepancyList()">
         <option value="">Month</option>
         <option>January</option>…<option>December</option>
       </select>
       <select id="discrepancy-name"   onchange="filterDiscrepancyList()"><option value="">Name (All)</option></select>
       <select id="discrepancy-serial" onchange="filterDiscrepancyList()"><option value="">IBM Serial No. (All)</option></select>
     </div>
     <div id="discrepancy-body">
       <div class="admin-table-wrap">
         <table class="admin-table" id="discrepancy-table">
           <thead><tr>
             <th>IBM Serial No.</th><th>Name</th><th>Email</th>
             <th>Date</th><th>Type</th><th>Variance</th><th>Reason</th>
           </tr></thead>
           <tbody id="discrepancy-tbody">
             <tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">Select a year and month to see discrepancies.</td></tr>
           </tbody>
         </table>
       </div>
     </div>
   </div>
   ```
2. The `loadDiscrepancyList()` function (in Sub-Task 6) will query both `wfhVariances` and `ilcMondayVariances` collections and merge results.

**Relevant Context:** Lines 3587–3630 (monday-attendance page pattern used as template).

---

### Sub-Task 4 — Page HTML: Monday vs WFH Schedule page

**Status:** `[ ] pending`

**Intent:** Create the `page-wfh-variance` page with all columns, toolbar filters, and action buttons as specified.

**Expected Outcomes:**
- Page with title "Monday vs WFH Schedule".
- Action buttons: Detect Variances, Clear Variances, Notify Employees.
- Filters: Report Year, Report Month, Name, IBM Serial No.
- Table columns: IBM Serial No. | Name | Email | WFH Day 1 | WFH Day 2 | Date | Monday Status | Monday Duration | Weekly Onsite Count | Variance | Reason.
- Rows are generated by `_renderWfhVariance()` from an in-memory `_wfhVarianceRecords[]` array.

**Todo List:**
1. Insert the page after the Discrepancy List page:
   ```html
   <!-- MONDAY vs WFH SCHEDULE PAGE -->
   <div class="page" id="page-wfh-variance">
     <div class="glow-line"></div>
     <div class="section-header">
       <div>
         <div class="section-title">Monday vs WFH Schedule</div>
         <div class="section-subtitle">Detect WFH compliance variances between Monday.com attendance and employee WFH schedule.</div>
       </div>
       <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
         <button class="btn btn-primary btn-sm" onclick="detectWfhVariances()">🔍 Detect Variances</button>
         <button class="btn btn-danger btn-sm"  onclick="clearWfhVariances()">🗑 Clear Variances</button>
         <button class="btn btn-ghost btn-sm"   onclick="notifyWfhVariances()">📧 Notify Employees</button>
       </div>
     </div>
     <div class="page-toolbar">
       <select id="wfh-var-year"   onchange="filterWfhVariance()"><option value="">Year</option></select>
       <select id="wfh-var-month"  onchange="filterWfhVariance()">
         <option value="">Month</option>
         <option>January</option>…<option>December</option>
       </select>
       <select id="wfh-var-name"   onchange="filterWfhVariance()"><option value="">Name (All)</option></select>
       <select id="wfh-var-serial" onchange="filterWfhVariance()"><option value="">IBM Serial No. (All)</option></select>
     </div>
     <div id="wfh-var-body">
       <div class="admin-table-wrap">
         <table class="admin-table" id="wfh-var-table">
           <thead><tr>
             <th>IBM Serial No.</th><th>Name</th><th>Email</th>
             <th>WFH Day 1</th><th>WFH Day 2</th>
             <th>Date</th><th>Monday Status</th><th>Monday Duration</th>
             <th>Weekly Onsite Count</th><th>Variance</th><th>Reason</th>
           </tr></thead>
           <tbody id="wfh-var-tbody">
             <tr><td colspan="11" style="text-align:center;color:var(--muted);padding:32px;">Click "Detect Variances" to analyse records.</td></tr>
           </tbody>
         </table>
       </div>
     </div>
   </div>
   ```

**Relevant Context:** Lines 3587–3628 (monday-attendance page as template).

---

### Sub-Task 5 — Page HTML: Monday vs ILC page

**Status:** `[ ] pending`

**Intent:** Create the `page-ilc-variance` page with all columns, toolbar filters, and action buttons as specified.

**Expected Outcomes:**
- Page with title "Monday vs ILC".
- Action buttons: Detect Variances, Clear Variances, Notify Employees.
- Filters: Report Year, Report Month, Name, IBM Serial No.
- Table columns: IBM Serial No. | Name | Email | Date (ILC weekending) | ILC Activity | ILC Clocking | Monday Status | Monday Duration | Variance | Variance Reason.

**Todo List:**
1. Insert the page after `page-wfh-variance`:
   ```html
   <!-- MONDAY vs ILC PAGE -->
   <div class="page" id="page-ilc-variance">
     <div class="glow-line"></div>
     <div class="section-header">
       <div>
         <div class="section-title">Monday vs ILC</div>
         <div class="section-subtitle">Detect variances between Monday.com attendance and ILC clockings.</div>
       </div>
       <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
         <button class="btn btn-primary btn-sm" onclick="detectIlcVariances()">🔍 Detect Variances</button>
         <button class="btn btn-danger btn-sm"  onclick="clearIlcVariances()">🗑 Clear Variances</button>
         <button class="btn btn-ghost btn-sm"   onclick="notifyIlcVariances()">📧 Notify Employees</button>
       </div>
     </div>
     <div class="page-toolbar">
       <select id="ilc-var-year"   onchange="filterIlcVariance()"><option value="">Year</option></select>
       <select id="ilc-var-month"  onchange="filterIlcVariance()">
         <option value="">Month</option>
         <option>January</option>…<option>December</option>
       </select>
       <select id="ilc-var-name"   onchange="filterIlcVariance()"><option value="">Name (All)</option></select>
       <select id="ilc-var-serial" onchange="filterIlcVariance()"><option value="">IBM Serial No. (All)</option></select>
     </div>
     <div id="ilc-var-body">
       <div class="admin-table-wrap">
         <table class="admin-table" id="ilc-var-table">
           <thead><tr>
             <th>IBM Serial No.</th><th>Name</th><th>Email</th>
             <th>Date (Weekending)</th><th>ILC Activity</th><th>ILC Clocking</th>
             <th>Monday Status</th><th>Monday Duration</th>
             <th>Variance</th><th>Variance Reason</th>
           </tr></thead>
           <tbody id="ilc-var-tbody">
             <tr><td colspan="10" style="text-align:center;color:var(--muted);padding:32px;">Click "Detect Variances" to analyse records.</td></tr>
           </tbody>
         </table>
       </div>
     </div>
   </div>
   ```

**Relevant Context:** Sub-Task 4 page as template.

---

### Sub-Task 6 — JS: Discrepancy List logic

**Status:** `[ ] pending`

**Intent:** Implement `loadDiscrepancyList()` and `filterDiscrepancyList()` which query and display merged results from both `wfhVariances` and `ilcMondayVariances` collections.

**Expected Outcomes:**
- `_discrepancyRecords[]` in-memory array populated from both Firestore collections.
- `loadDiscrepancyList(forceServer)` fetches both collections in parallel.
- `filterDiscrepancyList()` / `_renderDiscrepancyList()` filter by year, month, name, serial and render rows.
- Each row shows: Serial, Name, Email, Date, Type ("WFH" or "ILC"), Variance, Reason.

**Todo List:**
1. Declare `var _discrepancyRecords = [];` near the other record arrays.
2. Implement `loadDiscrepancyList(forceServer)`:
   - Parallel `Promise.all` fetching `wfhVariances` and `ilcMondayVariances`.
   - Tag each record with a `_type` field ("WFH" or "ILC").
   - Merge into `_discrepancyRecords`.
   - Call `_populateYearDropdown`, `_populateFilterDropdown` for year/name/serial, then `_renderDiscrepancyList()`.
3. Implement `filterDiscrepancyList()` — calls `_renderDiscrepancyList()`.
4. Implement `_renderDiscrepancyList()` — filters `_discrepancyRecords` by year/month/name/serial and renders rows.

**Relevant Context:** `loadMondayAttendance()` (line 6022) as the exact structural template.

---

### Sub-Task 7 — JS: WFH Variance detection logic

**Status:** `[ ] pending`

**Intent:** Implement the full detect/clear/notify flow for Monday vs WFH Schedule.

**Expected Outcomes:**
- `detectWfhVariances()`: reads the selected year+month filter, loads `mondayAttendance` records + `wfhSchedule` records for matching period, applies the 6-rule variance logic per row, writes results to `wfhVariances` Firestore collection, then re-renders the table.
- `clearWfhVariances()`: deletes all documents from `wfhVariances` for the selected year+month (confirm modal first).
- `notifyWfhVariances()`: shows a toast stub ("Notification feature coming soon") for now.
- `_renderWfhVariance()` / `filterWfhVariance()`: filter and render `_wfhVarianceRecords[]`.

**Monday.com status values (confirmed):**

| Monday.com Status | Meaning |
|---|---|
| `"Office"` | Physically onsite — counts toward Weekly Onsite Count |
| `"Remote (Scheduled)"` | Working from home on a **scheduled** WFH day — correct, no daily variance |
| `"Unscheduled"` | Working remotely on a day that is **not** a scheduled WFH day — potential daily variance |
| `"Sick"`, `"Vacation"`, `"CDO"`, `"Holiday"`, `"Emergency"`, `"BCP Impacted"` | Exempt leave statuses — no daily variance; count toward Weekly Exemption |

**Variance rules (applied per mondayAttendance record):**

```
Given a mondayAttendance record R (has date, status, duration, ibmSerialNo):
  dayOfWeek = getDayOfWeek(R.date)   // e.g. "monday", "tuesday", …

  // Rule 1 — skip weekends
  IF dayOfWeek IN ["saturday", "sunday"] → varType = "No Variance"

  // Rule 2 — skip exempt leave statuses (these never cause daily variance)
  ELSE IF R.status IN ["Sick","Vacation","CDO","Holiday","Emergency","BCP Impacted"]
    → varType = "No Variance"

  // Rule 3 — daily WFH compliance check
  ELSE:
    wfh      = lookup wfhSchedule by ibmSerialNo → parse daysSelection into wfhDay1, wfhDay2
    isWfhDay = (dayOfWeek === wfhDay1 OR dayOfWeek === wfhDay2)

    // "Remote (Scheduled)" on a scheduled WFH day → correct, no daily variance
    IF isWfhDay AND R.status = "Remote (Scheduled)"
      → proceed to Rule 4 (weekly check)

    // "Remote (Scheduled)" on a NON-WFH day → the employee worked remotely on a day
    //   they weren't scheduled to; that is a Daily Variance
    ELSE IF NOT isWfhDay AND R.status = "Remote (Scheduled)"
      → varType = "Daily Variance",
        reason = "Remote (Scheduled) on a non-WFH day"

    // "Unscheduled" = remote on a day NOT in the WFH schedule → Daily Variance
    ELSE IF R.status = "Unscheduled"
      → varType = "Daily Variance",
        reason = "Unscheduled remote on " + (isWfhDay ? "WFH day" : "non-WFH day")

    // "Office" on any weekday → correct; proceed to weekly check
    ELSE IF R.status = "Office"
      → proceed to Rule 4

    // Any other unrecognised status → proceed to Rule 4 (no daily variance)
    ELSE → proceed to Rule 4

    // Rule 4 — weekly onsite count (only reached when no Daily Variance above)
    weekRecords   = all mondayAttendance records for same ibmSerialNo in same Mon–Sun week
    onsiteCount   = count of weekRecords WHERE status = "Office"
    exemptCount   = count of weekRecords WHERE status IN
                      ["Sick","Vacation","CDO","Holiday","Emergency","BCP Impacted"]
    requiredOnsite = 3

    // Weekly Exemption: shortfall is covered when onsiteCount + exemptCount >= requiredOnsite
    IF onsiteCount < requiredOnsite AND (onsiteCount + exemptCount) < requiredOnsite
      → varType = "Weekly Variance",
        reason = "Only " + onsiteCount + " onsite day(s); " + exemptCount
                 + " exempt day(s); requires 3"
    ELSE
      → varType = "No Variance"
```

**Weekly Onsite Count** = count of records for that employee in the Mon–Sun calendar week of `R.date` where `status === "Office"`.

**Weekly Exemption logic explained:**
- Required onsite days = 3 (the non-WFH weekdays, e.g. Wed/Thu/Fri for a Mon+Tue WFH schedule).
- If onsiteCount = 2 and exemptCount = 1: `2 + 1 = 3 ≥ 3` → **No Variance** (sick/leave covered the gap).
- If onsiteCount = 1 and exemptCount = 1: `1 + 1 = 2 < 3` → **Weekly Variance**.
- If onsiteCount = 2 and exemptCount = 0: `2 + 0 = 2 < 3` → **Weekly Variance**.

**Daily Variance decision table:**

| Day type | Monday Status | Result |
|---|---|---|
| Sat / Sun | any | No Variance |
| Any weekday | Sick / Vacation / CDO / Holiday / Emergency / BCP Impacted | No Variance |
| Scheduled WFH day | `Remote (Scheduled)` | No Variance → weekly check |
| Non-WFH weekday | `Remote (Scheduled)` | **Daily Variance** |
| Any weekday | `Unscheduled` | **Daily Variance** |
| Any weekday | `Office` | No Variance → weekly check |

**Firestore document shape for `wfhVariances`:**
```json
{
  "ibmSerialNo": "...",
  "name": "...",
  "email": "...",
  "wfhDay1": "Wednesday",
  "wfhDay2": "Friday",
  "date": "2025-01-06",
  "mondayStatus": "Unscheduled",
  "mondayDuration": "...",
  "weeklyOnsiteCount": 2,
  "variance": "Daily Variance",
  "reason": "...",
  "month": "January",
  "year": "2025",
  "detectedAt": <serverTimestamp>
}
```

**Todo List:**
1. Declare `var _wfhVarianceRecords = [];`.
2. Implement `loadWfhVariance(forceServer)` — loads `wfhVariances` collection (same pattern as `loadMondayAttendance`). Populates year/name/serial dropdowns.
3. Implement `filterWfhVariance()` → calls `_renderWfhVariance()`.
4. Implement `_renderWfhVariance()` — filters `_wfhVarianceRecords` and renders 11-column rows.
5. Implement helper `_parseDaysSelection(daysSelectionStr)` → returns `{ day1, day2 }` normalised to lowercase day names.
6. Implement helper `_weeklyOnsiteCount(ibmSerialNo, dateStr, mondayRecords)` → counts `status === "Office"` records in the Mon–Sun week containing `dateStr`.
7. Implement `detectWfhVariances()`:
   a. Read year+month from `#wfh-var-year` / `#wfh-var-month` filters (require both).
   b. Parallel-load matching `mondayAttendance` records + full `wfhSchedule` (already small).
   c. Build WFH lookup map: `{ ibmSerialNo → { day1, day2 } }`.
   d. For each Monday record, compute variance using the 6-rule logic.
   e. Batch-write all result documents to `wfhVariances` collection (use Firestore batch).
   f. Reload `_wfhVarianceRecords` and re-render.
8. Implement `clearWfhVariances()` — confirm dialog, then batch-delete all `wfhVariances` docs for selected month/year. Re-render.
9. Implement `notifyWfhVariances()` — shows `showToast('Variances saved — employees can view them under My Variances.', 'ℹ️')`.

**Relevant Context:** `loadMondayAttendance()` line 6022, `_monthlyAttRecords` pattern, `filterMondayAtt()` line 6052.

---

### Sub-Task 8 — JS: ILC Variance detection logic

**Status:** `[ ] pending`

**Intent:** Implement the full detect/clear/notify flow for Monday vs ILC.

**Expected Outcomes:**
- `detectIlcVariances()`: joins `monthlyAttendance` records with `mondayAttendance` records by employee + date (where ILC `weekending` → extract Monday date), applies 7-rule variance logic, writes results to `ilcMondayVariances`.
- `clearIlcVariances()`: batch-deletes docs for selected period.
- `notifyIlcVariances()`: stub toast.
- `_renderIlcVariance()` / `filterIlcVariance()`: filter and render `_ilcVarianceRecords[]`.

**Join logic:** For each `monthlyAttendance` record R:
- The ILC weekending is a Friday date. Monday of that week = `weekendingDate - 4 days`.
- Look up `mondayAttendance` for same `ibmSerialNo` where `date === mondayDate`.

**Monday.com status values for leave/half-days (confirmed):**

| Monday Status string | Meaning |
|---|---|
| `"Vacation + Full Day"` | Full-day vacation |
| `"Vacation + Morning (AM)"` | Half-day vacation, morning |
| `"Vacation + Afternoon (PM)"` | Half-day vacation, afternoon |
| `"Sick + Full Day"` | Full-day sick |
| `"Sick + Morning (AM)"` | Half-day sick, morning |
| `"Sick + Afternoon (PM)"` | Half-day sick, afternoon |
| `"Emergency + Full Day"` | Full-day emergency |
| `"Emergency + Morning (AM)"` | Half-day emergency, morning |
| `"Emergency + Afternoon (PM)"` | Half-day emergency, afternoon |

**Helper:** `_isHalfDayStatus(status)` → returns `true` if status contains `"Morning (AM)"` or `"Afternoon (PM)"`.
**Helper:** `_statusBaseType(status)` → strips the suffix: `"Vacation + Morning (AM)"` → `"Vacation"`, `"Sick + Full Day"` → `"Sick"`, etc.

**7-rule variance logic (applied per ILC record):**

```
For each monthlyAttendance record ILC (weekending, ibmSerialNo, activity, monday hours):
  mondayDate   = weekendingDate − 4 days  (Friday − 4 = Monday)
  mondayRecord = lookup mondayAttendance[ibmSerialNo + '_' + mondayDate]
  mStatus      = mondayRecord.status   (full string e.g. "Sick + Morning (AM)")
  mBase        = _statusBaseType(mStatus)  ("Sick", "Vacation", "Office", …)
  mHalfDay     = _isHalfDayStatus(mStatus)
  ilcAct       = ILC.activity.trim().toUpperCase()   e.g. "GB", "VL", "SL", "CDO", "HOL"
  ilcMonHrs    = ILC.monday  (numeric hours for Monday from the ILC record)

  Rule 1: ilcAct = "GB" AND ilcMonHrs = 9
    → mBase must be "Office" OR "Remote (Scheduled)" OR "Unscheduled"
    → if yes: No Variance; if no: Variance ("ILC GB/9h but Monday is " + mStatus)

  Rule 2: ILC leave activity → Monday base type must match:
    ilcAct "VL"        → mBase must be "Vacation"
    ilcAct "SL"        → mBase must be "Sick"
    ilcAct "CDO"       → mBase must be "CDO"
    ilcAct "HOL"/"OHOL"→ mBase must be "Holiday"
    Mismatch → Variance ("ILC=" + ilcAct + " but Monday=" + mStatus)

  Rule 3: ilcAct = "GB" AND ilcMonHrs = 9 AND mBase is any leave type
    → Variance ("ILC GB/9h but Monday is leave: " + mStatus)
    (Note: Rule 3 is evaluated before Rule 1 when GB=9 — effectively: if GB=9 then Monday
     must NOT be a leave status, regardless of matching)

  Rule 4: ilcAct contains "GB" AND ilcMonHrs IN [4, 4.5] AND ILC also has "SL" = 4
    → mBase must be "Sick" AND mHalfDay must be true
    → if no: Variance ("ILC half-day GB+SL but Monday not Sick AM/PM: " + mStatus)

  Rule 5: ilcAct contains "GB" AND ilcMonHrs IN [4, 4.5] AND ILC also has "VL" = 4
    → mBase must be "Vacation" AND mHalfDay must be true
    → if no: Variance ("ILC half-day GB+VL but Monday not Vacation AM/PM: " + mStatus)

  Rule 6: ilcAct = "Emergency" (or mBase = "Emergency")
    → Skip, No Variance (Emergency Leave is exempt from ILC variance checks)

  Rule 7: ilcAct = "CDO" AND ilcMonHrs = 8
    → mBase must be "CDO"
    → if no: Variance ("ILC CDO/8h but Monday=" + mStatus)

  If no rule fires → No Variance
```

**Rule evaluation order:** 6 → 3 → 1 → 4 → 5 → 7 → 2. Rule 6 (emergency skip) always runs first. Rule 3 (GB=9 + leave) runs before Rule 1 (GB=9 + correct).

**Firestore document shape for `ilcMondayVariances`:**
```json
{
  "ibmSerialNo": "...",
  "name": "...",
  "email": "...",
  "weekending": "2025-01-10",
  "mondayDate": "2025-01-06",
  "ilcActivity": "GB",
  "ilcClocking": 9,
  "mondayStatus": "Vacation",
  "mondayDuration": "...",
  "variance": "Yes",
  "varianceReason": "ILC=GB/9h but Monday status is leave",
  "month": "January",
  "year": "2025",
  "detectedAt": <serverTimestamp>
}
```

**Todo List:**
1. Declare `var _ilcVarianceRecords = [];`.
2. Implement `loadIlcVariance(forceServer)` — loads `ilcMondayVariances` collection.
3. Implement `filterIlcVariance()` → calls `_renderIlcVariance()`.
4. Implement `_renderIlcVariance()` — renders 10-column rows with a "Yes" / "No" badge in the Variance column.
5. Implement helper `_mondayDateFromWeekending(weekendingStr)` → return the Monday of that ILC week as `YYYY-MM-DD` (Friday weekending − 4 days).
6. Implement helper `_statusBaseType(status)` → strips AM/PM/Full Day suffix: `"Sick + Morning (AM)"` → `"Sick"`.
7. Implement helper `_isHalfDayStatus(status)` → `true` if status contains `"Morning (AM)"` or `"Afternoon (PM)"`.
8. Implement `_applyIlcVarianceRule(ilcRecord, mondayRecord)` → returns `{ variance: 'Yes'|'No', reason: '...' }` using rule order 6→3→1→4→5→7→2.
9. Implement `detectIlcVariances()`:
   a. Require year+month selection.
   b. Parallel-load `monthlyAttendance` + `mondayAttendance` for that period.
   c. Build Monday lookup map: `{ ibmSerialNo + '_' + date → mondayRecord }`.
   d. For each ILC record, compute `mondayDate` via `_mondayDateFromWeekending(r.weekending)`.
   e. Find matching mondayRecord; if none found, mark variance = "No Monday Record".
   f. Apply 7-rule logic via `_applyIlcVarianceRule(ilcRecord, mondayRecord)`.
   g. Batch-write all results to `ilcMondayVariances`.
   h. Reload + re-render.
10. Implement `clearIlcVariances()` — confirm, batch-delete, re-render.
11. Implement `notifyIlcVariances()` — **not a stub**: triggers `navigate('my-variances')` with a filter/highlight so the employee's own variance records become visible on their View My Variances page. For the initial implementation, show a toast directing users to the View My Variances page: `showToast('Variances saved. Employees can view them in My Variances.', 'ℹ️')`.

**Relevant Context:** `_ilcWeekDates()` line 5724, `loadMonthlyAttendance()` line 5745, `loadMondayAttendance()` line 6022.

---

### Sub-Task 9 — Search inputs on existing and new pages

**Status:** `[ ] pending`

**Intent:** Add a real-time text search input (by Last Name or IBM Serial No.) to the toolbar of six pages.

**Affected pages:**
1. Monday Attendance (`monday-att-search`)
2. ILC Attendance (`monthly-att-search`)
3. Masterlist (`masterlist-search`)
4. WFH Schedule (`wfh-search`)
5. Monday vs WFH Schedule (`wfh-var-search`) — already accounted for in Sub-Task 4 toolbar
6. Monday vs ILC (`ilc-var-search`) — already accounted for in Sub-Task 5 toolbar

**Expected Outcomes:**
- A text input with `placeholder="Search name or serial…"` added to each page's `.page-toolbar`.
- Existing `filter*()` / `_render*()` functions updated to apply the text search as an additional filter condition (case-insensitive match against `name` and `ibmSerialNo`).
- The new variance pages (Sub-Tasks 4 & 5) include the search input in their toolbar HTML from the start.

**Todo List:**

For each of the four **existing** pages (monday-att, monthly-att, masterlist, wfh-schedule):

1. **Monday Attendance** (line ~3603 `.page-toolbar`):
   - Add `<input type="text" id="monday-att-search" placeholder="Search name or serial…" oninput="filterMondayAtt()" />` as the last child of `.page-toolbar`.
   - In `_renderMondayAtt()` (line 6054), read `document.getElementById('monday-att-search').value` and add filter condition: `if (search && !r.name.toLowerCase().includes(search) && !(r.ibmSerialNo||'').toLowerCase().includes(search)) return false;`

2. **ILC Attendance** (line ~3503 filter row):
   - Add search input to the filters `<div>` in `page-monthly-attendance`.
   - In `_renderMonthlyAtt()` (line 5785), add same search condition.

3. **Masterlist** (no current toolbar — add a simple div before the table):
   - Add a `.page-toolbar` div with the search input after `.section-header` in `page-masterlist`.
   - In `loadMasterlist()` / render, add search filter.

4. **WFH Schedule** (no current toolbar):
   - Add a `.page-toolbar` div with the search input after `.section-header` in `page-wfh-schedule`.
   - In `loadWfhSchedule()`, convert the direct `snap.forEach → tbody.innerHTML` pattern to use an in-memory `_wfhRecords[]` array that can be filtered. Alternatively keep the current direct render but add a client-side filter before building `rows`.

**Approach for Masterlist and WFH Schedule** (currently render directly from Firestore snap without an in-memory array):
- Introduce `var _wfhScheduleRecords = []` and `var _masterlistDisplayRecords = []` caches, populated on load, filtered on search.
- The `loadWfhSchedule()` already has a closure; add a module-level cache rather than a full refactor.

**Relevant Context:** Lines 3603–3614 (monday toolbar), lines 5573–5606 (loadWfhSchedule), lines 5119–5177 (masterlist), line 6054 (_renderMondayAtt).

---

## Firestore Collections

| Collection | Writer | Purpose |
|---|---|---|
| `wfhVariances` | `detectWfhVariances()` | Persisted WFH variance results per employee/date |
| `ilcMondayVariances` | `detectIlcVariances()` | Persisted ILC-vs-Monday variance results per employee/weekending |

Both collections need no Firestore index beyond the default — queries will filter by `year` and `month` fields (equality), which Firestore handles without composite indexes.

---

## Open Questions / Decisions Needed

1. ~~**Weekly Exemption field**~~ ✅ **RESOLVED**: Weekly Exemption is **not a stored flag** — it is computed at detection time. When `onsiteCount < 3`, check if the remaining non-onsite weekdays have exempt statuses (Sick/Vacation/CDO/Holiday/Emergency/BCP Impacted). If `onsiteCount + exemptCount >= 3`, the shortfall is fully covered → No Variance. Only flag Weekly Variance when the gap cannot be explained by exempt statuses.

2. ~~**"Unscheduled" status meaning**~~ ✅ **RESOLVED**: Monday.com exports use three key statuses: `"Office"` (onsite), `"Remote (Scheduled)"` (WFH on a scheduled day — no variance), and `"Unscheduled"` (remote on an unscheduled day — Daily Variance). Leave statuses are: `"Sick"`, `"Vacation"`, `"CDO"`, `"Holiday"`, `"Emergency"`, `"BCP Impacted"`.

3. ~~**Discrepancy List data source**~~ ✅ **RESOLVED**: The Discrepancy List is a **separate, independent page** — not merged from `wfhVariances`/`ilcMondayVariances`. It will have its own collection or display logic (to be defined). Sub-Task 3/6 is updated to reflect this: the page shell and load function are scaffolded but the exact data source will be defined in a follow-up. For now, `loadDiscrepancyList()` will be a placeholder that shows "Coming soon."

4. ~~**Notify Employees**~~ ✅ **RESOLVED**: "Notify" means the detected variances should appear on the employee's own **View My Variances** page. The `notifyWfhVariances()` and `notifyIlcVariances()` functions will show a toast: `"Variances saved — employees can view them under My Variances."` The actual visibility mechanism (writing to the `variances` collection or tagging records) will be addressed once the detect logic is confirmed working.

5. ~~**Half-day Monday marker**~~ ✅ **RESOLVED**: The `status` field in `mondayAttendance` carries the full string including the time-of-day suffix. Half-day statuses follow the pattern `"<Type> + Morning (AM)"` or `"<Type> + Afternoon (PM)"`. Full-day: `"<Type> + Full Day"`. Examples: `"Vacation + Morning (AM)"`, `"Sick + Full Day"`, `"Emergency + Afternoon (PM)"`. The base type and half-day flag are extracted by `_statusBaseType()` and `_isHalfDayStatus()` helpers.

---

## Implementation Order

```
Sub-Task 1 → Sub-Task 2   (sidebar HTML — do together in one edit)
Sub-Task 3 → Sub-Task 4 → Sub-Task 5   (page HTML — insert sequentially)
Sub-Task 6 → Sub-Task 7 → Sub-Task 8   (JS logic — implement in order)
Sub-Task 9   (search inputs — last, touches multiple places)
```
