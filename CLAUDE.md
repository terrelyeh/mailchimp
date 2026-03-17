# CLAUDE.md — Project Context

> Last updated: 2026-03-17

## Project Overview

Mailchimp Multi-Region Dashboard — 管理 4 個分公司（US / EU / APAC / JP）的 Mailchimp 電子報行銷數據。
提供 KPI 總覽、區域比較圖表、Campaign 列表與比較、AI 分析報告、匯出 PDF 等功能。
目前部署在 Zeabur（Docker 容器）。

## Tech Stack

### Frontend (`/frontend`)
- React 19 + Vite 5.4 + Tailwind CSS 3.4
- Recharts 3.6（圖表）、Lucide React（圖標）
- Axios（API 請求）、date-fns（日期處理）
- html2canvas + jsPDF（截圖匯出 PDF）
- Nginx 作為靜態伺服器（Docker 內）

### Backend (`/backend`)
- Python FastAPI + Uvicorn（ASGI server）
- SQLite3（本地快取資料庫：`campaign_cache.db`、`dashboard.db`）
- JWT（python-jose）+ bcrypt（認證與密碼 hashing）
- Google Gemini AI（`google-generativeai`，預設 gemini-2.0-flash）
- BackgroundTasks 背景同步、ThreadPoolExecutor 平行抓取

### 部署
- Docker + Docker Compose
- Zeabur 雲端平台（Persistent Volume 掛載 SQLite）

## Directory Structure

```
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # 主應用（路由、狀態管理）
│   │   ├── api.js               # Axios API client
│   │   ├── components/          # 27 個 React 元件
│   │   │   ├── CompareModal.jsx       # Campaign 跨區域比較（最大元件 ~41KB）
│   │   │   ├── ExecutiveSummary.jsx   # AI 摘要報告（~39KB）
│   │   │   ├── CampaignList.jsx       # Campaign 列表搜尋篩選
│   │   │   ├── DiagnosticsDrawer.jsx  # 資料診斷工具
│   │   │   ├── AIAnalysisModal.jsx    # Gemini AI 分析結果顯示
│   │   │   ├── KPICards.jsx           # KPI 指標卡片
│   │   │   ├── TimeSeriesMetricsChart.jsx  # 時間序列圖表
│   │   │   └── ...（其餘元件）
│   │   └── contexts/
│   │       └── ThresholdContext.jsx   # 全域閾值狀態
│   ├── Dockerfile               # Multi-stage: Node 18 build → Nginx
│   └── nginx.conf               # SPA 路由 + API proxy
├── backend/
│   ├── main.py                  # FastAPI app（所有 API endpoints）
│   ├── database.py              # SQLite schema 與 CRUD 操作
│   ├── mailchimp_service.py     # Mailchimp API client（Singleton）
│   ├── .env.example             # 環境變數範例
│   └── Dockerfile               # Python 3.9 slim
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
- AI 分析：前端截圖 → base64 傳後端 → Gemini API 分析（耗時 30-120 秒）
- Commit 風格：`fix:` / `feat:` / `chore:` 前綴

## Current Status

### ✅ Completed
- 多區域 KPI 儀表板（總覽 + 單區域詳細）
- Campaign 跨區域比較功能
- Gemini AI 分析（截圖分析、AI 設定管理）
- JWT 認證 + 角色管理（admin/viewer）+ 使用者管理
- 分享連結（可設密碼、過期時間）
- PDF / 截圖匯出
- 活動日誌追蹤
- Audience 篩選 + 排除管理
- Segment coverage 顯示
- 診斷工具 Drawer
- Zeabur Docker 部署

### ⚠️ Known Issues / Notes
- Gemini AI 分析耗時長（30-120 秒），Serverless 平台不適用
- SQLite 為檔案型資料庫，需要 Persistent Volume
- 後端使用 BackgroundTasks + ThreadPoolExecutor，需長駐服務環境

## Development

```bash
# Backend
cd backend
uv venv && uv pip install -r requirements.txt
cp .env.example .env  # 填入 API keys
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Docker（完整環境）
docker-compose up --build
# Frontend: http://localhost:80
# Backend: http://localhost:8000/docs
```

## Common Pitfalls

- **CORS**：後端 `ALLOWED_ORIGINS` 預設為 `*`，生產環境需設定為前端網域
- **SQLite 路徑**：Docker 內掛載 `/data` 目錄，Zeabur 需設定 Persistent Volume
- **Gemini timeout**：AI 分析可能超過 2 分鐘，前端需有足夠的 loading 狀態處理
- **Sync 按鈕**：已改為同步 `populateCache`（非背景 `triggerSync`），避免快取不一致
- **JWT_SECRET**：預設值僅供開發，生產環境必須設定環境變數覆蓋
- **多區域 API key**：env 格式為 `MAILCHIMP_API_KEY_{REGION}` + `MAILCHIMP_SERVER_PREFIX_{REGION}`
