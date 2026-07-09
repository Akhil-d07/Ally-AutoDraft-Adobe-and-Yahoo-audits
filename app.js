// Adobe Data Shortcut — browser version
// Reads from APP_DATA (see data.js). No build step, no network calls.

(function () {
  "use strict";

  const state = {
    mode: "DATA", // DATA | TEMPLATE
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    els.tabs = document.querySelectorAll(".tab-btn");
    els.content = document.getElementById("content");

    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        els.tabs.forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });

    render();
  }

  // Pulls the value on the line right after a "Screen Name:" header out of an
  // already-written Details block (used by the Summary Update tab, which works
  // off manually-authored issues rather than sheet/live-page lookups).
  function extractScreenNameFromDetails(text) {
    const lines = String(text || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().toLowerCase() === "screen name:") {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) return lines[j].trim();
        }
      }
    }
    return "";
  }

  function render() {
    els.content.innerHTML = "";
    if (state.mode === "DATA") renderListMode("DATA");
    else if (state.mode === "TEMPLATE") renderTemplateMode();
    else if (state.mode === "SUMMARY_UPDATE") renderSummaryUpdateMode();
  }

  // ---------- Manual mode (list + lookup) ----------

  function renderListMode(tableName) {
    const rows = APP_DATA[tableName];
    const titleKey = "checkpoint";
    const label = "Select Checkpoint";

    const selectorRow = document.createElement("div");
    selectorRow.className = "selector-row";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.setAttribute("for", "row-select");

    const select = document.createElement("select");
    select.id = "row-select";

    const sorted = [...rows].sort((a, b) =>
      String(a[titleKey]).localeCompare(String(b[titleKey]))
    );

    sorted.forEach((row) => {
      const opt = document.createElement("option");
      opt.value = row.id;
      opt.textContent = row[titleKey];
      select.appendChild(opt);
    });

    const countBadge = document.createElement("div");
    countBadge.className = "count-badge";
    countBadge.textContent = `${rows.length} entries`;

    selectorRow.appendChild(labelEl);
    selectorRow.appendChild(select);
    selectorRow.appendChild(countBadge);
    els.content.appendChild(selectorRow);

    const fieldsWrap = document.createElement("div");
    fieldsWrap.id = "fields-wrap";
    els.content.appendChild(fieldsWrap);

    select.addEventListener("change", () => {
      const row = rows.find((r) => String(r.id) === select.value);
      renderFields(row, fieldsWrap);
    });

    if (sorted.length) {
      select.value = sorted[0].id;
      renderFields(rows.find((r) => String(r.id) === String(sorted[0].id)), fieldsWrap);
    } else {
      fieldsWrap.innerHTML = '<div class="empty-state">No entries found.</div>';
    }
  }

  function renderFields(row, container) {
    container.innerHTML = "";
    if (!row) {
      container.innerHTML = '<div class="empty-state">No data for this selection.</div>';
      return;
    }

    const fieldDefs = [
      { key: "expected_results", label: "Expected Results" },
      { key: "actual_results", label: "Actual Results" },
    ];

    fieldDefs.forEach((def) => {
      container.appendChild(buildFieldBlock(def.label, row[def.key] || ""));
    });
  }

  function buildFieldBlock(label, value) {
    const block = document.createElement("div");
    block.className = "field-block";

    const header = document.createElement("div");
    header.className = "field-header";

    const span = document.createElement("span");
    span.textContent = label;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";

    header.appendChild(span);
    header.appendChild(copyBtn);

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.spellcheck = false;

    copyBtn.addEventListener("click", () => copyToClipboard(textarea.value, copyBtn));

    block.appendChild(header);
    block.appendChild(textarea);
    return block;
  }

  // ---------- Live page extraction (used from the Template tab's Get Data button) ----------

  // Maps keys from the auditor-page extraction (see pageExtractor) onto Template
  // form field keys. summary/impact/defaultSummaryFlag have no obvious home in
  // the Template fields, so they're extracted but intentionally left unmapped.
  // Expected/Actual Results are handled separately via findAutomationMatch().
  // recommendation is deliberately NOT mapped here anymore — Remediation
  // Recommendation now comes from the Automation sheet match's
  // recommendation_to_fix column instead of the live page's #notes field
  // (same reasoning as Expected/Actual Results: the sheet is the source of
  // truth once reviewed, not whatever's currently typed on the page).
  // checkpoint is also NOT mapped to wcagSc — the live Checkpoint dropdown
  // shows Deque's internal granular numbering (e.g. "1.1.1.a Alternative
  // Text (Active Images)"), not the official WCAG SC title. wcagSc is filled
  // separately in enrichFromReference() using the WCAG-JIRA sheet row's Key
  // column instead (e.g. "1.1.1 Non-text Content (Level A)").
  const EXTRACTED_TO_TEMPLATE_MAP = {
    sourceCode: "codeSnippet",
    pageName: "screenName",
  };

  function findAutomationMatch(summaryText) {
    if (!summaryText) return null;
    const norm = (s) => String(s || "").trim().toLowerCase();
    // Sheet titles are often prefixed with a WCAG SC code (e.g. "1.4.3 - " or
    // "1.3.1 f - "), but the live page's Summary field usually isn't — strip
    // that prefix before comparing so both forms match.
    const stripScPrefix = (s) => norm(s).replace(/^\d+(?:\.\d+)*\s*[a-z]?\s*-\s*/, "");
    const target = norm(summaryText);
    return (
      APP_DATA.AUTOMATION.find((row) => {
        const title = norm(row.automation_title);
        return title === target || stripScPrefix(row.automation_title) === target;
      }) || null
    );
  }

  // Runs chrome.scripting.executeScript against the active tab and returns
  // the extracted field values from pageExtractor().
  async function extractFromActivePage() {
    if (!(typeof chrome !== "undefined" && chrome.scripting && chrome.tabs)) {
      throw new Error("Live page reading is only available in the browser extension.");
    }
    const tab = await getTargetTab();
    if (!tab || !tab.id) {
      throw new Error("No active browser tab found \u2014 click on the auditor page, then try again.");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageExtractor,
    });
    return results && results[0] ? results[0].result : null;
  }

  // The tool now runs in its own floating window, so "the active tab" means
  // the active tab of the last-focused *normal* browser window (i.e. the
  // auditor's window) rather than this tool window itself.
  async function getTargetTab() {
    try {
      const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"], populate: true });
      const activeTab = win && win.tabs ? win.tabs.find((t) => t.active) : null;
      if (activeTab) return activeTab;
    } catch (e) {
      /* fall through to the query below */
    }
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab || null;
  }

  // Injected into the auditor page via chrome.scripting.executeScript.
  // Must be fully self-contained — no references to outer-scope variables.
  function pageExtractor() {
    function getVal(selector) {
      const el = document.querySelector(selector);
      if (!el) return "";
      if (el.tagName === "SELECT") {
        // .value returns the option's value attribute, which often doesn't match
        // human-readable text (e.g. "critical" vs "Critical") — use the visible
        // selected option's text instead, since that's what reference lookups match against.
        if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
          return (el.options[el.selectedIndex].text || "").trim();
        }
        return (el.value || "").trim();
      }
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        return (el.value || "").trim();
      }
      return (el.textContent || "").trim();
    }

    function getSourceCode() {
      // id looks like issue_elements[<uuid>][source] — uuid changes per issue,
      // so match by prefix/suffix instead of an exact id.
      const el = document.querySelector('[id^="issue_elements["][id$="][source]"]');
      if (!el) return "";
      if (el.tagName === "SELECT") {
        if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
          return (el.options[el.selectedIndex].text || "").trim();
        }
        return (el.value || "").trim();
      }
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        return (el.value || "").trim();
      }
      return (el.textContent || "").trim();
    }

    return {
      summary: getVal("#summary"),
      checkpoint: getVal("#combobox"),
      pageName: getVal("#issue-form > div.modal-content > div:nth-child(12) > div"),
      defaultSummaryFlag: getVal("#default-summary"),
      description: getVal("#custom-description"),
      impact: getVal("#severity-select"),
      sourceCode: getSourceCode(),
      recommendation: getVal("#notes"),
    };
  }

  // Injected into the auditor page via chrome.scripting.executeScript to write
  // values back in. Must be fully self-contained — no references to outer-scope
  // variables. Uses the native property setter (bypassing React's overridden
  // setter) so frameworks that track input via onChange actually notice the change.
  function pageWriter(summaryText, detailsText) {
    function setValue(selector, value) {
      const el = document.querySelector(selector);
      if (!el) return false;

      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) {
          desc.set.call(el, value);
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      if (el.isContentEditable) {
        el.textContent = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }

      return false;
    }

    return {
      summaryOk: setValue("#summary", summaryText),
      detailsOk: setValue("#details", detailsText),
    };
  }

  // Injected via chrome.scripting.executeScript for the Summary Update tab.
  // Reads the live Summary + Page fields plus the already-written Details text
  // (as opposed to pageExtractor, which reads the individual issue-authoring
  // fields for a fresh Get Data). Self-contained, same constraint as above.
  function summaryUpdateExtractor() {
    function getVal(selector) {
      const el = document.querySelector(selector);
      if (!el) return "";
      if (el.tagName === "SELECT") {
        if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
          return (el.options[el.selectedIndex].text || "").trim();
        }
        return (el.value || "").trim();
      }
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        return (el.value || "").trim();
      }
      return (el.textContent || "").trim();
    }

    return {
      summary: getVal("#summary"),
      pageField: getVal("#issue-form > div.modal-content > div:nth-child(12) > div"),
      details: getVal("#details"),
    };
  }

  // Injected via chrome.scripting.executeScript for the Summary Update tab.
  // Only touches #summary — the Details field is intentionally left alone,
  // since the whole point of this tab is the Details text is already correct.
  function summaryWriter(summaryText) {
    function setValue(selector, value) {
      const el = document.querySelector(selector);
      if (!el) return false;

      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) {
          desc.set.call(el, value);
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      if (el.isContentEditable) {
        el.textContent = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }

      return false;
    }

    return { summaryOk: setValue("#summary", summaryText) };
  }

  // ---------- Storage helpers (chrome.storage.local in the extension, localStorage on the web) ----------

  function storageSet(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, resolve);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (res) => resolve(res[key] || null));
      } else {
        const raw = localStorage.getItem(key);
        resolve(raw ? JSON.parse(raw) : null);
      }
    });
  }

  function storageRemove(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], resolve);
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function refreshExcelStatus(statusEl) {
    const stored = await storageGet("automationExcel");
    statusEl.textContent = stored ? `Stored: ${stored.name}` : "No excel file stored.";
  }

  // ---------- Reference data ----------
  //
  // Two possible sources, in priority order:
  //   1. The file uploaded via the "Upload Excel" button (stored in chrome.storage
  //      as "automationExcel") — this is what gets used if present, so re-uploading
  //      a changed file and clicking Get Data picks it up immediately.
  //   2. The bundled extension/reference-data.xlsx, as a fallback if nothing's
  //      been uploaded yet.
  //
  // Sheet columns: Type | Key | Label | Info1 | Info2. Rows are grouped by Type.
  // Types currently used:
  //   WCAG-JIRA               Key=SC title              Label=WCAG_x.x.x-ShortName (for Labels field line 1)
  //   WCAG-AffectedPopulations Key=SC title              Label=affected user population text
  //   Severity                Key=severity name          Label=SeverityN_Accessibility (for Labels field line 2)
  //   Context                 Key=OS/Browser/AT          Label=name, Info1=version
  //   Environment             Key=Platform URL/Auth State Label=default value
  //   Screen name             single row, value in Key column
  // Other types present in the sheet (Product, Customer, AccessibilityAudit,
  // Steps to reproduce, Digital Asset Type) aren't wired to any Template field yet.

  let referenceDataPromise = null;
  let referenceLoadError = null;

  // Call this whenever the uploaded file changes (uploaded or removed) so the
  // next Get Data re-reads from scratch instead of using a stale cached parse.
  function invalidateReferenceDataCache() {
    referenceDataPromise = null;
    referenceLoadError = null;
  }

  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function loadReferenceData() {
    if (referenceDataPromise) return referenceDataPromise;
    referenceDataPromise = (async () => {
      if (typeof XLSX === "undefined") {
        referenceLoadError = "xlsx.full.min.js not loaded (check extension/lib/xlsx.full.min.js exists and popup.html references it)";
        return null;
      }
      try {
        const uploaded = await storageGet("automationExcel");
        let buf;
        let source;

        if (uploaded && uploaded.dataUrl) {
          buf = dataUrlToUint8Array(uploaded.dataUrl);
          source = `uploaded file "${uploaded.name}"`;
        } else {
          if (!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)) {
            referenceLoadError = "chrome.runtime unavailable (not running as an extension)";
            return null;
          }
          const url = chrome.runtime.getURL("reference-data.xlsx");
          const resp = await fetch(url);
          if (!resp.ok) {
            referenceLoadError = `reference-data.xlsx not found (HTTP ${resp.status}) \u2014 check it's at extension/reference-data.xlsx`;
            return null;
          }
          buf = await resp.arrayBuffer();
          source = "bundled reference-data.xlsx";
        }

        const workbook = XLSX.read(buf, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const grouped = groupReferenceRows(rows);
        grouped.__source = source;
        return grouped;
      } catch (err) {
        referenceLoadError = "Error parsing reference file: " + err.message;
        console.warn("Reference data failed to load:", err);
        return null;
      }
    })();
    return referenceDataPromise;
  }

  // rows[0] is the header (Type, Key, Label, Info1, Info2); groups the rest by trimmed Type.
  function groupReferenceRows(rows) {
    const byType = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const type = String(r[0] || "").trim();
      if (!type) continue;
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        key: String(r[1] !== undefined ? r[1] : "").trim(),
        label: String(r[2] !== undefined ? r[2] : "").trim(),
        info1: String(r[3] !== undefined ? r[3] : "").trim(),
        info2: String(r[4] !== undefined ? r[4] : "").trim(),
      });
    }
    return byType;
  }

  function extractScCode(text) {
    const m = String(text || "").match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  }

  function lookupByScCode(byType, typeName, scText) {
    const code = extractScCode(scText);
    if (!code) return null;
    const list = byType[typeName] || [];
    return list.find((row) => extractScCode(row.key) === code) || null;
  }

  function lookupByKey(byType, typeName, keyText) {
    const norm = String(keyText || "").trim().toLowerCase();
    if (!norm) return null;
    const list = byType[typeName] || [];
    return list.find((row) => row.key.toLowerCase() === norm) || null;
  }

  // Fills Affected User Population, Labels, OS, Browser, Authentication State, and
  // Platform URL in the Template form using the reference sheet, keyed off the
  // pulled Checkpoint/Impact. Returns { applied, notes } — notes explain misses.
  async function enrichFromReference(form, pageData) {
    const byType = await loadReferenceData();
    if (!byType) {
      return { applied: [], notes: [`Reference data unavailable \u2014 ${referenceLoadError || "unknown reason"}`] };
    }

    const applied = [];
    const notes = [`reference source: ${byType.__source || "unknown"}`];
    const scCode = extractScCode(pageData.checkpoint);

    const popRow = lookupByScCode(byType, "WCAG-AffectedPopulations", pageData.checkpoint);
    const affectedInput = form.querySelector('[data-key="affectedUsers"]');
    if (popRow && affectedInput) {
      affectedInput.value = popRow.label;
      applied.push("affectedUsers");
    } else if (affectedInput) {
      notes.push(`no WCAG-AffectedPopulations row for SC ${scCode || "(none found in Checkpoint text)"}`);
    }

    const wcagRow = lookupByScCode(byType, "WCAG-JIRA", pageData.checkpoint);
    const severityRow = lookupByKey(byType, "Severity", pageData.impact);
    const labelLines = [];
    if (wcagRow) labelLines.push(wcagRow.label);
    else notes.push(`no WCAG-JIRA row for SC ${scCode || "(none found in Checkpoint text)"}`);
    if (severityRow) labelLines.push(severityRow.label);
    else notes.push(`no Severity row matching Impact "${pageData.impact || ""}"`);
    const labelsInput = form.querySelector('[data-key="labels"]');
    if (labelLines.length && labelsInput) {
      labelsInput.value = labelLines.map((l, i) => `${i + 1}. ${l}`).join("\n");
      applied.push("labels");
    }

    // Applicable WCAG Success Criterion: the official SC title (e.g. "1.1.1
    // Non-text Content (Level A)") — this is the WCAG-JIRA row's Key column,
    // NOT the live Checkpoint dropdown's Deque-internal numbering/wording.
    const wcagScInput = form.querySelector('[data-key="wcagSc"]');
    if (wcagRow && wcagScInput) {
      wcagScInput.value = wcagRow.key;
      applied.push("wcagSc");
    } else if (wcagScInput) {
      notes.push(`wcagSc left blank \u2014 no WCAG-JIRA row for SC ${scCode || "(none found in Checkpoint text)"}`);
    }

    const osRow = lookupByKey(byType, "Context", "OS");
    const osInput = form.querySelector('[data-key="os"]');
    if (osRow && osInput) {
      osInput.value = osRow.info1 ? `${osRow.label} (Version: ${osRow.info1})` : osRow.label;
      applied.push("os");
    }

    const browserRow = lookupByKey(byType, "Context", "Browser");
    const browserInput = form.querySelector('[data-key="browser"]');
    if (browserRow && browserInput) {
      browserInput.value = browserRow.info1
        ? `${browserRow.label} (Version: ${browserRow.info1})`
        : browserRow.label;
      applied.push("browser");
    }

    const authRow = lookupByKey(byType, "Environment", "Authentication State");
    const authInput = form.querySelector('[data-key="authState"]');
    if (authRow && authInput) {
      authInput.value = authRow.label;
      applied.push("authState (default)");
    }

    const urlRow = lookupByKey(byType, "Environment", "Platform URL");
    const urlInput = form.querySelector('[data-key="platformUrl"]');
    if (urlRow && urlInput) {
      urlInput.value = urlRow.label;
      applied.push("platformUrl (default)");
    }

    // "Screen name" is a single-row type (the value lives in the Key column
    // itself, not matched against anything) — takes over from whatever the
    // live page's Page Name selector produced.
    const screenNameRow = (byType["Screen name"] || [])[0];
    const screenNameInput = form.querySelector('[data-key="screenName"]');
    if (screenNameRow && screenNameInput) {
      screenNameInput.value = screenNameRow.key;
      applied.push("screenName (from reference sheet)");
    } else if (screenNameInput && !screenNameInput.value) {
      notes.push("no Screen name row found in reference sheet");
    }

    return { applied, notes };
  }

  // ---------- Template mode ----------

  // Narrows text down to just the Steps to Reproduce section (between the
  // "Steps to reproduce:" header and the next "Expected results:"/"Actual
  // results:" header) when those headers are present. If neither header is
  // found — e.g. when called with just the isolated Steps field value, which
  // has no headers of its own — the whole input is used as-is, so this stays
  // backward compatible with that call site.
  function scopeToStepsSection(text) {
    const str = String(text || "");
    const startMatch = str.match(/steps to reproduce:/i);
    if (!startMatch) return str;

    const afterStart = str.slice(startMatch.index + startMatch[0].length);
    const endMatch = afterStart.match(/\n\s*(expected results|actual results):/i);
    return endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
  }

  // Pulls "- Element" bullet lines out of the Steps to Reproduce section only
  // (see scopeToStepsSection) — deliberately NOT the whole text, since other
  // sections like Remediation Recommendation can also contain "- " lines
  // (e.g. resource link lists) that would otherwise be misread as elements.
  function extractElementsFromText(text) {
    const elements = [];
    scopeToStepsSection(text)
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^\s*-\s*(.+)$/);
        if (m) elements.push(m[1].trim());
      });
    return elements;
  }

  // 0 elements -> literal placeholder. 1-2 -> comma-joined. 3+ -> first two + "......"
  function formatElementsSummary(elements) {
    if (!elements.length) return "Issue elements";
    if (elements.length <= 2) return elements.join(", ");
    return `${elements[0]}, ${elements[1]}......`;
  }

  // Adobe: "[Accessibility] - <Modified title> - <Screen Name>"
  // Yahoo:  "<Modified title> - <Screen Name>" (no "[Accessibility] - " prefix)
  function buildTitlePrefix(project, modifiedTitle, screenName) {
    return project === "yahoo" ? `${modifiedTitle} - ${screenName}` : `[Accessibility] - ${modifiedTitle} - ${screenName}`;
  }

  function getUpdatedTitleLabelText(project) {
    return project === "yahoo" ? "Update summary in Yahoo format" : "Update summary in adobe format";
  }

  // Recomputes the Updated Title field from its stored modifiedTitle/screenName
  // plus whatever "- Element" bullets are currently in the preview. Used both
  // when typing into the preview and when switching the Adobe/Yahoo toggle.
  function refreshUpdatedTitle(form, output) {
    const updatedTitleInput = form.querySelector('[data-key="updatedTitle"]');
    if (!updatedTitleInput || updatedTitleInput.dataset.modifiedTitle === undefined) return;
    const prefix = buildTitlePrefix(
      templateState.project,
      updatedTitleInput.dataset.modifiedTitle,
      updatedTitleInput.dataset.screenName || ""
    );
    const elements = extractElementsFromText(output ? output.value : "");
    updatedTitleInput.value = `${prefix} (${formatElementsSummary(elements)})`;
  }

  // Which project's report format to generate. "adobe" is the only one
  // implemented so far — buildTemplateText() branches on this once the
  // Yahoo format specifics are provided.
  const templateState = { project: "adobe" };

  // Returns the Adobe/Yahoo project radio "buttons" as an array of <label>
  // elements so they can be placed inline with the other controls.
  function buildProjectRadios() {
    return ["adobe", "yahoo"].map((project) => {
      const optLabel = document.createElement("label");
      optLabel.className = "upload-btn";
      optLabel.style.display = "inline-flex";
      optLabel.style.alignItems = "center";
      optLabel.style.gap = "6px";
      optLabel.style.cursor = "pointer";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "tpl-project";
      radio.value = project;
      radio.checked = templateState.project === project;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          templateState.project = project;
          const output = document.getElementById("template-output");
          const form = document.getElementById("template-form");
          if (output && form) {
            output.value = buildTemplateText(collectFormValues(form));
            refreshUpdatedTitle(form, output);
          }
          const titleLabel = document.getElementById("updated-title-label");
          if (titleLabel) titleLabel.textContent = getUpdatedTitleLabelText(templateState.project);
        }
      });

      optLabel.appendChild(radio);
      optLabel.appendChild(document.createTextNode(project === "adobe" ? "Adobe" : "Yahoo"));
      return optLabel;
    });
  }

  // Fields that only get filled when there's real matching data for the current
  // Checkpoint/SC (reference sheet lookups) or Automation title (sheet match).
  // If any of these are blank, something failed to resolve for this issue —
  // logging anyway risks writing an incomplete/wrong report into the auditor.
  const REQUIRED_FOR_LOGGING = [
    { key: "wcagSc", label: "Applicable WCAG Success Criterion" },
    { key: "affectedUsers", label: "Affected User Population" },
    { key: "labels", label: "Labels" },
    { key: "expectedResults", label: "Expected Results" },
    { key: "actualResults", label: "Actual Results" },
    { key: "remediation", label: "Remediation Recommendation" },
  ];

  function findMissingRequiredFields(form) {
    return REQUIRED_FOR_LOGGING.filter((def) => {
      const input = form.querySelector(`[data-key="${def.key}"]`);
      return !input || !input.value || !input.value.trim();
    }).map((def) => def.label);
  }

  function setStatus(el, text, isError) {
    el.textContent = text;
    el.classList.toggle("status-error", !!isError);
  }

  // ---------- Summary Update tab ----------
  //
  // For issues someone already wrote by hand (not generated via Get Data):
  // pulls the existing Summary + Page field live off the page, parses the
  // Screen Name and "- Element" bullets already sitting in the Details text,
  // and reformats just the Summary into the standard title convention —
  // the original Summary wording is kept as-is, only wrapped into the format.
  // Also flags if the live Page field disagrees with the Screen Name written
  // in Details, since that usually means one of them is stale.

  // Separate radio group from buildProjectRadios() (Automation Template tab)
  // since both can't safely share one DOM id, but they read/write the same
  // shared templateState.project so picking a project in one tab is
  // remembered if you switch to the other.
  // Takes a getter (current value) and setter (called with the newly picked
  // project) rather than touching shared state directly, so callers can keep
  // their own independent project selection if they don't want it shared.
  function buildSummaryUpdateProjectRadios(getValue, onChange) {
    return ["adobe", "yahoo"].map((project) => {
      const optLabel = document.createElement("label");
      optLabel.className = "upload-btn";
      optLabel.style.display = "inline-flex";
      optLabel.style.alignItems = "center";
      optLabel.style.gap = "6px";
      optLabel.style.cursor = "pointer";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "summary-update-project";
      radio.value = project;
      radio.checked = getValue() === project;
      radio.addEventListener("change", () => {
        if (radio.checked) onChange(project);
      });

      optLabel.appendChild(radio);
      optLabel.appendChild(document.createTextNode(project === "adobe" ? "Adobe" : "Yahoo"));
      return optLabel;
    });
  }

  function renderSummaryUpdateMode() {
    const isExtension = typeof chrome !== "undefined" && chrome.scripting && chrome.tabs;
    let lastExtracted = null; // { summary, pageField, details }
    let originalSummary = null; // captured once on first Get Data, reused on repeat clicks
    let summaryProject = "adobe"; // independent from the Automation Template tab's toggle

    const radioRow = document.createElement("div");
    radioRow.className = "controls-row";
    radioRow.style.justifyContent = "center";
    buildSummaryUpdateProjectRadios(
      () => summaryProject,
      (project) => {
        summaryProject = project;
        regenerate();
      }
    ).forEach((el) => radioRow.appendChild(el));
    els.content.appendChild(radioRow);

    const actionRow = document.createElement("div");
    actionRow.className = "controls-row";
    const getDataBtn = document.createElement("button");
    getDataBtn.className = "action-btn";
    getDataBtn.type = "button";
    getDataBtn.textContent = "Get Data";

    const clearBtn = document.createElement("button");
    clearBtn.className = "action-btn";
    clearBtn.type = "button";
    clearBtn.textContent = "Clear";

    actionRow.appendChild(getDataBtn);
    actionRow.appendChild(clearBtn);
    els.content.appendChild(actionRow);

    const statusMsg = document.createElement("div");
    statusMsg.className = "count-badge";
    els.content.appendChild(statusMsg);

    const pageCheckMsg = document.createElement("div");
    pageCheckMsg.className = "count-badge";
    els.content.appendChild(pageCheckMsg);

    const resultBlock = buildFieldBlock("Updated Summary", "");
    els.content.appendChild(resultBlock);
    const resultTextarea = resultBlock.querySelector("textarea");

    const applyRow = document.createElement("div");
    applyRow.className = "controls-row";
    const applyBtn = document.createElement("button");
    applyBtn.className = "action-btn";
    applyBtn.type = "button";
    applyBtn.textContent = "Update Summary";
    applyRow.appendChild(applyBtn);
    els.content.appendChild(applyRow);

    function regenerate() {
      if (!lastExtracted) return;
      const screenName = extractScreenNameFromDetails(lastExtracted.details);
      const elements = extractElementsFromText(lastExtracted.details);
      const prefix = buildTitlePrefix(summaryProject, originalSummary || "", screenName);
      resultTextarea.value = `${prefix} (${formatElementsSummary(elements)})`;
      checkPageMismatch(lastExtracted.pageField, screenName);
    }

    function checkPageMismatch(pageField, screenName) {
      if (!screenName) {
        setStatus(pageCheckMsg, "No \"Screen Name:\" line found in Details \u2014 can't check it against the Page field.", true);
        return;
      }
      const pageNorm = String(pageField || "").trim().toLowerCase();
      const screenNorm = screenName.trim().toLowerCase();
      if (pageNorm !== screenNorm) {
        setStatus(
          pageCheckMsg,
          `\u26D4 Page Name different \u2014 editor shows "${pageField || "(empty)"}" but Details lists Screen Name "${screenName}".`,
          true
        );
      } else {
        setStatus(pageCheckMsg, `Page Name matches Screen Name ("${screenName}").`, false);
      }
    }

    getDataBtn.addEventListener("click", async () => {
      if (!isExtension) {
        setStatus(statusMsg, "Get Data reads the active browser tab, which only the extension version can do.", true);
        return;
      }
      setStatus(statusMsg, "Reading page\u2026", false);
      try {
        const tab = await getTargetTab();
        if (!tab || !tab.id) {
          throw new Error("No active browser tab found \u2014 click on the auditor page, then try again.");
        }
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: summaryUpdateExtractor,
        });
        const data = results && results[0] ? results[0].result : null;
        if (!data) throw new Error("Could not read the page.");

        lastExtracted = data;

        // Only capture the "original" Summary once. If Update Summary already wrote the
        // wrapped version back into #summary, a repeat Get Data click would otherwise
        // read that wrapped text and wrap it again, compounding on every click.
        if (originalSummary === null) {
          originalSummary = data.summary || "";
        }

        regenerate();
        setStatus(
          statusMsg,
          `Pulled Summary and parsed Details. Using original Summary: "${originalSummary}" (click Clear to re-capture from the page).`,
          false
        );
      } catch (err) {
        setStatus(statusMsg, "Error reading page: " + err.message, true);
      }
    });

    clearBtn.addEventListener("click", () => {
      lastExtracted = null;
      originalSummary = null;
      resultTextarea.value = "";
      setStatus(statusMsg, "Cleared. Next Get Data will re-capture the Summary from the page.", false);
      setStatus(pageCheckMsg, "", false);
    });

    applyBtn.addEventListener("click", async () => {
      if (!isExtension) {
        setStatus(statusMsg, "Update Summary writes into the active browser tab, which only the extension version can do.", true);
        return;
      }
      if (!resultTextarea.value.trim()) {
        setStatus(statusMsg, "Nothing to apply \u2014 click Get Data first.", true);
        return;
      }
      setStatus(statusMsg, "Updating summary\u2026", false);
      try {
        const tab = await getTargetTab();
        if (!tab || !tab.id) throw new Error("No active browser tab found.");
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: summaryWriter,
          args: [resultTextarea.value],
        });
        const result = results && results[0] ? results[0].result : null;
        const ok = !!(result && result.summaryOk);
        setStatus(statusMsg, ok ? "Summary updated on the page." : "Summary field (#summary) not found.", !ok);
      } catch (err) {
        setStatus(statusMsg, "Error updating summary: " + err.message, true);
      }
    });
  }

  function renderTemplateMode() {
    els.content.appendChild(buildGetDataPanel());

    const form = document.createElement("div");
    form.className = "template-form";
    form.id = "template-form";

    const values = getTemplateSourceData();

    APP_DATA.TEMPLATE_FIELDS.forEach((fieldDef) => {
      const wrap = document.createElement("div");
      wrap.className = "template-field";
      // Only "Updated title in Adobe format" is shown as an editable field;
      // everything else is still created (Get Data / buildTemplateText need
      // these inputs to exist) but hidden from view.
      if (fieldDef.key !== "updatedTitle") {
        wrap.style.display = "none";
      }

      const label = document.createElement("label");
      label.textContent = fieldDef.key === "updatedTitle" ? getUpdatedTitleLabelText(templateState.project) : fieldDef.label;
      label.setAttribute("for", `tpl-${fieldDef.key}`);
      if (fieldDef.key === "updatedTitle") label.id = "updated-title-label";

      let input;
      if (fieldDef.type === "textarea") {
        input = document.createElement("textarea");
      } else {
        input = document.createElement("input");
        input.type = "text";
      }
      input.id = `tpl-${fieldDef.key}`;
      input.dataset.key = fieldDef.key;
      input.value = values[fieldDef.key] !== undefined ? values[fieldDef.key] : fieldDef.default;

      wrap.appendChild(label);
      wrap.appendChild(input);
      form.appendChild(wrap);
    });

    els.content.appendChild(form);

    const actions = document.createElement("div");
    actions.className = "template-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy Output";

    actions.appendChild(copyBtn);
    els.content.appendChild(actions);

    // Preview is a plain editable textarea — typing directly into it *is* the save,
    // no separate edit/save step. Get Data (re)populates it from scratch each time.
    const output = document.createElement("textarea");
    output.className = "template-output template-output-edit";
    output.id = "template-output";
    els.content.appendChild(output);

    function collectValues() {
      const collected = {};
      form.querySelectorAll("[data-key]").forEach((el) => {
        collected[el.dataset.key] = el.value;
      });
      return collected;
    }

    function generate() {
      output.value = buildTemplateText(collectValues());
    }

    copyBtn.addEventListener("click", () => {
      if (!output.value) generate();
      copyToClipboard(output.value, copyBtn);
    });

    // Keep Updated Title's "(...)" suffix in sync with any "- Element" bullet
    // lines typed directly into the preview's Steps to Reproduce section.
    output.addEventListener("input", () => {
      refreshUpdatedTitle(form, output);
    });

    generate();
  }

  // Two clean controls above the Template form: Upload Excel + Get Data.
  function buildGetDataPanel() {
    const wrap = document.createElement("div");
    wrap.className = "controls-panel";

    const isExtension = typeof chrome !== "undefined" && chrome.scripting && chrome.tabs;

    // ---- Row 1: Adobe / Yahoo / Upload Excel ----
    const row = document.createElement("div");
    row.className = "controls-row";

    buildProjectRadios().forEach((label) => row.appendChild(label));

    // Upload button with the stored-file info shown directly beneath it
    // (filename + Remove link on one line).
    const uploadGroup = document.createElement("div");
    uploadGroup.className = "upload-group";

    const uploadLabel = document.createElement("label");
    uploadLabel.className = "upload-btn";
    uploadLabel.setAttribute("for", "excel-input");
    uploadLabel.textContent = "Upload Excel";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".xlsx,.xls";
    fileInput.id = "excel-input";
    fileInput.hidden = true;

    // ---- Excel file info (only shown once a file is stored) ----
    const excelInfo = document.createElement("div");
    excelInfo.className = "excel-info";

    uploadGroup.appendChild(uploadLabel);
    uploadGroup.appendChild(fileInput);
    uploadGroup.appendChild(excelInfo);
    row.appendChild(uploadGroup);
    wrap.appendChild(row);

    // ---- Row 2: Get Data / Log Issue / Clear (unified style) ----
    const actionRow = document.createElement("div");
    actionRow.className = "controls-row";

    const getDataBtn = document.createElement("button");
    getDataBtn.className = "action-btn";
    getDataBtn.type = "button";
    getDataBtn.textContent = "Get Data";

    const logBtn = document.createElement("button");
    logBtn.className = "action-btn";
    logBtn.type = "button";
    logBtn.textContent = "Log Issue";

    const clearBtn = document.createElement("button");
    clearBtn.className = "action-btn";
    clearBtn.type = "button";
    clearBtn.textContent = "Clear";

    actionRow.appendChild(getDataBtn);
    actionRow.appendChild(logBtn);
    actionRow.appendChild(clearBtn);
    wrap.appendChild(actionRow);

    // ---- Status (only shown after Get Data runs) ----
    const statusMsg = document.createElement("div");
    statusMsg.className = "count-badge";
    wrap.appendChild(statusMsg);

    refreshExcelInfo(excelInfo);

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      await storageSet("automationExcel", { name: file.name, dataUrl, storedAt: Date.now() });
      invalidateReferenceDataCache();
      fileInput.value = "";
      refreshExcelInfo(excelInfo);
    });

    async function refreshExcelInfo(container) {
      const stored = await storageGet("automationExcel");
      container.innerHTML = "";
      if (!stored) return;

      const name = document.createElement("span");
      name.textContent = stored.name;

      const removeLink = document.createElement("span");
      removeLink.className = "remove-link";
      removeLink.textContent = "Remove";
      removeLink.addEventListener("click", async () => {
        await storageRemove("automationExcel");
        invalidateReferenceDataCache();
        refreshExcelInfo(container);
      });

      container.appendChild(name);
      container.appendChild(removeLink);
    }

    getDataBtn.addEventListener("click", async () => {
      if (!isExtension) {
        setStatus(
          statusMsg,
          "Get Data reads the active browser tab, which only the extension version can do. Load this project as an unpacked extension (chrome://extensions \u2192 Load unpacked) to use this button.",
          true
        );
        return;
      }

      setStatus(statusMsg, "Reading page\u2026", false);
      const form = document.getElementById("template-form");
      if (!form) return;

      try {
        const pageData = await extractFromActivePage();
        if (!pageData) {
          setStatus(statusMsg, "Couldn't read the page. Make sure the auditor issue form is open in the active tab.", true);
          return;
        }

        const applied = [];
        const skipped = [];
        const problems = [];

        Object.keys(pageData).forEach((key) => {
          const targetKey = EXTRACTED_TO_TEMPLATE_MAP[key];
          const input = targetKey ? form.querySelector(`[data-key="${targetKey}"]`) : null;
          if (input) {
            input.value = pageData[key] || "";
            applied.push(targetKey);
            if (!pageData[key]) problems.push(`${targetKey} was empty on the page (selector for "${key}" found nothing)`);
          } else if (pageData[key]) {
            skipped.push(key);
          }
        });

        const match = findAutomationMatch(pageData.summary);
        const expectedInput = form.querySelector('[data-key="expectedResults"]');
        const actualInput = form.querySelector('[data-key="actualResults"]');
        const remediationInput = form.querySelector('[data-key="remediation"]');
        if (expectedInput) expectedInput.value = match ? match.expected_results || "" : "";
        if (actualInput) actualInput.value = match ? match.actual_results || "" : "";
        if (remediationInput) remediationInput.value = match ? match.recommendation_to_fix || "" : "";
        if (match) applied.push("expectedResults", "actualResults", "remediation");

        const { applied: referenceApplied, notes: referenceNotes } = await enrichFromReference(form, pageData);
        applied.push(...referenceApplied);
        problems.push(...referenceNotes);

        // Steps to Reproduce: swap the quoted "Description here" placeholder for
        // the pulled Summary (the technical rule text) — falls back to Description if Summary is empty.
        const stepsInput = form.querySelector('[data-key="steps"]');
        const summaryForSteps = pageData.summary || pageData.description || "";
        if (stepsInput && summaryForSteps) {
          const before = stepsInput.value;
          stepsInput.value = before.replace(/"Description here"/, `"${summaryForSteps}"`);
          if (stepsInput.value !== before) applied.push("steps");
        }

        // Updated Title: "Accessibility - <Modified title> - <Screen Name> (<elements>)" for Adobe,
        // "<Modified title> - <Screen Name> (<elements>)" for Yahoo (see buildTitlePrefix).
        // Modified title comes from the Automation sheet's Modified Alternative column (matched via
        // Summary above) — falls back to the live page's Description, then Summary, if no match.
        // Elements come from any "- Element" bullet lines already in the Steps text (none yet on a
        // fresh Get Data — the preview's input listener keeps this in sync as you type them in).
        const updatedTitleInput = form.querySelector('[data-key="updatedTitle"]');
        const screenNameInput = form.querySelector('[data-key="screenName"]');
        if (updatedTitleInput) {
          const modifiedTitle = (match && match.modified_alternative) || pageData.description || pageData.summary || "";
          const screenNameValue = screenNameInput ? screenNameInput.value || "" : "";
          updatedTitleInput.dataset.modifiedTitle = modifiedTitle;
          updatedTitleInput.dataset.screenName = screenNameValue;
          const elements = extractElementsFromText(stepsInput ? stepsInput.value : "");
          const prefix = buildTitlePrefix(templateState.project, modifiedTitle, screenNameValue);
          updatedTitleInput.value = `${prefix} (${formatElementsSummary(elements)})`;
          applied.push("updatedTitle");
        }

        const output = document.getElementById("template-output");
        if (output) output.value = buildTemplateText(collectFormValues(form));

        const missingAfterGetData = findMissingRequiredFields(form);
        setStatus(
          statusMsg,
          `Applied: ${applied.join(", ")}.` +
            (skipped.length ? ` Not mapped: ${skipped.join(", ")}.` : "") +
            (match ? "" : " No Automation Title match for Expected/Actual \u2014 fill in manually.") +
            (problems.length ? ` \u26A0 ${problems.join(" | ")}` : "") +
            (missingAfterGetData.length
              ? ` \u26D4 Missing for this SC: ${missingAfterGetData.join(", ")} \u2014 Log Issue will be blocked until this is resolved.`
              : ""),
          missingAfterGetData.length > 0
        );
      } catch (err) {
        setStatus(statusMsg, "Error reading page: " + err.message, true);
      }
    });

    logBtn.addEventListener("click", async () => {
      if (!isExtension) {
        setStatus(statusMsg, "Log Issue writes into the active browser tab, which only the extension version can do.", true);
        return;
      }

      const form = document.getElementById("template-form");
      const output = document.getElementById("template-output");
      const updatedTitleInput = form ? form.querySelector('[data-key="updatedTitle"]') : null;
      if (!form || !output || !updatedTitleInput) return;

      const missing = findMissingRequiredFields(form);
      if (missing.length) {
        setStatus(
          statusMsg,
          `\u26D4 Blocked \u2014 no data found for: ${missing.join(", ")}. This usually means there's no matching row for this SC/Automation title in the reference sheet or Automation data. Re-run Get Data or check the sheet before logging.`,
          true
        );
        return;
      }

      setStatus(statusMsg, "Logging issue\u2026", false);
      try {
        const tab = await getTargetTab();
        if (!tab || !tab.id) {
          throw new Error("No active browser tab found \u2014 click on the auditor page, then try again.");
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: pageWriter,
          args: [updatedTitleInput.value || "", output.value || ""],
        });
        const result = results && results[0] ? results[0].result : null;
        if (!result) throw new Error("Could not write to the page.");

        const parts = [
          result.summaryOk ? "Summary filled" : "Summary field (#summary) not found",
          result.detailsOk ? "Details filled" : "Details field (#details) not found",
        ];
        setStatus(statusMsg, parts.join(", ") + ".", !result.summaryOk || !result.detailsOk);
      } catch (err) {
        setStatus(statusMsg, "Error logging issue: " + err.message, true);
      }
    });

    clearBtn.addEventListener("click", () => {
      const form = document.getElementById("template-form");
      if (!form) return;

      APP_DATA.TEMPLATE_FIELDS.forEach((fieldDef) => {
        const input = form.querySelector(`[data-key="${fieldDef.key}"]`);
        if (input) input.value = fieldDef.default || "";
      });

      const updatedTitleInput = form.querySelector('[data-key="updatedTitle"]');
      if (updatedTitleInput) {
        delete updatedTitleInput.dataset.modifiedTitle;
        delete updatedTitleInput.dataset.screenName;
      }

      const output = document.getElementById("template-output");
      if (output) output.value = buildTemplateText(collectFormValues(form));

      setStatus(statusMsg, "Cleared.", false);
      setTimeout(() => {
        if (statusMsg.textContent === "Cleared.") setStatus(statusMsg, "", false);
      }, 1500);
    });

    return wrap;
  }

  function collectFormValues(form) {
    const collected = {};
    form.querySelectorAll("[data-key]").forEach((el) => {
      collected[el.dataset.key] = el.value;
    });
    return collected;
  }

  // Assembles the final report text from field values.
  // Sections are driven by APP_DATA.TEMPLATE_FIELDS order below is intentionally
  // explicit (not auto-looped) so sections/labels stay easy to add, remove, or reorder.
  // Assembles the final report text from field values, in whichever project's
  // format is currently selected (see templateState.project / buildProjectToggle).
  function buildTemplateText(v) {
    return templateState.project === "yahoo" ? buildTemplateTextYahoo(v) : buildTemplateTextAdobe(v);
  }

  function buildTemplateTextAdobe(v) {
    return [
      "Environment:",
      `Platform URL: ${v.platformUrl || ""}`,
      `Authentication State: ${v.authState || ""}`,
      "",
      "Context:",
      `Operating System: ${v.os || ""}`,
      `Browser: ${v.browser || ""}`,
      `${v.tool || ""}`,
      "",
      "Steps to reproduce:",
      `${v.steps || ""}`,
      "",
      "Expected results:",
      `${v.expectedResults || ""}`,
      "",
      "Actual results:",
      `${v.actualResults || ""}`,
      "",
      "Affected user population:",
      `${v.affectedUsers || ""}`,
      "",
      "Applicable WCAG Success Criterion:",
      `${v.wcagSc || ""}`,
      "",
      "Code Snippet:",
      `${v.codeSnippet || ""}`,
      "",
      "Remediation Recommendation:",
      `${v.remediation || ""}`,
      "",
      "Screen Name:",
      `${v.screenName || ""}`,
      "",
      "Labels:",
      `${v.labels || ""}`,
    ].join("\n");
  }

  // Yahoo: same sections as Adobe, minus the trailing Labels section, with a
  // "Platform: Web" line added under the "Context:" header and "Test Method:"
  // labeling the tool line.
  function buildTemplateTextYahoo(v) {
    return [
      "Environment:",
      `Platform URL: ${v.platformUrl || ""}`,
      `Authentication State: ${v.authState || ""}`,
      "",
      "Context:",
      "Platform: Web",
      `Operating System: ${v.os || ""}`,
      `Browser: ${v.browser || ""}`,
      `Test Method: ${v.tool || ""}`,
      "",
      "Steps to reproduce:",
      `${v.steps || ""}`,
      "",
      "Expected results:",
      `${v.expectedResults || ""}`,
      "",
      "Actual results:",
      `${v.actualResults || ""}`,
      "",
      "Affected user population:",
      `${v.affectedUsers || ""}`,
      "",
      "Applicable WCAG Success Criterion:",
      `${v.wcagSc || ""}`,
      "",
      "Code Snippet:",
      `${v.codeSnippet || ""}`,
      "",
      "Remediation Recommendation:",
      `${v.remediation || ""}`,
      "",
      "Screen Name:",
      `${v.screenName || ""}`,
    ].join("\n");
  }

  // Placeholder hook for pulling Template field values from an external/live source.
  // Get Data (above) now covers most of this live; kept as a hook in case another
  // source is added later — everything else in this file stays the same.
  function getTemplateSourceData() {
    return {};
  }

  // ---------- Clipboard ----------

  function copyToClipboard(text, btnEl) {
    const done = () => {
      const original = btnEl.textContent;
      btnEl.textContent = "Copied!";
      btnEl.classList.add("copied");
      setTimeout(() => {
        btnEl.textContent = original;
        btnEl.classList.remove("copied");
      }, 1200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* no-op */
    }
    document.body.removeChild(ta);
    done();
  }
})();