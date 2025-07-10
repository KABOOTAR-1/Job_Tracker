let trackingTabs = {};

// Add this at the start to restore tracking state
chrome.storage.local.get(['trackingTabs'], (result) => {
    if (result.trackingTabs) {
        trackingTabs = result.trackingTabs;
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const tabId = msg.tabId || sender.tab.id;

    if (msg.action === "toggleTracking") {
        if (trackingTabs[tabId]) {
            disableTracking(tabId);
            sendResponse({ isTracking: false });
        } else {
            enableTracking(tabId);
            sendResponse({ isTracking: true });
        }
        return true;
    }

    if (msg.action === "enableTracking") {
        console.log("Received enableTracking message");
        if (!trackingTabs[tabId]) {
            enableTracking(tabId);
            console.log(`Tracking ENABLED (from prompt) on tab ${tabId}`);
            sendResponse({ success: true });
        } else {
            console.log(`Tab ${tabId} already being tracked`);
            sendResponse({ success: true, alreadyTracking: true });
        }
        return true; // Required to indicate async response
    }

    if (msg.action === "getTrackingStatus") {
        sendResponse({ isTracking: !!trackingTabs[tabId] });
        return true;
    }

    if (msg.action === "saveCompany" && msg.company) {
        console.log(`Company detected: ${msg.company}`);
        
        // Check if company already exists in storage
        chrome.storage.local.get([msg.company], (result) => {
            if (result[msg.company]) {
                console.log(`Company already in storage: ${msg.company} (first tracked on ${new Date(result[msg.company]).toLocaleString()})`);
            } else {
                const timestamp = Date.now();
                chrome.storage.local.set({ [msg.company]: timestamp }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error saving company: ${chrome.runtime.lastError.message}`);
                    } else {
                        console.log(`NEW COMPANY SAVED: ${msg.company} at ${new Date(timestamp).toLocaleString()}`);
                        
                        // Get the count of all tracked companies
                        chrome.storage.local.get(null, (allData) => {
                            const companyCount = Object.keys(allData).length;
                            console.log(`Total companies tracked: ${companyCount}`);
                        });
                    }
                });
            }
        });
        
        return true; // Indicate we'll send an async response
    }
});

// Modify enableTracking function
function enableTracking(tabId) {
    trackingTabs[tabId] = true;
    // Persist tracking state
    chrome.storage.local.set({ trackingTabs });
    console.log(`Tracking ENABLED on tab ${tabId}`);
    
    // Only try to send a message if we have a valid numeric tab ID
    if (typeof tabId === 'number') {
        try {
            chrome.tabs.sendMessage(tabId, { action: "startTracking" }, (response) => {
                if (chrome.runtime.lastError) {
                    // Just log the error, don't throw - this is often expected when tab isn't ready
                    console.log(`Note: ${chrome.runtime.lastError.message} - This is normal if the content script isn't ready yet`);
                } else {
                    console.log("startTracking message delivered successfully");
                }
            });
        } catch (err) {
            console.warn("Error sending startTracking message:", err);
            // Continue execution - don't let this error block other functionality
        }
    } else {
        console.log("No valid tab ID available, skipping message send");
    }
}

function disableTracking(tabId) {
    delete trackingTabs[tabId];
    // Persist tracking state
    chrome.storage.local.set({ trackingTabs });
    console.log(`Tracking DISABLED on tab ${tabId}`);
    
    // Only try to send a message if we have a valid numeric tab ID
    if (typeof tabId === 'number') {
        try {
            chrome.tabs.sendMessage(tabId, { action: "stopTracking" }, (response) => {
                if (chrome.runtime.lastError) {
                    // Just log the error, don't throw - this is often expected when tab isn't ready
                    console.log(`Note: ${chrome.runtime.lastError.message} - This is normal if the content script isn't ready yet`);
                } else {
                    console.log("stopTracking message delivered successfully");
                }
            });
        } catch (err) {
            console.warn("Error sending stopTracking message:", err);
            // Continue execution - don't let this error block other functionality
        }
    } else {
        console.log("No valid tab ID available, skipping message send");
    }
}

// Auto disable on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    if (trackingTabs[tabId]) {
        disableTracking(tabId);
    }
});

// Replace the tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && trackingTabs[tabId]) {
        // Only disable tracking if the URL has changed
        chrome.tabs.get(tabId, (currentTab) => {
            if (currentTab.url !== tab.url) {
                disableTracking(tabId);
            } else if (changeInfo.status === "complete") {
                // Reinitialize tracking on the same URL
                enableTracking(tabId);
            }
        });
    }
});
