// popup.js
const btn = document.getElementById("toggleTracking");

function updateButton(isTracking) {
    btn.textContent = isTracking ? "Turn OFF Tracking" : "Turn ON Tracking";
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // Get current tracking status
    chrome.runtime.sendMessage({ action: "getTrackingStatus", tabId }, (response) => {
        updateButton(response?.isTracking);
    });

    // Toggle tracking on button click
    btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "toggleTracking", tabId }, (response) => {
            updateButton(response?.isTracking);
        });
    });
});
