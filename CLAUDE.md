# CLAUDE.md — Project Context

> Last updated: 2026-03-22

## Project Overview

Mailchimp Multi-Region Dashboard — 管理 4 個分公司（US / EU / APAC / JP）的 Mailchimp 電子報行銷數據。
提供 KPI 總覽、區域比較圖表、Campaign 列表與比較、匯出 PDF 等功能。
前後端皆部署在 Vercel，資料庫使用 Supabase（PostgreSQL）。

## Tech Stack

### Frontend (`/frontend`)
- React 19 + Vite 5.4 + Tailwind CSS 3.4
- Recharts 3.6（圖表）、Lucide React（圖標）
- Axios（API 請求）、date-fns（日期處理）
- html2canvas + jsPDF（截圖匯出 PDF）
- Nginx 作為靜態伺服器（Docker 內）

### Backend (`/backend`)
- Python FastAPI（Vercel Serverless Functions）
- Supabase PostgreSQL（透過 `supabase-py` REST API 連線，不使用 pooler）
- JWT（python-jose）+ bcrypt（認證與密碼 hashing）
- ThreadPoolExecutor 平行抓取 Mailchimp API

### 部署
- **Frontend**: Vercel（連結 GitHub `terrelyeh/mailchimp` 自動部署，Root Dir: `frontend`）
  - URL: https://edm-dashboard-eg.vercel.app
- **Backend**: Vercel Serverless Functions（同一 GitHub repo，Root Dir: `backend`）
  - URL: https://edm-dashboard-api.vercel.app
- **Database**: Supabase PostgreSQL（project: `mxfwbewanezlyvyxuhyt`，region: `ap-northeast-1`）
  - 5 個 RPC functions 處理複雜查詢（aggregations、JOINs）
  - RLS 目前未啟用（使用 anon key）

## Directory Structure

```
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # 主應用（路由、狀態管理）
│   │   ├── api.js               # Axios API client
│   │   ├── components/          # 27 個 React 元件
│   │   │   ├── CompareModal.jsx       # Campaign 跨區域比較（最大元件 ~41KB）
│   │   │   ├── ExecutiveSummary.jsx   # 摘要報告（~39KB）
│   │   │   ├── CampaignList.jsx       # Campaign 列表（Status 篩選、搜尋、CSV 匯出、欄位選擇器）
│   │   │   ├── DiagnosticsDrawer.jsx  # 資料診斷工具
│   │   │   ├── CampaignCalendar.jsx    # 月曆檢視（單一 Region，顯示所有 Status）
│   │   │   ├── RegionCards.jsx        # 區域績效卡片 + 表格檢視（Cards/Table 切換）
│   │   │   ├── KPICards.jsx           # KPI 指標卡片
│   │   │   ├── TimeSeriesMetricsChart.jsx  # 時間序列圖表
│   │   │   └── ...（其餘元件）
│   │   └── contexts/
│   │       └── ThresholdContext.jsx   # 全域閾值狀態
│   ├── Dockerfile               # Multi-stage: Node 18 build → Nginx
│   └── nginx.conf               # SPA 路由 + API proxy
├── backend/
│   ├── main.py                  # FastAPI app（所有 API endpoints）
│   ├── database.py              # Supabase CRUD（supabase-py REST API）
│   ├── mailchimp_service.py     # Mailchimp API client（Singleton）
│   ├── api/index.py             # Vercel Serverless entry point
│   ├── vercel.json              # Vercel 路由設定
│   ├── .env.example             # 環境變數範例
│   └── Dockerfile               # Python 3.9 slim（本地 Docker 用）
├── docs/                        # 部署指南、功能文件、AI 分析規格
├── docker-compose.yml           # 前後端容器編排
└── deploy.sh                    # 一鍵部署腳本
```

## Conventions

- 前後端分離：前端透過 Axios 呼叫 `/api/*`，Nginx 做 reverse proxy
- 所有 API endpoints 定義在 `backend/main.py`，資料庫操作在 `database.py`
- 認證：JWT HS256，token 有效期 24 小時，角色分 admin / viewer
- 多區域支援：每個區域可配獨立 Mailchimp API key，也可共用單一帳號
- Mock 資料：未設定 API key 時自動使用 mock data，方便開發測試
- 資料庫操作透過 Supabase REST API（`supabase-py`），複雜查詢用 RPC functions
- Commit 風格：`fix:` / `feat:` / `chore:` 前綴

## Current Status

