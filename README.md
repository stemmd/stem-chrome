# Stem for Chrome

Save, curate, and share your artifacts. The Chrome extension for [Stem](https://stem.md).

For the curious. Save pages to themed collections, discover what others are exploring, and go deep on what interests you.

## What it does

- Save any page to one of your stems with a single click
- Automatically extracts the page title, description, image, and favicon
- Add a note about why the page is interesting before saving
- Import bookmarks from Chrome into any stem (bulk import with progress)
- Works with your existing Stem account (no separate login)

## Install

**From the Chrome Web Store** (coming soon)

**From source:**

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder

## How it works

When you click the Stem icon, the extension:

1. Reads the current page's Open Graph metadata (title, description, image)
2. Fetches your stems from your Stem account
3. Lets you pick a stem and add an optional note
4. Saves the artifact via the Stem API

All data extraction happens locally in your browser. Only the page URL and metadata you choose to save are sent to Stem.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the current page's title and URL when you click Save |
| `stem.md` host | Authenticate with your account and save artifacts |
| `bookmarks` (optional) | Only requested when you use the Import Bookmarks feature |


## Privacy

No browsing data is collected, stored, or transmitted unless you explicitly save a page. See [stem.md/privacy](https://stem.md/privacy).

## Development

The extension is vanilla JS with no build step. Edit the files and reload at `chrome://extensions`.

```
manifest.json    Manifest V3 config
popup.html/js    Save-to-Stem popup UI
content.js       Page metadata extraction
background.js    Auth and message passing
icons/           Extension icons
```

## License

MIT License. See [LICENSE](LICENSE).
