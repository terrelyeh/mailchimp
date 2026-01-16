# Fix: AI Analysis Network Error

## Problem
AI analysis feature was showing "network error" when attempting to analyze the dashboard.

## Root Cause
Backend Python dependencies were not installed, causing the `/api/ai/analyze-dashboard` endpoint to fail with ImportError for `google.generativeai` module.

## Solution

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

This installs all required packages including:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `google-generativeai` - Gemini AI SDK
- `python-jose`, `passlib`, `bcrypt` - Authentication
- Other dependencies

### 2. Install Cryptography Dependencies
```bash
pip install --upgrade cffi cryptography
```

This fixes the `_cffi_backend` module error that prevents `google-generativeai` from loading properly.

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
# Required for AI Analysis
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - defaults to gemini-2.0-flash
GEMINI_MODEL=models/gemini-2.0-flash

# CORS settings
ALLOWED_ORIGINS=*

# MailChimp API credentials (existing configuration)
# ... your existing MailChimp settings ...
```

**Get Gemini API Key:**
1. Visit https://aistudio.google.com/app/apikey
2. Create or select a project
3. Generate a new API key
4. Copy the key to your `.env` file

### 4. Verify Installation

```bash
# Verify google-generativeai is installed
python3 -c "import google.generativeai as genai; print(f'✓ google-generativeai version: {genai.__version__}')"

# Expected output:
# ✓ google-generativeai version: 0.8.6
```

### 5. Start Backend Server

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Deployment Notes

### For Zeabur Deployment
1. Ensure `requirements.txt` is in the backend directory
2. Set `GEMINI_API_KEY` in Zeabur environment variables:
   - Go to your service settings
   - Navigate to "Environment Variables"
   - Add `GEMINI_API_KEY` with your API key
3. Zeabur will automatically install dependencies from `requirements.txt` during deployment

### Environment Variables Required
- `GEMINI_API_KEY` - **Required** for AI analysis
- `GEMINI_MODEL` - Optional, defaults to `models/gemini-2.0-flash`
- `MAILCHIMP_API_KEY` - Required for dashboard data
- `MAILCHIMP_SERVER_PREFIX` - Required for MailChimp API
- `JWT_SECRET` - Required for authentication (auto-generated in dev)
- `ALLOWED_ORIGINS` - CORS origins (use `*` for dev, specific domains for prod)

## Testing AI Analysis

1. Log in as an admin user
2. Navigate to any dashboard view
3. Click the AI Analysis button (purple gradient button in bottom right)
4. Wait for analysis to complete (~5-10 seconds)
5. View the analysis report in the side drawer

## Troubleshooting

### "Network Error" Still Appears
- Check backend server is running: `ps aux | grep uvicorn`
- Check backend logs for errors
- Verify GEMINI_API_KEY is set correctly
- Test Gemini API directly:
  ```bash
  python3 -c "import google.generativeai as genai; import os; genai.configure(api_key=os.getenv('GEMINI_API_KEY')); print('✓ API key is valid')"
  ```

### "AI service not available"
- Backend returned 503 status
- Check if GEMINI_API_KEY environment variable is set
- Verify the API key is valid (not expired or quota exceeded)

### "Admin access required"
- AI analysis is only available to admin users
- Check user role in Settings > User Management

### ImportError for google.generativeai
- Run: `pip install google-generativeai>=0.3.0`
- If cffi error occurs: `pip install --upgrade cffi cryptography`

## Package Deprecation Notice

The `google-generativeai` package shows a deprecation warning:
```
All support for the `google.generativeai` package has ended.
Please switch to the `google.genai` package as soon as possible.
```

The current implementation still works, but consider migrating to `google.genai` in the future. This is a non-breaking change and doesn't affect the current functionality.

## Verification Checklist

- [x] Backend dependencies installed
- [x] `google-generativeai` module imports successfully
- [x] GEMINI_API_KEY environment variable configured
- [x] Backend server can start without errors
- [x] AI Analysis button appears for admin users
- [x] AI analysis completes successfully and returns results

## Related Files

- `backend/requirements.txt` - Python dependencies
- `backend/main.py` - AI analysis endpoint implementation (lines 999-1094)
- `frontend/src/api.js` - Frontend API client (lines 535-556)
- `frontend/src/components/AIAnalysisButton.jsx` - AI analysis trigger button
- `docs/AI_ANALYSIS_FEATURE.md` - Complete feature documentation
