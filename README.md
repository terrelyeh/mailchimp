# MailChimp Multi-Region Dashboard

EnGenius EDM Analytic Dashboard — 統一管理 4 個分公司（US / EU / APAC / JP）的 Mailchimp 電子報行銷數據，提供即時分析、AI 洞察與團隊協作功能。

## 功能特色

### 儀表板
- **總覽頁面** — 全區域 KPI 彙總、Executive Summary、區域比較圖表、區域摘要卡片
- **區域詳細頁面** — 單一區域 KPI、效能趨勢圖、Campaign 列表（可搜尋、排序、分頁）
- **時間序列圖表** — 多指標疊加、區域篩選、hover tooltip
- **MoM/QoQ 比較** — 自動計算同期趨勢變化

### 篩選與資料管理
- **時間範圍** — 7 / 30 / 60 / 90 / 180 / 365 天 + 自訂日期
- **區域篩選** — All Regions 或單一區域
- **Audience 篩選** — 單一 Audience 或全部，支援排除測試 Audience
- **Segment Coverage** — 顯示 Campaign 的受眾涵蓋率
- **資料同步** — 手動觸發從 Mailchimp API 抓取最新資料

### AI 分析（Google Gemini）
- 截圖 → base64 → Gemini AI 分析，產出行銷診斷報告
- 結構化輸出：現況診斷、核心洞察、本週執行清單、自動化建議
- 可設定 AI 模型、自訂 Prompt、輸出格式

### Campaign 比較
- 跨區域 Campaign 比較，支援建立比較群組
- 儲存比較結果，方便日後檢視

### 認證與使用者管理
- JWT 認證（HS256，24hr）、bcrypt 密碼 hashing
- 角色管理：Admin（完整權限）/ Viewer（唯讀）
- 首次登入強制變更密碼、管理員可新增/刪除/重設密碼

### 分享與匯出
- **分享連結** — 保留篩選狀態、可設密碼保護與過期時間、無需登入即可檢視
- **匯出** — PNG 高解析度截圖、PDF 多頁報表
- **活動日誌** — 追蹤使用者操作紀錄

### 其他
- 閾值警示（Open Rate / Click Rate / Bounce Rate）
- API 診斷工具（endpoint 狀態、回應時間）
- 響應式設計（Desktop / Tablet / Mobile）
- Mock 資料模式（無 API key 也可測試）

## 技術架構

### Backend — Python FastAPI
| 技術 | 用途 |
|------|------|
| FastAPI + Uvicorn | ASGI web server |
| SQLite3 | 本地快取資料庫 |
| python-jose + bcrypt | JWT 認證 + 密碼安全 |
| google-generativeai | Gemini AI 整合 |
| BackgroundTasks | 背景資料同步 |
| ThreadPoolExecutor | 平行抓取多區域資料 |

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
- Docker + Docker Compose
- Nginx（靜態檔案 + reverse proxy）
- Vercel（Frontend 靜態網站 + Backend Serverless Functions）
- Supabase PostgreSQL（雲端資料庫）

## API Endpoints

共 45 個 endpoints，主要分類：

| 分類 | 路徑 | 說明 |
|------|------|------|
| 認證 | `/api/auth/*` | 登入、個人資料、變更密碼 |
| 使用者 | `/api/users/*` | CRUD、角色管理、重設密碼（Admin） |
| 儀表板 | `/api/dashboard` | 依時間/區域取得儀表板資料 |
| 區域 | `/api/regions/*` | 區域列表、活動狀態 |
| 資料 | `/api/sync`, `/api/cache/*` | 同步、快取管理 |
| Audience | `/api/audiences`, `/api/settings/excluded-audiences` | 列表、排除設定 |
| 分享 | `/api/share/*` | 建立/驗證/管理分享連結 |
| AI 分析 | `/api/ai/*` | 分析、狀態、設定管理 |
| 活動日誌 | `/api/activity/*` | 記錄、查詢、統計 |
| 比較 | `/api/comparisons/*` | Campaign 比較群組 CRUD |
| 搜尋 | `/api/campaigns/search` | Campaign 搜尋 |
| 系統 | `/`, `/health`, `/api/diagnose` | 健康檢查、診斷 |

完整 API 文件：啟動後端後訪問 `http://localhost:8000/docs`

## 快速開始

### 環境需求
- Python 3.9+
- Node.js 18+
- Mailchimp API Key（可選，有 Mock 資料）

### 本機開發

```bash
# Backend
cd backend
cp .env.example .env   # 填入 API keys
uv venv && uv pip install -r requirements.txt
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Docker 部署

```bash
docker-compose up --build
# Frontend: http://localhost:80
# Backend API: http://localhost:8000/docs
```

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `MAILCHIMP_API_KEY` | 單一帳號 API key | - |
| `MAILCHIMP_SERVER_PREFIX` | Server prefix (如 us1) | - |
| `MAILCHIMP_API_KEY_{REGION}` | 各區域獨立 API key | - |
| `MAILCHIMP_SERVER_PREFIX_{REGION}` | 各區域 server prefix | - |
| `GEMINI_API_KEY` | Google Gemini AI API key | - |
| `GEMINI_MODEL` | Gemini 模型 | gemini-2.0-flash |
| `JWT_SECRET` | JWT 簽名密鑰（生產必改） | 自動生成 |
| `ADMIN_EMAIL` | 預設管理員 email | engenius.ad@gmail.com |
| `ADMIN_INITIAL_PASSWORD` | 初始管理員密碼 | admin123 |
| `ALLOWED_ORIGINS` | CORS 允許來源 | * |
| `DATA_DIR` | SQLite 儲存目錄 | /data |

## Mock 資料

未設定 Mailchimp API key 時，自動使用 Mock 資料：
- 4 個區域各 30 筆 Campaign
- 模擬的訂閱人數趨勢
- 適合 UI 開發與功能測試

## 詳細文件

- [docs/FEATURES.md](./docs/FEATURES.md) — 完整功能規格與操作指南
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Vercel + Supabase 部署指南
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) — 詳細設定教學
- [QUICKSTART.md](./QUICKSTART.md) — 5 分鐘快速上手

## License

MIT
