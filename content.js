// Content script: extracts page metadata for the Save to Stem popup.

function extractMetadata() {
  const getMeta = (name) => {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content") : "";
  };

  const url = window.location.href;
  const title = getMeta("og:title") || document.title || "";
  const description = getMeta("og:description") || getMeta("description") || "";
  const image = getMeta("og:image") || "";
  const favicon =
    document.querySelector('link[rel="icon"]')?.href ||
    document.querySelector('link[rel="shortcut icon"]')?.href ||
    `${window.location.origin}/favicon.ico`;

  return { url, title, description, image, favicon };
}

// Listen for requests from background/popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "extract_metadata") {
    sendResponse(extractMetadata());
  }
});
