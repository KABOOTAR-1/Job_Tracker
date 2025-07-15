
function showApplyPrompt() {
    if (userDeclinedTracking) {
        console.log("User previously declined tracking for this tab session, not showing prompt");
        return;
    }

    if (confirm("Are you trying to apply for a job on this site?")) {
        console.log("User confirmed job application, enabling tracking...");

        chrome.runtime.sendMessage({ action: "enableTracking" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error enabling tracking:", chrome.runtime.lastError.message);
            } else {
                console.log("Tracking enabled successfully:", response);
            }
        });

        addTrackingIndicator();
    } else {
        console.log("User declined job application prompt");
        userDeclinedTracking = true;
    }
}

function addTrackingIndicator() {
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
                chrome.runtime.sendMessage({ 
                    action: "saveCompany", 
                    company: companyName,
                    url: window.location.href
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
    const applyHeader = document.querySelector('#jobs-apply-header');
    if (applyHeader && applyHeader.innerText.trim()) {
        const text = applyHeader.innerText.trim();
        const companyMatch = text.match(/Apply to (.+)/i);
        if (companyMatch) {
            return companyMatch[1].trim();
        }
    }

    let el = document.querySelector('.topcard__org-name-link, .topcard__flavor-row a, .topcard__flavor-row span');
    if (el && el.innerText.trim()) {
        return el.innerText.trim();
    }

    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle && metaOgTitle.content) {
        const match = metaOgTitle.content.match(/at (.+)$/i);
        if (match) {
            return match[1].trim();
        }
    }

    el = document.querySelector('.company, .company-name, [data-company], [itemprop="hiringOrganization"]');
    if (el && el.innerText.trim()) {
        return el.innerText.trim();
    }

    const metaCompany = document.querySelector('meta[name="company"]');
    if (metaCompany && metaCompany.content) {
        return metaCompany.content.trim();
    }

    const logoImg = document.querySelector('img[alt*="logo"], img[alt*="Logo"]');
    if (logoImg && logoImg.alt) {
        return logoImg.alt.replace(/logo/i, '').trim();
    }

    const brandLabel = Array.from(document.querySelectorAll('span, div')).find(el =>
        el.innerText && el.innerText.trim().match(/Brand:/i)
    );
    if (brandLabel) {
        const nextSpan = brandLabel.nextElementSibling;
        if (nextSpan && nextSpan.innerText.trim()) {
            return nextSpan.innerText.trim();
        }
    }

    return null; 
}


function checkIfJobPage() {
    const url = window.location.href.toLowerCase();
    return ["jobs", "careers", "apply", "opportunities", "position", "posting", "vacancy"].some(k => url.includes(k));
}

let userDeclinedTracking = false;
if (checkIfJobPage()) {
    showApplyPrompt();
}

let lastUrl = location.href; 
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('URL changed to:', lastUrl);
        // Check if the new URL is a job page
        if (checkIfJobPage()) {
            console.log('SPA navigation: Detected job page');
            // Only prompt if not already tracking AND user hasn't declined
            if (!isTrackingActive && !userDeclinedTracking) {
                showApplyPrompt();
            } else {
                console.log('Already tracking this job page or user declined tracking');
            }
        }
    }
});

urlObserver.observe(document, { subtree: true, childList: true });

let isTrackingActive = false;
let dynamicButtonObserver = null;

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "startTracking") {
        if (!isTrackingActive) {
            console.log("Tracking started");
            document.addEventListener("click", handleClick);
            addTrackingIndicator();
            isTrackingActive = true; 
            dynamicButtonObserver = setupDynamicButtonObserver();
            
            scanForApplyButtons();
        } else {
            console.log("Tracking is already active");
        }
    }

    if (msg.action === "stopTracking") {
        if (isTrackingActive) {
            console.log("Tracking stopped");
            document.removeEventListener("click", handleClick);
            
            if (dynamicButtonObserver) {
                dynamicButtonObserver.disconnect();
                dynamicButtonObserver = null;
            }
            
            removeTrackingIndicator();
            isTrackingActive = false; 
        } else {
            console.log("Tracking was not active");
        }
    }
});

function scanForApplyButtons() {
    if (!isTrackingActive) return;
    
    console.log('Scanning for apply buttons in current page');
    const possibleButtons = document.querySelectorAll('button, [role="button"], input[type="submit"], .btn, a[href*="apply"]');
    
    possibleButtons.forEach(button => {
        const text = button.innerText?.toLowerCase();
        if (text && containsApplyText(text)) {
            console.log('Found apply button:', button);
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

function setupDynamicButtonObserver() {
    if (isTrackingActive) {
        console.log('Setting up dynamic button observer');
        
        const buttonObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {

                            const applyButtons = node.querySelectorAll('button, [role="button"], input[type="submit"], .btn, a[href*="apply"]');
                            applyButtons.forEach(button => {
                                const text = button.innerText?.toLowerCase();
                                if (text && containsApplyText(text)) {
                                    console.log('SPA: Dynamically added apply button detected', button);
                                    button.addEventListener('click', handleClick);
                                }
                            });
                        }
                    });
                }
            }
        });
        
        buttonObserver.observe(document.body, { childList: true, subtree: true });
        return buttonObserver;
    }
    return null;
}
