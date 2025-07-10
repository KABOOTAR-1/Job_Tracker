// popup.js
const API_URL = 'http://localhost:5000/api';
const EXTENSION_ID = chrome.runtime.id;

const trackingBtn = document.getElementById("toggleTracking");
const applicationsContainer = document.getElementById("applications");
const loadingElement = document.getElementById("loading");
const errorElement = document.getElementById("error");
const emptyElement = document.getElementById("empty");
const totalApplications = document.getElementById("totalApplications");
const refreshButton = document.getElementById("refreshButton");
const statusFilter = document.getElementById("statusFilter");
const sortBySelect = document.getElementById("sortBy");

const applicationTemplate = document.getElementById("application-template");

let applications = [];
let currentFilter = 'all';
let currentSort = 'date-desc';

function updateButton(isTracking) {
    trackingBtn.textContent = isTracking ? "Tracking ON" : "Tracking OFF";
    trackingBtn.classList.toggle("active", isTracking);
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function displayApplications() {
    applicationsContainer.innerHTML = '';
    
    const filtered = currentFilter === 'all' 
        ? applications 
        : applications.filter(app => app.status === currentFilter);
    
    const sorted = [...filtered].sort((a, b) => {
        switch (currentSort) {
            case 'date-desc':
                return new Date(b.applicationDate) - new Date(a.applicationDate);
            case 'date-asc':
                return new Date(a.applicationDate) - new Date(b.applicationDate);
            case 'company-asc':
                return a.name.localeCompare(b.name);
            case 'company-desc':
                return b.name.localeCompare(a.name);
            default:
                return 0;
        }
    });
    
    totalApplications.textContent = sorted.length;
    
    if (sorted.length === 0) {
        emptyElement.classList.remove('hidden');
        return;
    }
    
    emptyElement.classList.add('hidden');
    
    sorted.forEach(app => {

        const appCard = document.importNode(applicationTemplate.content, true);
        
        appCard.querySelector('.company-name').textContent = app.name;
        appCard.querySelector('.application-date').textContent = formatDate(app.applicationDate);
        
        const statusBadge = appCard.querySelector('.status-badge');
        statusBadge.textContent = app.status || 'Applied';
        statusBadge.classList.add(app.status || 'applied');
        
        const companyUrl = appCard.querySelector('.company-url');
        if (app.url) {
            companyUrl.href = app.url;
        } else {
            companyUrl.classList.add('hidden');
        }
        
        const notesElement = appCard.querySelector('.application-notes');
        if (app.notes) {
            notesElement.textContent = app.notes;
        } else {
            notesElement.classList.add('hidden');
        }
        
        applicationsContainer.appendChild(appCard);
    });
}
async function fetchApplications() {

    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    emptyElement.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_URL}/companies?browserIdentifier=${EXTENSION_ID}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        applications = data.data;
        
        displayApplications();
        
        loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error fetching applications:', error);
        loadingElement.classList.add('hidden');
        errorElement.classList.remove('hidden');
        
        tryLocalStorageFallback();
    }
}
function tryLocalStorageFallback() {
    chrome.storage.local.get(['companies'], result => {
        if (result.companies && Object.keys(result.companies).length > 0) {
            applications = Object.entries(result.companies).map(([name, details]) => ({
                name,
                applicationDate: details.date || new Date().toISOString(),
                status: 'applied',
                url: details.url || ''
            }));
            
            displayApplications();
            errorElement.querySelector('span').textContent = '(Showing local data)'; 
        }
    });
}

async function initialize() {
    await fetchApplications();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.runtime.sendMessage({ action: "getTrackingStatus", tabId }, (response) => {
            updateButton(response?.isTracking);
        });

        trackingBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "toggleTracking", tabId }, (response) => {
                updateButton(response?.isTracking);
            });
        });
    });
    
    statusFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        displayApplications();
    });
    
    sortBySelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        displayApplications();
    });
    
    refreshButton.addEventListener('click', fetchApplications);
}

initialize();
