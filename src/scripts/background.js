let trackingTabs = {};

// Backend API URL - change this to your actual API URL
const API_BASE_URL = 'https://job-tracker-bb45.onrender.com/api';

// Authentication storage keys
const TOKEN_STORAGE_KEY = 'jt_auth_token';
const USER_STORAGE_KEY = 'jt_user_data';
const TOKEN_EXPIRY_KEY = 'jt_token_expiry';

// Debouncing mechanism to prevent duplicate requests
// Store last request timestamps by company name and URL
let lastRequestTimestamps = {};
const DEBOUNCE_TIMEOUT = 5000; // 5 seconds

// Add this at the start to restore tracking state
chrome.storage.local.get(['trackingTabs'], (result) => {
    if (result.trackingTabs) {
        trackingTabs = result.trackingTabs;
    }
});

// Check if user is authenticated
async function isAuthenticated() {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY], (result) => {
            const token = result[TOKEN_STORAGE_KEY];
            const expiry = result[TOKEN_EXPIRY_KEY];
            const now = new Date().getTime();
            
            console.log('Auth check:', { 
                hasToken: !!token, 
                hasExpiry: !!expiry,
                isExpired: expiry ? now >= expiry : true,
                timeRemaining: expiry ? Math.floor((expiry - now) / (1000 * 60 * 60 * 24)) + ' days' : 'expired'
            });
            
            resolve(token && expiry && now < expiry);
        });
    });
}

// Get auth token from storage
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY], (result) => {
            resolve(result[TOKEN_STORAGE_KEY] || null);
        });
    });
}

// Function to save company data to the backend
async function saveCompanyToBackend(companyData) {
    try {
        // Check authentication
        const authenticated = await isAuthenticated();
        if (!authenticated) {
            throw new Error('User not authenticated');
        }
        
        // Apply debounce mechanism to prevent duplicate submissions
        const requestKey = `${companyData.name}|${companyData.url || ''}`;
        const now = Date.now();
        const lastRequestTime = lastRequestTimestamps[requestKey] || 0;
        
        // If we've made the same request recently, skip it
        if (now - lastRequestTime < DEBOUNCE_TIMEOUT) {
            console.log(`Skipping duplicate request for ${companyData.name} - last request was ${(now - lastRequestTime)/1000}s ago`);
            
            // Still show a notification to the user that we've received their action
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icon-48.png',
                title: 'Already Tracking This Job',
                message: `${companyData.name} application was already saved moments ago.`
            });
            
            return; // Exit early without making API call
        }
        
        // Update timestamp before making request
        lastRequestTimestamps[requestKey] = now;

        // Get auth token
        const token = await getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/companies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
        
        // Show error notification to user
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'src/assets/icon-48.png',
            title: 'Error Saving Application',
            message: `Could not save application to ${companyData.name}. Please try again later.`
        });
    }
}

// Handle auth check requests
async function checkAndRedirectToLogin() {
    console.log('Checking authentication status');
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
        console.log('Not authenticated, will redirect to login');
        // We don't auto-redirect here anymore, just report status
        return false;
    }
    
    console.log('User is authenticated');
    return true;
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

    if (msg.action === "checkAuth") {
        console.log('Received checkAuth message');
        isAuthenticated().then(status => {
            console.log('Responding to checkAuth with status:', status);
            sendResponse({ isAuthenticated: status });
        }).catch(error => {
            console.error('Error during checkAuth:', error);
            sendResponse({ isAuthenticated: false, error: error.message });
        });
        return true;
    }
    
    if (msg.action === "logout") {
        console.log('Received logout message');
        chrome.storage.local.remove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY, TOKEN_EXPIRY_KEY], () => {
            console.log('Auth data cleared from storage');
            sendResponse({ success: true });
        });
        return true;
    }

    if (msg.action === "getTrackingStatus") {
        sendResponse({ isTracking: !!trackingTabs[tabId] });
        return true;
    }

    if (msg.action === "saveCompany" && msg.company) {
        console.log(`Company detected: ${msg.company}`);
        
        // First check authentication
        isAuthenticated().then(authenticated => {
            if (!authenticated) {
                console.log('User not authenticated, cannot save company');
                sendResponse({ success: false, error: 'Authentication required' });
                return;
            }
            
            // Get current tab information
            const tabId = sender.tab.id;
            chrome.tabs.get(tabId, (tab) => {
                // Use URL from message if provided (for SPAs), otherwise fall back to tab URL
                const jobUrl = msg.url || tab.url;
                console.log(`Using job URL: ${jobUrl} (SPA detected: ${!!msg.url})`);
                
                const companyData = {
                    name: msg.company,
                    url: jobUrl,
                    applicationDate: new Date(),
                    status: 'applied',
                    notes: `Applied via ${tab.title}`
                    // Browser identifier removed as it's no longer needed
                };
                
                // Send to backend API
                saveCompanyToBackend(companyData)
                    .then(() => sendResponse({ success: true }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
            });
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
    if (trackingTabs[tabId]) {
        if (changeInfo.status === "loading") {
            chrome.tabs.get(tabId, (currentTab) => {
                if (currentTab.url !== tab.url) {
                    disableTracking(tabId);
                }
            });
        } else if (changeInfo.status === "complete") {
            console.log(`Tab ${tabId} finished loading, reattaching event listeners`);
            enableTracking(tabId);
        }
    }
});