# Mailchimp Multi-Region Dashboard — 開發紀錄

> 🤖 **我用 AI 做了什麼**：從零建立一個多區域 Mailchimp 電子報分析儀表板，涵蓋前後端、認證系統、AI 分析、Docker 部署
> ⏱ **沒有 AI 的話**：以這個規模的功能，至少需要一個 2-3 人的小團隊花 2-3 個月開發
> ✅ **最終成果**：完整的生產環境 Dashboard，已部署在 Zeabur，日常用於管理 4 個區域的 EDM 行銷數據

> 公司需要一個統一的平台來監控 US / EU / APAC / JP 四個區域的 Mailchimp 電子報表現，取代原本散在各區域各自登入 Mailchimp 後台查看的低效方式。

## 一、為什麼要做這件事

EnGenius 在全球有四個區域分公司，各自有獨立的 Mailchimp 帳號在發電子報。行銷團隊要看「全局表現」時，必須分別登入四個 Mailchimp 後台，手動比對數據。這有幾個問題：

- **效率低**：每次要看報告就要切四個帳號，光登入就浪費時間
- **無法跨區比較**：Mailchimp 原生不支援跨帳號的 Campaign 比較
- **缺乏統一視角**：沒有一個地方可以一眼看到「哪個區域表現最好、哪個需要關注」
- **分享困難**：想把數據分享給主管或其他部門，只能截圖貼 Slack

目標很明確：**建一個統一的儀表板，一個畫面看全球，能比較、能分析、能分享。**

## 二、技術選型

| 技術 | 選擇 | 為什麼選它 |
|------|------|-----------|
| 前端框架 | React 19 + Vite | 生態成熟、元件化開發效率高、Vite 熱更新快 |
| 樣式 | Tailwind CSS | 快速迭代 UI，不用寫一堆 CSS 檔案 |
| 圖表 | Recharts | React 原生支援、API 直覺、客製化容易 |
| 後端框架 | Python FastAPI | 效能好、自動生成 API 文件、async 原生支援 |
| 資料庫 | SQLite | 輕量、無需額外服務、適合這個規模的資料快取 |
| AI 分析 | Google Gemini 2.0 Flash | 支援圖片輸入（截圖分析）、速度快、成本低 |
| 認證 | JWT + bcrypt | 業界標準、無需第三方服務 |
| 部署 | Docker + Zeabur | 容器化確保一致性、Zeabur 支援 Persistent Volume |

> **選型原則**：優先考慮「能快速迭代」和「維護成本低」。這不是一個需要處理高併發的系統，而是一個給內部團隊用的分析工具，所以 SQLite 完全夠用，不需要上 PostgreSQL。

## 三、建了什麼功能

### 核心儀表板

**總覽頁面（Home Dashboard）**
- KPI 卡片：一眼看到全球的發送量、開信率、點擊率、退訂數、訂閱人數
- Executive Summary：AI 自動生成的摘要報告，標出表現最好和需要關注的區域
- 時間序列圖表：多指標疊加，支援各區域獨立顯示
- 區域摘要卡片：點擊直接進入該區域的詳細頁面
- MoM/QoQ 趨勢比較：自動計算同期變化百分比

**區域詳細頁面（Region Detail）**
- 該區域完整 KPI、效能趨勢圖
- Campaign 列表：可搜尋、排序、分頁，標題可直接連到 Mailchimp 原始 archive
- Audience 篩選：可切換不同 Audience 查看數據
- Segment Coverage：顯示每個 Campaign 的受眾涵蓋率

### 跨區域 Campaign 比較

這是 Mailchimp 原生完全做不到的功能：
- 選擇不同區域的 Campaign，放在同一張表格裡比較
- 可以儲存比較群組，下次直接打開
- 搜尋功能可以跨區域找 Campaign

### AI 分析（Google Gemini）

按下浮動按鈕 → 系統自動截圖當前儀表板 → 送給 Gemini AI 分析 → 產出結構化報告：
1. 現況診斷（標出問題指標與 benchmark 對比）
2. 核心洞察與理由（數據交叉分析的結論）
3. 本週執行清單（5-7 個可行動項目）
4. 自動化建議（行銷自動化方向）

