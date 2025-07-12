// content.js
function showApplyPrompt() {
    if (confirm("Are you trying to apply for a job on this site?")) {
        console.log("User confirmed job application, enabling tracking...");

        // Simplify the message to just the action
        chrome.runtime.sendMessage({ action: "enableTracking" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error enabling tracking:", chrome.runtime.lastError.message);
            } else {
                console.log("Tracking enabled successfully:", response);
            }
        });

        // Add tracking indicator on the page
        addTrackingIndicator();
    } else {
        console.log("User declined job application prompt");
    }
}

function addTrackingIndicator() {
    // Remove existing indicator if present
    removeTrackingIndicator();
    const trackingIndicator = document.createElement('div');
    trackingIndicator.id = "job-tracker-active-indicator";
    trackingIndicator.textContent = "✓ Job Tracker Active";
    trackingIndicator.style.cssText = "position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px; z-index: 9999;";
    document.body.appendChild(trackingIndicator);
}

function removeTrackingIndicator() {
    const existing = document.getElementById("job-tracker-active-indicator");
    if (existing) {
        existing.remove();
    }
}

function trackClicks(e) {
    const text = e.target?.innerText?.toLowerCase();
    if (text && containsApplyText(text)) {
        const companyName = getCompanyName();
        console.log("Detected Apply Button - Company:", companyName);
        if (companyName) {
            console.log(`Sending company to background: ${companyName}`);
            try {
                // No response callback - this is fire-and-forget
                chrome.runtime.sendMessage({ 
                    action: "saveCompany", 
                    company: companyName,
                    url: window.location.href // Include the current URL of the job page
                });
                console.log(`Company ${companyName} sent to background script`);
            } catch (err) {
                console.error(`Error sending company data: ${err.message}`);
            }
        }
    }
}

function containsApplyText(text) {
    const keywords = [
        "apply",
        "submit application",
        "quick apply",
        "1-click apply",
        "submit"
    ];
    return keywords.some(keyword => text.includes(keyword)) && text != "easy apply";
}

function getCompanyName() {
    // LinkedIn Easy Apply header
    const applyHeader = document.querySelector('#jobs-apply-header');
    if (applyHeader && applyHeader.innerText.trim()) {
        const text = applyHeader.innerText.trim();
        const companyMatch = text.match(/Apply to (.+)/i);
        if (companyMatch) {
            return companyMatch[1].trim();
        }
    }

    // LinkedIn job detail selectors
    let el = document.querySelector('.topcard__org-name-link, .topcard__flavor-row a, .topcard__flavor-row span');
    if (el && el.innerText.trim()) {
        return el.innerText.trim();
    }

    // LinkedIn meta tags fallback
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle && metaOgTitle.content) {
        const match = metaOgTitle.content.match(/at (.+)$/i);
        if (match) {
            return match[1].trim();
        }
    }

    // Generic fallback for other sites
    el = document.querySelector('.company, .company-name, [data-company], [itemprop="hiringOrganization"]');
    if (el && el.innerText.trim()) {
        return el.innerText.trim();
    }

    // Meta tag fallback
    const metaCompany = document.querySelector('meta[name="company"]');
    if (metaCompany && metaCompany.content) {
        return metaCompany.content.trim();
    }

    // ✅ NEW: Look for company name in image alt tags
    const logoImg = document.querySelector('img[alt*="logo"], img[alt*="Logo"]');
    if (logoImg && logoImg.alt) {
        return logoImg.alt.replace(/logo/i, '').trim();
    }

    // ✅ NEW: Look for label "Brand:" or similar and get next sibling text
    const brandLabel = Array.from(document.querySelectorAll('span, div')).find(el =>
        el.innerText && el.innerText.trim().match(/Brand:/i)
    );
    if (brandLabel) {
        const nextSpan = brandLabel.nextElementSibling;
        if (nextSpan && nextSpan.innerText.trim()) {
            return nextSpan.innerText.trim();
        }
    }

    return null; // No company found
}


// Function to check if current URL is a job page
function checkIfJobPage() {
    const url = window.location.href.toLowerCase();
    return ["jobs", "careers", "apply", "opportunities", "position", "posting", "vacancy"].some(k => url.includes(k));
}

// Ask user when on job page initially
if (checkIfJobPage()) {
    showApplyPrompt();
}

// Set up SPA URL change detection
let lastUrl = location.href; 
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('URL changed to:', lastUrl);
        // Check if the new URL is a job page
        if (checkIfJobPage()) {
            console.log('SPA navigation: Detected job page');
            // Only prompt if not already tracking
            if (!isTrackingActive) {
                showApplyPrompt();
            } else {
                console.log('Already tracking this job page');
            }
        }
    }
});

// Start observing changes in the DOM
urlObserver.observe(document, { subtree: true, childList: true });

// Listen for start/stop tracking commands from background.js
let isTrackingActive = false;
let dynamicButtonObserver = null;

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "startTracking") {
        if (!isTrackingActive) {
            console.log("Tracking started");
            document.addEventListener("click", handleClick);
            addTrackingIndicator();
            isTrackingActive = true; // mark as active
            
            // Set up observer for dynamically added apply buttons
            dynamicButtonObserver = setupDynamicButtonObserver();
            
            // Check if any apply buttons exist on page load
            scanForApplyButtons();
        } else {
            console.log("Tracking is already active");
        }
    }

    if (msg.action === "stopTracking") {
        if (isTrackingActive) {
            console.log("Tracking stopped");
            document.removeEventListener("click", handleClick);
            
            // Disconnect the observer
            if (dynamicButtonObserver) {
                dynamicButtonObserver.disconnect();
                dynamicButtonObserver = null;
            }
            
            removeTrackingIndicator();
            isTrackingActive = false; // mark as inactive
        } else {
            console.log("Tracking was not active");
        }
    }
});

// Function to scan for apply buttons on page load or after SPA navigation
function scanForApplyButtons() {
    if (!isTrackingActive) return;
    
    console.log('Scanning for apply buttons in current page');
    const possibleButtons = document.querySelectorAll('button, [role="button"], input[type="submit"], .btn, a[href*="apply"]');
    
    possibleButtons.forEach(button => {
        const text = button.innerText?.toLowerCase();
        if (text && containsApplyText(text)) {
            console.log('Found apply button:', button);
            // We don't need to add click listeners here as the global document listener will catch them
        }
    });
}

function handleClick(e) {
    const el = e.target.closest('button, [role="button"], input[type="submit"], .btn, a[href*="apply"]'); 
    if (el) {
        console.log("Potential apply element clicked:", el);
        trackClicks(e);
    }
}

// Set up observer to detect dynamically added apply buttons in SPAs
function setupDynamicButtonObserver() {
    if (isTrackingActive) {
        console.log('Setting up dynamic button observer');
        
        const buttonObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    // Check for buttons with apply-related text
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for buttons or elements that look like buttons
                            const applyButtons = node.querySelectorAll('button, [role="button"], input[type="submit"], .btn, a[href*="apply"]');
                            
                            applyButtons.forEach(button => {
                                const text = button.innerText?.toLowerCase();
                                if (text && containsApplyText(text)) {
                                    console.log('SPA: Dynamically added apply button detected', button);
                                    // Add click listener to this specific button
                                    button.addEventListener('click', handleClick);
                                }
                            });
                        }
                    });
                }
            }
        });
        
        // Observe entire document for added nodes
        buttonObserver.observe(document.body, { childList: true, subtree: true });
        return buttonObserver;
    }
    return null;
}

