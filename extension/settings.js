chrome.storage.local.get(["apiUrl", "apiKey"], ({ apiUrl, apiKey }) => {
  if (apiUrl) document.getElementById("api-url").value = apiUrl;
  if (apiKey) document.getElementById("api-key").value = apiKey;
});

document.getElementById("save-btn").addEventListener("click", () => {
  const apiUrl = document.getElementById("api-url").value.trim().replace(/\/$/, "");
  const apiKey = document.getElementById("api-key").value.trim();

  chrome.storage.local.set({ apiUrl, apiKey }, () => {
    const msg = document.getElementById("saved-msg");
    msg.style.display = "inline";
    setTimeout(() => { msg.style.display = "none"; }, 2500);
    // Refresh badge with new config
    chrome.runtime.sendMessage({ type: "UPDATE_BADGE" });
  });
});