AI 模型、Prompt、輸出格式都可以在後台自訂。

### 認證與使用者管理

- JWT 認證，24 小時 token 有效期
- 兩種角色：Admin（完整權限）/ Viewer（唯讀）
- 首次登入強制改密碼
- 管理員可新增/刪除使用者、重設密碼

### 分享與匯出

- **分享連結**：保留當前篩選狀態，可設密碼和過期時間，無需登入即可檢視
- **匯出**：PNG 高解析度截圖、PDF 多頁報告

### 其他功能

- 閾值警示：開信率/點擊率低於設定值時紅色標示
- 排除 Audience：排除測試用 Audience，不影響統計
- 活動日誌：追蹤使用者操作紀錄
- API 診斷工具：即時檢查各 endpoint 狀態與回應時間
- 響應式設計：Desktop / Tablet / Mobile 都能用
- Mock 資料：沒有 API key 也能用假資料開發測試

## 四、解決了什麼問題

| 原本的痛點 | Dashboard 怎麼解決 |
|-----------|-------------------|
| 要切 4 個 Mailchimp 帳號看數據 | 一個畫面看全球，KPI 自動彙總 |
| 無法跨區域比較 Campaign 表現 | Campaign 比較功能，跨區域放在同一張表 |
| 看完數據不知道要做什麼 | AI 分析直接產出診斷報告和行動清單 |
| 分享數據只能截圖 | 一鍵產生分享連結，可設密碼保護 |
| 主管要報告要手動整理 | PDF/PNG 匯出，含 KPI、圖表、Campaign 列表 |
| 測試用 Audience 干擾統計 | 排除功能，一鍵排除不影響正式數據 |
| 沒有歷史趨勢可看 | 時間序列圖表 + MoM/QoQ 自動比較 |

## 五、技術架構

```
使用者瀏覽器
    │
    ▼
┌─────────────────────────────────┐
│  Frontend (Nginx + React SPA)   │  Port 80
│  Vite build → 靜態檔案          │
│  Nginx reverse proxy → /api/*   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)    │  Port 8000
│  45 API endpoints               │
│  JWT 認證 middleware             │
│  BackgroundTasks 背景同步        │
│  ThreadPoolExecutor 平行抓取    │
├─────────────────────────────────┤
│  SQLite (campaign_cache.db)     │  /data volume
│  SQLite (dashboard.db)          │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      ▼              ▼
 Mailchimp API   Gemini AI API
 (4 regions)     (截圖分析)
```

**部署在 Zeabur**：Docker Compose 編排前後端兩個容器，SQLite 掛載在 Persistent Volume 確保重新部署不遺失資料。

## 六、如果繼續往下

- **自動定時報告**：每週自動產生 AI 分析報告，寄到指定信箱或推播到 Slack
- **A/B Test 分析**：當 Mailchimp 有做 A/B 測試時，自動比較各變體的表現
- **訂閱增長追蹤**：長期追蹤各區域的訂閱人數變化趨勢
- **與 CRM 整合**：把 Campaign 表現和實際轉換率（Salesforce / HubSpot）串起來

## Takeaway

**這個案例展示的核心思路**：
用 AI 協作的方式，一個人就能建出原本需要小團隊才能完成的內部工具。關鍵不在技術多複雜，而是清楚知道「要解決什麼問題」，然後讓 AI 處理實作細節。

**可移植的部分**：
- 「多帳號聚合成統一儀表板」的模式適用於任何 SaaS 工具（Google Ads、Facebook Ads、GA4 等）
- 「截圖 → AI 分析 → 結構化報告」的流程可以套用到任何數據儀表板
- Docker + Zeabur 的部署方式適合所有需要持久儲存的小型內部工具

**這個案例的特殊條件**：
- Mailchimp API 相對穩定且文件齊全，其他平台的 API 品質可能不同
- SQLite 適合這個規模（十幾個使用者），如果使用者更多需要換成 PostgreSQL
- Gemini AI 分析的品質取決於 Prompt 設計，需要根據實際需求調整

_開發紀錄整理日期：2026-03-17_
