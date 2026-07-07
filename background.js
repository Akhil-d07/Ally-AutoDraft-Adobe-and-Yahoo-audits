// Opens the tool as a separate floating window (fixed size) instead of the
// default anchored dropdown popup, so it can sit next to the auditor page
// and stays open when you click over to that page.

const WINDOW_WIDTH = 520;
const WINDOW_HEIGHT = 700;

let toolWindowId = null;

chrome.action.onClicked.addListener(async () => {
  if (toolWindowId !== null) {
    try {
      await chrome.windows.update(toolWindowId, { focused: true });
      return;
    } catch (e) {
      // Window was closed by the user; fall through and open a new one.
      toolWindowId = null;
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  });
  toolWindowId = win.id;
});

chrome.windows.onRemoved.addListener((closedId) => {
  if (closedId === toolWindowId) toolWindowId = null;
});
