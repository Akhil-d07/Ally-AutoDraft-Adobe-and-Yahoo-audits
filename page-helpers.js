// Injected into the auditor page (by app.js, via chrome.scripting) right
// before every read/write. It holds the one copy of the "find a field on the
// page" logic, so the selectors themselves can live in a single place —
// PAGE_SELECTORS in app.js — instead of being repeated in every injected
// function.
//
// Lookup order for a field:
//   1. each CSS selector listed for it in PAGE_SELECTORS.selectors, in order
//   2. (best effort) the field's visible label text from PAGE_SELECTORS.labels,
//      so a small layout shift (e.g. a new field pushing :nth-child(12) down)
//      doesn't silently break the tool.
(function () {
  "use strict";

  function listOf(v) {
    return Array.isArray(v) ? v : v ? [v] : [];
  }

  function firstEl(selectors) {
    const list = listOf(selectors);
    for (let i = 0; i < list.length; i++) {
      try {
        const el = document.querySelector(list[i]);
        if (el) return el;
      } catch (e) {
        /* invalid selector in the config — skip it */
      }
    }
    return null;
  }

  // Same rules the tool has always used: a SELECT reads as its visible option
  // text (not the option's value attribute), inputs/textareas as their value,
  // anything else as its text.
  function textOf(el) {
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

  function norm(t) {
    return String(t || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/:$/, "")
      .toLowerCase();
  }

  // Finds the element next to a visible label ("Page", "Page:", ...) inside the
  // issue form. Only used when the CSS selectors found nothing.
  function elByLabel(labelText) {
    const root = document.querySelector("#issue-form") || document.body;
    const want = norm(labelText);
    if (!want) return null;
    const nodes = root.querySelectorAll("label, legend, span, div, strong, b, dt, th, h2, h3, h4, h5, h6");
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const own = Array.prototype.filter
        .call(n.childNodes, (c) => c.nodeType === 3)
        .map((c) => c.textContent)
        .join(" ");
      const isLabel = norm(own) === want || (n.children.length === 0 && norm(n.textContent) === want);
      if (!isLabel) continue;
      const next = n.nextElementSibling || (n.parentElement && n.parentElement.nextElementSibling);
      if (next) return next;
    }
    return null;
  }

  function el(S, key) {
    const found = firstEl(S.selectors[key]);
    if (found) return found;
    const labels = listOf(S.labels && S.labels[key]);
    for (let i = 0; i < labels.length; i++) {
      const byLabel = elByLabel(labels[i]);
      if (byLabel) return byLabel;
    }
    return null;
  }

  // First NON-EMPTY text among the listed selectors (so a primary selector that
  // exists but is empty still falls through to the next one), then the label.
  function val(S, key) {
    const list = listOf(S.selectors[key]);
    for (let i = 0; i < list.length; i++) {
      let node = null;
      try {
        node = document.querySelector(list[i]);
      } catch (e) {
        node = null;
      }
      const t = textOf(node);
      if (t) return t;
    }
    const labels = listOf(S.labels && S.labels[key]);
    for (let i = 0; i < labels.length; i++) {
      const t = textOf(elByLabel(labels[i]));
      if (t) return t;
    }
    return "";
  }

  // Writes through the native property setter (bypassing React's overridden
  // one) and fires input/change so frameworks tracking onChange notice.
  function setValue(S, key, value) {
    const target = el(S, key);
    if (!target) return false;

    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      const proto = target.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(target, value);
      else target.value = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (target.isContentEditable) {
      target.textContent = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }

  // The Attachments area. Web: fixed position first, label as fallback.
  // Native: label first, fixed position as fallback (its position differs).
  function attachments(S, native) {
    const a = S.attachments;
    function byLabel() {
      const fieldset = document.querySelector(a.fieldset);
      if (!fieldset) return null;
      const kids = Array.prototype.slice.call(fieldset.children);
      for (let i = 0; i < kids.length; i++) {
        if (/^attachments?\b/i.test((kids[i].textContent || "").trim())) return kids[i];
      }
      return null;
    }
    const byPosition = () => document.querySelector(native ? a.native : a.web);
    return native ? byLabel() || byPosition() : byPosition() || byLabel();
  }

  window.__A11Y_DRAFTER__ = { firstEl, textOf, elByLabel, el, val, setValue, attachments };
})();
