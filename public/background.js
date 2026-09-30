import { classifySolanaIdentifier } from "../src/security/solana.js";

const HOSTS = new Map([
  ["solscan.io", "solscan"],
  ["www.solscan.io", "solscan"],
  ["solana.fm", "solanafm"],
  ["www.solana.fm", "solanafm"],
  ["explorer.solana.com", "explorer"],
]);

function parseNavigation(tabId, rawUrl) {
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const source = HOSTS.get(url.hostname);
  if (!source) return null;

  const parts = url.pathname.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  let resourceType = null;
  let resourceId = null;

  if (source === "solanafm" && parts[0] === "address" && parts[2] === "transactions") {
    resourceType = "account";
    resourceId = parts[1];
  } else if (
    (source === "solscan" || source === "explorer") &&
    parts[0] === "account" || source === "explorer" && parts[0] === "address"
  ) {
    resourceType = "account";
    resourceId = parts[1];
  } else if (parts[0] === "tx") {
    resourceType = "transaction";
    resourceId = parts[1];
  }

  if (!resourceType || !resourceId || classifySolanaIdentifier(resourceId) !== resourceType) {
    return null;
  }

  return {
    tabId,
    source,
    chain: "solana",
    network: "mainnet-beta",
    resourceType,
    resourceId,
    observedAt: new Date().toISOString(),
    sourceUrl: url.href,
  };
}

async function captureTab(tabId, rawUrl) {
  const context = parseNavigation(tabId, rawUrl);
  const key = `solanaData:${tabId}`;

  if (!context) {
    await chrome.storage.local.remove(key);
    return;
  }

  await chrome.storage.local.set({ [key]: context });

  try {
    await chrome.runtime.sendMessage({ action: "updateData", context });
  } catch {
    // Popup may not currently have a listener.
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await captureTab(tabId, tab.url);
  } catch {
    // Ignore tabs that disappear during activation.
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await captureTab(tabId, changeInfo.url);
  } else if (tab.url) {
    await captureTab(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await chrome.storage.local.remove(`solanaData:${tabId}`);
});
