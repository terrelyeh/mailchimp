# Deployment Guide - Zeabur

This guide covers deploying the EDM Analytic Dashboard to [Zeabur](https://zeabur.com).

---

## Prerequisites

1. **Zeabur Account** - Sign up at [zeabur.com](https://zeabur.com)
2. **GitHub Repository** - Project should be pushed to GitHub
3. **Mailchimp API Key** - From your Mailchimp account settings

---

## Project Structure

```
mailchimp/
├── frontend/          # React frontend (Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Node.js API server (Express)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── docs/
```

This project requires deploying **two services**:
1. **Backend** - Node.js Express API server
2. **Frontend** - React static site (Vite)

---

## Step 1: Create Zeabur Project

1. Log in to [Zeabur Dashboard](https://dash.zeabur.com)
2. Click **"Create Project"**
3. Select your preferred region (recommend: closest to your users)
4. Name your project (e.g., `edm-dashboard`)

---

## Step 2: Deploy Backend Service

### 2.1 Add Service

1. In your project, click **"Add Service"**
2. Select **"Deploy from GitHub"**
3. Connect your GitHub account if not already connected
4. Select your repository

### 2.2 Configure Backend

1. After selecting repo, Zeabur will detect the project
2. Click on the service settings
3. Set **Root Directory**: `backend`
4. Zeabur should auto-detect Node.js

### 2.3 Environment Variables

Add the following environment variables in Zeabur:

| Variable | Description | Example |
|----------|-------------|---------|
| `MAILCHIMP_API_KEY` | Your Mailchimp API key | `xxxxxxxx-us21` |
| `PORT` | Server port (optional) | `3000` |
| `NODE_ENV` | Environment | `production` |

To add variables:
1. Click on your backend service
2. Go to **"Variables"** tab
3. Add each variable

### 2.4 Generate Domain

1. Go to **"Networking"** tab
2. Click **"Generate Domain"**
3. Note the URL (e.g., `edm-backend.zeabur.app`)

---

## Step 3: Deploy Frontend Service

### 3.1 Add Another Service

1. Click **"Add Service"** again
2. Select **"Deploy from GitHub"**
3. Select the same repository

### 3.2 Configure Frontend

1. Set **Root Directory**: `frontend`
2. Zeabur should auto-detect Vite/React

### 3.3 Environment Variables

Add the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://edm-backend.zeabur.app` |

### 3.4 Generate Domain

1. Go to **"Networking"** tab
2. Click **"Generate Domain"**
3. This will be your dashboard URL (e.g., `edm-dashboard.zeabur.app`)

---

## Step 4: Verify Deployment

1. **Backend Health Check**
   ```
   https://your-backend.zeabur.app/api/health
   ```
   Should return: `{ "status": "ok" }`

2. **Frontend**
   ```
   https://your-frontend.zeabur.app
   ```
   Should load the dashboard

3. **Test Data Sync**
   - Click the "Sync" button on the dashboard
   - Verify data loads from Mailchimp

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to your frontend service
2. Click **"Networking"** tab
3. Click **"Add Domain"**
4. Enter your custom domain (e.g., `edm.yourcompany.com`)

### DNS Configuration

Add a CNAME record in your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | edm | `your-frontend.zeabur.app` |

Wait for DNS propagation (up to 24 hours).

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILCHIMP_API_KEY` | Yes | Mailchimp API key with read access |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full URL to backend API |

---

## Troubleshooting

### Build Fails

**Check logs:**
1. Click on the service
2. Go to **"Logs"** tab
3. Look for error messages

**Common issues:**
- Missing dependencies: Check `package.json`
- Wrong root directory: Verify path in service settings

### API Connection Failed

**CORS errors:**
- Ensure `ALLOWED_ORIGINS` includes frontend URL
- Check backend is returning proper CORS headers

**Network errors:**
- Verify `VITE_API_URL` is correct
- Ensure backend service is running

### Mailchimp API Errors

**401 Unauthorized:**
- Check API key is correct
- Verify API key has required permissions

**429 Too Many Requests:**
- Mailchimp rate limiting
- Wait and retry, or implement caching

---

## Deployment Checklist

- [ ] Backend service deployed
- [ ] Backend environment variables configured
- [ ] Backend domain generated
- [ ] Frontend service deployed
- [ ] Frontend `VITE_API_URL` points to backend
- [ ] Frontend domain generated
- [ ] Health check endpoint working
- [ ] Data sync working
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

---

## Updating Deployment

Zeabur automatically redeploys when you push to your GitHub repository.

**Manual Redeploy:**
1. Go to your service
2. Click **"Redeploy"** button

**Rollback:**
1. Go to **"Deployments"** tab
2. Select a previous deployment
3. Click **"Rollback"**

---

## Cost Estimation

Zeabur pricing is usage-based. For this dashboard:

| Resource | Estimated Usage |
|----------|-----------------|
| Backend | ~$5-10/month (minimal compute) |
| Frontend | ~$0-5/month (static hosting) |

Check [Zeabur Pricing](https://zeabur.com/pricing) for current rates.

---

## Support

- **Zeabur Docs**: [docs.zeabur.com](https://docs.zeabur.com)
- **Zeabur Discord**: [discord.gg/zeabur](https://discord.gg/zeabur)
- **Project Issues**: GitHub repository issues
