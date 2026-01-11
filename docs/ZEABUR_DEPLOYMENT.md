# Zeabur Deployment Guide

This guide covers deploying the EnGenius EDM Analytics Dashboard to [Zeabur](https://zeabur.com).

## Architecture Overview

The application consists of two services:
- **Backend**: Python FastAPI server (connects to Mailchimp API)
- **Frontend**: React Vite application

Both services need to be deployed separately on Zeabur.

---

## Prerequisites

1. A [Zeabur account](https://zeabur.com)
2. Your code pushed to a Git repository (GitHub, GitLab, etc.)
3. Mailchimp API credentials:
   - `MAILCHIMP_API_KEY` - Your Mailchimp API key
   - `MAILCHIMP_SERVER_PREFIX` - Server prefix (e.g., `us14`)

---

## Step 1: Create a New Project

1. Log in to [Zeabur Dashboard](https://dash.zeabur.com)
2. Click **Create Project**
3. Select your preferred region (recommend: closest to your users)
4. Name your project (e.g., `edm-analytics-dashboard`)

---

## Step 2: Deploy Backend Service

### 2.1 Add Service

1. In your project, click **Add Service**
2. Select **Git** and connect your repository
3. Choose your repository and branch
4. Set **Root Directory** to `backend`

### 2.2 Configure Build Settings

Zeabur should auto-detect Python. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework | Python |
| Build Command | (auto-detected) |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port 8000` |

### 2.3 Set Environment Variables

Go to **Variables** tab and add:

| Variable | Description | Required |
|----------|-------------|----------|
| `MAILCHIMP_API_KEY` | Your Mailchimp API key | Yes |
| `MAILCHIMP_SERVER_PREFIX` | Server prefix (e.g., `us14`) | Yes |
| `JWT_SECRET` | Secret key for JWT tokens (use a strong random string) | Yes |
| `ADMIN_EMAIL` | Default admin email | No (default: `engenius.ad@gmail.com`) |
| `ADMIN_INITIAL_PASSWORD` | Initial admin password | No (default: `ChangeMe123!`) |
| `DATA_DIR` | Directory for SQLite database | No (default: `.`) |

**Important**: Generate a strong `JWT_SECRET`:
```bash
# Generate a secure random string
openssl rand -base64 32
```

### 2.4 Enable Persistent Storage (Recommended)

To persist the SQLite database across deployments:

1. Go to **Storage** tab
2. Click **Add Storage**
3. Set:
   - Mount Path: `/app/data`
   - Size: 1 GB (adjust as needed)
4. Add environment variable: `DATA_DIR=/app/data`

### 2.5 Configure Domain

1. Go to **Networking** tab
2. Click **Generate Domain** for a free `.zeabur.app` domain
3. Or add your custom domain
4. Note the backend URL (e.g., `https://your-backend.zeabur.app`)

---

## Step 3: Deploy Frontend Service

### 3.1 Add Service

1. Click **Add Service** again
2. Select **Git** and choose the same repository
3. Set **Root Directory** to `frontend`

### 3.2 Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3.3 Set Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your backend URL + `/api` (e.g., `https://your-backend.zeabur.app/api`) |

### 3.4 Configure Domain

1. Go to **Networking** tab
2. Generate domain or add custom domain
3. This will be your dashboard URL

---

## Step 4: Post-Deployment Setup

### 4.1 Initial Login

1. Open your frontend URL
2. Login with default credentials:
   - Email: `engenius.ad@gmail.com` (or your `ADMIN_EMAIL`)
   - Password: `ChangeMe123!` (or your `ADMIN_INITIAL_PASSWORD`)

### 4.2 Change Default Password

**Critical**: Change the default password immediately!

1. After login, you'll be prompted to change password
2. Or go to Settings > Alert Settings > Change Password
3. Create a strong password (minimum 8 characters)

### 4.3 Verify Mailchimp Connection

1. Click the sync button (refresh icon) in the header
2. Check API Diagnostics (Activity icon) if issues occur
3. Verify data loads correctly

---

## Environment Variables Reference

### Backend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MAILCHIMP_API_KEY` | Mailchimp API key | - | Yes |
| `MAILCHIMP_SERVER_PREFIX` | Mailchimp server (e.g., `us14`) | - | Yes |
| `JWT_SECRET` | JWT signing secret | Auto-generated (insecure) | Yes |
| `ADMIN_EMAIL` | Default admin email | `engenius.ad@gmail.com` | No |
| `ADMIN_INITIAL_PASSWORD` | Initial admin password | `ChangeMe123!` | No |
| `DATA_DIR` | SQLite database directory | `.` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` | No |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://your-backend.zeabur.app/api` |

---

## Troubleshooting

### Backend won't start

1. Check **Logs** in Zeabur dashboard
2. Verify all required environment variables are set
3. Ensure `requirements.txt` is in the `backend` folder

### Frontend shows "Network Error"

1. Verify `VITE_API_URL` is correctly set
2. Ensure backend is running and accessible
3. Check CORS settings - backend should allow frontend origin

### Database resets after deployment

1. Enable persistent storage (see Step 2.4)
2. Set `DATA_DIR` to the storage mount path

### "Invalid credentials" on login

1. Check `ADMIN_EMAIL` environment variable matches your login
2. If database was reset, password reverts to `ADMIN_INITIAL_PASSWORD`
3. Check backend logs for authentication errors

### Mailchimp data not loading

1. Verify `MAILCHIMP_API_KEY` is correct
2. Check `MAILCHIMP_SERVER_PREFIX` matches your Mailchimp datacenter
3. Use API Diagnostics to check endpoint responses

---

## Security Checklist

Before going live, ensure:

- [ ] `JWT_SECRET` is set to a strong random string
- [ ] Default admin password has been changed
- [ ] `ADMIN_INITIAL_PASSWORD` is changed or removed after first login
- [ ] Persistent storage is enabled for database
- [ ] HTTPS is enabled (automatic on Zeabur)

---

## Updating the Application

To deploy updates:

1. Push changes to your Git repository
2. Zeabur automatically detects changes and rebuilds
3. Or manually trigger redeploy from Zeabur dashboard

**Note**: Database data persists across deployments if persistent storage is enabled.

---

## Cost Estimation

Zeabur pricing varies. Approximate resources needed:

| Service | Estimated Usage |
|---------|-----------------|
| Backend | ~256MB RAM, minimal CPU |
| Frontend | Static hosting (minimal) |
| Storage | ~100MB for database |

Check [Zeabur Pricing](https://zeabur.com/pricing) for current rates.

---

## Support

- Zeabur Documentation: https://zeabur.com/docs
- Zeabur Discord: https://discord.gg/zeabur
- Project Issues: Report in your Git repository
