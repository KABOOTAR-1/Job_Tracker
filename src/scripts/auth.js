// auth.js - Handles authentication functions for the Job Tracker extension
const API_URL = 'http://localhost:5000/api';

// Token storage constants
const TOKEN_STORAGE_KEY = 'jt_auth_token';
const USER_STORAGE_KEY = 'jt_user_data';
const TOKEN_EXPIRY_KEY = 'jt_token_expiry';
const TOKEN_EXPIRY_DAYS = 30; // Keep user logged in for 30 days

// Calculate token expiry date - 30 days from now
function calculateExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + TOKEN_EXPIRY_DAYS);
    return date.getTime();
}

// Save authentication data to Chrome storage
function saveAuthData(token, userData) {
    if (!token) {
        console.error('Cannot save auth data: No token provided');
        return;
    }
    
    const expiryDate = calculateExpiryDate();
    console.log('Saving auth data:', { 
        hasToken: !!token, 
        userData: userData,
        expiry: new Date(expiryDate).toLocaleString() 
    });
    
    chrome.storage.local.set({
        [TOKEN_STORAGE_KEY]: token,
        [USER_STORAGE_KEY]: userData || {},
        [TOKEN_EXPIRY_KEY]: expiryDate
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving auth data:', chrome.runtime.lastError);
        } else {
            console.log('Authentication data saved successfully');
        }
    });
}

// Clear authentication data from Chrome storage
function clearAuthData() {
    chrome.storage.local.remove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY, TOKEN_EXPIRY_KEY], () => {
        console.log('Authentication data cleared');
    });
}

// Check if user is logged in
function checkAuthStatus() {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY], (result) => {
            const token = result[TOKEN_STORAGE_KEY];
            const expiry = result[TOKEN_EXPIRY_KEY];
            const now = new Date().getTime();
            
            if (token && expiry && now < expiry) {
                resolve(true);
            } else {
                // Clear expired token if it exists
                if (token) {
                    clearAuthData();
                }
                resolve(false);
            }
        });
    });
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Clear previous errors
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
    
    // Basic validation
    if (!username || !password) {
        errorMessage.textContent = 'Username and password are required';
        errorMessage.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    loginBtn.classList.add('loading');
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Attempting login with:', { username });
        
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Save the JWT token and user data
        if (!data.token) {
            console.error('No token in response:', data);
            throw new Error('Authentication token not found in response');
        }
        
        saveAuthData(data.token, data.user || {});
        
        // Redirect to popup page
        window.location.href = 'popup.html';
        
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message || 'An error occurred during login';
        errorMessage.classList.remove('hidden');
        
        // Reset loading state
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Sign In';
        loginBtn.disabled = false;
    }
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const registerBtn = document.getElementById('register-btn');
    const errorMessage = document.getElementById('error-message');
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value; // Optional
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Clear previous errors
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
    
    // Validation
    if (!username || !password) {
        errorMessage.textContent = 'Username and password are required';
        errorMessage.classList.remove('hidden');
        return;
    }
    
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    registerBtn.classList.add('loading');
    registerBtn.textContent = 'Creating account...';
    registerBtn.disabled = true;
    
    try {
        const userData = { username, password };
        if (email) {
            userData.email = email;
        }
        
        console.log('Attempting registration with:', { username, hasEmail: !!email });
        
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        console.log('Registration response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        // Save the JWT token and user data
        if (!data.token) {
            console.error('No token in response:', data);
            throw new Error('Authentication token not found in response');
        }
        
        saveAuthData(data.token, data.user || {});
        
        // Redirect to popup page
        window.location.href = 'popup.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = error.message || 'An error occurred during registration';
        errorMessage.classList.remove('hidden');
        
        // Reset loading state
        registerBtn.classList.remove('loading');
        registerBtn.textContent = 'Sign Up';
        registerBtn.disabled = false;
    }
}

// Initialize the page
function initialize() {
    console.log('Initializing auth.js...');
    const currentPath = window.location.pathname;
    console.log('Current page:', currentPath);
    
    // Check if we're on the login page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Login form detected, adding event listener');
        loginForm.addEventListener('submit', handleLogin);
        
        // Add error display helper for login page
        addErrorMessageHandler('login-error');
    }
    
    // Check if we're on the register page
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        console.log('Register form detected, adding event listener');
        registerForm.addEventListener('submit', handleRegister);
        
        // Add error display helper for register page
        addErrorMessageHandler('register-error');
    }
    
    // If already logged in, redirect to popup
    console.log('Checking authentication status...');
    checkAuthStatus().then(isAuthenticated => {
        console.log('Auth check result:', isAuthenticated);
        
        if (isAuthenticated) {
            // Only redirect if we're on login or register page
            if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
                console.log('Already authenticated, redirecting to popup.html');
                window.location.href = 'popup.html';
            } else {
                console.log('Already authenticated, staying on current page');
            }
        } else {
            console.log('Not authenticated, staying on auth page');
            
            // If we're on popup.html but not authenticated, redirect to login
            if (currentPath.includes('popup.html')) {
                console.log('Not authenticated but on popup page, redirecting to login');
                window.location.href = 'login.html';
            }
        }
    }).catch(error => {
        console.error('Auth check error:', error);
    });
}

// Helper function to handle error messages in forms
function addErrorMessageHandler(elementId) {
    const errorElement = document.getElementById('error-message');
    if (!errorElement) {
        console.warn(`Error message element not found for ${elementId}`);
        return;
    }
    
    // Add method to display errors
    window.showAuthError = function(message) {
        errorElement.textContent = message || 'An error occurred';
        errorElement.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    };
    
    // Clear error when user starts typing
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            errorElement.classList.add('hidden');
        });
    });
}

// Start the initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
