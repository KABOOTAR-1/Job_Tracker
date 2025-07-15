// popup.js
const API_URL = 'http://localhost:5000/api';
const EXTENSION_ID = chrome.runtime.id;

// Authentication storage keys
const TOKEN_STORAGE_KEY = 'jt_auth_token';
const USER_STORAGE_KEY = 'jt_user_data';
const TOKEN_EXPIRY_KEY = 'jt_token_expiry';

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
// Check authentication status
async function checkAuth() {
    return new Promise((resolve) => {
        // First check locally to avoid message passing overhead
        chrome.storage.local.get([TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY], (result) => {
            const token = result[TOKEN_STORAGE_KEY];
            const expiry = result[TOKEN_EXPIRY_KEY];
            const now = new Date().getTime();
            
            // If we have a valid token in storage, we're authenticated
            if (token && expiry && now < expiry) {
                console.log('Valid auth token found in storage');
                resolve(true);
                return;
            }
            
            // Fall back to message-based check
            console.log('No valid token in storage, checking via background');
            chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error checking auth:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    console.log('Auth check response:', response);
                    resolve(response && response.isAuthenticated);
                }
            });
        });
    });
}

// Get auth token
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY], (result) => {
            const token = result[TOKEN_STORAGE_KEY];
            console.log('Retrieved auth token:', token ? 'Token exists' : 'No token');
            resolve(token || null);
        });
    });
}

// Logout function
async function logout() {
    console.log('Logging out...');
    return new Promise((resolve) => {
        // Clear tokens locally first for immediate effect
        chrome.storage.local.remove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY, TOKEN_EXPIRY_KEY], () => {
            console.log('Auth data cleared from storage');
            
            // Also notify the background script
            chrome.runtime.sendMessage({ action: "logout" }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error during logout:', chrome.runtime.lastError);
                }
                
                console.log('Redirecting to login page');
                // Redirect to login page
                window.location.href = "login.html";
                resolve(true);
            });
        });
    });
}

async function fetchApplications() {
    console.log('Fetching applications...');
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    emptyElement.classList.add('hidden');
    
    try {
        // Check if user is authenticated
        const isAuthenticated = await checkAuth();
        console.log('Authentication check result:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            // Redirect to login page
            window.location.href = "login.html";
            return;
        }
        
        // Get the auth token
        const token = await getAuthToken();
        if (!token) {
            console.error('No auth token found despite auth check passing');
            throw new Error('Authentication token not found');
        }
        
        console.log('Fetching companies from API...');
        const response = await fetch(`${API_URL}/companies`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired or invalid, logging out');
                // Token expired or invalid - redirect to login
                await logout();
                return;
            }
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response data:', data);
        
        // Handle the data properly based on the API response structure
        applications = data.data || [];
        
        console.log(`Loaded ${applications.length} applications`);
        displayApplications();
        
        loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error fetching applications:', error);
        loadingElement.classList.add('hidden');
        errorElement.classList.remove('hidden');
        errorElement.querySelector('span').textContent = error.message;
        
        // Try local storage as fallback
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
    console.log('Initializing popup.js...');
    // First check if the user is authenticated
    const isAuthenticated = await checkAuth();
    console.log('Initial auth check:', isAuthenticated);
    
    if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        // Redirect to login page
        window.location.href = "login.html";
        return;
    }
    
    console.log('Authentication successful, continuing initialization');
    
    // Create logout button
    const header = document.querySelector('header .nav-actions');
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Logout';
    logoutButton.classList.add('logout-button');
    logoutButton.addEventListener('click', logout);
    header.appendChild(logoutButton);
    
    // Get username to display welcome message
    chrome.storage.local.get([USER_STORAGE_KEY], (result) => {
        const userData = result[USER_STORAGE_KEY];
        if (userData && userData.username) {
            const welcomeMsg = document.createElement('span');
            welcomeMsg.classList.add('welcome-message');
            welcomeMsg.textContent = `Welcome, ${userData.username}`;
            document.querySelector('header h1').after(welcomeMsg);
        }
    });
    
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
