# A11y AutoDraft — Adobe & Yahoo audits

A Chrome/Edge extension that simplifies writing WCAG accessibility issues for
Adobe and Yahoo audits: it pulls live data straight off the auditor's issue
form, cross-references it against your own checkpoint/automation/reference
spreadsheets, assembles a properly-formatted report, and can write the result
straight back into the auditor page. No build step, no backend — plain
HTML/CSS/JS, everything runs locally in the browser.

## Setup (one-time)

1. **Clone this repo.**
2. Confirm **`lib/xlsx.full.min.js`** is present in the folder (it's the
   [SheetJS](https://sheetjs.com) library, used to read `reference-data.xlsx`
   in the browser). It's committed to the repo, so cloning is all that's
   needed — nothing to separately download.
3. In Chrome or Edge, go to **`chrome://extensions`**.
4. Toggle **Developer mode** on (top right).
5. Click **Load unpacked** and select this folder (the one containing
   `manifest.json`).
6. Click the toolbar icon — the tool opens as its own **floating window**
   (not a dropdown), so it stays open while you work on the auditor page in
   another tab or window. Clicking the icon again just refocuses the same
   window instead of opening a second one.

**Permissions:** the extension requests `<all_urls>` host access. This is
needed so Get Data/Log Issue can read and write the auditor page regardless
of which tab is active — `activeTab` alone only grants access to whichever
tab was focused at the exact moment the toolbar icon was clicked, which
breaks the moment you switch tabs. Fine for an internal team tool; would need
tightening to a specific domain before ever publishing to the Web Store.

**Updating later:** since this isn't installed from the Web Store, updates
are manual — `git pull`, then click the reload icon for this extension on
`chrome://extensions`.

## The two tabs

### Manual Results
A dropdown of WCAG checkpoints (from `data.js` → `APP_DATA.DATA`). Pick one,
get its Expected/Actual Results with individual Copy buttons. Read-only
lookup, no live page interaction.

### Automation Template
This is the main tool. Three controls sit above the report form:

- **Upload Excel** — upload a reference spreadsheet (columns: `Type | Key |
  Label | Info1 | Info2`, see below). Stored in the browser (`chrome.storage`)
  until removed or replaced. **This is what Get Data actually reads from** —
  re-uploading a changed file and clicking Get Data again picks up the
  changes immediately, no need to touch any files on disk. If nothing's been
  uploaded yet, it falls back to the bundled `reference-data.xlsx`.
- **Get Data** — reads the auditor's issue form on whichever browser tab is
  currently active, using the selectors in `pageExtractor()` in `app.js`:
  Summary, Checkpoint, Page Name, Description, Impact, Source Code, and
  Recommendation to Fix. Requires the extension (a plain web page can't read
  another tab's DOM — this is a hard browser limitation, not a bug).
- **Log Issue** — writes the generated Summary and full report back into the
  auditor's own `#summary` and `#details` fields, so you don't have to
  copy/paste manually. **Includes a safety check** (see below) that refuses
  to write anything if key data is missing for the current issue.
- **Clear** — resets every field back to its default/empty state.

An **Adobe / Yahoo** radio toggle switches which report format gets
generated (see "Adobe vs. Yahoo format" below). Only one field is visible in
the form itself — **Update summary in adobe/Yahoo format** — everything else
Get Data fills in stays hidden but is still used to build the final report.
The **preview below the form is directly editable** — type into it and it's
immediately the content that gets copied or logged; no separate save step.
Typing "`- Element name`" lines under step 3 of Steps to Reproduce also
live-updates the parenthetical part of the title field.

## Where each piece of data comes from

| Field | Source |
|---|---|
| Summary, Checkpoint, Page Name, Description, Impact, Source Code, Recommendation | Live auditor page (`pageExtractor` selectors) |
| Expected Results, Actual Results | `data.js` → `APP_DATA.AUTOMATION`, matched by comparing pulled Summary against `automation_title` (leading WCAG SC-code prefixes like `"1.4.3 - "` are stripped before comparing) |
| Modified title (used in Updated Summary) | `data.js` → `APP_DATA.AUTOMATION`, same row's `modified_alternative` column |
| Affected User Population | Reference sheet, `WCAG-AffectedPopulations` type, matched by SC code |
| Labels (line 1: WCAG label, line 2: severity label) | Reference sheet, `WCAG-JIRA` type (by SC code) + `Severity` type (by pulled Impact text) |
| Operating System, Browser | Reference sheet, `Context` type (`Key`=`OS`/`Browser`) — fixed values, not matched per-issue |
| Authentication State, Platform URL | Reference sheet, `Environment` type (`Key`=`Authentication State`/`Platform URL`) — fixed default values |
| Screen Name | Reference sheet, `Screen name` type — a single fixed value (the sheet only has one row here; there's no per-page matching yet) |

## Reference sheet format

One sheet, columns exactly: `Type | Key | Label | Info1 | Info2`. Rows are
grouped by `Type`; see the table above for which types are actually read.
Other types present in a typical sheet (`Product`, `Customer`,
`AccessibilityAudit`, `Steps to reproduce`, `Digital Asset Type`) aren't wired
to anything yet.

## Adobe vs. Yahoo format differences

- **Title format:** Adobe → `Accessibility - <Modified title> - <Screen Name>
  (<elements>)`. Yahoo → same but without the `"Accessibility - "` prefix.
- **Labels:** included in Adobe's report, omitted entirely from Yahoo's.
- **Context section:** Adobe uses the plain `Context:` header. Yahoo adds a
  `Platform: Web` line under it and labels the tool line `Test Method:`
  instead of leaving it bare.

`buildTemplateTextAdobe()` and `buildTemplateTextYahoo()` in `app.js` are
separate functions if either format needs to change further.

## Safety check before Log Issue

Before writing anything back into the auditor, Log Issue checks that these
fields actually have data: **Applicable WCAG Success Criterion, Affected User
Population, Labels, Expected Results, Actual Results**. These are exactly the
fields that only get filled when a real match was found in the reference
sheet or Automation data — if any are blank, it means the lookup genuinely
failed for this issue (wrong/missing SC in the sheet, no matching Automation
title, etc.), and logging anyway would push an incomplete report. The status
message turns red and lists what's missing; Log Issue is blocked until it's
resolved. This check also runs right after Get Data, so you find out
immediately rather than only at the point of logging.

## Updating `data.js` (Automation scenarios)

`APP_DATA.AUTOMATION` in `data.js` is a plain JS array — no live file loading
for this one (unlike the reference sheet). To add a scenario, add an object
to the array:

```js
{
  "id": 33,
  "automation_title": "Exact text as it appears in the auditor's Summary field",
  "modified_alternative": "The modified/rewritten alternative text",
  "expected_results": "What should happen",
  "actual_results": "What actually happens"
}
```

`automation_title` is what gets matched against the live Summary — it's
tolerant of a leading WCAG SC-code prefix (`"1.4.3 - "`, `"1.3.1 f - "`) but
otherwise needs to match closely.
