# Mailchimp Multi-Region Dashboard — 開發紀錄

> 我用 AI 做了什麼：從零建立一個多區域 Mailchimp 電子報分析儀表板，涵蓋前後端、認證系統、日曆檢視、跨區比較，並完成從 Docker/Zeabur/SQLite 到 Vercel/Supabase 的完整架構遷移
> 沒有 AI 的話：以這個規模的功能與架構遷移，至少需要 2-3 人的小團隊花 3-4 個月開發
> 最終成果：完整的生產環境 Dashboard，前後端部署在 Vercel、資料庫在 Supabase，日常用於管理 6 個區域的 EDM 行銷數據

> 公司需要一個統一的平台來監控 US / EU / APAC / JP / TW / INDIA 六個區域的 Mailchimp 電子報表現，取代原本散在各區域各自登入 Mailchimp 後台查看的低效方式。

## 一、為什麼要做這件事

EnGenius 在全球有六個區域分公司，各自有獨立的 Mailchimp 帳號在發電子報。行銷團隊要看「全局表現」時，必須分別登入多個 Mailchimp 後台，手動比對數據。這有幾個問題：

- **效率低**：每次要看報告就要切多個帳號，光登入就浪費時間
- **無法跨區比較**：Mailchimp 原生不支援跨帳號的 Campaign 比較
- **缺乏統一視角**：沒有一個地方可以一眼看到「哪個區域表現最好、哪個需要關注」
- **分享困難**：想把數據分享給主管或其他部門，只能截圖貼 Slack
- **排程盲區**：各區域的 Campaign 排程散落各處，無法一覽全貌

目標很明確：**建一個統一的儀表板，一個畫面看全球，能比較、能排程總覽、能分享。**

## 二、技術選型

| 技術 | 選擇 | 為什麼選它 |
|------|------|-----------|
| 前端框架 | React 19 + Vite | 生態成熟、元件化開發效率高、Vite 熱更新快 |
| 樣式 | Tailwind CSS | 快速迭代 UI，不用寫一堆 CSS 檔案 |
| 圖表 | Recharts | React 原生支援、API 直覺、客製化容易 |
| 後端框架 | Python FastAPI | 效能好、自動生成 API 文件、async 原生支援 |
| 資料庫 | Supabase PostgreSQL | 雲端託管、REST API 直接呼叫、免費方案夠用、自帶管理介面 |
| 認證 | JWT + bcrypt | 業界標準、無需第三方服務 |
| 前端部署 | Vercel | GitHub push 自動部署、全球 CDN、零設定 |
| 後端部署 | Vercel Serverless | 同一平台管理、免維護伺服器、自動擴縮 |

> **選型原則**：這次的遷移（從 Docker + Zeabur + SQLite 搬到 Vercel + Supabase）核心考量是「維護成本」。Docker 要顧容器、Zeabur 要顧 volume、SQLite 要顧備份——換成全託管服務之後，push 就部署，不用再管基礎設施。

> **拿掉的東西**：原本有 Google Gemini AI 分析功能（截圖送 AI 產出報告），但 Vercel Serverless 有 10 秒 timeout 限制，AI 分析往往超時，所以整組移除。這是一個「功能很酷但跟架構不相容」的典型取捨。

## 三、建了什麼功能

### 核心儀表板

**總覽頁面（All Regions）**
- KPI 卡片：一眼看到全球的發送量、開信率、點擊率、退訂數、訂閱人數
- Executive Summary：自動彙整的摘要報告，標出表現最好和需要關注的區域
- 時間序列圖表：多指標疊加，支援各區域獨立顯示
- 區域績效卡片 / 表格：Cards 和 Table 兩種檢視模式切換
- MoM/QoQ 趨勢比較：自動計算同期變化百分比

**區域詳細頁面（Region Detail）**
- 該區域完整 KPI、效能趨勢圖
- Campaign 列表：Status 篩選、關鍵字搜尋、欄位選擇器、CSV 匯出
- Campaign 日曆：月曆格狀顯示所有 Campaign 的狀態與排程
- Audience 篩選：可切換不同 Audience 查看數據
- Segment Coverage：顯示每個 Campaign 的受眾涵蓋率

