// Background service worker for Testcim Extension (Manifest V3)

// Configure side panel to open when action icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err: unknown) => console.error('Error setting panel behavior:', err));
  }
});

// Fallback action click handler
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && tab.windowId) {
    chrome.sidePanel
      .open({ windowId: tab.windowId })
      .catch((err: unknown) => console.error('Error opening side panel:', err));
  }
});

// Message hub
chrome.runtime.onMessage.addListener((message: { action?: string; rect?: unknown; viewport?: unknown; reason?: string }, sender, sendResponse) => {
  if (message.action === 'REQUEST_SNIP') {
    void handleRequestSnip(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'SNIP_CAPTURED') {
    const windowId = sender.tab?.windowId;
    void handleSnipCaptured(windowId, message.rect, message.viewport);
    return false;
  }

  if (message.action === 'SNIP_CANCELLED') {
    // Forward to side panel
    void chrome.runtime.sendMessage({
      action: 'SNIP_CANCELLED_FORWARD',
      reason: message.reason,
    });
    return false;
  }

  return false;
});

async function handleRequestSnip(
  sendResponse: (res: { ok: boolean; reason?: string }) => void,
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) {
      sendResponse({ ok: false, reason: 'no_active_tab' });
      return;
    }

    // Attempt to inject content script and CSS if not present
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css'],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch {
      // Content script may already be injected or page doesn't allow scripting (e.g. chrome://)
    }

    // Trigger snip
    chrome.tabs.sendMessage(tab.id, { action: 'START_SNIP' }, () => {
      if (chrome.runtime.lastError?.message) {
        sendResponse({ ok: false, reason: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
  } catch (err) {
    sendResponse({
      ok: false,
      reason: err instanceof Error ? err.message : 'failed_to_trigger_snip',
    });
  }
}

async function handleSnipCaptured(
  windowId: number | undefined,
  rect: unknown,
  viewport: unknown,
): Promise<void> {
  try {
    const dataUrl =
      typeof windowId === 'number'
        ? await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
        : await chrome.tabs.captureVisibleTab({ format: 'png' });

    // Forward image and crop coordinates to side panel for cropping and review
    await chrome.runtime.sendMessage({
      action: 'PROCESS_SNIP',
      dataUrl,
      rect,
      viewport,
    });
  } catch (err) {
    await chrome.runtime.sendMessage({
      action: 'SNIP_ERROR',
      reason: err instanceof Error ? err.message : 'screenshot_failed',
    });
  }
}
