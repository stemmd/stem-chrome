const STEM_BASE = "https://stem.md";

let pageData = null;
let stems = [];

async function init() {
  const loading = document.getElementById("loading");
  const authScreen = document.getElementById("auth-screen");
  const saveScreen = document.getElementById("save-screen");

  // Check auth
  try {
    const res = await fetch(`${STEM_BASE}/api/notifications/count`, {
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
      const res = await fetch(`${STEM_BASE}/api/stems/mine`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        stems = json.stems || [];
        populateStems();
      }
    } catch {
      // If /api/stems/mine doesn't exist yet, user can still type
    }

    loading.style.display = "none";
    saveScreen.style.display = "block";
    updateSaveButton();
  });
}

function populateStems() {
  const select = document.getElementById("stem-select");
  stems.forEach((stem) => {
    const opt = document.createElement("option");
    opt.value = `${stem.username}/${stem.slug}`;
    opt.textContent = `${stem.emoji || ""} ${stem.title}`.trim();
    opt.dataset.stemId = stem.id;
    select.appendChild(opt);
  });
}

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

  const selectedOption = select.options[select.selectedIndex];
  const stemPath = select.value;

  try {
    // Build form data matching the add_find action
    const formData = new FormData();
    formData.append("intent", "add_find");
    formData.append("url", pageData.url);
    if (note) formData.append("note", note);
    if (pageData.title) formData.append("og_title", pageData.title);
    if (pageData.description) formData.append("og_description", pageData.description);
    if (pageData.image) formData.append("og_image", pageData.image);
    if (pageData.favicon) formData.append("og_favicon", pageData.favicon);

    const domain = new URL(pageData.url).hostname.replace("www.", "");
    formData.append("og_domain", domain);

    const res = await fetch(`${STEM_BASE}/${stemPath}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (res.ok || res.status === 302) {
      status.className = "status success";
      status.textContent = "Saved!";
      status.style.display = "block";
      btn.textContent = "Saved";

      // Auto-close after 1.5s
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
    btn.textContent = "Save find";
  }
});

init();