### 跨區域 Campaign 比較

Mailchimp 原生完全做不到的功能：選擇不同區域的 Campaign 放在同一張表格裡比較，可儲存比較群組供日後檢視，搜尋功能支援跨區域找 Campaign。

### Campaign 日曆檢視（新功能）

在單一區域頁面，Campaign 列表可以切換成月曆檢視。月曆上用不同顏色標示 Sent / Scheduled / Draft / Paused 四種狀態，點擊日期會彈出該日所有 Campaign 的詳情。這等於自帶了一個輕量的 Content Planning 視角——不用另外開工具，就能看到「這個月哪幾天有排程、有沒有空窗」。

### 區域績效表格檢視（新功能）

總覽頁面原本只有卡片式的區域摘要，現在多了一個 Table 檢視。把所有區域的核心指標（開信率、點擊率等）排成表格，最佳表現的數字標上星號，一眼就能做跨區域的橫向比較。點擊任一行可以直接跳到該區域的詳細頁面。

### Campaign 列表強化（新功能）

Campaign 列表從原本只能看「已寄出」的 Campaign，擴充到可以看所有狀態（Sent / Scheduled / Draft / Paused）。新增了關鍵字搜尋（搜 Campaign 名稱和 Subject Line）、CSV 匯出（正確處理中文編碼）、欄位可見度選擇器（設定會記在瀏覽器裡，下次打開還在）。

### A/B 測試 Archive 修復

Mailchimp 早期格式的 A/B 測試 Campaign（variate + template 類型）在 archive 頁面會是空白的。系統現在會自動偵測這種狀況，改用勝出變體的 archive URL，確保每個 Campaign 都能正確開啟。

### 認證與使用者管理

- JWT 認證，24 小時 token 有效期
- 三種角色：Admin（完整權限）/ Manager / Viewer（唯讀）
- 首次登入強制改密碼
- 管理員可新增/刪除使用者、重設密碼

### 分享與匯出

- **分享連結**：保留當前篩選狀態，可設密碼和過期時間，無需登入即可檢視
- **匯出**：PNG 高解析度截圖、PDF 多頁報告

### 其他功能

- 閾值警示（開信率/點擊率低於設定值紅色標示）
- 排除測試 Audience，不影響統計
- 活動日誌追蹤使用者操作
- API 診斷工具（endpoint 狀態與回應時間）
- 響應式設計（Desktop / Tablet / Mobile）
- Mock 資料模式（無 API key 也能開發測試）

## 四、解決了什麼問題

| 原本的痛點 | Dashboard 怎麼解決 |
|-----------|-------------------|
| 要切多個 Mailchimp 帳號看數據 | 一個畫面看全球 6 個區域，KPI 自動彙總 |
| 無法跨區域比較 Campaign 表現 | Campaign 比較功能，跨區域放在同一張表 |
| 分享數據只能截圖 | 一鍵產生分享連結，可設密碼保護 |
| 主管要報告要手動整理 | PDF/PNG 匯出，含 KPI、圖表、Campaign 列表 |
| 測試 Audience 干擾統計 | 排除功能，一鍵排除不影響正式數據 |
| 沒有歷史趨勢可看 | 時間序列圖表 + MoM/QoQ 自動比較 |
| 各區域排程散落各處，看不到全貌 | Campaign 日曆檢視，一覽 Draft → Scheduled → Sent 生命週期 |
| 跨區數字比較要手動對照 | 區域績效表格，最佳表現自動標記 |
| 只能看已寄出的 Campaign | Status 篩選器，Scheduled/Draft/Paused 都能看 |
| 舊格式 A/B 測試 archive 打開是空白 | 自動偵測並切換到勝出變體的 archive |

## 五、技術架構

使用者瀏覽器
    |
    v
Vercel CDN（前端）
    React SPA 靜態檔案
    |
    v
Vercel Serverless Functions（後端）
    FastAPI
    JWT 認證
    ThreadPoolExecutor 平行抓取
    |
    +--- Supabase PostgreSQL（資料庫）
    |      REST API 連線（supabase-py）
    |      5 個 RPC functions 處理複雜查詢
    |
    +--- Mailchimp API（6 個區域）
    |
    +--- Vercel Cron（每日 08:00 UTC keep-alive）