### ✅ Completed
- 多區域 KPI 儀表板（總覽 + 單區域詳細）
- Campaign 跨區域比較功能
- JWT 認證 + 角色管理（admin/manager/viewer）+ 使用者管理
- 分享連結（可設密碼、過期時間）
- PDF / 截圖匯出
- 活動日誌追蹤
- Audience 篩選 + 排除管理
- Segment / Tag 解析顯示（含 Advanced Segment fallback）
- 診斷工具 Drawer
- Campaign List 強化功能：
  - Status 欄位 + 篩選器（Sent / Scheduled / Draft / Paused / All）
  - 關鍵字搜尋（Campaign 名稱 + Subject Line）
  - CSV 匯出（UTF-8 BOM）
  - 欄位可見度選擇器（localStorage 持久化）
  - 非 Sent 狀態獨立 API 取得，不影響 Dashboard KPI
- Campaign Calendar View（單一 Region 頁面，List/Calendar 切換）：
  - 月曆格狀顯示所有 Status（Sent/Scheduled/Draft/Paused）
  - 兼具輕量 Content Planning 功能——可一覽各 campaign 的排程與狀態
  - 點擊日期顯示 campaign 詳情 popover
- Region Performance Table View（All Regions 頁面，Cards/Table 切換）：
  - 跨區域數字比較表格，最佳表現標記 ★
  - 可點擊行導航至區域詳細頁
- 前後端皆遷移至 Vercel（GitHub 自動部署）
- 資料庫遷移至 Supabase PostgreSQL（REST API 連線）
- AI（Gemini）功能已移除（與 Vercel Serverless 10 秒 timeout 不相容）
- 後端 CORS 支援多前端網域

### 🚀 Next
- **Vercel 後端加入 Mailchimp API keys**：需在 Vercel project settings 設定環境變數以啟用資料同步
- **Google Social Login**：利用 Supabase Auth 加入 Google OAuth（白名單制）
- **啟用 RLS**：目前 Supabase 未啟用 Row Level Security，生產環境應啟用並使用 service_role key
- **Content Planning / Topic Pool**（優先級降低）：
  - Calendar View 已部分覆蓋此需求（可看到 Draft → Scheduled → Sent 的生命週期）

### ⚠️ Known Issues / Notes
- Vercel Serverless 有 10 秒 timeout（Free tier），Mailchimp sync 可能超時
- Supabase pooler 連線（psycopg2）目前無法使用（"Tenant or user not found"），改用 REST API
- Mailchimp API 限制：inline/advanced segments 無法取得條件細節，只有 saved segments 和 tags 能取到名稱
- Supabase free tier 7 天沒活動會暫停（已設 Vercel Cron keep-alive，每天 08:00 UTC）

## Development

```bash
# Backend（本地開發）
cd backend
uv venv && uv pip install -r requirements.txt
cp .env.example .env  # 填入 SUPABASE_URL, SUPABASE_ANON_KEY, Mailchimp API keys
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# 部署（自動）
git push origin main  # 前端自動部署到 Vercel
cd backend && vercel --prod  # 後端手動部署到 Vercel
```

## Common Pitfalls

- **CORS**：後端 `EXTRA_ORIGINS` 列表需包含所有前端網域（目前：`edm-dashboard-eg.vercel.app`、`localhost`）
- **Supabase 連線**：使用 REST API（`supabase-py`），不使用 pooler（pooler 目前有 "Tenant not found" 問題）
- **Supabase env vars**：後端需要 `SUPABASE_URL` + `SUPABASE_ANON_KEY`（或 `SUPABASE_SERVICE_ROLE_KEY`）
- **Vercel Deployment Protection**：後端 Vercel 專案需關閉 Deployment Protection，否則 API 會被攔截
- **Sync 操作**：已改為同步（非 BackgroundTasks），Vercel Serverless 不支援背景任務
- **JWT_SECRET**：預設值僅供開發，生產環境必須設定環境變數覆蓋（Vercel 已設定）
- **多區域 API key**：env 格式為 `MAILCHIMP_API_KEY_{REGION}` + `MAILCHIMP_SERVER_PREFIX_{REGION}`
- **Mailchimp campaign fields**：必須用 `.get()` 安全取值，部分 campaign 缺少 `subject_line`、`settings` 等欄位
- **Vercel 前端**：push 自動部署；`VITE_API_URL` 設在 Vercel project settings → `https://edm-dashboard-api.vercel.app/api`
- **Vercel 後端**：需從 `backend/` 目錄執行 `vercel --prod` 手動部署（非 GitHub 自動部署）
- **Calendar 不適合 All Regions**：跨區載入太慢，Calendar 只放在單一 Region 頁面
- **頁面架構**：All Regions = KPI → Chart → Region Cards → Compare；單一 Region = KPI → Chart → Campaign List/Calendar
- **bcrypt 版本**：passlib 不相容 bcrypt 5.x，必須使用 bcrypt 4.x（requirements.txt 已限制）
