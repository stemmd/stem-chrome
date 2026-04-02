// Background service worker for Stem extension.
// Handles auth state and communication between content script and popup.

const STEM_BASE = "https://stem.md";

// Check if user is logged in by fetching the session
async function checkAuth() {
  try {
    const res = await fetch(`${STEM_BASE}/api/notifications/count`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.count !== undefined ? true : null;
  } catch {
    return null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "check_auth") {
    checkAuth().then((authed) => sendResponse({ authed }));
    return true; // async response
  }

  if (msg.type === "get_page_data") {
    // Get data from the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: "No active tab" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "extract_metadata" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, use tab info as fallback
          sendResponse({
            url: tabs[0].url,
            title: tabs[0].title || "",
            description: "",
            image: tabs[0].favIconUrl || "",
            favicon: tabs[0].favIconUrl || "",
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  }
});
