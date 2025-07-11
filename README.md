# Job Tracker

A Chrome extension that tracks job applications by detecting "Apply" button clicks on job websites and provides resume improvement suggestions using AI.

## Features

- Detects job application pages automatically
- Tracks companies when users click on "Apply" buttons
- Stores application data locally in Chrome's storage
- Connects to an Express.js backend with MongoDB
- Resume analysis against job descriptions using Hugging Face LLM models
- Suggests resume improvements and provides match scoring

## Project Structure

```
/src                  # Main source directory
├── assets/           # Images, icons, and other static assets
├── scripts/          # JavaScript files
│   ├── background.js # Chrome extension background service worker
│   ├── content.js    # Content script injected into web pages
│   └── popup.js      # Script for the extension popup
├── styles/           # CSS stylesheets
│   ├── popup.css     # Styles for the popup UI
│   └── resume.css    # Styles for the resume manager UI
├── views/            # HTML files
│   ├── popup.html    # Popup interface HTML
│   └── resume.html   # Resume manager and analysis interface
└── manifest.json     # Chrome extension manifest file
```

## Backend Integration

The extension connects to an Express.js backend with MongoDB for more robust data storage, including:

- RESTful API with CRUD operations for companies
- MongoDB schema with fields for company name, application date, URL, status, and notes
- User identification to separate data between users
- Resume storage and analysis capabilities using Hugging Face LLM
- AI-powered job description analysis and resume improvement suggestions

The extension uses local storage as a fallback when offline.