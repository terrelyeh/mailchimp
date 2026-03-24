# Mailchimp Multi-Region Dashboard — 部署文件

> 最後更新：2026-03-24

本文件描述 Mailchimp Dashboard 的完整部署架構、各服務角色、環境變數設定以及日常維護指南。

---

## 目錄

1. [架構總覽](#1-架構總覽)
2. [各服務角色說明](#2-各服務角色說明)
3. [部署流程](#3-部署流程)
4. [環境變數清單](#4-環境變數清單)
5. [常見問題 / 注意事項](#5-常見問題--注意事項)
6. [維護指南](#6-維護指南)

---

## 1. 架構總覽

```
┌──────────┐     HTTPS      ┌──────────────────────────────┐
│          │ ──────────────▶ │  Vercel Frontend              │
│  使用者   │                │  edm-dashboard-eg.vercel.app  │
│ (Browser) │                │  React 19 + Vite + Tailwind   │
│          │                │  Root Dir: frontend/           │
└──────────┘                └──────────────┬───────────────┘
                                           │
                                           │ API Requests
                                           │ /api/*
                                           ▼
                            ┌──────────────────────────────┐
                            │  Vercel Backend (Serverless)  │
                            │  edm-dashboard-api.vercel.app │
                            │  Python FastAPI               │
                            │  Root Dir: backend/            │
                            └──────────┬──────────┬────────┘
                                       │          │
                              REST API │          │ HTTP (API Key)
                                       ▼          ▼
                            ┌──────────────┐  ┌──────────────┐
                            │  Supabase     │  │  Mailchimp   │
                            │  PostgreSQL   │  │  API (v3.0)  │
                            │  ap-northeast │  │  多區域帳號   │
                            │  -1 (Tokyo)   │  │              │
                            └──────────────┘  └──────────────┘
```

### 關鍵設計

- **同一 GitHub Repo**：`terrelyeh/mailchimp` 同時包含前端與後端程式碼
- **兩個 Vercel Projects**：分別指向不同的 Root Directory（`frontend/` 與 `backend/`）
- **前端自動部署**：push to `main` 自動觸發
- **後端手動部署**：需從 `backend/` 目錄執行 `vercel --prod`
- **資料庫**：Supabase PostgreSQL，透過 REST API 連線（不使用 pooler）

---

## 2. 各服務角色說明

### 2.1 GitHub (`terrelyeh/mailchimp`)

| 項目 | 說明 |
|------|------|
| 用途 | 程式碼版本控制 |
| 分支策略 | `main` 為生產分支 |
| 自動部署 | Push to `main` → Vercel 前端自動部署 |
| CI/CD | Vercel Git Integration（前端）|

### 2.2 Vercel Frontend (`edm-dashboard-eg`)

| 項目 | 說明 |
|------|------|
| 框架 | React 19 + Vite 5.4 + Tailwind CSS 3.4 |
| 類型 | 靜態網站（SPA）|
| 部署方式 | Git push 自動部署 |
| Root Directory | `frontend/` |
| Production URL | https://edm-dashboard-eg.vercel.app |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**主要依賴：**
- Recharts 3.6（圖表）
- Lucide React（圖標）
- Axios（API 請求）
- date-fns（日期處理）
- html2canvas + jsPDF（PDF 匯出）

### 2.3 Vercel Backend (`edm-backend`)

| 項目 | 說明 |
|------|------|
| 框架 | Python FastAPI（Serverless Functions）|
| 部署方式 | **手動**：`cd backend && vercel --prod` |
| Root Directory | `backend/` |
| Production URL | https://edm-dashboard-api.vercel.app |
| Entry Point | `api/index.py` |
| Timeout | 10 秒（Free Tier 限制）|

> **重要**：Backend Vercel project 的 Deployment Protection 必須關閉，否則 API 請求會被攔截回傳 Vercel 登入頁面。

**API 功能：**
- JWT 認證（HS256，24 小時有效期）
- 多區域 Mailchimp 資料同步
- Campaign CRUD、比較群組
- 分享連結管理（可設密碼、過期時間）
- 使用者管理（admin / manager / viewer）
- 活動日誌

### 2.4 Supabase PostgreSQL

| 項目 | 說明 |
|------|------|
| Project ID | `mxfwbewanezlyvyxuhyt` |
| Region | `ap-northeast-1`（Tokyo）|
| 連線方式 | REST API（`supabase-py`）|
| Dashboard | https://supabase.com/dashboard/project/mxfwbewanezlyvyxuhyt |
| Free Tier 限制 | 500MB storage、7 天無活動自動暫停 |

**資料表（8 個）：**

| Table | 說明 |
|-------|------|
| `campaigns` | Campaign 資料快取（含 region 欄位）|
| `users` | 使用者帳號（email、password_hash、role）|
| `shared_links` | 分享連結（token、filter_state、密碼、過期時間）|
| `excluded_audiences` | 排除的 Audience（不計入 KPI）|
| `activity_logs` | 使用者活動日誌 |
| `settings` | 系統設定 |
| `comparison_groups` | Campaign 比較群組 |
| `comparison_items` | 比較群組內的 Campaign 項目 |

**RPC Functions（5 個）：**

| Function | 說明 |
|----------|------|
| `get_cache_stats` | 快取統計（各區域 campaign 數量）|
| `get_regions_last_activity` | 各區域最近活動時間 |
| `get_activity_summary` | 活動日誌摘要（指定天數）|
| `list_comparison_groups_with_counts` | 比較群組列表（含項目數量）|
| `get_comparison_group_full` | 比較群組完整資料 |

**注意事項：**
- RLS（Row Level Security）目前未啟用
- 使用 `anon` key 連線（生產環境建議改用 `service_role` key）
- 不使用 Supabase pooler（有 "Tenant or user not found" 問題）
- 已設定 keep-alive cron job 防止 7 天自動暫停

---

## 3. 部署流程

### 3.1 Frontend（自動部署）

```bash
# 1. 修改前端程式碼
# 2. Commit & Push
git add .
git commit -m "feat: your changes"
git push origin main

# 3. Vercel 自動偵測 push，觸發部署
# 4. 約 1 分鐘後上線
```

**部署流程圖：**
```
git push origin main
    ↓
Vercel Git Integration 偵測變更
    ↓
npm install → npm run build
    ↓
產出 dist/ 靜態檔案
    ↓
部署至 CDN Edge Network
    ↓
https://edm-dashboard-eg.vercel.app 更新完成（~1 min）
```

### 3.2 Backend（手動部署）

```bash
# 1. 進入 backend 目錄
cd backend

# 2. 執行 Vercel 部署
vercel --prod

# 3. 部署完成後會顯示 Production URL
```

> **注意**：修改環境變數後必須重新部署才會生效。

### 3.3 Database（無需部署）

- Schema 變更直接在 Supabase Dashboard 執行 SQL
- 或使用 Supabase CLI 管理 migrations
- 不需要額外的部署步驟

```bash
# 透過 Supabase Dashboard SQL Editor 執行
# https://supabase.com/dashboard/project/mxfwbewanezlyvyxuhyt/sql
```

---

## 4. 環境變數清單

### 4.1 Vercel Frontend (`edm-dashboard-eg`)

| 變數名稱 | 說明 | 範例值 |
|----------|------|--------|
| `VITE_API_URL` | 後端 API 基礎 URL | `https://edm-dashboard-api.vercel.app/api` |

### 4.2 Vercel Backend (`edm-backend`)

#### 必要變數

| 變數名稱 | 說明 | 範例值 |
|----------|------|--------|
| `SUPABASE_URL` | Supabase Project URL | `https://mxfwbewanezlyvyxuhyt.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key | `eyJhbGciOiJI...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（優先使用）| `eyJhbGciOiJI...` |
| `JWT_SECRET` | JWT 簽名密鑰（生產環境必須自訂）| 隨機長字串 |

#### Mailchimp API Keys（每個區域一組）

| 變數名稱 | 說明 |
|----------|------|
| `MAILCHIMP_API_KEY_US` | US 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_US` | US 區域 Server Prefix（如 `us1`）|
| `MAILCHIMP_API_KEY_EU` | EU 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_EU` | EU 區域 Server Prefix |
| `MAILCHIMP_API_KEY_APAC` | APAC 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_APAC` | APAC 區域 Server Prefix |
| `MAILCHIMP_API_KEY_JP` | JP 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_JP` | JP 區域 Server Prefix |
| `MAILCHIMP_API_KEY_TW` | TW 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_TW` | TW 區域 Server Prefix |
| `MAILCHIMP_API_KEY_INDIA` | INDIA 區域 API Key |
| `MAILCHIMP_SERVER_PREFIX_INDIA` | INDIA 區域 Server Prefix |

> **Fallback 機制**：若未設定區域專屬 key，會嘗試使用 `MAILCHIMP_API_KEY`（無區域後綴）作為預設值。未設定任何 key 時，系統自動使用 mock data。

#### 選用變數

| 變數名稱 | 說明 | 預設值 |
|----------|------|--------|
| `ALLOWED_ORIGINS` | CORS 允許的來源（逗號分隔）| `*` |

---

## 5. 常見問題 / 注意事項

### Vercel Deployment Protection

後端 Vercel project **必須關閉** Deployment Protection。否則所有 API 請求會被導向 Vercel 的認證頁面，前端無法正常呼叫 API。

**設定路徑**：Vercel Dashboard → Project Settings → General → Deployment Protection → **Off**

### Supabase Pooler 問題

Supabase connection pooler（Transaction / Session mode）目前有 "Tenant or user not found" 錯誤，無法使用 `psycopg2` 直接連線。已改用 `supabase-py` REST API 連線，不受此問題影響。

### Vercel Serverless 10 秒 Timeout

Free Tier 的 Serverless Functions 有 10 秒執行時間限制。以下操作可能超時：
- 首次同步大量 Mailchimp 資料
- 同時抓取所有區域的資料

**因應策略**：
- 使用 ThreadPoolExecutor 平行抓取多區域
- 分區域同步，避免一次全部抓取
- 考慮升級 Vercel Pro（60 秒 timeout）

### bcrypt 版本相容性

`passlib` 不相容 `bcrypt` 5.x。`requirements.txt` 中已限制 `bcrypt<5`，請勿升級。

### Supabase Free Tier 自動暫停

Supabase Free Tier 在 7 天無活動後會自動暫停資料庫。已設定 keep-alive cron job 定期 ping 防止暫停。若資料庫已暫停，可在 Supabase Dashboard 手動恢復。

### CORS 設定

後端 `main.py` 中的 `EXTRA_ORIGINS` 列表必須包含所有前端網域。目前已包含：
- `https://edm-dashboard-eg.vercel.app`
- `https://mailchimp-dashboard.vercel.app`
- `http://localhost:5173`
- `http://localhost:3000`

如新增前端網域，需同步更新此列表並重新部署後端。

### Mock Data 模式

若未設定任何 Mailchimp API key，系統會自動使用 mock data，方便本地開發和測試。不需要真實的 Mailchimp 帳號即可啟動完整系統。

---

## 6. 維護指南

### 6.1 新增一個區域

**Step 1：設定 Mailchimp API Key**

在 Vercel Backend project 新增環境變數：

```
MAILCHIMP_API_KEY_NEWREGION=your-api-key-here
MAILCHIMP_SERVER_PREFIX_NEWREGION=us1
```

**Step 2：重新部署後端**

```bash
cd backend
vercel --prod
```

系統會自動偵測以 `MAILCHIMP_API_KEY_` 為前綴的環境變數，並將新區域加入可用區域列表。前端無需修改。

### 6.2 檢查 Supabase 資料庫

**方法一：Supabase Dashboard**
1. 前往 https://supabase.com/dashboard/project/mxfwbewanezlyvyxuhyt
2. 左側選單 → Table Editor（瀏覽資料）或 SQL Editor（執行查詢）

**方法二：透過 API**
```bash
# 檢查 cache 統計
curl https://edm-dashboard-api.vercel.app/api/diagnostics

# 檢查健康狀態
curl https://edm-dashboard-api.vercel.app/api/health
```

### 6.3 查看 Vercel Logs

**Frontend Logs：**
1. 前往 https://vercel.com → `edm-dashboard-eg` project
2. Deployments → 點選最新部署 → Functions 或 Build Logs

**Backend Logs：**
1. 前往 https://vercel.com → `edm-backend` project
2. Deployments → 點選最新部署 → Functions tab
3. 或使用 Runtime Logs（即時）：Logs tab

**CLI 方式：**
```bash
# 查看後端 runtime logs
cd backend
vercel logs https://edm-dashboard-api.vercel.app
```

### 6.4 更新環境變數

**Vercel Dashboard：**
1. 前往 Project Settings → Environment Variables
2. 新增或修改變數
3. **重新部署**才會生效

**CLI 方式：**
```bash
# 新增環境變數
cd backend
vercel env add VARIABLE_NAME

# 部署使變更生效
vercel --prod
```

### 6.5 資料庫備份

Supabase Free Tier 不提供自動備份。建議定期手動匯出重要資料：

```sql
-- 在 Supabase SQL Editor 執行匯出查詢
-- 或使用 Dashboard 的 Table Editor → Export as CSV
```

### 6.6 緊急恢復

如果 Supabase 資料庫被暫停：
1. 前往 Supabase Dashboard
2. 點選 "Restore project"
3. 等待約 1-2 分鐘恢復
4. 驗證 API 是否正常：`curl https://edm-dashboard-api.vercel.app/api/health`

如果 Vercel 部署異常：
1. 前往 Vercel Dashboard → Deployments
2. 找到上一個正常運作的部署
3. 點選 "..." → "Promote to Production" 回滾

---

## 附錄：專案連結

| 服務 | URL |
|------|-----|
| Frontend（Production）| https://edm-dashboard-eg.vercel.app |
| Backend API | https://edm-dashboard-api.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/mxfwbewanezlyvyxuhyt |
| GitHub Repository | https://github.com/terrelyeh/mailchimp |
| Vercel Frontend Project | https://vercel.com/dashboard → `edm-dashboard-eg` |
| Vercel Backend Project | https://vercel.com/dashboard → `edm-backend` |
