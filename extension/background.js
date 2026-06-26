// Service Worker — MV3

const POLL_ALARM = "poll_unread";
const POLL_INTERVAL_MINUTES = 5;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, {
    periodInMinutes: POLL_INTERVAL_MINUTES,
  });
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) updateBadge();
});

async function getConfig() {
  return new Promise((res) =>
    chrome.storage.local.get(["apiUrl", "apiKey"], res)
  );
}

async function updateBadge() {
  const { apiUrl, apiKey } = await getConfig();
  if (!apiUrl || !apiKey) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  try {
    const resp = await fetch(`${apiUrl}/api/changes/unread-count`, {
      headers: { "X-API-Key": apiKey },
    });
    if (!resp.ok) throw new Error("API error");
    const { count } = await resp.json();
    const label = count > 0 ? String(count > 99 ? "99+" : count) : "";
    chrome.action.setBadgeText({ text: label });
    chrome.action.setBadgeBackgroundColor({ color: "#1db954" });
  } catch {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "UPDATE_BADGE") {
    updateBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "GET_CONFIG") {
    getConfig().then(sendResponse);
    return true;
  }
});
