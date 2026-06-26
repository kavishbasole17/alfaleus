async function getConfig() {
  return new Promise(res => chrome.storage.local.get(["apiUrl", "apiKey"], res));
}

function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = `status ${type}`;
  el.style.display = "block";
}

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById("config-link")?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function init() {
  const { apiUrl, apiKey } = await getConfig();

  if (!apiUrl || !apiKey) {
    document.getElementById("no-config").style.display = "block";
    return;
  }

  document.getElementById("form-area").style.display = "block";

  // Pre-fill current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) document.getElementById("url").value = tab.url;

  // Auto-fill competitor name from page title
  if (tab?.title) {
    const nameInput = document.getElementById("name");
    // Simplify: take domain name
    try {
      const hostname = new URL(tab.url).hostname.replace("www.", "");
      nameInput.value = hostname.split(".")[0].charAt(0).toUpperCase() +
                        hostname.split(".")[0].slice(1);
    } catch {}
  }

  document.getElementById("track-btn").addEventListener("click", async () => {
    const url     = document.getElementById("url").value.trim();
    const name    = document.getElementById("name").value.trim();
    const section = document.getElementById("section").value;

    if (!name) { showStatus("Please enter a competitor name.", "error"); return; }

    const btn = document.getElementById("track-btn");
    btn.disabled = true;
    btn.textContent = "Adding…";

    try {
      const resp = await fetch(`${apiUrl}/api/competitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ name, url, section, check_interval: 360 }),
      });

      if (resp.status === 409) {
        showStatus("This URL is already being tracked.", "error");
        return;
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      showStatus(`✓ ${name} added! First scrape running in background.`, "success");
      chrome.runtime.sendMessage({ type: "UPDATE_BADGE" });
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Track This Page";
    }
  });
}

init();
