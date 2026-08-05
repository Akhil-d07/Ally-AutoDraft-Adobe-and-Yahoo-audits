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
    ensureDeviceTypeLoaded().then((loaded) => {
      if (loaded !== "Desktop Web") render();
    });
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
    else if (state.mode === "CSV_SANITY") renderCsvSanityMode();
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
      checkpoint: getVal("#combobox"),
      impact: getVal("#severity-select"),
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
  //   2. The bundled reference sheet ("reference-data.xlsx" or
  //      "referencedata.xlsx" — both are checked), as a fallback if nothing's
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
          // Tried in order — the bundled filename has changed between
          // versions of this project, so both are checked rather than
          // hardcoding one and silently failing on a 404 if it's the other.
          const candidateNames = ["reference-data.xlsx", "referencedata.xlsx"];
          let resp = null;
          let loadedName = null;
          for (const name of candidateNames) {
            const candidateUrl = chrome.runtime.getURL(name);
            const candidateResp = await fetch(candidateUrl);
            if (candidateResp.ok) {
              resp = candidateResp;
              loadedName = name;
              break;
            }
          }
          if (!resp) {
            referenceLoadError = `Bundled reference sheet not found \u2014 checked for ${candidateNames.join(
              " and "
            )} at the extension root.`;
            return null;
          }
          buf = await resp.arrayBuffer();
          source = `bundled ${loadedName}`;
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

  // ---------- Device Type / Native app context helpers ----------
  //
  // Device Type is a shared selection (persisted via chrome.storage) shown on
  // both the Automation Template tab and the Summary Update tab. It filters
  // which report format is needed:
  //   Desktop Web / Android Web / iOS Web -> existing Web-audit behavior
  //   Android Native / iOS Native          -> no automation exists; Environment/
  //                                           Context comes from a manually
  //                                           filled + locked "Native App
  //                                           Context" block instead of the
  //                                           Excel-driven Platform URL/OS/Browser
  //                                           fields.

  const DEVICE_TYPES = ["Desktop Web", "Android Web", "iOS Web", "Android Native", "iOS Native"];
  const NATIVE_DEVICE_TYPES = ["Android Native", "iOS Native"];
  // Automation only ever runs against Web audits — there's no automation
  // tooling for native apps — so its Device Type dropdown omits the Native
  // options entirely rather than offering them and then blocking on them.
  // The Summary Update (manual) tab keeps all 5, since native issues are
  // authored manually there.
  const WEB_DEVICE_TYPES = ["Desktop Web", "Android Web", "iOS Web"];

  function isNativeDeviceType(deviceType) {
    return NATIVE_DEVICE_TYPES.indexOf(deviceType) !== -1;
  }

  let currentDeviceType = "Desktop Web";
  let deviceTypeLoaded = false;

  async function ensureDeviceTypeLoaded() {
    if (deviceTypeLoaded) return currentDeviceType;
    const stored = await storageGet("deviceTypeSelection");
    if (stored && DEVICE_TYPES.indexOf(stored) !== -1) currentDeviceType = stored;
    deviceTypeLoaded = true;
    return currentDeviceType;
  }

  function setDeviceType(value) {
    currentDeviceType = value;
    storageSet("deviceTypeSelection", value);
  }

  // Builds the shared "Device Type:" selector row used by both the Automation
  // Template tab and the Summary Update tab — label and dropdown sit on a
  // single line rather than stacked. optionsOverride restricts which Device
  // Types are offered (used by the Automation tab to hide Native options).
  function buildDeviceTypeRow(onChange, optionsOverride) {
    const options = optionsOverride || DEVICE_TYPES;
    const row = document.createElement("div");
    row.className = "inline-row";

    const label = document.createElement("label");
    label.className = "aligned-label-col";
    label.textContent = "Device Type:";
    label.setAttribute("for", "device-type-select");

    const select = document.createElement("select");
    select.id = "device-type-select";
    select.className = "inline-select";
    options.forEach((dt) => {
      const opt = document.createElement("option");
      opt.value = dt;
      opt.textContent = dt;
      if (dt === currentDeviceType) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      setDeviceType(select.value);
      onChange(select.value);
    });

    row.appendChild(label);
    row.appendChild(select);
    return row;
  }

  // Storage key for a Native App Context lock, kept separate per Device Type
  // (Android Native vs iOS Native have different devices/app versions/etc.).
  function nativeContextStorageKeyFor(deviceType) {
    return `nativeContext:${deviceType}`;
  }

  // Locates the combined "Environment:" ... "Context:" region of Details, up
  // to (but excluding) "Steps to reproduce:". Web and Native reports both keep
  // Environment+Context contiguous, so one section covers both headers.
  function locateEnvironmentContextSection(text) {
    const str = String(text || "");
    const startMatch = str.match(/environment:/i);
    if (!startMatch) return null;
    const sectionStart = startMatch.index;
    const afterHeader = str.slice(sectionStart);
    const endMatch = afterHeader.match(/\n\s*steps to reproduce:/i);
    const sectionEnd = endMatch ? sectionStart + endMatch.index : str.length;
    return { sectionStart, sectionEnd, content: str.slice(sectionStart, sectionEnd) };
  }

  // Builds the Environment/Context block for Native app testing (iOS/Android),
  // used in place of the Platform URL / OS / Browser fields that only apply
  // to Web audits. Same shape for both Adobe and Yahoo projects.
  function buildNativeEnvironmentContextBlock(fields) {
    const f = fields || {};
    return [
      "Environment:",
      `Testing Application: ${f.testingApplication || ""}`,
      `Authentication State: ${f.authState || ""}`,
      "",
      "Context:",
      `Device: ${f.device || ""}`,
      `Operating System: ${f.os || ""}`,
      `${f.os || "OS"} Version: ${f.osVersion || ""}`,
      `${f.testingApplication || "Application"} Version: ${f.appVersion || ""}`,
      `${f.toolDescription || ""}`,
    ].join("\n");
  }

  // Replaces the Environment+Context region (using offsets from
  // locateEnvironmentContextSection) with newBlock, normalizing spacing.
  function spliceEnvironmentContextIntoDetails(fullText, loc, newBlock) {
    const before = fullText.slice(0, loc.sectionStart).replace(/\s+$/, "");
    const after = fullText.slice(loc.sectionEnd).replace(/^\s+/, "");
    const prefix = before ? before + "\n\n" : "";
    return `${prefix}${newBlock}\n\n${after}`;
  }

  // Auto-fix applied on Update/Log Issue: within the Steps to Reproduce
  // section only, turns 'quoted text' into "quoted text" (single quotes used
  // where double quotes were intended).
  function fixSingleQuotesInSteps(fullText) {
    const loc = locateStepsSection(fullText);
    if (!loc) return fullText;
    const fixedContent = loc.content.replace(/'([^'\n]+)'/g, '"$1"');
    return fullText.slice(0, loc.sectionStart) + fixedContent + fullText.slice(loc.sectionEnd);
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

  // Same boundary logic as scopeToStepsSection, but returns character offsets
  // into the original text (content only, header excluded) so a corrected
  // version can be spliced back in without disturbing anything else.
  function locateStepsSection(text) {
    const str = String(text || "");
    const startMatch = str.match(/steps to reproduce:/i);
    if (!startMatch) return null;
    const sectionStart = startMatch.index + startMatch[0].length;
    const afterHeader = str.slice(sectionStart);
    const endMatch = afterHeader.match(/\n\s*(expected results|actual results):/i);
    const sectionEnd = endMatch ? sectionStart + endMatch.index : str.length;
    return { sectionStart, sectionEnd, content: str.slice(sectionStart, sectionEnd) };
  }

  // Pulls the leading step markers (e.g. "1", "2", but also malformed ones
  // like "" for a blank/missing marker or "a"/"b" for stray letters) out of
  // the Steps to Reproduce section, in the order they appear. Kept as raw
  // strings (not parsed as integers) specifically so malformed markers show
  // up as-is in the displayed sequence rather than silently vanishing.
  function extractStepNumbers(text) {
    const markers = [];
    scopeToStepsSection(text)
      .split("\n")
      .forEach((line) => {
        const m = line.match(/^\s*([a-zA-Z0-9]*)\s*\./);
        if (m) markers.push(m[1]);
      });
    return markers;
  }

  // Checks that step markers form a clean 1,2,3,... sequence with no gaps,
  // duplicates, blanks, or stray letters. Returns the actual sequence either
  // way, for display (e.g. "1,2,3,4,4,5,6" for a duplicate, "1,2,3,5,6" for a
  // gap, "1,2,,4,5,6" for a blank marker, "1,2,3,4,a,b,7,8" for stray letters).
  function checkStepSequence(markers) {
    for (let i = 0; i < markers.length; i++) {
      if (markers[i] !== String(i + 1)) return { ok: false, markers };
    }
    return { ok: markers.length > 0, markers };
  }

  // Renumbers the Steps to Reproduce section sequentially starting at
  // startAt (default 1), fixing duplicates, gaps, blank markers, and stray
  // letters alike, while leaving "- Element" bullet lines and everything
  // outside Steps untouched. Used with startAt=2 when Step 1 doesn't open the
  // URL — see checkStepOneOpensUrl — so the existing steps shift down and
  // leave slot 1 free for the user to add the missing "Open the URL..." step.
  function fixStepsNumberingInDetails(fullText, startAt) {
    const loc = locateStepsSection(fullText);
    if (!loc) return fullText;

    let counter = (startAt || 1) - 1;
    const fixedContent = loc.content
      .split("\n")
      .map((line) => {
        const m = line.match(/^(\s*)([a-zA-Z0-9]*)(\s*\.\s*)(.*)$/);
        if (!m) return line;
        counter += 1;
        return `${m[1]}${counter}${m[3]}${m[4]}`;
      })
      .join("\n");

    return fullText.slice(0, loc.sectionStart) + fixedContent + fullText.slice(loc.sectionEnd);
  }

  // Generic section locator: finds startRegex's header, returns offsets/content
  // up to whichever endRegex in the list appears first (or end of text).
  function locateSection(text, startRegex, endRegexList) {
    const str = String(text || "");
    const startMatch = str.match(startRegex);
    if (!startMatch) return null;
    const sectionStart = startMatch.index + startMatch[0].length;
    const afterHeader = str.slice(sectionStart);
    let endIdx = afterHeader.length;
    endRegexList.forEach((re) => {
      const m = afterHeader.match(re);
      if (m && m.index < endIdx) endIdx = m.index;
    });
    const sectionEnd = sectionStart + endIdx;
    return { sectionStart, sectionEnd, content: str.slice(sectionStart, sectionEnd) };
  }

  // The Remediation Recommendation section actually ends at "Resource Link:"
  // / "Reference Link:" when either is present (falls back to "Screen Name:"
  // for reports that don't have a Resource/Reference Link section at all).
  function locateRemediationSection(text) {
    return locateSection(text, /remediation recommendation:/i, [
      /\n\s*(resource link|reference link):/i,
      /\n\s*screen name:/i,
    ]);
  }

  // Flags any line within Remediation Recommendation that ends with ":" and
  // has nothing else on that same line (e.g. "...appropriate ARIA roles,
  // states, and properties:") — a dangling colon usually means a value was
  // left unfinished. Checked per-line, not just the section's last line,
  // since an earlier line can be broken even if later lines have real content.
  function checkRemediationTrailingColon(text) {
    const loc = locateRemediationSection(text);
    if (!loc) return { ok: true, sectionFound: false, badLines: [] };
    const badLines = [];
    loc.content.split("\n").forEach((line) => {
      const trimmed = line.replace(/\s+$/, "");
      if (trimmed && trimmed.endsWith(":")) badLines.push(trimmed);
    });
    return { ok: badLines.length === 0, sectionFound: true, badLines };
  }

  // Fixes every dangling trailing ":" line by turning it into ":-".
  function fixRemediationTrailingColon(fullText) {
    const loc = locateRemediationSection(fullText);
    if (!loc) return fullText;
    const fixedContent = loc.content
      .split("\n")
      .map((line) => {
        const trimmed = line.replace(/\s+$/, "");
        return trimmed && trimmed.endsWith(":") ? trimmed + "-" : line;
      })
      .join("\n");
    return fullText.slice(0, loc.sectionStart) + fixedContent + fullText.slice(loc.sectionEnd);
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

  // If a Summary already looks like it's in the expected wrapped format
  // ("Accessibility - Title - Screen (Elements)" for Adobe, without the
  // prefix for Yahoo), extracts its pieces. Returns null if it doesn't look
  // wrapped at all (e.g. a plain freeform title never touched by this tool).
  // Hoisted to top level so both the Summary Update tab and the Sanity engine
  // can use it.
  function parseWrappedSummary(summaryText) {
    const str = String(summaryText || "").trim();
    const m = str.match(/^(.*)\(([^()]*)\)\s*$/);
    if (!m) return null;
    const rest = m[1].trim();
    const elementsRaw = m[2].trim();
    const lastDash = rest.lastIndexOf(" - ");
    if (lastDash === -1) return null;
    const screenName = rest.slice(lastDash + 3).trim();
    let modifiedTitle = rest.slice(0, lastDash).trim();
    let hasAccessibilityPrefix = false;
    if (/^\[?Accessibility\]?\s*-\s*/i.test(modifiedTitle)) {
      hasAccessibilityPrefix = true;
      modifiedTitle = modifiedTitle.replace(/^\[?Accessibility\]?\s*-\s*/i, "").trim();
    }
    return { modifiedTitle, screenName, elementsRaw, hasAccessibilityPrefix };
  }

  function escapeRegExp(str) {
    return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Same shape as parseWrappedSummary, but checks for the combined base+custom
  // prefix ("[Accessibility][Custom]" for Adobe, "[Custom]" alone for Yahoo)
  // instead of the normal "[Accessibility] -"/no-prefix convention. Used when
  // a tab's "Custom prefix?" toggle is enabled+locked — Sanity and the
  // Update/Log Issue builders then check ONLY this pattern.
  function parseWrappedSummaryCustom(summaryText, customPrefix, project) {
    const str = String(summaryText || "").trim();
    const m = str.match(/^(.*)\(([^()]*)\)\s*$/);
    if (!m) return null;
    const rest = m[1].trim();
    const elementsRaw = m[2].trim();
    const lastDash = rest.lastIndexOf(" - ");
    if (lastDash === -1) return null;
    const screenName = rest.slice(lastDash + 3).trim();
    const titlePart = rest.slice(0, lastDash).trim();
    const basePrefix = project === "yahoo" ? "" : "[Accessibility]";
    const expectedPrefix = `${basePrefix}[${customPrefix}]`;
    const prefixRegex = new RegExp("^" + escapeRegExp(expectedPrefix) + "\\s*-\\s*", "i");
    const hasPrefix = prefixRegex.test(titlePart);
    const modifiedTitle = hasPrefix ? titlePart.replace(prefixRegex, "").trim() : titlePart;
    return { modifiedTitle, screenName, elementsRaw, hasPrefix };
  }

  // Whether a parsed summary's prefix presence matches what the current
  // project expects (Adobe -> has "Accessibility - ", Yahoo -> doesn't).
  function wrappedFormatMatchesProject(wrapped, project) {
    if (!wrapped) return false;
    const expectsPrefix = project !== "yahoo";
    return wrapped.hasAccessibilityPrefix === expectsPrefix;
  }

  // Safety net against double-wrapping: if `text` already looks like a fully
  // wrapped "Prefix - Title - Screen (Elements)" summary (matching either a
  // custom prefix, if one is active, or the normal Adobe/Yahoo convention),
  // returns just the inner title so it isn't wrapped a second time. Returns
  // `text` unchanged if it doesn't look wrapped at all.
  function unwrapIfAlreadyWrapped(text, customPrefix, project) {
    if (customPrefix) {
      const wrappedCustom = parseWrappedSummaryCustom(text, customPrefix, project);
      if (wrappedCustom) return wrappedCustom.modifiedTitle;
    }
    const wrapped = parseWrappedSummary(text);
    return wrapped ? wrapped.modifiedTitle : text;
  }

  // ---------- Sanity engine ----------
  //
  // Runs once, ~1 second after Update/Log Issue writes to the live page (the
  // delay gives the page's own state a moment to settle before we read
  // anything back off it, e.g. the screenshot upload widget or the Impact
  // select). All checks that can be derived purely from the Summary/Details
  // text we just wrote are pure functions below; the two that need the live
  // page (screenshot presence, Impact value, Checkpoint value) are read via
  // sanityPageExtractor(), injected the same way as the other page readers.

  // Injected into the auditor page. Self-contained — no outer-scope refs.
  function sanityPageExtractor() {
    function getVal(selector) {
      const el = document.querySelector(selector);
      if (!el) return "";
      if (el.tagName === "SELECT") {
        if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
          return (el.options[el.selectedIndex].text || "").trim();
        }
        return (el.value || "").trim();
      }
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return (el.value || "").trim();
      return (el.textContent || "").trim();
    }

    // The attachment area lives at #issue-more-info > fieldset > div:nth-child(6)
    // (labeled "Attachments" on the page) — it's not a drag/drop widget, so
    // detection is based on whether that container has any actual attachment
    // entries (thumbnails, file links/list items) versus being empty.
    // Each attached screenshot has its own edit field, id'd like
    // "ws-assure-generated-0", "ws-assure-generated-1", etc., inside the
    // Attachments container. Presence of at least one such field means the
    // issue has a screenshot; absence means it doesn't.
    function detectScreenshot() {
      const el = document.querySelector("#issue-more-info > fieldset > div:nth-child(6)");
      if (!el) return { found: false, hasScreenshot: false };
      const editFields = el.querySelectorAll('[id^="ws-assure-generated-"]');
      return { found: true, hasScreenshot: editFields.length > 0 };
    }

    const shot = detectScreenshot();
    return {
      severity: getVal("#severity-select"),
      checkpoint: getVal("#combobox"),
      screenshotFound: shot.found,
      hasScreenshot: shot.hasScreenshot,
    };
  }

  // Extracts the raw value after "Authentication State:" (same line, per the
  // templates). Returns null if the header isn't found at all, "" if found
  // but empty, otherwise the cleaned value — the caller decides what counts
  // as valid.
  function extractAuthenticationState(detailsText) {
    const m = String(detailsText || "").match(/authentication\s*state\s*:\s*(.*)/i);
    if (!m) return null;
    // Strip non-breaking spaces and other invisible whitespace that can slip
    // in via copy/paste and would otherwise defeat a plain .trim() check.
    return m[1].replace(/[\u00A0\u200B\uFEFF]/g, " ").trim();
  }

  // Authentication State must be exactly "Logged In" or "Logged Out"
  // (case-insensitive) — flag if absent or any other value.
  function checkAuthenticationState(detailsText) {
    const raw = extractAuthenticationState(detailsText);
    if (raw === null) {
      return {
        ok: false,
        detail: 'No "Authentication State:" line found.',
        suggestedText: 'Authentication State: "Logged In" or "Logged Out"',
      };
    }
    const norm = raw.toLowerCase();
    if (norm === "logged in" || norm === "logged out") {
      return { ok: true, detail: "" };
    }
    return {
      ok: false,
      detail: raw
        ? `Authentication State is "${raw}" \u2014 must be "Logged In" or "Logged Out".`
        : "Authentication State line is empty.",
      // No deterministic single correct value here (either state could be the
      // real one), so this is informational only — no auto-"fix" offered.
      suggestedText: 'Authentication State: "Logged In" or "Logged Out"',
    };
  }

  // Determines Screen Reader / Keyboard / Other from the Context section's
  // tool line. Shared by the consistency check below and by the auto-insert
  // logic that fills in a missing Step 1.
  function determineIssueTypeFromContext(detailsText) {
    const parsedContext = parseContextFromDetails(detailsText);
    const blob = (parsedContext && parsedContext.tool ? parsedContext.tool : "").toLowerCase();
    if (/nvda|screen reader|assistive technology/.test(blob)) return "Screen Reader";
    if (/keyboard/.test(blob)) return "Keyboard";
    return "Other";
  }

  // Checks Step 1 of Steps to Reproduce for consistency with the issue type
  // determined from Context.
  function checkStepsIssueTypeConsistency(detailsText) {
    const issueType = determineIssueTypeFromContext(detailsText);

    const stepLines = scopeToStepsSection(detailsText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9]*\s*\./.test(l));
    const firstStepText = stepLines.length ? stepLines[0].replace(/^[a-zA-Z0-9]*\s*\.\s*/, "").trim() : "";
    const mentionsTurnOnScreenReader = /turn\s+on\s+(the\s+)?screen\s*reader/i.test(firstStepText);

    if (issueType === "Screen Reader") {
      return {
        ok: mentionsTurnOnScreenReader,
        detail: mentionsTurnOnScreenReader
          ? ""
          : `Context indicates Screen Reader testing, but Step 1 ("${firstStepText || "(empty)"}") doesn't mention turning on the screen reader.`,
      };
    }
    return {
      ok: !mentionsTurnOnScreenReader,
      detail: !mentionsTurnOnScreenReader
        ? ""
        : `Context indicates ${issueType} testing, but Step 1 mentions turning on the screen reader.`,
    };
  }

  // Collapses all whitespace runs to single spaces, drops a single trailing
  // period, and lowercases — so wording is compared exactly while spacing
  // and trailing-punctuation differences are ignored.
  function normalizeSpacing(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.$/, "")
      .toLowerCase();
  }

  // Determines the exact Step 1 wording an issue is required to have:
  //   - Reflow (1.4.10) / Resize Text (1.4.4): tested via plain browser
  //     zoom, not AT — Step 1 must be "Open the chrome browser".
  //   - Issues with AT (Screen Reader): Step 1 must be "Turn on the screen
  //     reader and open the above-mentioned URL."
  //   - Everything else (Keyboard/no AT): Step 1 must be "Open the
  //     above-mentioned URL."
  function determineStepOneRequirement(detailsText, checkpointText) {
    const scCode = extractScCode(checkpointText);
    if (scCode === "1.4.10" || scCode === "1.4.4") {
      return { category: "browser-only", expectedText: "Open the chrome browser." };
    }
    const issueType = determineIssueTypeFromContext(detailsText);
    if (issueType === "Screen Reader") {
      return { category: "screen-reader", expectedText: "Turn on the screen reader and open the above-mentioned URL." };
    }
    return { category: "no-at", expectedText: "Open the above-mentioned URL." };
  }

  // Step 1 of Steps to Reproduce must match the required wording exactly
  // (spacing/trailing-punctuation differences ignored) for the issue's
  // checkpoint/issue type — see determineStepOneRequirement.
  function checkStepOneOpensUrl(detailsText, checkpointText) {
    const requirement = determineStepOneRequirement(detailsText, checkpointText);
    const stepLines = scopeToStepsSection(detailsText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9]*\s*\./.test(l));
    const firstStepText = stepLines.length ? stepLines[0].replace(/^[a-zA-Z0-9]*\s*\.\s*/, "").trim() : "";

    const ok = normalizeSpacing(firstStepText) === normalizeSpacing(requirement.expectedText);
    return {
      ok,
      detail: ok
        ? ""
        : `Step 1 should be "${requirement.expectedText}" but is "${firstStepText || "(empty)"}".`,
      requirement,
    };
  }

  // If Step 1 doesn't match the required wording (per checkStepOneOpensUrl),
  // inserts the correct "1. ..." line ahead of the existing steps. Caller is
  // expected to renumber afterward (fixStepsNumberingInDetails) since this
  // just prepends "1." and leaves the old lines' markers as-is.
  function autoInsertStepOneIfMissing(fullText, checkpointText) {
    const check = checkStepOneOpensUrl(fullText, checkpointText);
    if (check.ok) return { changed: false, text: fullText, issueType: null, stepText: null };

    const loc = locateStepsSection(fullText);
    if (!loc) return { changed: false, text: fullText, issueType: null, stepText: null };

    const stepText = check.requirement.expectedText;
    const lines = loc.content.split("\n");
    const firstStepLineIndex = lines.findIndex((l) => /^\s*[a-zA-Z0-9]*\s*\./.test(l));

    let newContent;
    if (firstStepLineIndex === -1) {
      // No numbered step lines exist at all yet — insert a brand new Step 1,
      // preserving any leading blank line right after the "Steps to
      // reproduce:" header.
      const leadingMatch = loc.content.match(/^\n+/);
      const leading = leadingMatch ? leadingMatch[0] : "";
      const rest = loc.content.slice(leading.length);
      newContent = `${leading}1. ${stepText}\n${rest}`;
    } else {
      // A Step 1 already exists but has the wrong wording — replace its text
      // in place (keeping whatever marker/indentation it already had; the
      // numbering pass afterward renumbers everything anyway) rather than
      // inserting a new line ahead of it, which would leave the old wrong
      // line behind as Step 2 and compound with every click.
      const line = lines[firstStepLineIndex];
      const markerMatch = line.match(/^(\s*)([a-zA-Z0-9]*)(\s*\.\s*)/);
      const leadingWs = markerMatch ? markerMatch[1] : "";
      const marker = markerMatch ? markerMatch[2] || "1" : "1";
      const sep = markerMatch ? markerMatch[3] : ". ";
      lines[firstStepLineIndex] = `${leadingWs}${marker}${sep}${stepText}`;
      newContent = lines.join("\n");
    }

    return {
      changed: true,
      text: fullText.slice(0, loc.sectionStart) + newContent + fullText.slice(loc.sectionEnd),
      issueType: check.requirement.category,
      stepText,
    };
  }

  // Resource Link is optional — only flagged if present under the wrong label.
  function checkResourceLinkLabel(detailsText) {
    const match = String(detailsText || "").match(/^\s*(resource link|reference link|references)\s*:/im);
    if (!match) return { ok: true, detail: "" };
    if (match[1].toLowerCase() === "references") {
      return {
        ok: false,
        detail: 'Found a "References:" section \u2014 label should be "Resource Link:" instead.',
        suggestedText: "Resource Link:",
        fix: { target: "details", apply: (text) => text.replace(/references\s*:/i, "Resource Link:") },
      };
    }
    return { ok: true, detail: "" };
  }

  // Accepts either dot- or underscore-separated numbers after "WCAG" (e.g.
  // "WCAG_1.4.3-..." or "WCAG_1_4_3-...") and always normalizes the captured
  // number to dot-separated, so a difference in separator style alone can't
  // cause a false mismatch (or a false match) against extractWcagScField's
  // always-dotted output. Also captures the "-Name_Suffix" part (if any) so a
  // corrected label can be suggested without losing the existing name.
  function extractWcagLabel(detailsText) {
    const m = String(detailsText || "").match(/WCAG[_-]?(\d+)[._](\d+)[._](\d+)([-_][A-Za-z0-9_]*)?/i);
    if (!m) return null;
    return { raw: m[0], number: `${m[1]}.${m[2]}.${m[3]}`, suffix: m[4] || "" };
  }

  function extractSeverityLabelToken(detailsText) {
    const m = String(detailsText || "").match(/severity[123]_accessibility/i);
    return m ? m[0] : null;
  }

  // Reads the value on the line right after "Applicable WCAG Success
  // Criterion:" (same next-line convention as Screen Name — see
  // extractScreenNameFromDetails) and pulls the leading X.X.X number out of it.
  // Reads the FULL text value on the line right after "Applicable WCAG
  // Success Criterion:" (not just the leading number) — used for exact
  // matching against Excel, since the Excel data must be matched exactly,
  // not just have a matching SC number.
  function extractWcagScFieldRaw(detailsText) {
    const lines = String(detailsText || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (/^applicable wcag success criterion:$/i.test(lines[i].trim())) {
        for (let j = i + 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (line) return line;
        }
        return null;
      }
    }
    return null;
  }

  // Collapses internal whitespace and lowercases, so exact-match comparisons
  // aren't tripped up by incidental spacing differences while still catching
  // any real difference in wording/content.
  function normalizeForExactMatch(text) {
    return String(text || "")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // Replaces the value on the line right after "Applicable WCAG Success
  // Criterion:" with newValue (inserting a value line if the header exists
  // but has none yet). Re-locates the header fresh each call, so this is
  // safe to apply even after other fixes have modified the text.
  function replaceWcagScFieldValue(detailsText, newValue) {
    const lines = String(detailsText || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (/^applicable wcag success criterion:$/i.test(lines[i].trim())) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            lines[j] = newValue;
            return lines.join("\n");
          }
        }
        lines.splice(i + 1, 0, newValue);
        return lines.join("\n");
      }
    }
    return detailsText;
  }

  // Looks up the WCAG-JIRA reference row for the live Checkpoint. Shared by
  // both checks below so "Applicable WCAG Success Criterion:" and "Labels:
  // WCAG_..." are each validated against the same single source of truth
  // (the Excel reference sheet) rather than against each other.
  async function lookupWcagReferenceRow(checkpointText) {
    const byType = await loadReferenceData();
    if (!byType) {
      return { row: null, error: `Reference data unavailable \u2014 ${referenceLoadError || "unknown reason"}.` };
    }
    const row = lookupByScCode(byType, "WCAG-JIRA", checkpointText);
    if (!row) {
      return { row: null, error: `No WCAG-JIRA reference row found for Checkpoint "${checkpointText || "(empty)"}".` };
    }
    return { row, error: null };
  }

  // Adobe-only: "Applicable WCAG Success Criterion:" must match the Excel
  // reference sheet's row for the live Checkpoint EXACTLY (the row's Key
  // column, full text) — not just have a matching leading SC number. E.g.
  // "1.4.3 Contrast" does not pass just because "1.4.3" matches; it must
  // read the full "1.4.3 Contrast (Minimum) (Level AA)" from Excel.
  async function checkApplicableWcagScField(detailsText, checkpointText) {
    const scFieldRaw = extractWcagScFieldRaw(detailsText);
    if (!scFieldRaw) {
      return { ok: false, detail: 'Couldn\'t read a value from "Applicable WCAG Success Criterion:".' };
    }

    const { row, error } = await lookupWcagReferenceRow(checkpointText);
    if (!row) return { ok: false, detail: `${error} Can't verify "Applicable WCAG Success Criterion:" against Excel.` };

    const expected = String(row.key || "").trim();
    if (!expected) {
      return { ok: false, detail: "Excel reference row has no value in the Key column." };
    }

    if (normalizeForExactMatch(scFieldRaw) !== normalizeForExactMatch(expected)) {
      return {
        ok: false,
        detail: `"${scFieldRaw}" doesn't exactly match Excel (per Checkpoint): "${expected}".`,
        suggestedText: expected,
        fix: { target: "details", apply: (text) => replaceWcagScFieldValue(text, expected) },
      };
    }
    return { ok: true, detail: "" };
  }

  // Adobe-only: the "WCAG_..." label inside Labels: must match the Excel
  // reference sheet's row for the live Checkpoint EXACTLY (the row's Label
  // column, full text) — not just have a matching SC number. Also checks
  // SeverityN_Accessibility capitalization, if that label is present.
  async function checkLabelsWcagTag(detailsText, checkpointText) {
    const wcagLabel = extractWcagLabel(detailsText);
    if (!wcagLabel) {
      return { ok: false, detail: "No WCAG_... label found in the Labels section." };
    }

    const { row, error } = await lookupWcagReferenceRow(checkpointText);
    if (!row) return { ok: false, detail: `${error} Can't verify "Labels: WCAG_" against Excel.` };

    const expectedLabel = String(row.label || "").trim();
    if (!expectedLabel) {
      return { ok: false, detail: "Excel reference row has no value in the Label column." };
    }

    if (normalizeForExactMatch(wcagLabel.raw) !== normalizeForExactMatch(expectedLabel)) {
      return {
        ok: false,
        detail: `"${wcagLabel.raw}" doesn't exactly match Excel (per Checkpoint): "${expectedLabel}".`,
        suggestedText: expectedLabel,
        fix: {
          target: "details",
          apply: (text) => text.replace(/WCAG[_-]?\d+[._]\d+[._]\d+([-_][A-Za-z0-9_]*)?/i, expectedLabel),
        },
      };
    }

    const severityToken = extractSeverityLabelToken(detailsText);
    if (severityToken && !/^Severity[123]_Accessibility$/.test(severityToken)) {
      const corrected = `Severity${severityToken.match(/[123]/)[0]}_Accessibility`;
      return {
        ok: false,
        detail: `Severity label "${severityToken}" should be capitalized like "Severity1_Accessibility".`,
        suggestedText: corrected,
        fix: { target: "details", apply: (text) => text.replace(/severity[123]_accessibility/i, corrected) },
      };
    }
    return { ok: true, detail: "" };
  }

  // Given a live Impact value, returns the Severity number it requires
  // (Critical -> 1, Serious/Moderate -> 2, Minor -> 3), or null if the Impact
  // text doesn't match a known value.
  function expectedSeverityNumberForImpact(impactText) {
    const norm = String(impactText || "").trim().toLowerCase();
    if (norm === "critical") return 1;
    if (norm === "serious" || norm === "moderate") return 2;
    if (norm === "minor") return 3;
    return null;
  }

  // SeverityN_Accessibility is mandatory for every issue. Impact (read live
  // off the page) is the source of truth: this derives the Severity label the
  // issue *should* have from Impact, then checks that against what's actually
  // in Labels — flag if they disagree, rather than starting from the Severity
  // label and treating Impact as secondary.
  function checkSeverityImpactConsistency(detailsText, impactText) {
    const token = extractSeverityLabelToken(detailsText);
    const actualSeverityNum = token ? Number(token.match(/[123]/)[0]) : null;

    if (!actualSeverityNum) {
      // No fix offered — where to insert a brand-new Labels line is
      // ambiguous, unlike correcting one that's already present.
      return { ok: false, detail: "SeverityN_Accessibility label is missing from Labels \u2014 required for every issue." };
    }

    const impactNorm = String(impactText || "").trim();
    if (!impactNorm) {
      return {
        ok: false,
        detail: `Couldn't read the live Impact field to determine the required Severity label (Details currently has Severity${actualSeverityNum}_Accessibility).`,
      };
    }

    const expectedSeverityNum = expectedSeverityNumberForImpact(impactNorm);
    if (!expectedSeverityNum) {
      return {
        ok: false,
        detail: `Impact "${impactText}" doesn't match a known severity mapping (Critical/Serious/Moderate/Minor).`,
      };
    }

    if (expectedSeverityNum !== actualSeverityNum) {
      const corrected = `Severity${expectedSeverityNum}_Accessibility`;
      return {
        ok: false,
        detail: `Impact "${impactText}" requires Severity${expectedSeverityNum}_Accessibility, but Details has Severity${actualSeverityNum}_Accessibility.`,
        suggestedText: corrected,
        fix: { target: "details", apply: (text) => text.replace(/severity[123]_accessibility/i, corrected) },
      };
    }
    return { ok: true, detail: "" };
  }

  // Rebuilds a corrected Summary using the current title text (unwrapped if
  // it was already wrapped) plus the Screen Name/Elements pulled fresh from
  // Details — same logic the Summary Update tab's regenerate() uses, exposed
  // here so the Sanity "Correct" action can apply the identical fix.
  function buildCorrectedSummary(currentSummaryText, detailsText, project, customPrefix) {
    const screenName = extractScreenNameFromDetails(detailsText);
    const elements = extractElementsFromText(detailsText);
    const expectedElementsSummary = formatElementsSummary(elements);
    const modifiedTitle = unwrapIfAlreadyWrapped(currentSummaryText, customPrefix, project);
    const prefix = buildTitlePrefix(project, modifiedTitle, screenName, customPrefix);
    return `${prefix} (${expectedElementsSummary})`;
  }

  // Runs every applicable check and returns an ordered list of
  // { name, ok, detail, suggestedText?, fix? }, in the same top-to-bottom
  // order the corresponding fields appear in the issue (Summary/Screenshot
  // first, then Environment, then Steps to reproduce, then Remediation/Labels
  // near the bottom) so a failure is easy to locate. Each name is prefixed
  // with the field label it corresponds to. Where a single correct value can
  // be determined, `fix` describes how to apply it (target: "summary" or
  // "details", apply: (text) => correctedText) and `suggestedText` is the
  // human-readable value to show for copy/paste. project is "adobe" or
  // "yahoo" — the WCAG/Labels/Severity checks are Adobe-only, since Yahoo
  // issues have no Labels: section at all.
  async function runSanityChecks({
    project,
    summaryText,
    detailsText,
    screenshotFound,
    hasScreenshot,
    severityText,
    checkpointText,
    customPrefix,
  }) {
    const results = [];

    let summaryOk;
    let summaryDetail;
    if (customPrefix) {
      const wrappedCustom = parseWrappedSummaryCustom(summaryText, customPrefix, project);
      summaryOk = !!wrappedCustom && wrappedCustom.hasPrefix;
      const basePrefixDisplay = project === "yahoo" ? "" : "[Accessibility]";
      summaryDetail = summaryOk
        ? ""
        : `Summary doesn't match the custom prefix format: expected "${basePrefixDisplay}[${customPrefix}] - Issue Description - Page name (issue elements)".`;
    } else {
      const wrapped = parseWrappedSummary(summaryText);
      summaryOk = !!wrapped && wrappedFormatMatchesProject(wrapped, project);
      const projectLabel = project === "yahoo" ? "Yahoo" : "Adobe";
      const expectedStructure =
        project === "yahoo"
          ? "Issue Description - Page Name (issue elements)"
          : "[Accessibility] - Issue Description - Page name (issue elements)";
      summaryDetail = summaryOk ? "" : `Summary doesn't match ${projectLabel} format: expected "${expectedStructure}".`;
    }
    results.push({
      name: "Summary: Format",
      ok: summaryOk,
      detail: summaryDetail,
      suggestedText: summaryOk ? undefined : buildCorrectedSummary(summaryText, detailsText, project, customPrefix),
      fix: summaryOk
        ? undefined
        : {
            target: "summary",
            apply: (text, det) => buildCorrectedSummary(text, det || detailsText, project, customPrefix),
          },
    });

    results.push({
      name: "Attachments: Screenshot",
      ok: !!hasScreenshot,
      detail: hasScreenshot
        ? ""
        : screenshotFound
        ? "The screenshot upload area was found but appears empty."
        : "Couldn't find the Attachments section (#issue-more-info > fieldset > div:nth-child(6)) on the page.",
    });

    const authCheck = checkAuthenticationState(detailsText);
    results.push({
      name: "Authentication State: Logged In/Out",
      ok: authCheck.ok,
      detail: authCheck.detail,
      suggestedText: authCheck.suggestedText,
    });

    const stepOneUrlCheck = checkStepOneOpensUrl(detailsText, checkpointText);
    let stepOneFix;
    let stepOneSuggestion;
    if (!stepOneUrlCheck.ok) {
      const insertion = autoInsertStepOneIfMissing(detailsText, checkpointText);
      if (insertion.changed) {
        stepOneSuggestion = `1. ${insertion.stepText}`;
        stepOneFix = {
          target: "details",
          apply: (text) => fixStepsNumberingInDetails(autoInsertStepOneIfMissing(text, checkpointText).text, 1),
        };
      }
    }
    results.push({
      name: "Steps to reproduce: Step 1 Opens the URL",
      ok: stepOneUrlCheck.ok,
      detail: stepOneUrlCheck.detail,
      suggestedText: stepOneSuggestion,
      fix: stepOneFix,
    });

    const stepsCheck = checkStepsIssueTypeConsistency(detailsText);
    results.push({
      name: "Steps to reproduce: Step 1 vs Issue Type",
      ok: stepsCheck.ok,
      detail: stepsCheck.detail,
    });

    const resourceLinkCheck = checkResourceLinkLabel(detailsText);
    results.push({
      name: "Resource Link: Label",
      ok: resourceLinkCheck.ok,
      detail: resourceLinkCheck.detail,
      suggestedText: resourceLinkCheck.suggestedText,
      fix: resourceLinkCheck.fix,
    });

    if (project !== "yahoo") {
      const wcagScCheck = await checkApplicableWcagScField(detailsText, checkpointText);
      results.push({
        name: "Applicable WCAG Success Criterion:",
        ok: wcagScCheck.ok,
        detail: wcagScCheck.detail,
        suggestedText: wcagScCheck.suggestedText,
        fix: wcagScCheck.fix,
      });

      const labelsWcagCheck = await checkLabelsWcagTag(detailsText, checkpointText);
      results.push({
        name: "Labels: WCAG_",
        ok: labelsWcagCheck.ok,
        detail: labelsWcagCheck.detail,
        suggestedText: labelsWcagCheck.suggestedText,
        fix: labelsWcagCheck.fix,
      });

      const severityCheck = checkSeverityImpactConsistency(detailsText, severityText);
      results.push({
        name: "Labels: Severity vs Impact",
        ok: severityCheck.ok,
        detail: severityCheck.detail,
        suggestedText: severityCheck.suggestedText,
        fix: severityCheck.fix,
      });
    }

    return results;
  }

  // Renders the tick/cross list + failed-only summary as compact rows (same
  // visual language as the existing "Status & Checks" panel — small text
  // lines, red for failures) instead of one large monospace block, so it
  // stays tidy without changing the popup's fixed size. Failed items that
  // have a deterministic `fix` get a checkbox; checking one or more and
  // clicking "Correct" applies just those fixes and re-writes the page.
  function renderSanityResults(container, results, actions) {
    container.innerHTML = "";

    results.forEach((r) => {
      const line = document.createElement("div");
      line.className = "count-badge" + (r.ok ? "" : " status-error");
      line.textContent = `${r.ok ? "\u2714" : "\u2716"} ${r.name}`;
      container.appendChild(line);
    });

    const failed = results.filter((r) => !r.ok);
    const summaryLine = document.createElement("div");
    summaryLine.className = "count-badge" + (failed.length ? " status-error" : "");
    summaryLine.style.fontWeight = "700";
    summaryLine.style.marginTop = "4px";
    summaryLine.textContent = failed.length ? `Failed (${failed.length}):` : "All sanity checks passed.";
    container.appendChild(summaryLine);

    const checkboxEntries = [];
    let selectAllCheckbox = null;

    if (failed.some((r) => r.fix)) {
      const selectAllRow = document.createElement("div");
      selectAllRow.style.display = "flex";
      selectAllRow.style.alignItems = "center";
      selectAllRow.style.gap = "6px";
      selectAllRow.style.margin = "4px 0 2px";

      selectAllCheckbox = document.createElement("input");
      selectAllCheckbox.type = "checkbox";
      selectAllCheckbox.checked = true;
      selectAllRow.appendChild(selectAllCheckbox);

      const selectAllLabel = document.createElement("span");
      selectAllLabel.className = "count-badge";
      selectAllLabel.style.margin = "0";
      selectAllLabel.style.fontWeight = "600";
      selectAllLabel.textContent = "Select all";
      selectAllRow.appendChild(selectAllLabel);

      container.appendChild(selectAllRow);

      selectAllCheckbox.addEventListener("change", () => {
        checkboxEntries.forEach((c) => {
          c.checkbox.checked = selectAllCheckbox.checked;
        });
      });
    }

    failed.forEach((r) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "flex-start";
      row.style.gap = "6px";
      row.style.margin = "2px 0";

      if (r.fix) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.style.marginTop = "3px";
        checkbox.style.flexShrink = "0";
        checkbox.addEventListener("change", () => {
          if (!checkbox.checked && selectAllCheckbox) selectAllCheckbox.checked = false;
          else if (selectAllCheckbox && checkboxEntries.every((c) => c.checkbox.checked)) {
            selectAllCheckbox.checked = true;
          }
        });
        checkboxEntries.push({ checkbox, result: r });
        row.appendChild(checkbox);
      } else {
        const spacer = document.createElement("span");
        spacer.style.width = "16px";
        spacer.style.flexShrink = "0";
        row.appendChild(spacer);
      }

      const textCol = document.createElement("div");
      textCol.style.flex = "1";

      const detailLine = document.createElement("div");
      detailLine.className = "count-badge status-error";
      detailLine.style.margin = "0";
      const failureLabel = document.createElement("strong");
      failureLabel.textContent = "Failure: ";
      detailLine.appendChild(failureLabel);
      detailLine.appendChild(document.createTextNode(`${r.name}: `));
      renderTextWithHighlightedQuotes(detailLine, r.detail || "See check above.", true);
      textCol.appendChild(detailLine);

      if (r.suggestedText) {
        const suggestLine = document.createElement("div");
        suggestLine.className = "count-badge status-error";
        suggestLine.style.margin = "0";
        const fixLabel = document.createElement("strong");
        fixLabel.textContent = "Fix: ";
        suggestLine.appendChild(fixLabel);
        const truncatedSuggestion = truncateWholeValue(r.suggestedText);
        suggestLine.appendChild(document.createTextNode(truncatedSuggestion.text));
        textCol.appendChild(suggestLine);
      }

      row.appendChild(textCol);
      container.appendChild(row);
    });

    if (checkboxEntries.length && actions && actions.onCorrect) {
      const correctBtn = document.createElement("button");
      correctBtn.className = "action-btn";
      correctBtn.type = "button";
      correctBtn.textContent = "Correct";
      correctBtn.style.marginTop = "8px";
      container.appendChild(correctBtn);

      correctBtn.addEventListener("click", async () => {
        const selected = checkboxEntries.filter((c) => c.checkbox.checked).map((c) => c.result);
        if (!selected.length) return;
        correctBtn.disabled = true;
        correctBtn.textContent = "Correcting\u2026";
        try {
          await actions.onCorrect(selected);
          // On success, actions.onCorrect re-runs Sanity, which rebuilds this
          // whole container — no further cleanup needed here.
        } catch (err) {
          correctBtn.disabled = false;
          correctBtn.textContent = "Correct";
          const errLine = document.createElement("div");
          errLine.className = "count-badge status-error";
          errLine.textContent = "Correction error: " + err.message;
          container.appendChild(errLine);
        }
      });
    }
  }

  // Builds the read-only container used to display Sanity results — a plain
  // div (rows are appended by renderSanityResults), no fixed min-height so it
  // only takes up as much space as the current results need.
  function buildSanityOutputBlock() {
    const box = document.createElement("div");
    box.textContent = "";
    return box;
  }

  // Runs the live-page read + all Sanity checks immediately (no artificial
  // delay) against whatever's currently in summaryEl.value/detailsEl.value,
  // and renders the result into outputEl with Correct-button wiring. summaryEl
  // and detailsEl just need a `.value` property — either a real form element
  // (kept in sync with the page) or a plain `{ value }` holder. customPrefix,
  // if provided, means Summary Format is checked against ONLY that custom
  // pattern instead of the normal Adobe/Yahoo convention.
  async function runSanityCheckNow({ project, summaryEl, detailsEl, outputEl, customPrefix }) {
    try {
      const tab = await getTargetTab();
      if (!tab || !tab.id) throw new Error("No active browser tab found.");
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: sanityPageExtractor,
      });
      const liveData = results && results[0] ? results[0].result : {};
      const checks = await runSanityChecks({
        project,
        summaryText: summaryEl.value,
        detailsText: detailsEl.value,
        screenshotFound: liveData.screenshotFound,
        hasScreenshot: liveData.hasScreenshot,
        severityText: liveData.severity,
        checkpointText: liveData.checkpoint,
        customPrefix,
      });
      renderSanityResults(outputEl, checks, {
        onCorrect: (selected) => applySanityCorrections({ project, summaryEl, detailsEl, outputEl, selected, customPrefix }),
      });
    } catch (err) {
      outputEl.innerHTML = "";
      const errLine = document.createElement("div");
      errLine.className = "count-badge status-error";
      errLine.textContent = "Sanity check error: " + err.message;
      outputEl.appendChild(errLine);
    }
  }

  // Applies the fixes for just the checked failed items, writes the
  // corrected Summary/Details back to the live page, syncs summaryEl/detailsEl
  // to match, then immediately re-runs Sanity so the panel reflects the fix.
  async function applySanityCorrections({ project, summaryEl, detailsEl, outputEl, selected, customPrefix }) {
    let summaryText = summaryEl.value;
    let detailsText = detailsEl.value;

    selected.forEach((r) => {
      if (!r.fix) return;
      if (r.fix.target === "summary") {
        summaryText = r.fix.apply(summaryText, detailsText);
      } else {
        detailsText = r.fix.apply(detailsText, summaryText);
      }
    });

    const tab = await getTargetTab();
    if (!tab || !tab.id) throw new Error("No active browser tab found.");
    const writeResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageWriter,
      args: [summaryText, detailsText],
    });
    const writeResult = writeResults && writeResults[0] ? writeResults[0].result : null;
    if (!writeResult) throw new Error("Could not write corrections to the page.");

    summaryEl.value = summaryText;
    detailsEl.value = detailsText;

    await runSanityCheckNow({ project, summaryEl, detailsEl, outputEl, customPrefix });
  }

  // Kicks off the first Sanity run 1 second after a write (giving the page a
  // moment to settle), against whatever's currently in summaryEl.value/
  // detailsEl.value.
  function scheduleSanityCheck({ project, summaryEl, detailsEl, outputEl, customPrefix }) {
    outputEl.innerHTML = "";
    const waitingLine = document.createElement("div");
    waitingLine.className = "count-badge";
    waitingLine.textContent = "Performing sanity for this issue\u2026 (waiting for the page to update)";
    outputEl.appendChild(waitingLine);
    setTimeout(() => {
      runSanityCheckNow({ project, summaryEl, detailsEl, outputEl, customPrefix });
    }, 1000);
  }

  // Adobe: "[Accessibility] - <Modified title> - <Screen Name>"
  // Yahoo:  "<Modified title> - <Screen Name>" (no "[Accessibility] - " prefix)
  // Adobe's base prefix is always "[Accessibility]"; Yahoo has none. A custom
  // prefix is appended in its own brackets right after the base (no space) —
  // e.g. Adobe + "Win" -> "[Accessibility][Win] - Title - Screen (Elements)",
  // Yahoo + "Win" -> "[Win] - Title - Screen (Elements)" (no base to combine with).
  function buildTitlePrefix(project, modifiedTitle, screenName, customPrefix) {
    const basePrefix = project === "yahoo" ? "" : "[Accessibility]";
    if (customPrefix) {
      const combined = `${basePrefix}[${customPrefix}]`;
      return `${combined} - ${modifiedTitle} - ${screenName}`;
    }
    return basePrefix ? `${basePrefix} - ${modifiedTitle} - ${screenName}` : `${modifiedTitle} - ${screenName}`;
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
    const activeCustomPrefix = templateCustomPrefixManager ? templateCustomPrefixManager.getActivePrefix() : null;
    const prefix = buildTitlePrefix(
      templateState.project,
      updatedTitleInput.dataset.modifiedTitle,
      updatedTitleInput.dataset.screenName || "",
      activeCustomPrefix
    );
    const elements = extractElementsFromText(output ? output.value : "");
    updatedTitleInput.value = `${prefix} (${formatElementsSummary(elements)})`;
  }

  // Which project's report format to generate. "adobe" is the only one
  // implemented so far — buildTemplateText() branches on this once the
  // Yahoo format specifics are provided.
  const templateState = { project: "adobe" };

  // Set each time the Automation Template tab renders (see buildGetDataPanel).
  // Referenced by refreshUpdatedTitle/buildProjectRadios' onChange, which are
  // top-level functions rather than nested inside that tab's closure.
  let templateCustomPrefixManager = null;

  function customPrefixStorageKey(tabKey, project) {
    return `customPrefix:${tabKey}:${project}`;
  }

  // Builds a self-contained "Custom prefix?" control: a checkbox that reveals
  // a text field + Lock button when checked. State (enabled/locked/prefix
  // value) persists per tab+project via chrome.storage, the same pattern as
  // the Yahoo Platform lock and Native Context lock. getProject() is called
  // fresh each time so the manager can be reloaded when the project radio
  // changes (each project has its own independent custom prefix).
  function buildCustomPrefixManager(tabKey, getProject, onChange) {
    let state = { enabled: false, locked: false, prefix: "" };

    const row = document.createElement("div");
    row.className = "inline-row";

    const labelCol = document.createElement("span");
    labelCol.className = "aligned-label-col";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const label = document.createElement("span");
    label.textContent = "Custom prefix?";

    labelCol.appendChild(checkbox);
    labelCol.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "[MyPrefix]";
    // Same sizing pattern as the Yahoo Platform field, but at roughly half
    // its width — a short prefix like "[Win]" doesn't need much room, and
    // keeping it compact leaves space for the label + Lock button on the
    // same line rather than pushing them to a second row.
    input.style.flex = "1";
    input.style.minWidth = "80px";
    input.style.maxWidth = "110px";
    input.style.display = "none";

    const lockBtn = document.createElement("button");
    lockBtn.className = "copy-btn";
    lockBtn.type = "button";
    lockBtn.style.display = "none";

    row.appendChild(labelCol);
    row.appendChild(input);
    row.appendChild(lockBtn);

    function storageKey() {
      return customPrefixStorageKey(tabKey, getProject());
    }

    function applyStateToUi() {
      checkbox.checked = !!state.enabled;
      input.value = state.prefix || "";
      input.disabled = !!state.locked;
      lockBtn.textContent = state.locked ? "\uD83D\uDD12 Locked" : "\uD83D\uDD13 Lock";
      input.style.display = state.enabled ? "" : "none";
      lockBtn.style.display = state.enabled ? "" : "none";
    }

    async function load() {
      const stored = await storageGet(storageKey());
      state = stored || { enabled: false, locked: false, prefix: "" };
      applyStateToUi();
    }

    checkbox.addEventListener("change", async () => {
      state = Object.assign({}, state, { enabled: checkbox.checked });
      await storageSet(storageKey(), state);
      applyStateToUi();
      onChange();
    });

    lockBtn.addEventListener("click", async () => {
      if (state.locked) {
        state = Object.assign({}, state, { locked: false });
      } else {
        state = { enabled: state.enabled, locked: true, prefix: input.value.trim() };
      }
      await storageSet(storageKey(), state);
      applyStateToUi();
      onChange();
    });

    load();

    return {
      row,
      // fieldRow is kept as a no-op empty element for callers that still
      // append it separately — everything now lives in `row` on one line.
      fieldRow: document.createDocumentFragment(),
      reload: load,
      // Returns the active custom prefix string if enabled+locked+non-empty,
      // else null (meaning: use the normal Adobe/Yahoo convention instead).
      getActivePrefix() {
        return state.enabled && state.locked && state.prefix ? state.prefix : null;
      },
    };
  }

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
      radio.addEventListener("change", async () => {
        if (radio.checked) {
          templateState.project = project;
          if (templateCustomPrefixManager) await templateCustomPrefixManager.reload();
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

  // ---------- Error message truncation & highlighting ----------
  //
  // Long quoted snippets (a full Remediation Recommendation paragraph, a
  // long Steps to reproduce line, etc.) used to get dumped into status
  // messages verbatim, making the panel very tall and burying the actual
  // problem in a wall of unrelated text. These helpers trim quoted content
  // down to ~20 characters of context (rounded to the nearest whole word)
  // on each side of the actual error, and wrap the erroring part itself in a
  // red-bordered <span> so it's immediately obvious what to look at.

  const ERROR_HIGHLIGHT_CONTEXT_CHARS = 20;

  // Trims the trailing ~maxChars characters of str, extending the cut
  // point outward to the nearest earlier space so a word isn't split.
  function trimTailToWord(str, maxChars) {
    if (str.length <= maxChars) return { text: str, truncated: false };
    let cut = str.length - maxChars;
    const nextSpace = str.indexOf(" ", cut);
    if (nextSpace !== -1 && nextSpace - cut <= 15) cut = nextSpace + 1;
    return { text: str.slice(cut), truncated: true };
  }

  // Trims the leading ~maxChars characters of str, pulling the cut point
  // back to the nearest later space so a word isn't split.
  function trimHeadToWord(str, maxChars) {
    if (str.length <= maxChars) return { text: str, truncated: false };
    let cut = maxChars;
    const lastSpace = str.lastIndexOf(" ", cut);
    if (lastSpace !== -1 && cut - lastSpace <= 15) cut = lastSpace;
    return { text: str.slice(0, cut), truncated: true };
  }

  // Builds { beforeText, beforeTruncated, errorText, afterText, afterTruncated }
  // for a known error span (errStart..errStart+errLen) inside a larger text —
  // used when the exact location of the problem within a long paragraph is
  // known (e.g. a dangling ":" at a specific position in a Remediation line).
  function buildHighlightSnippetAtIndex(fullText, errStart, errLen, contextChars) {
    const ctx = contextChars || ERROR_HIGHLIGHT_CONTEXT_CHARS;
    const str = String(fullText || "");
    const beforeFull = str.slice(0, errStart);
    const errorText = str.slice(errStart, errStart + errLen);
    const afterFull = str.slice(errStart + errLen);
    const before = trimTailToWord(beforeFull, ctx);
    const after = trimHeadToWord(afterFull, ctx);
    return {
      beforeText: before.text,
      beforeTruncated: before.truncated,
      errorText,
      afterText: after.text,
      afterTruncated: after.truncated,
    };
  }

  // Appends beforeText / a red-bordered errorText span / afterText into
  // container, with "(.....)" wherever context was truncated.
  function appendHighlightSnippet(container, snippet) {
    if (snippet.beforeTruncated) container.appendChild(document.createTextNode("(.....) "));
    if (snippet.beforeText) container.appendChild(document.createTextNode(snippet.beforeText));
    const errSpan = document.createElement("span");
    errSpan.textContent = snippet.errorText;
    errSpan.style.border = "1px solid #b3261e";
    errSpan.style.borderRadius = "3px";
    errSpan.style.padding = "0 3px";
    errSpan.style.margin = "0 1px";
    errSpan.style.fontWeight = "700";
    container.appendChild(errSpan);
    if (snippet.afterText) container.appendChild(document.createTextNode(snippet.afterText));
    if (snippet.afterTruncated) container.appendChild(document.createTextNode(" (.....)"));
  }

  // For a standalone quoted value that IS the error itself (no separate
  // "before/after" context needed — e.g. a mismatched WCAG label or a wrong
  // Step 1 sentence) — trims it to ~2x context chars total, word-rounded,
  // keeping the head and tail with "(.....)" in between if it's long.
  function truncateWholeValue(text, maxTotal) {
    const max = maxTotal || ERROR_HIGHLIGHT_CONTEXT_CHARS * 2 + 4;
    const str = String(text || "");
    if (str.length <= max) return { text: str, truncated: false };
    const headLen = Math.floor(max / 2);
    const tailLen = max - headLen;
    const head = trimHeadToWord(str, headLen).text;
    const tail = trimTailToWord(str, tailLen).text;
    return { text: `${head} (.....) ${tail}`, truncated: true };
  }

  // Scans text for "quoted" spans and appends it into container as a mix of
  // plain text nodes and (for error messages) red-bordered, truncated spans
  // for each quoted value — so any status message that embeds a quoted
  // snippet automatically gets it trimmed and highlighted, with no changes
  // needed at each call site. For non-error (pass/info) messages, quoted
  // values are still truncated for length but not boxed in red.
  function renderTextWithHighlightedQuotes(container, text, isError) {
    const str = String(text || "");
    const regex = /"([^"]*)"/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
      container.appendChild(document.createTextNode(str.slice(lastIndex, match.index) + '"'));
      const truncated = truncateWholeValue(match[1], ERROR_HIGHLIGHT_CONTEXT_CHARS * 2 + 4);
      if (isError) {
        const span = document.createElement("span");
        span.textContent = truncated.text;
        span.style.border = "1px solid #b3261e";
        span.style.borderRadius = "3px";
        span.style.padding = "0 3px";
        span.style.fontWeight = "700";
        container.appendChild(span);
      } else {
        container.appendChild(document.createTextNode(truncated.text));
      }
      container.appendChild(document.createTextNode('"'));
      lastIndex = match.index + match[0].length;
    }
    container.appendChild(document.createTextNode(str.slice(lastIndex)));
  }

  function setStatus(el, text, isError) {
    el.classList.toggle("status-error", !!isError);
    el.innerHTML = "";
    if (!text) return;
    renderTextWithHighlightedQuotes(el, text, isError);
  }

  // Numbered, concise two-line failure format for the "Status & Checks"
  // panel — "N. Failure: <label> <what's wrong>" then "Fix: <what will
  // happen>", matching the same pattern used in the Sanity panel. Quoted
  // values inside failureText are auto-truncated/highlighted, same as setStatus.
  // The number itself is left blank here — renumberStatusChecks() fills it in
  // afterward based on which checks are actually visible, so hidden checks
  // (e.g. the Platform check on Adobe) don't leave gaps like "1, 3, 4...".
  function setStatusFailureFix(el, label, failureText, fixText) {
    el.classList.add("status-error");
    el.innerHTML = "";
    const failureLine = document.createElement("div");
    const numberSpan = document.createElement("strong");
    numberSpan.className = "status-check-number";
    failureLine.appendChild(numberSpan);
    const strong = document.createElement("strong");
    strong.textContent = "Failure: ";
    failureLine.appendChild(strong);
    failureLine.appendChild(document.createTextNode(`${label} `));
    renderTextWithHighlightedQuotes(failureLine, failureText, true);
    el.appendChild(failureLine);

    if (fixText) {
      const fixLine = document.createElement("div");
      const fixStrong = document.createElement("strong");
      fixStrong.textContent = "Fix: ";
      fixLine.appendChild(fixStrong);
      fixLine.appendChild(document.createTextNode(fixText));
      el.appendChild(fixLine);
    }
  }

  // Pass/OK line for the Status & Checks panel — number filled in later by
  // renumberStatusChecks(), same as setStatusFailureFix.
  function setStatusOk(el, text) {
    el.classList.remove("status-error");
    el.innerHTML = "";
    const numberSpan = document.createElement("strong");
    numberSpan.className = "status-check-number";
    el.appendChild(numberSpan);
    el.appendChild(document.createTextNode(text));
  }

  // Clears a Status & Checks line entirely (used when a check doesn't apply
  // yet, e.g. before Get Data has run) — stays empty so CSS :empty hides it.
  function setStatusEmpty(el) {
    el.classList.remove("status-error");
    el.innerHTML = "";
  }

  // Assigns sequential numbers to the "Status & Checks" panel based on which
  // checks are ACTUALLY visible right now, in the given fixed order — a check
  // that's empty/hidden (e.g. Platform on Adobe, where there's nothing to
  // compare yet) is skipped entirely rather than leaving a gap in the
  // numbering (previously a hardcoded "2." would just vanish, producing
  // "1, 3, 4, 5, 6"). Call this after all the checks for a given order/tab
  // have run and populated their elements.
  function renumberStatusChecks(elementsInOrder) {
    let n = 0;
    elementsInOrder.forEach((el) => {
      if (!el || !el.textContent || el.style.display === "none") return;
      const marker = el.querySelector(".status-check-number");
      if (!marker) return;
      n += 1;
      marker.textContent = `${n}. `;
    });
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

  // Parses the "Context:" section out of an already-written Details block.
  // Returns null if no "Context:" header is found at all. sectionStart/
  // sectionEnd are character offsets into the original text (from the start
  // of "Context:" up to but not including the next header), so the caller
  // can splice a replacement back in without disturbing anything else.
  function parseContextFromDetails(text) {
    const str = String(text || "");
    const startMatch = str.match(/context:/i);
    if (!startMatch) return null;

    const sectionStart = startMatch.index;
    const afterHeader = str.slice(sectionStart + startMatch[0].length);
    const endMatch = afterHeader.match(/\n\s*(steps to reproduce|expected results|actual results):/i);
    const contentEnd = endMatch ? endMatch.index : afterHeader.length;
    const sectionEnd = sectionStart + startMatch[0].length + contentEnd;

    const lines = afterHeader
      .slice(0, contentEnd)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length);

    let platform = null;
    let os = "";
    let browser = "";
    let tool = "";
    let assistiveTechnology = null;
    let hasPlatformLabel = false;
    let hasTestMethodLabel = false;

    lines.forEach((line) => {
      if (/^platform:/i.test(line)) {
        platform = line.replace(/^platform:\s*/i, "").trim();
        hasPlatformLabel = true;
      } else if (/^operating system:/i.test(line)) {
        os = line.replace(/^operating system:\s*/i, "").trim();
      } else if (/^browser:/i.test(line)) {
        browser = line.replace(/^browser:\s*/i, "").trim();
      } else if (/^assistive technology:/i.test(line)) {
        // e.g. "Assistive Technology: NVDA (Version: 2025.3.1)" — captured
        // separately so it survives reformatting instead of being treated as
        // an unlabeled line and overwritten by the real Test Method line.
        assistiveTechnology = line.replace(/^assistive technology:\s*/i, "").trim();
      } else if (/^test method:/i.test(line)) {
        tool = line.replace(/^test method:\s*/i, "").trim();
        hasTestMethodLabel = true;
      } else {
        // Unlabeled line = the old-style bare tool description
        // (e.g. "Chrome on Windows using axe DevTools Chrome browser extension").
        tool = line;
      }
    });

    return {
      sectionStart,
      sectionEnd,
      platform,
      os,
      browser,
      tool,
      assistiveTechnology,
      hasPlatformLabel,
      hasTestMethodLabel,
      // Already has both labels -> someone (or this tool) already reformatted
      // it for Yahoo; don't touch it again.
      alreadyFormatted: hasPlatformLabel && hasTestMethodLabel,
    };
  }

  // Builds just the Yahoo-format Context block text (no surrounding blank
  // lines — spliceContextIntoDetails handles spacing when merging it back in).
  // Assistive Technology (if present) sits between Browser and Test Method —
  // Platform gets added at the top, so Test Method stays the last line either way.
  function buildYahooContextBlock(parsed, platformValue) {
    const lines = ["Context:", `Platform: ${platformValue || ""}`, `Operating System: ${parsed.os || ""}`, `Browser: ${parsed.browser || ""}`];
    if (parsed.assistiveTechnology) {
      lines.push(`Assistive Technology: ${parsed.assistiveTechnology}`);
    }
    lines.push(`Test Method: ${parsed.tool || ""}`);
    return lines.join("\n");
  }

  // Builds the Adobe-format Context block: no "Platform:" line at all, and
  // the tool description is bare (no "Test Method:" label prefix).
  function buildAdobeContextBlock(parsed) {
    return ["Context:", `Operating System: ${parsed.os || ""}`, `Browser: ${parsed.browser || ""}`, `${parsed.tool || ""}`].join(
      "\n"
    );
  }

  // Adobe issues should never have a "Platform:" line or a "Test Method:"
  // label in Context — those are Yahoo-only additions. If either is present
  // (e.g. left over from switching the Project toggle, or from a Yahoo-style
  // paste), strip them back to Adobe's bare format. No-op if neither is present.
  function stripYahooContextArtifactsForAdobe(detailsText) {
    const parsed = parseContextFromDetails(detailsText);
    if (!parsed) return detailsText;
    if (!parsed.hasPlatformLabel && !parsed.hasTestMethodLabel) return detailsText;
    return spliceContextIntoDetails(detailsText, parsed, buildAdobeContextBlock(parsed));
  }

  // Replaces the original Context section (using the offsets from
  // parseContextFromDetails) with newContextBlock, normalizing to exactly
  // one blank line before and after.
  function spliceContextIntoDetails(fullText, parsed, newContextBlock) {
    const before = fullText.slice(0, parsed.sectionStart).replace(/\s+$/, "");
    const after = fullText.slice(parsed.sectionEnd).replace(/^\s+/, "");
    return `${before}\n\n${newContextBlock}\n\n${after}`;
  }

  function renderSummaryUpdateMode() {
    const isExtension = typeof chrome !== "undefined" && chrome.scripting && chrome.tabs;
    let lastExtracted = null; // { summary, pageField, details }
    let originalSummary = null; // captured once on first Get Data, reused on repeat clicks
    let summaryProject = "adobe"; // independent from the Automation Template tab's toggle
    let lastParsedContext = null; // result of parseContextFromDetails(), refreshed each Get Data
    let platformState = { value: "", locked: false }; // persisted via chrome.storage — sticky across issues
    let nativeContextState = { locked: false, fields: {} }; // per-device-type, persisted via chrome.storage

    const deviceTypeRow = buildDeviceTypeRow(() => {
      loadNativeContextState();
      refreshAllStatusChecks();
    });
    els.content.appendChild(deviceTypeRow);

    const radioRow = document.createElement("div");
    radioRow.className = "inline-row";
    const summaryProjectLabel = document.createElement("label");
    summaryProjectLabel.className = "aligned-label-col";
    summaryProjectLabel.textContent = "Project:";
    radioRow.appendChild(summaryProjectLabel);
    buildSummaryUpdateProjectRadios(
      () => summaryProject,
      async (project) => {
        summaryProject = project;
        if (summaryCustomPrefixManager) await summaryCustomPrefixManager.reload();
        refreshAllStatusChecks();
      }
    ).forEach((el) => radioRow.appendChild(el));
    els.content.appendChild(radioRow);

    const summaryCustomPrefixManager = buildCustomPrefixManager(
      "summaryUpdate",
      () => summaryProject,
      () => {
        refreshAllStatusChecks();
      }
    );
    els.content.appendChild(summaryCustomPrefixManager.row);
    els.content.appendChild(summaryCustomPrefixManager.fieldRow);

    // ---- Platform field with lock icon (Yahoo only) ----
    const platformRow = document.createElement("div");
    platformRow.className = "inline-row";
    platformRow.style.display = "none";

    const platformLabel = document.createElement("label");
    platformLabel.className = "aligned-label-col";
    platformLabel.textContent = "Platform:";

    const platformInput = document.createElement("input");
    platformInput.type = "text";
    platformInput.style.flex = "1";
    platformInput.style.minWidth = "160px";

    const lockBtn = document.createElement("button");
    lockBtn.className = "copy-btn";
    lockBtn.type = "button";

    platformRow.appendChild(platformLabel);
    platformRow.appendChild(platformInput);
    platformRow.appendChild(lockBtn);
    els.content.appendChild(platformRow);

    async function loadPlatformState() {
      const stored = await storageGet("summaryUpdatePlatform");
      platformState = stored || { value: "", locked: false };
      applyPlatformStateToUi();
    }

    function applyPlatformStateToUi() {
      platformInput.value = platformState.value || "";
      platformInput.disabled = !!platformState.locked;
      lockBtn.textContent = platformState.locked ? "\uD83D\uDD12 Locked" : "\uD83D\uDD13 Lock";
    }

    lockBtn.addEventListener("click", async () => {
      if (platformState.locked) {
        platformState.locked = false;
      } else {
        platformState.value = platformInput.value.trim();
        platformState.locked = true;
      }
      await storageSet("summaryUpdatePlatform", platformState);
      applyPlatformStateToUi();
      refreshAllStatusChecks();
    });

    loadPlatformState();

    // ---- Native App Context panel (Android Native / iOS Native only) ----
    const nativePanel = document.createElement("div");
    nativePanel.className = "errors-section";
    nativePanel.style.display = "none";

    const nativeHeading = document.createElement("div");
    nativeHeading.className = "errors-heading";
    nativeHeading.textContent = "Native App Context (fill in once per device, then lock)";
    nativePanel.appendChild(nativeHeading);

    const NATIVE_FIELD_DEFS = [
      { key: "testingApplication", label: "Testing Application", placeholder: "e.g. Adobe Lightroom" },
      { key: "authState", label: "Authentication State", placeholder: "e.g. Logged out" },
      { key: "device", label: "Device", placeholder: "e.g. iPhone 15" },
      { key: "os", label: "Operating System", placeholder: "e.g. iOS" },
      { key: "osVersion", label: "OS Version", placeholder: "e.g. 18.6.2" },
      { key: "appVersion", label: "Application Version", placeholder: "e.g. 11.3.2" },
      {
        key: "toolDescription",
        label: "Device/Tool description line",
        placeholder: "e.g. Iphone using Adobe Lightroom application",
      },
    ];

    const nativeInputs = {};
    NATIVE_FIELD_DEFS.forEach((def) => {
      const fieldRow = document.createElement("div");
      fieldRow.className = "template-field";
      const fieldLabel = document.createElement("label");
      fieldLabel.textContent = def.label;
      const fieldInput = document.createElement("input");
      fieldInput.type = "text";
      fieldInput.placeholder = def.placeholder;
      fieldRow.appendChild(fieldLabel);
      fieldRow.appendChild(fieldInput);
      nativePanel.appendChild(fieldRow);
      nativeInputs[def.key] = fieldInput;
    });

    const nativeLockRow = document.createElement("div");
    nativeLockRow.className = "controls-row";
    const nativeLockBtn = document.createElement("button");
    nativeLockBtn.className = "copy-btn";
    nativeLockBtn.type = "button";
    nativeLockRow.appendChild(nativeLockBtn);
    nativePanel.appendChild(nativeLockRow);

    els.content.appendChild(nativePanel);

    function applyNativeContextStateToUi() {
      NATIVE_FIELD_DEFS.forEach((def) => {
        nativeInputs[def.key].value = (nativeContextState.fields && nativeContextState.fields[def.key]) || "";
        nativeInputs[def.key].disabled = !!nativeContextState.locked;
      });
      nativeLockBtn.textContent = nativeContextState.locked ? "\uD83D\uDD12 Locked" : "\uD83D\uDD13 Lock";
    }

    async function loadNativeContextState() {
      const stored = await storageGet(nativeContextStorageKeyFor(currentDeviceType));
      nativeContextState = stored || { locked: false, fields: {} };
      applyNativeContextStateToUi();
      refreshNativeContextPreview();
    }

    nativeLockBtn.addEventListener("click", async () => {
      if (nativeContextState.locked) {
        nativeContextState = { locked: false, fields: nativeContextState.fields || {} };
      } else {
        const fields = {};
        NATIVE_FIELD_DEFS.forEach((def) => {
          fields[def.key] = nativeInputs[def.key].value.trim();
        });
        nativeContextState = { locked: true, fields };
      }
      await storageSet(nativeContextStorageKeyFor(currentDeviceType), nativeContextState);
      applyNativeContextStateToUi();
      refreshNativeContextPreview();
    });

    loadNativeContextState();

    const nativeContextBlock = buildFieldBlock("Environment & Context (Native format)", "");
    nativeContextBlock.style.display = "none";
    els.content.appendChild(nativeContextBlock);
    const nativeContextTextarea = nativeContextBlock.querySelector("textarea");

    // Shows/hides the Native panel + preview based on the current Device Type,
    // and (re)builds the preview text from the locked fields. The preview is
    // editable directly, same pattern as the Yahoo Context preview — whatever
    // is in it at Update time is what gets written back.
    function refreshNativeContextPreview() {
      const isNative = isNativeDeviceType(currentDeviceType);
      nativePanel.style.display = isNative ? "" : "none";
      nativeContextBlock.style.display = isNative ? "" : "none";
      if (!isNative) return;
      nativeContextTextarea.value = buildNativeEnvironmentContextBlock(nativeContextState.fields || {});
    }

    // Builds the final Details text for Native device types by splicing the
    // Native Context preview into the Environment/Context region, in place of
    // buildFinalDetailsText()'s Web/Yahoo-only Context splice.
    function buildFinalDetailsTextNative() {
      if (!lastExtracted) return "";
      const loc = locateEnvironmentContextSection(lastExtracted.details);
      if (!loc) return lastExtracted.details;
      return spliceEnvironmentContextIntoDetails(lastExtracted.details, loc, nativeContextTextarea.value);
    }

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

    // All status/error displays grouped together right under Get Data/Clear:
    // general status, Summary data mismatch, Page Name vs Screen Name, locked
    // Platform vs Details' existing Platform value, Steps numbering sequence,
    // and Remediation Recommendation.
    const errorsSection = document.createElement("div");
    errorsSection.className = "errors-section";

    const errorsHeading = document.createElement("div");
    errorsHeading.className = "errors-heading";
    errorsHeading.textContent = "Status & Checks";
    errorsSection.appendChild(errorsHeading);

    const statusMsg = document.createElement("div");
    statusMsg.className = "count-badge";
    errorsSection.appendChild(statusMsg);

    const summaryDataCheckMsg = document.createElement("div");
    summaryDataCheckMsg.className = "count-badge";
    errorsSection.appendChild(summaryDataCheckMsg);

    const platformCheckMsg = document.createElement("div");
    platformCheckMsg.className = "count-badge";
    platformCheckMsg.style.display = "none";
    errorsSection.appendChild(platformCheckMsg);

    const stepOneUrlCheckMsg = document.createElement("div");
    stepOneUrlCheckMsg.className = "count-badge";
    errorsSection.appendChild(stepOneUrlCheckMsg);

    const stepsCheckMsg = document.createElement("div");
    stepsCheckMsg.className = "count-badge";
    errorsSection.appendChild(stepsCheckMsg);

    const remediationCheckMsg = document.createElement("div");
    remediationCheckMsg.className = "count-badge";
    errorsSection.appendChild(remediationCheckMsg);

    const pageCheckMsg = document.createElement("div");
    pageCheckMsg.className = "count-badge";
    errorsSection.appendChild(pageCheckMsg);

    els.content.appendChild(errorsSection);

    const resultBlock = buildFieldBlock("Updated Summary", "");
    els.content.appendChild(resultBlock);
    const resultTextarea = resultBlock.querySelector("textarea");

    // ---- Context preview (Yahoo only) ----
    const contextStatusMsg = document.createElement("div");
    contextStatusMsg.className = "count-badge";
    contextStatusMsg.style.display = "none";
    els.content.appendChild(contextStatusMsg);

    const contextBlock = buildFieldBlock("Context (Yahoo format)", "");
    contextBlock.style.display = "none";
    els.content.appendChild(contextBlock);
    const contextTextarea = contextBlock.querySelector("textarea");

    const applyRow = document.createElement("div");
    applyRow.className = "controls-row";
    const applyBtn = document.createElement("button");
    applyBtn.className = "action-btn";
    applyBtn.type = "button";
    applyBtn.textContent = "Update";
    applyRow.appendChild(applyBtn);
    els.content.appendChild(applyRow);

    const sanitySection = document.createElement("div");
    sanitySection.className = "errors-section";
    const sanityHeading = document.createElement("div");
    sanityHeading.className = "errors-heading";
    sanityHeading.textContent = "Sanity";
    sanitySection.appendChild(sanityHeading);
    const sanityOutput = buildSanityOutputBlock();
    sanitySection.appendChild(sanityOutput);
    els.content.appendChild(sanitySection);

    function regenerate() {
      if (!lastExtracted) return;
      const screenName = extractScreenNameFromDetails(lastExtracted.details);
      const elements = extractElementsFromText(lastExtracted.details);
      const expectedElementsSummary = formatElementsSummary(elements);
      const activeCustomPrefix = summaryCustomPrefixManager ? summaryCustomPrefixManager.getActivePrefix() : null;

      let modifiedTitle;
      let wrapped;
      let formatOk;

      // When a custom prefix is active for this tab+project, Summary Format
      // is checked against ONLY that pattern — the normal Adobe/Yahoo
      // convention is ignored entirely, per the Custom prefix? toggle.
      if (activeCustomPrefix) {
        wrapped = parseWrappedSummaryCustom(originalSummary, activeCustomPrefix, summaryProject);
        formatOk = !!wrapped && wrapped.hasPrefix;
      } else {
        wrapped = parseWrappedSummary(originalSummary);
        formatOk = !!wrapped && wrappedFormatMatchesProject(wrapped, summaryProject);
      }

      if (wrapped) {
        // Already looks wrapped ("Title - Screen (Elements)") — reuse just
        // the real title text (already prefix-stripped, regardless of
        // whether that prefix was expected) so we don't nest another
        // wrapper around an already-wrapped summary. This applies even if
        // the prefix doesn't match — that mismatch is flagged below, not
        // silently treated as a fresh title (this is the fix for the
        // double-wrapping bug).
        modifiedTitle = wrapped.modifiedTitle;

        const screenMismatch = wrapped.screenName.trim().toLowerCase() !== (screenName || "").trim().toLowerCase();
        const elementsMismatch = wrapped.elementsRaw.trim() !== expectedElementsSummary.trim();

        if (!formatOk) {
          const basePrefixDisplay = summaryProject === "yahoo" ? "" : "[Accessibility]";
          const expectedLabel = activeCustomPrefix
            ? `the format "${basePrefixDisplay}[${activeCustomPrefix}] - Title - Screen (Elements)"`
            : summaryProject === "yahoo"
            ? "Yahoo format (no prefix)"
            : 'Adobe format ("[Accessibility] - " prefix)';
          setStatusFailureFix(
            summaryDataCheckMsg,
            "Summary Format",
            `doesn't match ${expectedLabel}.`,
            "Prefix will be corrected when you click Update."
          );
        } else if (screenMismatch || elementsMismatch) {
          const bits = [];
          if (screenMismatch) bits.push(`Screen Name "${wrapped.screenName}" \u2192 "${screenName || ""}"`);
          if (elementsMismatch) bits.push(`Elements "${wrapped.elementsRaw}" \u2192 "${expectedElementsSummary}"`);
          setStatusFailureFix(summaryDataCheckMsg, "Summary Data", bits.join("; "), "Will be corrected when you click Update.");
        } else {
          setStatusOk(summaryDataCheckMsg, "Summary Format: OK.");
        }
      } else {
        // Defensive: even if parseWrappedSummary/parseWrappedSummaryCustom
        // failed to match at all, still unwrap if it happens to look wrapped
        // some other way, rather than using the raw (possibly already
        // wrapped) text as-is.
        modifiedTitle = unwrapIfAlreadyWrapped(originalSummary, activeCustomPrefix, summaryProject);
        setStatusEmpty(summaryDataCheckMsg);
      }

      const prefix = buildTitlePrefix(summaryProject, modifiedTitle, screenName, activeCustomPrefix);
      resultTextarea.value = `${prefix} (${expectedElementsSummary})`;
      checkPageMismatch(lastExtracted.pageField, screenName);
    }

    // Shows/builds the Yahoo-only Platform field + Context preview, plus the
    // Platform-mismatch check. Hidden entirely for Adobe — this part only
    // applies to Yahoo.
    function refreshContextPreview() {
      const isYahoo = summaryProject === "yahoo" && !isNativeDeviceType(currentDeviceType);
      platformRow.style.display = isYahoo ? "" : "none";
      contextBlock.style.display = isYahoo ? "" : "none";
      contextStatusMsg.style.display = isYahoo ? "" : "none";
      platformCheckMsg.style.display = isYahoo ? "" : "none";
      if (!isYahoo) return;

      if (!lastExtracted) {
        contextTextarea.value = "";
        setStatus(contextStatusMsg, "Click Get Data to load the Context section.", false);
        setStatus(platformCheckMsg, "", false);
        lastParsedContext = null;
        return;
      }

      const parsed = parseContextFromDetails(lastExtracted.details);
      lastParsedContext = parsed;

      if (!parsed) {
        contextTextarea.value = "";
        setStatus(contextStatusMsg, "No \"Context:\" section found in Details.", true);
      } else if (parsed.alreadyFormatted) {
        // Already has Platform + Test Method labels — leave its existing
        // Platform value alone rather than overwriting with the locked one.
        contextTextarea.value = buildYahooContextBlock(parsed, parsed.platform || "");
        setStatus(contextStatusMsg, "Already provided in correct format.", false);
      } else {
        contextTextarea.value = buildYahooContextBlock(parsed, platformState.value);
        setStatus(contextStatusMsg, "Context reformatted for Yahoo \u2014 review before clicking Update.", false);
      }

      checkPlatformMismatch(parsed);
    }

    // Steps-numbering and Remediation-colon checks apply to BOTH Adobe and
    // Yahoo, unlike the Context/Platform stuff above which is Yahoo-only.
    function refreshUniversalChecks() {
      if (!lastExtracted) {
        setStatus(stepOneUrlCheckMsg, "", false);
        setStatus(stepsCheckMsg, "", false);
        setStatus(remediationCheckMsg, "", false);
        return;
      }
      checkStepOneUrlLive(lastExtracted.details, lastExtracted.checkpoint);
      checkStepsNumbering(lastExtracted.details);
      checkRemediationColon(lastExtracted.details);
    }

    // Runs every Status & Checks check (Summary Format/Data, Context —
    // Platform, both Steps checks, Remediation, Screen Name) and then
    // numbers only the ones actually visible right now, in that fixed order
    // — so a hidden check (e.g. Platform on Adobe) doesn't leave a gap in
    // the numbering. Call this instead of calling regenerate()/
    // refreshContextPreview()/refreshUniversalChecks() individually.
    function refreshAllStatusChecks() {
      regenerate();
      refreshContextPreview();
      refreshUniversalChecks();
      renumberStatusChecks([
        summaryDataCheckMsg,
        platformCheckMsg,
        stepOneUrlCheckMsg,
        stepsCheckMsg,
        remediationCheckMsg,
        pageCheckMsg,
      ]);
    }

    // Shows Step 1's URL-opening status live (same check used by the
    // auto-insert fix on Update, and by the post-Update Sanity panel) so it's
    // visible right after Get Data, before Update is even clicked.
    function checkStepOneUrlLive(detailsText, checkpointText) {
      const check = checkStepOneOpensUrl(detailsText, checkpointText);
      if (check.ok) {
        setStatusOk(stepOneUrlCheckMsg, "Steps to reproduce \u2014 Step 1: OK.");
      } else {
        setStatusFailureFix(
          stepOneUrlCheckMsg,
          "Steps to reproduce \u2014 Step 1",
          `wrong wording (${check.detail})`,
          "Correct wording will be inserted when you click Update."
        );
      }
    }

    // Flags when Details already has a Platform value that differs from the
    // locked Platform field — usually means one of the two is stale.
    function checkPlatformMismatch(parsed) {
      const existingPlatform = parsed && parsed.platform ? parsed.platform.trim() : "";
      const lockedPlatform = (platformState.value || "").trim();
      if (!existingPlatform || !lockedPlatform) {
        setStatusEmpty(platformCheckMsg);
        return;
      }
      if (existingPlatform.toLowerCase() !== lockedPlatform.toLowerCase()) {
        setStatusFailureFix(
          platformCheckMsg,
          "Context \u2014 Platform",
          `"${existingPlatform}" \u2260 locked "${lockedPlatform}"`,
          `Will be set to "${lockedPlatform}" when you click Update.`
        );
      } else {
        setStatusOk(platformCheckMsg, `Context \u2014 Platform: OK ("${existingPlatform}").`);
      }
    }

    // Flags a broken Steps to Reproduce numbering sequence and shows the
    // actual numbers found (e.g. "1,2,3,4,4,5,6" or "1,2,3,5,6").
    function checkStepsNumbering(detailsText) {
      const numbers = extractStepNumbers(detailsText);
      if (!numbers.length) {
        setStatusEmpty(stepsCheckMsg);
        return;
      }
      const result = checkStepSequence(numbers);
      if (!result.ok) {
        setStatusFailureFix(
          stepsCheckMsg,
          "Steps to reproduce \u2014 numbering",
          `out of order (${numbers.join(",")})`,
          "Will be renumbered when you click Update."
        );
      } else {
        setStatusOk(stepsCheckMsg, `Steps to reproduce \u2014 numbering: OK (${numbers.join(",")}).`);
      }
    }

    // Flags any dangling ":"-ending lines within Remediation Recommendation.
    function checkRemediationColon(detailsText) {
      const result = checkRemediationTrailingColon(detailsText);
      remediationCheckMsg.innerHTML = "";
      remediationCheckMsg.classList.remove("status-error");
      if (!result.sectionFound) return;

      if (!result.ok) {
        remediationCheckMsg.classList.add("status-error");

        const failureLine = document.createElement("div");
        const numberSpan = document.createElement("strong");
        numberSpan.className = "status-check-number";
        failureLine.appendChild(numberSpan);
        const failureLabel = document.createElement("strong");
        failureLabel.textContent = "Failure: ";
        failureLine.appendChild(failureLabel);
        failureLine.appendChild(
          document.createTextNode(
            `Remediation Recommendation \u2014 dangling ":" (${result.badLines.length} instance${
              result.badLines.length === 1 ? "" : "s"
            }): `
          )
        );
        result.badLines.forEach((line, i) => {
          if (i > 0) failureLine.appendChild(document.createTextNode("; "));
          const instanceLabel = document.createElement("span");
          instanceLabel.style.fontWeight = "600";
          instanceLabel.textContent = `${i + 1}: `;
          failureLine.appendChild(instanceLabel);
          failureLine.appendChild(document.createTextNode('"'));
          // The trailing ":" is always the last character of the (already
          // right-trimmed) bad line — highlight that exact position rather
          // than the whole paragraph, with ~20 chars of word-rounded context
          // before it.
          const snippet = buildHighlightSnippetAtIndex(line, line.length - 1, 1);
          appendHighlightSnippet(failureLine, snippet);
          failureLine.appendChild(document.createTextNode('"'));
        });
        remediationCheckMsg.appendChild(failureLine);

        const fixLine = document.createElement("div");
        const fixLabel = document.createElement("strong");
        fixLabel.textContent = "Fix: ";
        fixLine.appendChild(fixLabel);
        fixLine.appendChild(document.createTextNode('":" \u2192 ":-" when you click Update.'));
        remediationCheckMsg.appendChild(fixLine);
      } else {
        const numberSpan = document.createElement("strong");
        numberSpan.className = "status-check-number";
        remediationCheckMsg.appendChild(numberSpan);
        remediationCheckMsg.appendChild(document.createTextNode("Remediation Recommendation: OK."));
      }
    }

    // Reconstructs the full Details text with whatever's currently in the
    // Context preview spliced in (respects manual edits to that field).
    // Returns the original Details unchanged if there's no Yahoo Context
    // section to work with.
    function buildFinalDetailsText() {
      if (summaryProject !== "yahoo" || !lastExtracted) {
        return lastExtracted ? lastExtracted.details : "";
      }
      if (!lastParsedContext) return lastExtracted.details;
      return spliceContextIntoDetails(lastExtracted.details, lastParsedContext, contextTextarea.value);
    }

    function checkPageMismatch(pageField, screenName) {
      if (!screenName) {
        setStatusFailureFix(
          pageCheckMsg,
          "Screen Name",
          "no \"Screen Name:\" line found in Details",
          "Add a Screen Name line to Details, then re-run Get Data."
        );
        return;
      }
      const pageNorm = String(pageField || "").trim().toLowerCase();
      const screenNorm = screenName.trim().toLowerCase();
      if (pageNorm !== screenNorm) {
        setStatusFailureFix(
          pageCheckMsg,
          "Screen Name",
          `Page shows "${pageField || "(empty)"}" \u2260 Details "${screenName}"`,
          "Not auto-corrected \u2014 check which one is stale."
        );
      } else {
        setStatusOk(pageCheckMsg, 6, `Screen Name: OK ("${screenName}").`);
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

        refreshAllStatusChecks();
        refreshNativeContextPreview();
        setStatus(
          statusMsg,
          "Pulled Summary and parsed Details. (Click Clear to re-capture the Summary from the page.)",
          false
        );
      } catch (err) {
        setStatus(statusMsg, "Error reading page: " + err.message, true);
      }
    });

    clearBtn.addEventListener("click", () => {
      lastExtracted = null;
      originalSummary = null;
      lastParsedContext = null;
      resultTextarea.value = "";
      contextTextarea.value = "";
      sanityOutput.innerHTML = "";
      setStatus(statusMsg, "Cleared. Next Get Data will re-capture the Summary from the page.", false);
      setStatus(pageCheckMsg, "", false);
      setStatus(contextStatusMsg, "", false);
      setStatus(platformCheckMsg, "", false);
      setStatus(stepOneUrlCheckMsg, "", false);
      setStatus(stepsCheckMsg, "", false);
      setStatus(remediationCheckMsg, "", false);
      setStatus(summaryDataCheckMsg, "", false);
    });

    applyBtn.addEventListener("click", async () => {
      if (!isExtension) {
        setStatus(statusMsg, "Update writes into the active browser tab, which only the extension version can do.", true);
        return;
      }
      if (!resultTextarea.value.trim()) {
        setStatus(statusMsg, "Nothing to apply \u2014 click Get Data first.", true);
        return;
      }
      setStatus(statusMsg, "Updating\u2026", false);
      try {
        const tab = await getTargetTab();
        if (!tab || !tab.id) throw new Error("No active browser tab found.");

        // Native device types splice in the Native App Context block instead
        // of the Web Platform/OS/Browser fields; for Web, Yahoo starts from
        // the Context-corrected Details while Adobe starts from the Details
        // as originally pulled. All paths then get the same quote-fix, Steps-
        // numbering, and Remediation-colon fixes applied on top.
        let detailsToWrite;
        if (isNativeDeviceType(currentDeviceType)) {
          detailsToWrite = buildFinalDetailsTextNative();
        } else if (summaryProject === "yahoo") {
          detailsToWrite = buildFinalDetailsText();
        } else {
          detailsToWrite = lastExtracted ? lastExtracted.details : "";
          detailsToWrite = stripYahooContextArtifactsForAdobe(detailsToWrite);
        }

        detailsToWrite = fixSingleQuotesInSteps(detailsToWrite);

        // If Step 1 doesn't have the required wording for this checkpoint/
        // issue type (Reflow/Resize -> browser-open step; AT -> turn on
        // screen reader + open URL; else -> open URL), insert the correct
        // one automatically, then renumber everything sequentially from 1.
        const stepInsertion = autoInsertStepOneIfMissing(detailsToWrite, lastExtracted ? lastExtracted.checkpoint : "");
        detailsToWrite = stepInsertion.text;

        const stepsBefore = extractStepNumbers(detailsToWrite).join(",");
        detailsToWrite = fixStepsNumberingInDetails(detailsToWrite, 1);
        const stepsAfter = extractStepNumbers(detailsToWrite).join(",");
        const stepsWereFixed = stepsBefore !== stepsAfter && stepsBefore !== "";

        const remediationCheck = checkRemediationTrailingColon(detailsToWrite);
        let remediationWasFixed = false;
        if (remediationCheck.sectionFound && !remediationCheck.ok) {
          detailsToWrite = fixRemediationTrailingColon(detailsToWrite);
          remediationWasFixed = true;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: pageWriter,
          args: [resultTextarea.value, detailsToWrite],
        });
        const result = results && results[0] ? results[0].result : null;
        const summaryOk = !!(result && result.summaryOk);
        const detailsOk = !!(result && result.detailsOk);

        const extras = [];
        if (stepsWereFixed) extras.push(`Steps numbering corrected (${stepsBefore} \u2192 ${stepsAfter}).`);
        if (stepInsertion.changed) {
          extras.push(
            `Step 1 didn't open the URL \u2014 inserted "1. ${stepInsertion.stepText}" automatically (${stepInsertion.issueType} issue type).`
          );
        }
        if (remediationWasFixed) extras.push('Remediation Recommendation ":" corrected to ":-".');

        setStatus(
          statusMsg,
          `${summaryOk ? "Summary updated" : "Summary field (#summary) not found"}. ${
            detailsOk ? "Details updated." : "Details field (#details) not found."
          }${extras.length ? " " + extras.join(" ") : ""}`,
          !summaryOk || !detailsOk
        );

        if (summaryOk && detailsOk) {
          scheduleSanityCheck({
            project: summaryProject,
            summaryEl: resultTextarea,
            detailsEl: { value: detailsToWrite },
            outputEl: sanityOutput,
            customPrefix: summaryCustomPrefixManager ? summaryCustomPrefixManager.getActivePrefix() : null,
          });
        }
      } catch (err) {
        setStatus(statusMsg, "Error updating: " + err.message, true);
      }
    });
  }

  function renderTemplateMode() {
    els.content.appendChild(buildDeviceTypeRow(() => render(), WEB_DEVICE_TYPES));

    if (isNativeDeviceType(currentDeviceType)) {
      const notice = document.createElement("div");
      notice.className = "template-notice";
      notice.textContent =
        "Automation issues aren't available for Native app testing \u2014 there's no automation tooling for native apps. Please use the Manual Results tab or the Summary Update tab for this issue instead.";
      els.content.appendChild(notice);
      return;
    }

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

    const sanitySection = document.createElement("div");
    sanitySection.className = "errors-section";
    const sanityHeading = document.createElement("div");
    sanityHeading.className = "errors-heading";
    sanityHeading.textContent = "Sanity";
    sanitySection.appendChild(sanityHeading);
    const sanityOutput = buildSanityOutputBlock();
    sanityOutput.id = "template-sanity-output";
    sanitySection.appendChild(sanityOutput);
    els.content.appendChild(sanitySection);
  }

  // Two clean controls above the Template form: Upload Excel + Get Data.
  function buildGetDataPanel() {
    const wrap = document.createElement("div");
    wrap.className = "controls-panel";

    const isExtension = typeof chrome !== "undefined" && chrome.scripting && chrome.tabs;

    // ---- Row 1: Adobe / Yahoo / Upload Excel ----
    const row = document.createElement("div");
    row.className = "controls-row";

    const projectLabel = document.createElement("label");
    projectLabel.className = "aligned-label-col";
    projectLabel.textContent = "Project:";
    row.appendChild(projectLabel);

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

    // ---- Custom prefix (its own row, same one-concern-per-row layout as
    // the Device Type row) ----
    templateCustomPrefixManager = buildCustomPrefixManager(
      "template",
      () => templateState.project,
      () => {
        const output = document.getElementById("template-output");
        const form = document.getElementById("template-form");
        if (output && form) refreshUpdatedTitle(form, output);
      }
    );
    wrap.appendChild(templateCustomPrefixManager.row);
    wrap.appendChild(templateCustomPrefixManager.fieldRow);

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
        // Stashed for Log Issue's Step 1 auto-insert, which runs in a
        // separate click handler without access to this pageData closure.
        form.dataset.checkpoint = pageData.checkpoint || "";

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

        // Reflow (1.4.10) and Resize Text (1.4.4) are tested via plain browser
        // zoom, not axe DevTools/keyboard/screen reader — override the
        // Testing Tool field accordingly (this also drives Yahoo's
        // "Test Method:" line, since both projects share the same tool field).
        const scForTool = extractScCode(pageData.checkpoint);
        const toolInput = form.querySelector('[data-key="tool"]');
        if (toolInput && (scForTool === "1.4.10" || scForTool === "1.4.4")) {
          toolInput.value = "Chrome using Windows";
          applied.push("tool (Reflow/Resize Text override)");
        }

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
          // Guard against double-wrapping: if the live Summary (used as a
          // fallback source below) is already a fully wrapped title from a
          // previous Log Issue, unwrap it first instead of wrapping it again.
          const activeCustomPrefix = templateCustomPrefixManager ? templateCustomPrefixManager.getActivePrefix() : null;
          const modifiedTitleRaw = (match && match.modified_alternative) || pageData.description || pageData.summary || "";
          const modifiedTitle = unwrapIfAlreadyWrapped(modifiedTitleRaw, activeCustomPrefix, templateState.project);
          const screenNameValue = screenNameInput ? screenNameInput.value || "" : "";
          updatedTitleInput.dataset.modifiedTitle = modifiedTitle;
          updatedTitleInput.dataset.screenName = screenNameValue;
          const elements = extractElementsFromText(stepsInput ? stepsInput.value : "");
          const prefix = buildTitlePrefix(templateState.project, modifiedTitle, screenNameValue, activeCustomPrefix);
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

        let finalDetailsText = fixSingleQuotesInSteps(output.value || "");
        const checkpointForSteps = form.dataset.checkpoint || "";
        const stepInsertion = autoInsertStepOneIfMissing(finalDetailsText, checkpointForSteps);
        finalDetailsText = fixStepsNumberingInDetails(stepInsertion.text, 1);

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: pageWriter,
          args: [updatedTitleInput.value || "", finalDetailsText],
        });
        const result = results && results[0] ? results[0].result : null;
        if (!result) throw new Error("Could not write to the page.");

        const parts = [
          result.summaryOk ? "Summary filled" : "Summary field (#summary) not found",
          result.detailsOk ? "Details filled" : "Details field (#details) not found",
        ];
        if (stepInsertion.changed) {
          parts.push(
            `Step 1 didn't open the URL \u2014 inserted "1. ${stepInsertion.stepText}" automatically (${stepInsertion.issueType} issue type)`
          );
        }
        setStatus(statusMsg, parts.join(", ") + ".", !result.summaryOk || !result.detailsOk);

        if (result.summaryOk && result.detailsOk) {
          output.value = finalDetailsText;
          const sanityOutput = document.getElementById("template-sanity-output");
          if (sanityOutput) {
            scheduleSanityCheck({
              project: templateState.project,
              summaryEl: updatedTitleInput,
              detailsEl: output,
              outputEl: sanityOutput,
              customPrefix: templateCustomPrefixManager ? templateCustomPrefixManager.getActivePrefix() : null,
            });
          }
        }
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

  // ---------- CSV Sanity ----------
  //
  // Implements the QA-validator rule set for Adobe/Yahoo axe Auditor CSV
  // exports, across 8 Project+Platform combinations. Every combination maps
  // onto one of two underlying rule sets:
  //   Rule Set A ("web")    — Adobe Desktop Web, Yahoo Desktop Web
  //   Rule Set B ("native") — Adobe/Yahoo Native, Native iOS, Native Android
  // Adobe vs Yahoo differences (Summary bracket convention, presence of
  // Labels/WCAG_/Severity checks) layer on top of whichever rule set applies,
  // consistent with how the live-page Sanity engine already treats them.
  // This is a read-only report — there's no live page to write corrections
  // back to for a CSV row, so it only flags what needs manual attention.

  const CSV_SANITY_MODES = [
    { key: "adobe-web", label: "Adobe Desktop Web", project: "adobe", platform: "web" },
    { key: "adobe-native", label: "Adobe Native", project: "adobe", platform: "native", nativeTag: "Win/Mac/Both" },
    { key: "adobe-native-ios", label: "Adobe Native iOS", project: "adobe", platform: "native", nativeTag: "iOS" },
    { key: "adobe-native-android", label: "Adobe Native Android", project: "adobe", platform: "native", nativeTag: "Android" },
    { key: "yahoo-web", label: "Yahoo Desktop Web", project: "yahoo", platform: "web" },
    { key: "yahoo-native", label: "Yahoo Native", project: "yahoo", platform: "native", nativeTag: "Win/Mac/Both" },
    { key: "yahoo-native-ios", label: "Yahoo Native iOS", project: "yahoo", platform: "native", nativeTag: "iOS" },
    { key: "yahoo-native-android", label: "Yahoo Native Android", project: "yahoo", platform: "native", nativeTag: "Android" },
  ];

  function getCsvSanityMode(key) {
    return CSV_SANITY_MODES.find((m) => m.key === key) || CSV_SANITY_MODES[0];
  }

  const csvSanityState = { modeKey: "adobe-web" };

  // Minimal CSV parser: handles quoted fields (including embedded commas,
  // newlines, and escaped "" quotes). Returns { headers, rows } where rows
  // are arrays of cell strings, header row excluded, blank rows dropped.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const str = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (inQuotes) {
        if (c === '"') {
          if (str[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = (rows.shift() || []).map((h) => String(h || "").trim());
    const dataRows = rows.filter((r) => r.some((cell) => String(cell || "").trim().length));
    return { headers, rows: dataRows };
  }

  // Finds which CSV column (by index) holds each field the rule set needs,
  // matching header names loosely (case-insensitive substring), most
  // specific patterns first so e.g. "Issue ID" doesn't get shadowed by a
  // later, broader match.
  function detectCsvColumnsV2(headers) {
    const norm = headers.map((h) => String(h || "").toLowerCase());
    const findIdx = (patterns, excludeIdx) => {
      for (const p of patterns) {
        const idx = norm.findIndex((h, i) => h.includes(p) && !(excludeIdx || []).includes(i));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    // Issue URL (the actual tracker/ticket link for that Issue ID) is looked
    // up with more specific patterns FIRST, and excluded from the generic
    // page "URL" match below — otherwise, if a CSV has both an "Issue URL"
    // column and a plain "URL" (page) column, the generic "url" substring
    // match would grab whichever column happened to come first and treat
    // them as the same thing.
    const issueUrl = findIdx(["issue url", "issue_url", "ticket url", "jira link", "issue link", "bug link"]);
    const checkpoint = findIdx(["checkpoint", "check point", "wcag checkpoint", "wcag sc"]);
    return {
      issueId: findIdx(["issue id", "issue_id", "issueid"]),
      summary: findIdx(["summary", "title"]),
      description: findIdx(["description", "details"]),
      impact: findIdx(["impact", "severity"]),
      checkpoint,
      successCriteria: findIdx(
        ["success criteria", "success_criteria", "successcriteria", "wcag success criterion"],
        checkpoint !== -1 ? [checkpoint] : []
      ),
      testUnit: findIdx(["test unit", "test_unit", "testunit"]),
      url: findIdx(["page url", "url"], issueUrl !== -1 ? [issueUrl] : []),
      issueUrl,
      attachments: findIdx(["attachment"]),
      method: findIdx(["method"]),
    };
  }

  // Generic same-line "Label: value" extractor for Environment/Context
  // fields that aren't already covered by a dedicated helper (Platform URL,
  // Testing Application, Operating System as written in Environment).
  function extractLabeledField(text, label) {
    const re = new RegExp("^\\s*" + escapeRegExp(label) + "\\s*:\\s*(.*)$", "im");
    const m = String(text || "").match(re);
    return m ? m[1].trim() : "";
  }

  // Compares two URLs on origin+path only (query params and trailing slash
  // ignored), falling back to plain string cleanup if either isn't a valid URL.
  function normalizeBaseUrl(u) {
    const str = String(u || "").trim();
    try {
      const parsed = new URL(str);
      return (parsed.origin + parsed.pathname).replace(/\/$/, "").toLowerCase();
    } catch (e) {
      return str.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
    }
  }

  // ---- S1: Summary Format ----
  function checkCsvS1Web(summary, project) {
    const wrapped = parseWrappedSummary(summary);
    if (!wrapped) {
      return { ok: false, detail: 'Doesn\'t match the wrapped "Description - Page (Element)" structure.' };
    }
    const expectsPrefix = project !== "yahoo";
    if (wrapped.hasAccessibilityPrefix !== expectsPrefix) {
      return {
        ok: false,
        detail: expectsPrefix
          ? 'Missing the "[Accessibility] -" prefix required for Adobe.'
          : 'Has an "[Accessibility] -" prefix, but Yahoo format doesn\'t use one.',
      };
    }
    if (!wrapped.elementsRaw || !wrapped.elementsRaw.trim()) {
      return { ok: false, detail: "Element name is entirely absent from the parenthetical." };
    }
    return { ok: true, detail: "" };
  }

  function checkCsvS1Native(summary, project) {
    const str = String(summary || "").trim();
    const isYahoo = project === "yahoo";
    // Adobe: "[Accessibility][Platform] - ..."; Yahoo: "[Platform] - ..." (no
    // "[Accessibility]" bracket at all, same convention as Yahoo Web).
    const pattern = isYahoo
      ? /^\[([^\]]*)\]\s*-\s*(.*)\(([^()]*)\)\s*$/i
      : /^\[Accessibility\]\[([^\]]*)\]\s*-\s*(.*)\(([^()]*)\)\s*$/i;
    const m = str.match(pattern);
    if (!m) {
      return {
        ok: false,
        detail: isYahoo
          ? 'Doesn\'t match "[Platform] - Description - Screen (Element)" structure, or platform tag is missing.'
          : 'Doesn\'t match "[Accessibility][Platform] - Description - Screen (Element)" structure, or platform tag is missing.',
      };
    }
    const tag = m[1].trim();
    if (!tag) return { ok: false, detail: "Platform tag is missing (e.g. [Win], [Mac], [Android], [iOS])." };
    if (isYahoo && tag.toLowerCase() === "accessibility") {
      return {
        ok: false,
        detail: 'Has an "[Accessibility]" bracket, but Yahoo Native format doesn\'t use one \u2014 expected just "[Platform] - ...".',
      };
    }
    if (!m[3].trim()) {
      return { ok: false, detail: "Element name is entirely absent from the parenthetical." };
    }
    return { ok: true, detail: "" };
  }

  // ---- S2: Attachment Present ----
  function checkCsvS2(attachments) {
    const val = String(attachments || "").trim();
    const ok = !!val && val.toLowerCase() !== "nan";
    return { ok, detail: ok ? "" : "Attachments column is empty." };
  }

  // ---- S3 (Web): Platform URL vs CSV URL ----
  function checkCsvS3Web(description, csvUrl) {
    const platformUrl = extractLabeledField(description, "Platform URL");
    if (!platformUrl) return { ok: false, detail: '"Platform URL:" not found in the Environment section.' };
    if (!csvUrl) return { ok: true, detail: "" };
    const ok = normalizeBaseUrl(platformUrl) === normalizeBaseUrl(csvUrl);
    return { ok, detail: ok ? "" : `Environment "${platformUrl}" \u2260 CSV URL "${csvUrl}".` };
  }

  // ---- S3 (Native): Context/Environment Consistency — CRITICAL ----
  // Same field requirements for Adobe and Yahoo (Testing Application,
  // Authentication State, Device, OS Version) — but Device: and the
  // OS-version label ("iOS Version:"/"Android Version:") are only required
  // for the mobile Native sub-types, not Desktop Native.
  function checkCsvS3Native(description, mode) {
    const hasEnv = /environment\s*:/i.test(description);
    const hasCtx = /context\s*:/i.test(description);
    if (!hasEnv || !hasCtx) {
      const missing = [];
      if (!hasEnv) missing.push("Environment");
      if (!hasCtx) missing.push("Context");
      return { ok: false, detail: `Missing section(s): ${missing.join(", ")}.`, critical: true };
    }

    const testingApp = extractLabeledField(description, "Testing Application");
    if (!testingApp) {
      return { ok: false, detail: "Testing Application (with version) not clearly stated in Environment.", critical: true };
    }

    const isMobile = mode.nativeTag === "iOS" || mode.nativeTag === "Android";
    if (isMobile) {
      const device = extractLabeledField(description, "Device");
      if (!device) {
        return { ok: false, detail: `Mobile Native (${mode.nativeTag}) issues must state a "Device:" line in Context.`, critical: true };
      }
      const versionLabel = `${mode.nativeTag} Version`;
      const osVersion = extractLabeledField(description, versionLabel);
      if (!osVersion) {
        return { ok: false, detail: `Missing "${versionLabel}:" in Context for ${mode.nativeTag} Native.`, critical: true };
      }
    } else {
      const parsedCtx = parseContextFromDetails(description);
      const envOs = extractLabeledField(description, "Operating System");
      const ctxOs = (parsedCtx && parsedCtx.os) || "";
      if (envOs && ctxOs && envOs.trim().slice(0, 3).toLowerCase() !== ctxOs.trim().slice(0, 3).toLowerCase()) {
        return { ok: false, detail: `Environment OS ("${envOs}") doesn't align with Context OS ("${ctxOs}").`, critical: true };
      }
    }

    return { ok: true, detail: "" };
  }

  // ---- S5 (Web): Context — OS and Browser ----
  // Yahoo Web Context requires a "Platform:" line and a "Test Method:" label
  // on the tool line; Adobe Web Context must NOT have either (bare tool line
  // instead) — same convention already enforced on the live-page Sanity side.
  function checkCsvS5Web(description, project) {
    const parsed = parseContextFromDetails(description);
    const osText = (parsed && parsed.os) || "";
    const browserText = (parsed && parsed.browser) || "";
    const hasOs = /windows|mac ?os/i.test(osText);
    const hasBrowserVersion = /(chrome|firefox|safari|edge)\b.*\d/i.test(browserText);
    const missing = [];
    if (!hasOs) missing.push("OS (Windows/macOS)");
    if (!hasBrowserVersion) missing.push("Browser with version");

    if (project === "yahoo") {
      if (!parsed || !parsed.hasPlatformLabel) missing.push('"Platform:" line (required for Yahoo Context)');
      if (!parsed || !parsed.hasTestMethodLabel) missing.push('"Test Method:" label (required for Yahoo Context, not a bare tool line)');
    } else if (parsed && (parsed.hasPlatformLabel || parsed.hasTestMethodLabel)) {
      missing.push('Adobe Context should have a bare tool line \u2014 no "Platform:" line or "Test Method:" label (those are Yahoo-only)');
    }

    return { ok: missing.length === 0, detail: missing.length ? `${missing.join("; ")}.` : "" };
  }

  // ---- S5 (Native): Context — OS and Testing Tool ----
  function checkCsvS5Native(description) {
    const parsed = parseContextFromDetails(description);
    const osText = ((parsed && parsed.os) || "") + " " + description;
    const toolText = ((parsed && parsed.tool) || "") + " " + description;
    const hasOs = /windows|mac ?os|android(\s*\d|\s*version)?|ios(\s*\d|\s*version)?|linux/i.test(osText);
    const hasTool = /nvda|jaws|voiceover|talkback|keyboard|deque|cca|axe auditor|axe devtools/i.test(toolText);
    const missing = [];
    if (!hasOs) missing.push("OS");
    if (!hasTool) missing.push("testing tool/method");
    return { ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}.` : "" };
  }

  // ---- S5a (Native only): No Browser References — CRITICAL ----
  function checkCsvS5aNative(description) {
    const parsed = parseContextFromDetails(description);
    const ctxBlob = [parsed && parsed.os, parsed && parsed.browser, parsed && parsed.tool].filter(Boolean).join(" ");
    const m = ctxBlob.match(/\b(chrome|firefox|safari|edge|opera)\b/i);
    return {
      ok: !m,
      detail: m ? `Browser reference found ("${m[0]}") \u2014 native audits must not reference a browser.` : "",
      critical: true,
    };
  }

  // ---- S6: Issue Type vs Step 1 Consistency ----
  // For Automated issues, the spec says to evaluate this via S12b instead —
  // marked N/A here so it isn't double-counted.
  function checkCsvS6(description, isAutomated) {
    if (isAutomated) return { ok: true, detail: "", na: true };
    return checkStepsIssueTypeConsistency(description);
  }

  // ---- S7: Steps Numbering ----
  function checkCsvS7(description) {
    const numbers = extractStepNumbers(description);
    if (!numbers.length) return { ok: false, detail: "No numbered steps found." };
    const result = checkStepSequence(numbers);
    return { ok: result.ok, detail: result.ok ? "" : `Out of order/gaps: ${numbers.join(",")}.` };
  }

  // ---- S9: Screen Name vs Page Name/Test Unit ----
  function checkCsvS9(description, testUnit) {
    const screenName = extractScreenNameFromDetails(description);
    if (!screenName) return { ok: false, detail: 'No "Screen Name:" found.' };
    if (/,/.test(screenName)) return { ok: true, detail: "", na: true }; // multiple listed -> skip, per spec
    if (!testUnit) return { ok: true, detail: "" };
    const ok = screenName.trim().toLowerCase() === testUnit.trim().toLowerCase();
    return { ok, detail: ok ? "" : `Screen Name "${screenName}" \u2260 Test Unit "${testUnit}".` };
  }

  // ---- S10: WCAG Checkpoint Label (+ Severity capitalization) ----
  // The CSV's "Checkpoint" column holds the broader WCAG *Guideline* (e.g.
  // "2.4 Navigable" — only two segments), not the specific Success Criterion
  // — the real, specific SC (e.g. "2.4.7") lives inside Description under
  // "Applicable WCAG Success Criterion:". Handles both the same-line
  // convention ("...Criterion: 2.4.7 Focus Visible...") and a next-line
  // convention, and tolerates exports where section breaks collapse to runs
  // of spaces instead of real newlines.
  function extractApplicableWcagScCode(description) {
    const m = String(description || "").match(/applicable\s+wcag\s+success\s+criterion\s*:\s*\n?\s*([^\n]*)/i);
    if (!m) return null;
    return extractScCode(m[1]);
  }

  // hasSuccessCriteriaColumn distinguishes "column exists but this row's cell
  // is blank" (fail) from "this CSV doesn't have that column at all" (skip
  // the comparison entirely, rather than failing every single row on a
  // column that was never there).
  function checkCsvS10(description, successCriteria, hasSuccessCriteriaColumn) {
    const scCode = extractApplicableWcagScCode(description);
    const wcagLabel = extractWcagLabel(description);
    const issues = [];
    if (!scCode) {
      issues.push('couldn\'t read a WCAG number from "Applicable WCAG Success Criterion:" in Description');
    }
    if (!wcagLabel) issues.push("no WCAG_ label found in Labels");
    if (scCode && wcagLabel && wcagLabel.number !== scCode) {
      issues.push(`Applicable WCAG Success Criterion (${scCode}) \u2260 Labels WCAG_${wcagLabel.number}`);
    }
    if (hasSuccessCriteriaColumn) {
      const successCriteriaCode = extractScCode(successCriteria);
      if (!successCriteriaCode) {
        issues.push(`couldn't read a WCAG number from the "Success Criteria" column (found: "${successCriteria || "(empty)"}")`);
      } else if (scCode && successCriteriaCode !== scCode) {
        issues.push(`Applicable WCAG Success Criterion (${scCode}) \u2260 "Success Criteria" column (${successCriteriaCode})`);
      }
    }
    const severityToken = extractSeverityLabelToken(description);
    if (severityToken && !/^Severity[123]_Accessibility$/.test(severityToken)) {
      issues.push(`Severity label capitalization wrong ("${severityToken}")`);
    }
    return { ok: issues.length === 0, detail: issues.join("; ") };
  }

  // Loose ("semantic match ok") Step 1 opens-URL check for S12b — separate
  // from the live-page checkStepOneOpensUrl, which requires exact checkpoint-
  // specific wording; this rule explicitly allows fuzzy phrasing.
  function checkCsvStepOneSemanticUrlOpen(description) {
    const stepLines = scopeToStepsSection(description)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9]*\s*\./.test(l));
    const first = stepLines.length ? stepLines[0].replace(/^[a-zA-Z0-9]*\s*\.\s*/, "").trim() : "";
    const ok = /\burl\b/i.test(first) && /\b(open|navigate|go\s+to|launch|access)\b/i.test(first);
    return { ok, detail: ok ? "" : `Step 1 ("${first || "(empty)"}") doesn't convey opening the URL.` };
  }

  // ---- S12: Automation Checks (only if Method = Automated) ----
  function checkCsvS12(description, platform, project) {
    const parsedCtx = parseContextFromDetails(description);
    const toolLine = (parsedCtx && parsedCtx.tool) || "";
    const stepsText = scopeToStepsSection(description);

    if (platform === "web") {
      const expectedToolLine = "chrome on windows using axe devtools chrome browser extension";
      // Yahoo's Context labels this line "Test Method:" (parseContextFromDetails
      // already strips that label into `tool` the same as Adobe's bare line,
      // so the expected wording itself doesn't change — just noted for clarity
      // in the failure message).
      const a_ok = toolLine.trim().toLowerCase() === expectedToolLine && !/nvda|screen reader|assistive|keyboard/i.test(toolLine);
      const b = checkCsvStepOneSemanticUrlOpen(description);
      const c_ok = /f12/i.test(stepsText) && /inspect/i.test(stepsText);
      const issues = [];
      if (!a_ok) {
        const fieldName = project === "yahoo" ? '"Test Method:" line' : "Context's last (bare) line";
        issues.push(
          `${fieldName} should be exactly "Chrome on Windows using axe DevTools Chrome browser extension" (found "${
            toolLine || "(empty)"
          }")`
        );
      }
      if (!b.ok) issues.push(b.detail);
      if (!c_ok) issues.push("No step mentions pressing F12 to open the browser inspect panel.");
      return { ok: issues.length === 0, detail: issues.join("; ") };
    }

    // Native
    const a_ok = /axe devtools|axe auditor/i.test(toolLine) && !/chrome|firefox|safari|edge|opera/i.test(toolLine);
    const stepLines = stepsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9]*\s*\./.test(l));
    const firstStep = stepLines.length ? stepLines[0].replace(/^[a-zA-Z0-9]*\s*\.\s*/, "").trim() : "";
    const b_ok = firstStep.length > 0;
    const c_ok = /\bscan\b/i.test(stepsText);
    const issues = [];
    if (!a_ok) issues.push(`Automation tool not clearly specified, or a browser was referenced (found "${toolLine || "(empty)"}")`);
    if (!b_ok) issues.push("Step 1 doesn't have a clear starting/scanning action.");
    if (!c_ok) issues.push("No step mentions running the automated scan.");
    return { ok: issues.length === 0, detail: issues.join("; ") };
  }

  // Runs the full S1-S12 (+S5a for native) rule set for one CSV row against
  // the selected mode (Adobe/Yahoo x Web/Native). Returns an ordered array
  // of { code, name, ok, detail, na?, critical? }. Adobe and Yahoo share the
  // same check numbers but differ in the expected formatting at several
  // points (Summary prefix, Context Platform:/Test Method: labels, and
  // whether Labels/WCAG_/Severity exist at all — Yahoo issues never have a
  // Labels section, so S10/S11 are marked N/A rather than failed).
  async function runCsvRowChecksV2(mode, fields) {
    const isNative = mode.platform === "native";
    const isYahoo = mode.project === "yahoo";
    const isAutomated = String(fields.method || "").trim().toLowerCase() === "automated";
    const results = [];

    const s1 = isNative ? checkCsvS1Native(fields.summary, mode.project) : checkCsvS1Web(fields.summary, mode.project);
    results.push({ code: "S1", name: "Summary Format", ...s1 });

    results.push({ code: "S2", name: "Attachment Present", ...checkCsvS2(fields.attachments) });

    const s3 = isNative ? checkCsvS3Native(fields.description, mode) : checkCsvS3Web(fields.description, fields.url);
    results.push({ code: "S3", name: isNative ? "Context/Environment Consistency" : "Platform URL", ...s3 });

    const s4 = checkAuthenticationState(fields.description);
    results.push({ code: "S4", name: "Authentication State", ok: s4.ok, detail: s4.detail });

    const s5 = isNative ? checkCsvS5Native(fields.description) : checkCsvS5Web(fields.description, mode.project);
    results.push({ code: "S5", name: isNative ? "OS + Testing Tool" : "OS + Browser", ...s5 });

    if (isNative) {
      results.push({ code: "S5a", name: "No Browser References", ...checkCsvS5aNative(fields.description) });
    }

    results.push({ code: "S6", name: "Issue Type vs Step 1", ...checkCsvS6(fields.description, isAutomated) });
    results.push({ code: "S7", name: "Steps Numbering", ...checkCsvS7(fields.description) });

    const s8 = checkResourceLinkLabel(fields.description);
    results.push({ code: "S8", name: "Resource Link", ok: s8.ok, detail: s8.detail });

    results.push({ code: "S9", name: "Screen Name vs Test Unit", ...checkCsvS9(fields.description, fields.testUnit) });

    // Yahoo issues have no Labels section at all — WCAG_/SeverityN_Accessibility
    // labels never exist, so these are N/A rather than perpetual failures.
    if (isYahoo) {
      results.push({ code: "S10", name: "WCAG Checkpoint Label", ok: true, detail: "N/A (Yahoo has no Labels section)", na: true });
      results.push({ code: "S11", name: "Severity/Impact Consistency", ok: true, detail: "N/A (Yahoo has no Labels section)", na: true });
    } else {
      results.push({
        code: "S10",
        name: "WCAG Checkpoint Label",
        ...checkCsvS10(fields.description, fields.successCriteria, fields.hasSuccessCriteriaColumn),
      });
      const s11 = checkSeverityImpactConsistency(fields.description, fields.impact);
      results.push({ code: "S11", name: "Severity/Impact Consistency", ok: s11.ok, detail: s11.detail });
    }
    if (!isAutomated) {
      results.push({ code: "S12", name: "Automation Checks", ok: true, detail: "N/A (Manual)", na: true });
    } else {
      results.push({ code: "S12", name: "Automation Checks", ...checkCsvS12(fields.description, mode.platform, mode.project) });
    }

    return results;
  }

  // Builds the exact "single summary table plus Flagged Issues section"
  // output the rule spec calls for, as plain markdown text (for Copy Report).
  function buildCsvReportMarkdown(mode, rowResults) {
    const isNative = mode.platform === "native";
    const codes = ["S1", "S2", "S3", "S4", "S5"]
      .concat(isNative ? ["S5a"] : [])
      .concat(["S6", "S7", "S8", "S9", "S10", "S11", "S12"]);

    const header = ["Issue ID", "Summary", "Method"].concat(codes);
    const lines = [];
    lines.push(`| ${header.join(" | ")} |`);
    lines.push(`| ${header.map(() => "---").join(" | ")} |`);

    rowResults.forEach((r) => {
      const cells = [r.issueId || String(r.rowIndex), (r.summary || "").slice(0, 40), r.method || ""];
      codes.forEach((code) => {
        const check = r.checks.find((c) => c.code === code);
        if (!check) {
          cells.push("N/A");
        } else if (check.na) {
          cells.push("N/A");
        } else if (check.ok) {
          cells.push("\u2705");
        } else {
          cells.push(`\u274C ${check.detail}`.replace(/\|/g, "/"));
        }
      });
      lines.push(`| ${cells.join(" | ")} |`);
    });

    lines.push("");
    lines.push("Flagged Issues Summary");
    lines.push("");
    const flagged = rowResults.filter((r) => r.checks.some((c) => !c.ok && !c.na));
    if (!flagged.length) {
      lines.push("No issues flagged \u2014 every row passed every applicable check.");
    } else {
      flagged.forEach((r) => {
        const failed = r.checks.filter((c) => !c.ok && !c.na);
        const critical = failed.filter((c) => c.critical);
        const rest = failed.filter((c) => !c.critical);
        lines.push(`- Issue ${r.issueId || r.rowIndex} (${(r.summary || "").slice(0, 50)}):`);
        critical.forEach((c) => lines.push(`  - \u26A0 CRITICAL \u2014 ${c.code} ${c.name}: ${c.detail}`));
        rest.forEach((c) => lines.push(`  - ${c.code} ${c.name}: ${c.detail}`));
      });
    }

    return lines.join("\n");
  }

  // Small stat card used by the dashboard (Total/Manual/Automated/Failure Rate).
  function buildStatCard(value, label, color) {
    const card = document.createElement("div");
    card.style.flex = "1 1 100px";
    card.style.minWidth = "100px";
    card.style.background = "var(--panel)";
    card.style.border = "1px solid var(--border)";
    card.style.borderRadius = "var(--radius)";
    card.style.padding = "8px 10px";
    card.style.textAlign = "center";

    const valueEl = document.createElement("div");
    valueEl.style.fontSize = "19px";
    valueEl.style.fontWeight = "700";
    valueEl.style.color = color || "var(--text)";
    valueEl.textContent = value;

    const labelEl = document.createElement("div");
    labelEl.style.fontSize = "10px";
    labelEl.style.color = "var(--text-dim)";
    labelEl.style.textTransform = "uppercase";
    labelEl.style.letterSpacing = "0.03em";
    labelEl.style.marginTop = "2px";
    labelEl.textContent = label;

    card.appendChild(valueEl);
    card.appendChild(labelEl);
    return card;
  }

  // Dashboard: Total / Manual / Automated / Failure Rate at a glance.
  function renderCsvDashboard(container, rowResults) {
    const total = rowResults.length;
    const automated = rowResults.filter((r) => String(r.method || "").trim().toLowerCase() === "automated").length;
    const manual = total - automated;
    const failedCount = rowResults.filter((r) => r.checks.some((c) => !c.ok && !c.na)).length;
    const failureRate = total ? Math.round((failedCount / total) * 100) : 0;

    const dash = document.createElement("div");
    dash.style.display = "flex";
    dash.style.flexWrap = "wrap";
    dash.style.gap = "8px";
    dash.style.marginBottom = "10px";

    dash.appendChild(buildStatCard(total, "Total Issues", "var(--accent)"));
    dash.appendChild(buildStatCard(manual, "Manual"));
    dash.appendChild(buildStatCard(automated, "Automated"));
    dash.appendChild(buildStatCard(`${failureRate}%`, "Failure Rate", failureRate > 0 ? "#b3261e" : "var(--ok)"));

    container.appendChild(dash);
  }

  // Fixed check-code order so failure groups always render in the same
  // S1...S12 sequence regardless of which rows/codes happened to fail.
  const CSV_CHECK_ORDER = ["S1", "S2", "S3", "S4", "S5", "S5a", "S6", "S7", "S8", "S9", "S10", "S11", "S12"];

  // Groups every failure by check type (S1, S2, ...) rather than by row, and
  // lists the affected Issue IDs under each — linked to the CSV's URL column
  // (when present) so the row can be opened directly from here.
  function renderCsvFailuresByType(container, rowResults) {
    const byCode = {};
    rowResults.forEach((r) => {
      r.checks.forEach((c) => {
        if (c.ok || c.na) return;
        if (!byCode[c.code]) byCode[c.code] = { name: c.name, critical: false, entries: [] };
        byCode[c.code].critical = byCode[c.code].critical || !!c.critical;
        byCode[c.code].entries.push({
          issueId: r.issueId || String(r.rowIndex),
          issueUrl: r.issueUrl,
          detail: c.detail,
        });
      });
    });

    const codes = Object.keys(byCode).sort((a, b) => CSV_CHECK_ORDER.indexOf(a) - CSV_CHECK_ORDER.indexOf(b));

    if (!codes.length) {
      const okLine = document.createElement("div");
      okLine.className = "count-badge";
      okLine.style.fontWeight = "700";
      okLine.textContent = "No failures \u2014 every row passed every applicable check.";
      container.appendChild(okLine);
      return;
    }

    codes.forEach((code) => {
      const group = byCode[code];
      const block = document.createElement("div");
      block.className = "errors-section";

      const heading = document.createElement("div");
      heading.className = "errors-heading";
      heading.textContent = `${group.critical ? "\u26A0 " : ""}${code} \u2014 ${group.name} (${group.entries.length} issue${
        group.entries.length === 1 ? "" : "s"
      })`;
      block.appendChild(heading);

      group.entries.forEach((e) => {
        const line = document.createElement("div");
        line.className = "count-badge status-error";

        if (e.issueUrl) {
          const link = document.createElement("a");
          link.href = e.issueUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = `#${e.issueId}`;
          link.style.color = "var(--accent)";
          link.style.fontWeight = "700";
          line.appendChild(link);
        } else {
          const idSpan = document.createElement("strong");
          idSpan.textContent = `#${e.issueId}`;
          line.appendChild(idSpan);
        }
        line.appendChild(document.createTextNode(": "));
        renderTextWithHighlightedQuotes(line, e.detail || "See check above.", true);
        block.appendChild(line);
      });

      container.appendChild(block);
    });
  }

  // Renders the dashboard followed by failures grouped by check type —
  // replaces the old one-block-per-row dump.
  function renderCsvResultsV2(container, rowResults) {
    container.innerHTML = "";
    renderCsvDashboard(container, rowResults);
    renderCsvFailuresByType(container, rowResults);
  }

  function renderCsvSanityMode() {
    const modeRow = document.createElement("div");
    modeRow.className = "inline-row";

    const modeLabel = document.createElement("label");
    modeLabel.className = "aligned-label-col";
    modeLabel.textContent = "Project:";
    modeLabel.setAttribute("for", "csv-sanity-mode-select");

    const modeSelect = document.createElement("select");
    modeSelect.id = "csv-sanity-mode-select";
    modeSelect.className = "inline-select";
    CSV_SANITY_MODES.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.key;
      opt.textContent = m.label;
      if (m.key === csvSanityState.modeKey) opt.selected = true;
      modeSelect.appendChild(opt);
    });
    modeSelect.addEventListener("change", () => {
      csvSanityState.modeKey = modeSelect.value;
    });

    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSelect);
    els.content.appendChild(modeRow);

    const notice = document.createElement("div");
    notice.className = "template-notice";
    notice.textContent =
      "Upload a CSV export and click Analyze to run the full S1\u2013S12 rule set (S5a added for Native) across every row. Desktop Web uses Rule Set A; Native/Native iOS/Native Android all use Rule Set B \u2014 within each, Adobe and Yahoo formatting is checked separately (Summary prefix, Context Platform:/Test Method: labels, Labels/WCAG_/Severity presence). Read-only \u2014 nothing is written back. If your CSV has an \"Issue URL\" (or Ticket/Jira link) column, failed Issue IDs are shown as clickable links to that issue, opening in a new tab. Use Copy Report for the full markdown table + Flagged Issues Summary.";
    els.content.appendChild(notice);

    const fileRow = document.createElement("div");
    fileRow.className = "controls-row";

    const fileGroup = document.createElement("div");
    fileGroup.className = "upload-group";

    const fileLabel = document.createElement("label");
    fileLabel.className = "upload-btn";
    fileLabel.setAttribute("for", "csv-sanity-input");
    fileLabel.textContent = "Choose CSV";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";
    fileInput.id = "csv-sanity-input";
    fileInput.hidden = true;

    const fileInfo = document.createElement("div");
    fileInfo.className = "excel-info";

    fileGroup.appendChild(fileLabel);
    fileGroup.appendChild(fileInput);
    fileGroup.appendChild(fileInfo);
    fileRow.appendChild(fileGroup);

    const analyzeBtn = document.createElement("button");
    analyzeBtn.className = "action-btn";
    analyzeBtn.type = "button";
    analyzeBtn.textContent = "Analyze";
    fileRow.appendChild(analyzeBtn);

    const copyReportBtn = document.createElement("button");
    copyReportBtn.className = "copy-btn";
    copyReportBtn.type = "button";
    copyReportBtn.textContent = "Copy Report";
    copyReportBtn.style.display = "none";
    fileRow.appendChild(copyReportBtn);

    els.content.appendChild(fileRow);

    const statusMsg = document.createElement("div");
    statusMsg.className = "count-badge";
    els.content.appendChild(statusMsg);

    const resultsWrap = document.createElement("div");
    resultsWrap.style.marginTop = "8px";
    els.content.appendChild(resultsWrap);

    let csvText = null;
    let lastRowResults = null;
    let lastMode = null;

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        csvText = await file.text();
      } catch (err) {
        setStatus(statusMsg, "Couldn't read the file: " + err.message, true);
        return;
      }
      fileInfo.innerHTML = "";
      const name = document.createElement("span");
      name.textContent = file.name;
      fileInfo.appendChild(name);
      resultsWrap.innerHTML = "";
      copyReportBtn.style.display = "none";
      lastRowResults = null;
      setStatus(statusMsg, `Loaded "${file.name}". Click Analyze to run Sanity across all rows.`, false);
    });

    analyzeBtn.addEventListener("click", async () => {
      if (!csvText) {
        setStatus(statusMsg, "Choose a CSV file first.", true);
        return;
      }
      setStatus(statusMsg, "Analyzing\u2026", false);
      resultsWrap.innerHTML = "";
      copyReportBtn.style.display = "none";

      try {
        const parsed = parseCsv(csvText);
        if (!parsed.rows.length) {
          setStatus(statusMsg, "No data rows found in the CSV.", true);
          return;
        }

        const columnMap = detectCsvColumnsV2(parsed.headers);
        if (columnMap.summary === -1 && columnMap.description === -1) {
          setStatus(
            statusMsg,
            '\u26D4 Couldn\'t find a "Summary" or "Description" column in the CSV header. Columns found: ' +
              parsed.headers.join(", "),
            true
          );
          return;
        }

        const mode = getCsvSanityMode(csvSanityState.modeKey);
        const rowResults = [];
        for (let i = 0; i < parsed.rows.length; i++) {
          const row = parsed.rows[i];
          const get = (idx) => (idx !== -1 ? row[idx] || "" : "");
          const fields = {
            issueId: get(columnMap.issueId),
            summary: get(columnMap.summary),
            description: get(columnMap.description),
            impact: get(columnMap.impact),
            checkpoint: get(columnMap.checkpoint),
            successCriteria: get(columnMap.successCriteria),
            hasSuccessCriteriaColumn: columnMap.successCriteria !== -1,
            testUnit: get(columnMap.testUnit),
            url: get(columnMap.url),
            issueUrl: get(columnMap.issueUrl),
            attachments: get(columnMap.attachments),
            method: get(columnMap.method),
          };

          const checks = await runCsvRowChecksV2(mode, fields);
          rowResults.push({
            rowIndex: i + 2, // +1 for the header row, +1 to make it 1-indexed
            issueId: fields.issueId,
            summary: fields.summary,
            method: fields.method,
            issueUrl: fields.issueUrl,
            checks,
          });
        }

        lastRowResults = rowResults;
        lastMode = mode;
        renderCsvResultsV2(resultsWrap, rowResults);
        copyReportBtn.style.display = "";
        const failedRowCount = rowResults.filter((r) => r.checks.some((c) => !c.ok && !c.na)).length;
        setStatus(
          statusMsg,
          `Analyzed ${parsed.rows.length} row(s) as ${mode.label}. ${failedRowCount} row(s) with failed checks.`,
          failedRowCount > 0
        );
      } catch (err) {
        setStatus(statusMsg, "Error analyzing CSV: " + err.message, true);
      }
    });

    copyReportBtn.addEventListener("click", () => {
      if (!lastRowResults || !lastMode) return;
      const markdown = buildCsvReportMarkdown(lastMode, lastRowResults);
      copyToClipboard(markdown, copyReportBtn);
    });
  }
})();