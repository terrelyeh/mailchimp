# MailChimp Multi-Region Dashboard

EnGenius EDM Analytic Dashboard — 統一管理 6 個分公司（US / EU / APAC / JP / TW / INDIA）的 Mailchimp 電子報行銷數據，提供 KPI 總覽、區域比較、Campaign 分析與團隊協作功能。

- 前端：https://edm-dashboard-eg.vercel.app
- 後端 API：https://edm-dashboard-api.vercel.app

## 功能特色

### 儀表板
- **總覽頁面** — 全區域 KPI 彙總、Executive Summary、區域比較圖表、區域績效（Cards / Table 切換，Table 標記各指標最佳區域）
- **區域詳細頁面** — 單一區域 KPI、效能趨勢圖、Campaign 列表（可搜尋、排序、分頁、Status 篩選、欄位選擇、CSV 匯出，含退訂率欄位；捲動時表頭與 Campaign 欄固定）、Calendar 月曆檢視
- **時間序列圖表** — 多指標疊加、區域篩選、hover tooltip
- **MoM/QoQ 比較** — 自動計算同期趨勢變化

### 篩選與資料管理
- **時間範圍** — 7 / 30 / 60 / 90 / 180 / 365 天 + 自訂日期
- **區域篩選** — All Regions 或單一區域
- **Audience 篩選** — 單一 Audience 或全部，支援排除測試 Audience
- **Segment Coverage** — 顯示 Campaign 的受眾涵蓋率
- **資料同步** — 手動觸發從 Mailchimp API 抓取最新資料

### Campaign 比較
- 跨區域 Campaign 比較，支援建立比較群組
- 儲存比較結果，方便日後檢視

### 認證與使用者管理
- JWT 認證（HS256，24hr）、bcrypt 密碼 hashing
- 角色管理：
  - **Admin** — 完整權限，含使用者管理
  - **Manager** — 可管理分享連結、Audience 排除設定、活動日誌，不能管理使用者
  - **Viewer** — 檢視儀表板為主
- 首次登入強制變更密碼、管理員可新增/刪除/重設密碼

### 分享與匯出
- **分享連結** — 保留篩選狀態、可設密碼保護與過期時間、無需登入即可檢視
- **匯出** — PNG 高解析度截圖、PDF 多頁報表
- **活動日誌** — 追蹤使用者操作紀錄

### 其他
- 閾值警示（Open Rate / Click Rate / Delivery Rate）
- Segment / Tag 顯示（saved segment 與 tag 顯示名稱，其餘顯示為 Advanced Segment）
- 資料診斷工具（Diagnostics Drawer）
- 響應式設計（Desktop / Tablet / Mobile）
- Mock 資料模式（無 API key 也可測試）

## 技術架構

### Backend — Python FastAPI
| 技術 | 用途 |
|------|------|
| FastAPI + Uvicorn | ASGI web server（部署為 Vercel Serverless Function） |
| supabase-py | 透過 REST API 存取 Supabase PostgreSQL（Campaign 快取、使用者、分享連結等） |
| python-jose + passlib / bcrypt 4.x | JWT 認證 + 密碼 hashing |
| ThreadPoolExecutor | 平行抓取多區域 Mailchimp 資料 |

### Frontend — React + Vite
| 技術 | 用途 |
|------|------|
| React 19 + Vite 5.4 | UI 框架 + 建置工具 |
| Tailwind CSS 3.4 | 樣式框架 |
| Recharts 3.6 | 圖表視覺化 |
| Lucide React | 圖標庫 |
| html2canvas + jsPDF | 截圖匯出 PDF |
| Axios | HTTP 請求 |

### 部署
- **Frontend** — Vercel（連結 GitHub，push 到 `main` 自動部署，Root Dir: `frontend`）
- **Backend** — Vercel Serverless Functions（在 `backend/` 執行 `vercel --prod` 手動部署）
- **Database** — Supabase PostgreSQL（Vercel Cron 每天 08:00 UTC 呼叫 `/api/keep-alive` 避免 free tier 暫停）
- Docker Compose + Nginx 設定仍保留，可用於本機容器化執行

