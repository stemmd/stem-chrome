const API_BASE = "https://api.stem.md";

let pageData = null;
let stems = [];
let bookmarkItems = []; // flat list of { id, title, url, folderId }

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const loading = document.getElementById("loading");
  const authScreen = document.getElementById("auth-screen");
  const mainScreen = document.getElementById("main-screen");

  // Check auth
  try {
    const res = await fetch(`${API_BASE}/notifications/count`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Not authed");
  } catch {
    loading.style.display = "none";
    authScreen.style.display = "block";
    return;
  }

  // Get page metadata from content script
  chrome.runtime.sendMessage({ type: "get_page_data" }, async (data) => {
    pageData = data || {};
    document.getElementById("page-title").textContent = pageData.title || "Untitled page";
    document.getElementById("page-url").textContent = pageData.url || "";

    // Fetch user's stems
    try {
      const res = await fetch(`${API_BASE}/stems`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        stems = json.stems || [];
        populateStems("stem-select");
        populateStems("import-stem-select");
      }
    } catch {}

    loading.style.display = "none";
    mainScreen.style.display = "block";
    updateSaveButton();
  });
}

function populateStems(selectId) {
  const select = document.getElementById(selectId);
  stems.forEach((stem) => {
    const opt = document.createElement("option");
    opt.value = stem.id;
    opt.textContent = `${stem.emoji || ""} ${stem.title}`.trim();
    select.appendChild(opt);
  });
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

document.getElementById("tab-save")?.addEventListener("click", () => {
  document.getElementById("tab-save").classList.add("active");
  document.getElementById("tab-import").classList.remove("active");
  document.getElementById("panel-save").classList.remove("hidden");
  document.getElementById("panel-import").classList.add("hidden");
});

document.getElementById("tab-import")?.addEventListener("click", () => {
  document.getElementById("tab-import").classList.add("active");
  document.getElementById("tab-save").classList.remove("active");
  document.getElementById("panel-import").classList.remove("hidden");
  document.getElementById("panel-save").classList.add("hidden");
  loadBookmarks();
});

// ── Save Page ────────────────────────────────────────────────────────────────

function updateSaveButton() {
  const select = document.getElementById("stem-select");
  const btn = document.getElementById("save-btn");
  btn.disabled = !select.value;
}

document.getElementById("stem-select")?.addEventListener("change", updateSaveButton);

document.getElementById("save-btn")?.addEventListener("click", async () => {
  const btn = document.getElementById("save-btn");
  const status = document.getElementById("status");
  const select = document.getElementById("stem-select");
  const note = document.getElementById("note").value.trim();

  if (!select.value || !pageData?.url) return;

  btn.disabled = true;
  btn.textContent = "Saving...";
  status.style.display = "none";

  try {
    const body = {
      url: pageData.url,
      title: pageData.title || undefined,
      description: pageData.description || undefined,
      image_url: pageData.image || undefined,
      favicon_url: pageData.favicon || undefined,
      note: note || undefined,
    };

    const res = await fetch(`${API_BASE}/stems/${select.value}/artifacts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      status.className = "status success";
      status.textContent = "Saved!";
      status.style.display = "block";
      btn.textContent = "Saved";
      setTimeout(() => window.close(), 1500);
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save");
    }
  } catch (err) {
    status.className = "status error";
    status.textContent = err.message || "Something went wrong";
    status.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Save artifact";
  }
});

// ── Import Bookmarks ─────────────────────────────────────────────────────────

let bookmarksLoaded = false;

function loadBookmarks() {
  if (bookmarksLoaded) return;

  chrome.permissions.request({ permissions: ["bookmarks"] }, (granted) => {
    if (!granted) {
      document.getElementById("bm-loading").textContent =
        "Bookmark access was denied. Click the Import tab again to retry.";
      return;
    }

    chrome.bookmarks.getTree((tree) => {
      const treeEl = document.getElementById("bm-tree");
      treeEl.innerHTML = "";
      bookmarkItems = [];
      renderBookmarkTree(tree[0].children, treeEl, 0);
      document.getElementById("bm-loading").style.display = "none";
      document.getElementById("bm-container").style.display = "block";
      updateSelectedCount();
      bookmarksLoaded = true;
    });
  });
}

function renderBookmarkTree(nodes, parentEl, depth) {
  for (const node of nodes) {
    if (node.children) {
      // Folder
      const folder = document.createElement("div");
      folder.className = "bm-folder";

      const header = document.createElement("button");
      header.className = "bm-folder-header";
      header.style.paddingLeft = `${10 + depth * 12}px`;
      header.innerHTML = `<span class="bm-chevron">▶</span> 📁 ${escapeHtml(node.title || "Untitled")}`;

      const children = document.createElement("div");
      children.className = "bm-children hidden";

      header.addEventListener("click", () => {
        children.classList.toggle("hidden");
        header.querySelector(".bm-chevron").textContent =
          children.classList.contains("hidden") ? "▶" : "▼";
      });

      folder.appendChild(header);
      folder.appendChild(children);
      parentEl.appendChild(folder);

      renderBookmarkTree(node.children, children, depth + 1);
    } else if (node.url && node.url.startsWith("http")) {
      // Bookmark item
      const item = document.createElement("label");
      item.className = "bm-item";
      item.style.paddingLeft = `${10 + depth * 12}px`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.bmId = node.id;
      checkbox.addEventListener("change", updateSelectedCount);

      const title = document.createElement("span");
      title.className = "bm-item-title";
      title.textContent = node.title || node.url;
      title.title = node.url;

      item.appendChild(checkbox);
      item.appendChild(title);
      parentEl.appendChild(item);

      bookmarkItems.push({ id: node.id, title: node.title, url: node.url });
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getSelectedBookmarks() {
  const checked = document.querySelectorAll('#bm-tree input[type="checkbox"]:checked');
  return Array.from(checked).map((cb) => {
    return bookmarkItems.find((b) => b.id === cb.dataset.bmId);
  }).filter(Boolean);
}

function updateSelectedCount() {
  const selected = getSelectedBookmarks();
  document.getElementById("bm-selected-count").textContent = selected.length;
  const stemSelected = document.getElementById("import-stem-select").value;
  document.getElementById("import-btn").disabled = selected.length === 0 || !stemSelected;
}

document.getElementById("import-stem-select")?.addEventListener("change", updateSelectedCount);

// Select all / deselect all toggle
document.getElementById("bm-select-all")?.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll('#bm-tree input[type="checkbox"]');
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  checkboxes.forEach((cb) => (cb.checked = !allChecked));
  document.getElementById("bm-select-all").textContent = allChecked ? "Select all" : "Deselect all";
  updateSelectedCount();
});

// Import button
document.getElementById("import-btn")?.addEventListener("click", async () => {
  const btn = document.getElementById("import-btn");
  const status = document.getElementById("import-status");
  const progress = document.getElementById("import-progress");
  const progressText = document.getElementById("import-progress-text");
  const bar = document.getElementById("import-bar");
  const stemId = document.getElementById("import-stem-select").value;
  const selected = getSelectedBookmarks();

  if (!stemId || selected.length === 0) return;

  btn.disabled = true;
  btn.textContent = "Importing...";
  status.style.display = "none";
  progress.style.display = "block";

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < selected.length; i++) {
    const bm = selected[i];
    progressText.textContent = `${i + 1} of ${selected.length}`;
    bar.style.width = `${((i + 1) / selected.length) * 100}%`;

    try {
      const res = await fetch(`${API_BASE}/stems/${stemId}/artifacts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: bm.url,
          title: bm.title || undefined,
        }),
      });
      if (res.ok) {
        imported++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Small delay to avoid rate limiting
    if (i < selected.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  progress.style.display = "none";

  if (failed === 0) {
    status.className = "status success";
    status.textContent = `Imported ${imported} bookmark${imported !== 1 ? "s" : ""}`;
  } else {
    status.className = "status success";
    status.textContent = `Imported ${imported}, ${failed} failed`;
  }
  status.style.display = "block";
  btn.textContent = "Done";
});

init();
