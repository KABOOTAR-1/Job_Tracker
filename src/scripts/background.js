let trackingTabs = {};

// Backend API URL - change this to your actual API URL
const API_BASE_URL = 'http://localhost:5000/api';

// Add this at the start to restore tracking state
chrome.storage.local.get(['trackingTabs'], (result) => {
    if (result.trackingTabs) {
        trackingTabs = result.trackingTabs;
    }
});

// Function to save company data to the backend
async function saveCompanyToBackend(companyData) {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(companyData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Company saved to backend: ${companyData.name}`, data.data);
            
            // Show notification to user
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icon-48.png',
                title: 'Job Application Tracked',
                message: `Successfully saved application to ${companyData.name}`
            });
        } else {
            throw new Error(data.message || 'Failed to save company data');
        }
    } catch (error) {
        console.error('Error saving to backend:', error.message);
        
        // Fall back to local storage if backend fails
        fallbackToLocalStorage(companyData);
    }
}

// Fallback function to use local storage if backend is unavailable
function fallbackToLocalStorage(companyData) {
    console.log('Falling back to local storage');
    chrome.storage.local.set({ [companyData.name]: Date.now() }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error saving company locally: ${chrome.runtime.lastError.message}`);
        } else {
            console.log(`Company saved locally as fallback: ${companyData.name}`);
            
            // Show notification to user about fallback
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icon-48.png',
                title: 'Local Backup Created',
                message: `Saved ${companyData.name} locally (backend unavailable)`
            });
        }
    });
}

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
        
        // Get current tab URL to save with company data
        const tabId = sender.tab.id;
        chrome.tabs.get(tabId, (tab) => {
            const companyData = {
                name: msg.company,
                url: tab.url,
                applicationDate: new Date(),
                status: 'applied',
                notes: `Applied via ${tab.title}`,
                browserIdentifier: chrome.runtime.id // Use extension ID as identifier
            };
            
            // Send to backend API
            saveCompanyToBackend(companyData);
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