**部署方式**：前端 push GitHub 自動部署到 Vercel；後端在 backend 目錄手動執行部署；資料庫在 Supabase 託管，透過 REST API 存取，不用管連線池。整個架構沒有任何需要自己維護的伺服器。

## 六、踩到的坑，讓我更懂的事

**Supabase Pooler 連不上**
遷移到 Supabase 時，一開始用 Connection Pooler（走 psycopg2）連線，結果一直報「Tenant or user not found」。查了很久發現是 Pooler 的已知問題。最後改用 REST API（supabase-py）繞過去，反而更簡單——不用管連線池、不用裝 psycopg2，API 呼叫就搞定。

**Vercel 10 秒 Timeout**
原本的 AI 分析功能（截圖送 Gemini）在 Zeabur 跑得好好的，搬到 Vercel 就爆了。Free tier 的 Serverless Function 有 10 秒 timeout，AI 分析動輒 15-30 秒。試過各種最佳化都壓不進 10 秒，最後決定整組移除。教訓：選架構之前要先確認每個功能的執行時間限制。

**A/B 測試 Archive 空白頁**
Mailchimp 早期的 A/B 測試 Campaign（variate + template 類型）有一個 archive URL，但打開是空白的。原因是這種格式的 archive 連結指向的是「母 Campaign」而不是實際的變體內容。解法是偵測到這種情況時，自動去抓勝出變體的 archive URL 來替代。

**bcrypt 版本衝突**
Python 的 passlib 套件跟 bcrypt 5.x 不相容，會在密碼驗證時報錯。必須把 bcrypt 鎖定在 4.x 版本。這種依賴衝突在本地開發不一定會遇到，但一部署到乾淨環境就炸。

**Supabase Free Tier 自動暫停**
Supabase 免費方案如果一週沒有活動，資料庫會被自動暫停。設了一個 Vercel Cron Job，每天早上 UTC 8 點自動 ping 一下，防止被暫停。小事，但不知道的話某天早上 Dashboard 就突然掛了。

## 七、如果繼續往下

- **Google Social Login**：利用 Supabase Auth 加入 Google OAuth，白名單制，只允許公司網域登入，取代現在的帳號密碼
- **啟用 Row Level Security**：目前 Supabase 沒有開 RLS，資料庫用 anon key 就能存取所有資料。生產環境應該啟用 RLS 搭配 service_role key
- **Content Planning 進化**：Calendar View 已經能看排程，下一步可以加上 Topic Pool——在日曆上直接規劃未來的 Campaign 主題
- **訂閱增長追蹤**：長期追蹤各區域的訂閱人數變化趨勢
- **與 CRM 整合**：把 Campaign 表現和實際轉換率（Salesforce / HubSpot）串起來

## Takeaway

**這個案例展示的核心思路**：
用 AI 協作的方式，一個人就能建出原本需要小團隊才能完成的內部工具——而且不只是建出來，還能在一週內完成從 Docker/SQLite 到 Vercel/Supabase 的完整架構遷移。關鍵不在技術多複雜，而是清楚知道「要解決什麼問題」，然後讓 AI 處理實作細節。

**可移植的部分**：
- 「多帳號聚合成統一儀表板」的模式適用於任何 SaaS 工具（Google Ads、Facebook Ads、GA4 等）
- 「Vercel 前端 + Vercel Serverless 後端 + Supabase 資料庫」這套免費組合，適合所有中小型內部工具，零伺服器維護
- 日曆檢視 + 狀態篩選的 UI 模式，適合任何需要「排程總覽」的場景

**這個案例的特殊條件**：
- Mailchimp API 相對穩定且文件齊全，其他平台的 API 品質可能不同
- Vercel Free Tier 的 10 秒 timeout 是硬限制，需要長時間運算的功能（如 AI 分析）不適合這個架構
- Supabase Free Tier 有自動暫停機制，需要 keep-alive 策略

_開發紀錄整理日期：2026-03-24_
