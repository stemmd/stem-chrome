const API_BASE = "https://api.stem.md";

let pageData = null;
let stems = [];

async function init() {
  const loading = document.getElementById("loading");
  const authScreen = document.getElementById("auth-screen");
  const saveScreen = document.getElementById("save-screen");

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
      const res = await fetch(`${API_BASE}/stems`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        stems = json.stems || [];
        populateStems();
      }
    } catch {}

    loading.style.display = "none";
    saveScreen.style.display = "block";
    updateSaveButton();
  });
}

function populateStems() {
  const select = document.getElementById("stem-select");
  stems.forEach((stem) => {
    const opt = document.createElement("option");
    opt.value = stem.id;
    opt.textContent = `${stem.emoji || ""} ${stem.title}`.trim();
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

  const stemId = select.value;

  try {
    const body = {
      url: pageData.url,
      title: pageData.title || undefined,
      description: pageData.description || undefined,
      image_url: pageData.image || undefined,
      favicon_url: pageData.favicon || undefined,
      note: note || undefined,
    };

    const res = await fetch(`${API_BASE}/stems/${stemId}/finds`, {
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
    btn.textContent = "Save find";
  }
});

init();
