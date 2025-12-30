# MailChimp Multi-Region Dashboard 🚀

酷炫的 MailChimp 多帳號管理儀表板，一次管理 4 個分公司的行銷數據！

## 功能特色 ✨

### 多區域支援
- 🇺🇸 美國 (US)
- 🇪🇺 歐洲 (EU)
- 🌏 亞太 (APAC)
- 🇯🇵 日本 (JP)

### 主要功能

#### 總覽頁面
- **整體 KPI 卡片**: 顯示所有區域加總的關鍵指標
  - 總發送郵件數
  - 平均開信率
  - 平均點擊率
  - 取消訂閱總數

- **區域比較圖表**:
  - 長條圖：比較各區域的開信率/點擊率
  - 折線圖：顯示過去 30 天訂閱人數趨勢

- **區域摘要卡片**: 4 張可點擊的卡片顯示各分公司摘要數據

#### 單一區域詳細頁面
- 該區域的詳細 KPI 指標
- 性能趨勢圖表
- 最近發送的 email 列表（前 10 封）
- 返回總覽按鈕

#### 智能篩選
- **時間範圍選擇器**: 7天 / 30天 / 90天
- **區域下拉選單**: All Regions / US / EU / APAC / JP
- 選擇後所有數據即時更新

## 技術架構 🏗️

### Backend (FastAPI + Python)
- **FastAPI**: 高性能 Python Web 框架
- **SQLite**: 本地資料快取
- **多區域支援**: 每個區域可配置獨立的 MailChimp API 憑證

#### API Endpoints
- `GET /api/dashboard?days={7|30|90}&region={US|EU|APAC|JP}` - 獲取儀表板數據
- `GET /api/regions` - 獲取可用區域列表
- `POST /api/sync?days={7|30|90}` - 觸發背景同步

### Frontend (React + Vite)
- **React 19**: 最新的 React 版本
- **Vite**: 極速的開發建置工具
- **Tailwind CSS**: 現代化的 CSS 框架
- **Recharts**: 強大的圖表庫
- **Lucide React**: 精美的圖標庫

#### 主要元件
- `App.jsx` - 主應用程式，處理路由和狀態
- `KPICards.jsx` - KPI 指標卡片
- `RegionCards.jsx` - 區域摘要卡片（可點擊）
- `RegionComparisonCharts.jsx` - 區域比較圖表
- `DashboardCharts.jsx` - 單一區域詳細圖表
- `CampaignList.jsx` - Campaign 列表
- `RegionSelector.jsx` - 區域下拉選單
- `TimeRangeSelector.jsx` - 時間範圍選擇器

## 快速開始 🚀

### 1. 環境需求
- Python 3.8+
- Node.js 18+
- MailChimp API Key (可選，有 Mock 資料可用)

### 2. Backend 設定

```bash
cd backend

# 安裝依賴
pip install -r requirements.txt

# 設定環境變數（可選）
# 創建 .env 檔案並加入：
# MAILCHIMP_API_KEY_US=your_us_api_key
# MAILCHIMP_SERVER_PREFIX_US=us1
# MAILCHIMP_API_KEY_EU=your_eu_api_key
# MAILCHIMP_SERVER_PREFIX_EU=us1
# ... 其他區域

# 啟動 Backend
python main.py
# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend 設定

```bash
cd frontend

# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build
```

### 4. 訪問應用
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 文檔: http://localhost:8000/docs

## 使用說明 📖

### 查看總覽
1. 打開應用，預設顯示「總覽頁面」
2. 上方顯示所有區域的整體 KPI
3. 中間顯示區域比較圖表
4. 下方顯示 4 個區域的摘要卡片

### 查看單一區域
**方法 1**: 點擊區域卡片
**方法 2**: 使用上方的區域下拉選單選擇區域

### 調整時間範圍
使用右上角的時間範圍選擇器，選擇 7天/30天/90天

### 同步資料
點擊右上角的「Sync」按鈕，從 MailChimp API 重新獲取最新數據

### 返回總覽
在單一區域頁面時，點擊左上角的「← Back to Overview」按鈕

## Mock 資料 🎭

如果沒有設定 MailChimp API 憑證，應用會自動使用 Mock 資料：
- 4 個區域各有 30 筆 campaign 資料
- 每個區域的數據特性略有不同（開信率、點擊率等）
- 自動生成的訂閱人數趨勢數據

## 資料庫架構 💾

SQLite 資料庫包含以下表格：

### campaigns 表
- `id` - Campaign ID
- `region` - 區域代碼 (US/EU/APAC/JP)
- `title` - Campaign 標題
- `send_time` - 發送時間
- `data_json` - 完整 campaign 資料 (JSON)
- `updated_at` - 更新時間

主鍵: `(id, region)`

## 環境變數配置 ⚙️

### Backend (.env)
```env
# 單一帳號（所有區域共用）
MAILCHIMP_API_KEY=your_api_key
MAILCHIMP_SERVER_PREFIX=us1

# 或使用多帳號（各區域獨立）
MAILCHIMP_API_KEY_US=us_api_key
MAILCHIMP_SERVER_PREFIX_US=us1
MAILCHIMP_API_KEY_EU=eu_api_key
MAILCHIMP_SERVER_PREFIX_EU=us1
MAILCHIMP_API_KEY_APAC=apac_api_key
MAILCHIMP_SERVER_PREFIX_APAC=us1
MAILCHIMP_API_KEY_JP=jp_api_key
MAILCHIMP_SERVER_PREFIX_JP=us1
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
```

## 部署建議 🌐

### 使用 Docker
專案已包含 Dockerfile 可直接使用 Docker 部署。

### 手動部署
1. Backend: 使用 Gunicorn + Uvicorn workers
2. Frontend: 建置後使用 Nginx 或其他靜態檔案伺服器

## 未來優化方向 🔮

- [ ] 新增更多圖表類型（餅圖、熱力圖等）
- [ ] 支援自訂時間範圍
- [ ] 新增 Email 模板預覽
- [ ] 匯出報表功能 (PDF/Excel)
- [ ] 即時通知功能
- [ ] 深色模式支援
- [ ] 多語言支援

## License

MIT

---

Made with ❤️ by Claude Code
