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
        const trackingIndicator = document.createElement('div');
        trackingIndicator.textContent = "✓ Job Tracker Active";
        trackingIndicator.style.cssText = "position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px; z-index: 9999;";
        document.body.appendChild(trackingIndicator);
    } else {
        console.log("User declined job application prompt");
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
                chrome.runtime.sendMessage({ action: "saveCompany", company: companyName });
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
        "easy apply",
        "quick apply",
        "1-click apply",
        "submit"
    ];
    return keywords.some(keyword => text.includes(keyword));
}

function getCompanyName() {
    // LinkedIn Easy Apply header
    const applyHeader = document.querySelector('#jobs-apply-header');
    if (applyHeader && applyHeader.innerText.trim()) {
        const text = applyHeader.innerText.trim();
        const companyMatch = text.match(/Apply to (.+)/i);
        if (companyMatch) {
            return companyMatch[1].trim(); // Extracts "Rock Solid Solutions Mumbai"
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
        const match = metaOgTitle.content.match(/at (.+)$/i); // e.g., "Software Engineer at Google"
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

    return null; // No company found
}


// Ask user when on job page
const url = window.location.href.toLowerCase();
if (["jobs", "careers", "apply", "opportunities"].some(k => url.includes(k))) {
    showApplyPrompt();
}

// Listen for start/stop tracking commands from background.js
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "startTracking") {
        document.addEventListener("click", trackClicks);
    }
    if (msg.action === "stopTracking") {
        document.removeEventListener("click", trackClicks);
    }
});