## API Endpoints

共 44 個 endpoints，主要分類：

| 分類 | 路徑 | 說明 |
|------|------|------|
| 認證 | `/api/auth/*` | 登入、個人資料、變更密碼 |
| 使用者 | `/api/users/*` | CRUD、角色管理、重設密碼（Admin） |
| 儀表板 | `/api/dashboard` | 依時間/區域取得儀表板資料 |
| 區域 | `/api/regions/*` | 區域列表、活動狀態 |
| 資料 | `/api/sync`, `/api/cache/*` | 從 Mailchimp 同步、快取管理 |
| Audience | `/api/audiences`, `/api/settings/excluded-audiences` | 列表、排除設定 |
| 分享 | `/api/share/*` | 建立/驗證/管理分享連結 |
| 活動日誌 | `/api/activity/*` | 記錄、查詢、統計 |
| 比較 | `/api/comparisons/*` | Campaign 比較群組 CRUD |
| Campaign | `/api/campaigns/list`, `/api/campaigns/search` | 非 Sent 狀態列表（Scheduled / Draft / Paused）、搜尋 |
| 系統 | `/`, `/health`, `/api/diagnose`, `/api/keep-alive` | 健康檢查、診斷、Supabase keep-alive |

完整 API 文件：啟動後端後訪問 `http://localhost:8000/docs`

## 快速開始

### 環境需求
- Python 3.9+（用 `uv` 管理）
- Node.js 18+
- Supabase 專案（URL + service_role 或 anon key）
- Mailchimp API Key

### 本機開發

```bash
# Backend
cd backend
cp .env.example .env   # 填入 Supabase 與 Mailchimp 憑證
uv venv && uv pip install -r requirements.txt
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Docker（本機容器化，可選）

```bash
docker-compose up --build
# Frontend: http://localhost:80
# Backend API: http://localhost:8000/docs
```

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `SUPABASE_URL` | Supabase 專案 URL | -（必填） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（建議） | - |
| `SUPABASE_ANON_KEY` | 沒有 service_role key 時的備用 key | - |
| `MAILCHIMP_API_KEY` | 單一帳號 API key（所有區域共用） | - |
| `MAILCHIMP_SERVER_PREFIX` | Server prefix（如 us1） | - |
| `MAILCHIMP_API_KEY_{REGION}` | 各區域獨立 API key（US / EU / APAC / JP / TW / INDIA） | - |
| `MAILCHIMP_SERVER_PREFIX_{REGION}` | 各區域 server prefix | - |
| `JWT_SECRET` | JWT 簽名密鑰 | 開發用預設值（生產必改） |
| `ADMIN_EMAIL` | 預設管理員 email | engenius.ad@gmail.com |
| `ADMIN_DISPLAY_NAME` | 預設管理員顯示名稱 | Admin |
| `ADMIN_INITIAL_PASSWORD` | 初始管理員密碼（首次登入強制變更） | 有預設值（生產必改） |
| `ALLOWED_ORIGINS` | CORS 允許來源，多個用逗號分隔 | * |

前端只需要 `VITE_API_URL`（Vercel 上設為 `https://edm-dashboard-api.vercel.app/api`）。

## Mock 資料

後端 API 無法連線或回傳空資料時，前端會自動改用 Mock 資料並顯示提示：
- 4 個區域（US / EU / APAC / JP）各 30 筆 Campaign
- 適合 UI 開發與功能測試

## 詳細文件

- [docs/FEATURES.md](./docs/FEATURES.md) — 完整功能規格與操作指南
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Vercel + Supabase 部署指南
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) — 詳細設定教學
- [QUICKSTART.md](./QUICKSTART.md) — 5 分鐘快速上手

## License

MIT
