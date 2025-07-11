// Constants
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const resumeFileInput = document.getElementById('resume-file');
const selectedFileText = document.getElementById('selected-file');
const saveResumeButton = document.getElementById('save-resume');
const resumeStatus = document.getElementById('resume-status');
const currentResume = document.getElementById('current-resume');
const resumeDate = document.getElementById('resume-date');
const resumePreview = document.getElementById('resume-preview');

const jobDescription = document.getElementById('job-description');
const analyzeJobButton = document.getElementById('analyze-job');
const analysisStatus = document.getElementById('analysis-status');
const analysisResults = document.getElementById('analysis-results');
const scoreValue = document.getElementById('score-value');
const scorePercentage = document.getElementById('score-percentage');
const improvementsList = document.getElementById('improvements-list');
const matchingSkills = document.getElementById('matching-skills');
const missingSkills = document.getElementById('missing-skills');
const recommendation = document.getElementById('recommendation');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Get browser identifier (extension ID)
const browserIdentifier = chrome.runtime.id;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load user's resume if it exists
    loadResume();
    
    // Set up tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Activate the clicked tab
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
    
    // Set up event listeners
    resumeFileInput.addEventListener('change', handleFileSelection);
    saveResumeButton.addEventListener('click', saveResume);
    analyzeJobButton.addEventListener('click', analyzeJobDescription);
});

/**
 * Handle file selection and update UI
 */
function handleFileSelection() {
    const file = resumeFileInput.files[0];
    
    if (file) {
        // Check file type
        if (file.type !== 'application/pdf') {
            showStatus(resumeStatus, 'error', 'Only PDF files are allowed.');
            resumeFileInput.value = '';
            selectedFileText.textContent = 'No file selected';
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showStatus(resumeStatus, 'error', 'File is too large. Maximum size is 5MB.');
            resumeFileInput.value = '';
            selectedFileText.textContent = 'No file selected';
            return;
        }
        
        selectedFileText.textContent = file.name;
        clearStatus(resumeStatus);
    } else {
        selectedFileText.textContent = 'No file selected';
    }
}

/**
 * Load user's resume from backend
 */
async function loadResume() {
    try {
        showStatus(resumeStatus, 'loading', 'Loading your resume...');
        
        const response = await fetch(`${API_BASE_URL}/resume/${browserIdentifier}`);
        const data = await response.json();
        
        if (data.success) {
            // Format date
            const updateDate = new Date(data.data.updatedAt);
            resumeDate.textContent = updateDate.toLocaleString();
            
            // Show preview
            if (resumePreview) {
                // Create PDF file info display
                const fileInfoHTML = `
                    <div class="pdf-info">
                        <div class="pdf-icon">📄</div>
                        <div class="pdf-details">
                            <div class="pdf-filename">${data.data.fileName}</div>
                            <div class="pdf-size">${formatFileSize(data.data.fileSize)}</div>
                        </div>
                    </div>
                    <div class="pdf-content-preview">
                        <h4>Content Preview:</h4>
                        <div class="content-preview">${data.data.contentPreview || 'Content preview not available'}</div>
                    </div>
                `;
                resumePreview.innerHTML = fileInfoHTML;
            }
            
            currentResume.classList.remove('hidden');
            clearStatus(resumeStatus);
        } else {
            // No resume found
            currentResume.classList.add('hidden');
            clearStatus(resumeStatus);
        }
    } catch (error) {
        console.error('Error loading resume:', error);
        showStatus(resumeStatus, 'error', 'Could not load your resume. Please try again later.');
        currentResume.classList.add('hidden');
    }
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Save resume to backend
 */
async function saveResume() {
    try {
        const file = resumeFileInput.files[0];
        
        if (!file) {
            showStatus(resumeStatus, 'error', 'Please select a PDF resume file.');
            return;
        }
        
        showStatus(resumeStatus, 'loading', 'Uploading your resume...');
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('resumeFile', file);
        formData.append('browserIdentifier', browserIdentifier);
        
        const response = await fetch(`${API_BASE_URL}/resume`, {
            method: 'POST',
            body: formData
            // No Content-Type header needed; browser sets it with boundary for FormData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(resumeStatus, 'success', 'Resume uploaded successfully!');
            loadResume(); // Refresh resume data
            // Reset file input
            resumeFileInput.value = '';
            selectedFileText.textContent = 'No file selected';
        } else {
            showStatus(resumeStatus, 'error', data.message || 'Failed to upload resume.');
        }
    } catch (error) {
        console.error('Error uploading resume:', error);
        showStatus(resumeStatus, 'error', 'Could not upload your resume. Please try again later.');
    }
}

/**
 * Analyze job description against resume
 */
async function analyzeJobDescription() {
    try {
        const description = jobDescription.value.trim();
        
        if (!description) {
            showStatus(analysisStatus, 'error', 'Please enter a job description to analyze.');
            return;
        }
        
        showStatus(analysisStatus, 'loading', 'Analyzing job description... This may take a moment.');
        analysisResults.classList.add('hidden');
        
        const response = await fetch(`${API_BASE_URL}/resume/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobDescription: description,
                browserIdentifier
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAnalysisResults(data.data);
            clearStatus(analysisStatus);
        } else {
            showStatus(analysisStatus, 'error', data.message || 'Failed to analyze job description.');
            analysisResults.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error analyzing job description:', error);
        showStatus(analysisStatus, 'error', 'Could not analyze job description. Please try again later.');
        analysisResults.classList.add('hidden');
    }
}

/**
 * Display analysis results in the UI
 */
function displayAnalysisResults(analysis) {
    // Set match score
    const score = analysis.matchScore || 0;
    scoreValue.style.width = `${score}%`;
    scorePercentage.textContent = `${score}%`;
    
    // Change color based on score
    if (score < 40) {
        scoreValue.style.backgroundColor = '#dc3545'; // Red
    } else if (score < 70) {
        scoreValue.style.backgroundColor = '#ffc107'; // Yellow
    } else {
        scoreValue.style.backgroundColor = '#28a745'; // Green
    }
    
    // Populate improvements
    improvementsList.innerHTML = '';
    if (analysis.improvements && analysis.improvements.length > 0) {
        analysis.improvements.forEach(improvement => {
            const li = document.createElement('li');
            li.textContent = improvement;
            improvementsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No specific improvements suggested.';
        improvementsList.appendChild(li);
    }
    
    // Populate matching skills
    matchingSkills.innerHTML = '';
    if (analysis.matchingSkills && analysis.matchingSkills.length > 0) {
        analysis.matchingSkills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            matchingSkills.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No matching skills found.';
        matchingSkills.appendChild(li);
    }
    
    // Populate missing skills
    missingSkills.innerHTML = '';
    if (analysis.missingSkills && analysis.missingSkills.length > 0) {
        analysis.missingSkills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            missingSkills.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No missing skills identified.';
        missingSkills.appendChild(li);
    }
    
    // Set recommendation
    recommendation.textContent = analysis.recommendation || 'No specific recommendation available.';
    
    // Show results
    analysisResults.classList.remove('hidden');
}

/**
 * Show status message
 */
function showStatus(element, type, message) {
    element.textContent = message;
    element.className = 'status-message';
    element.classList.add(type);
}

/**
 * Clear status message
 */
function clearStatus(element) {
    element.textContent = '';
    element.className = 'status-message';
}
