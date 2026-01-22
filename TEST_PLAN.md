# Mailchimp Dashboard - QA Test Plan

## 測試資訊
- **應用名稱**: Mailchimp Multi-Region Dashboard
- **測試版本**: v1.0
- **測試日期**: ____________
- **測試人員**: ____________
- **應用網址**: https://your-app-url.zeabur.app

---

## 如何使用 AI 進行測試

### 與 AI 溝通的 Prompt 範本

```
我需要你幫我測試一個 Mailchimp Dashboard 網頁應用。

應用網址: [貼上網址]
測試帳號: [提供測試帳號]
密碼: [提供密碼]

請依照以下測試案例逐一測試，並回報結果：
[貼上下方的測試案例]

回報格式：
- 測試項目: [名稱]
- 結果: PASS / FAIL
- 實際行為: [描述你看到的]
- 截圖: [如果可以的話]
- 問題描述: [如果 FAIL]
```

---

## 測試帳號

| 角色 | Email | 密碼 | 用途 |
|------|-------|------|------|
| Admin | [admin@example.com] | [password] | 測試所有功能 |
| Viewer | [viewer@example.com] | [password] | 測試權限限制 |

---

## 測試案例

### 1. 認證與登入 (Authentication)

#### TC-1.1: 正常登入
```
前置條件: 未登入狀態
測試步驟:
1. 開啟應用網址
2. 輸入正確的 Email
3. 輸入正確的密碼
4. 點擊「Login」按鈕

預期結果:
- 成功登入
- 跳轉到 Dashboard 主頁
- 右上角顯示使用者名稱
```
結果: [ ] PASS  [ ] FAIL

#### TC-1.2: 錯誤密碼登入
```
前置條件: 未登入狀態
測試步驟:
1. 輸入正確的 Email
2. 輸入錯誤的密碼
3. 點擊「Login」按鈕

預期結果:
- 顯示錯誤訊息「Invalid email or password」
- 停留在登入頁面
```
結果: [ ] PASS  [ ] FAIL

#### TC-1.3: 登出
```
前置條件: 已登入狀態
測試步驟:
1. 點擊右上角使用者名稱
2. 點擊「Logout」

預期結果:
- 成功登出
- 跳轉到登入頁面
```
結果: [ ] PASS  [ ] FAIL

---

### 2. 首頁儀表板 (Home Dashboard)

#### TC-2.1: 載入儀表板資料
```
前置條件: 已登入
測試步驟:
1. 確認在首頁 Dashboard

預期結果:
- 顯示 Executive Summary 區塊
- 顯示 Top Region 卡片
- 顯示 Needs Attention 卡片
- 顯示 Alerts 列表
- 顯示各區域的 KPI 卡片
```
結果: [ ] PASS  [ ] FAIL

#### TC-2.2: 時間範圍切換
```
前置條件: 已登入，在首頁
測試步驟:
1. 點擊時間範圍選擇器
2. 選擇「Last 30 Days」
3. 觀察資料是否更新
4. 重複測試 7 天、60 天、90 天

預期結果:
- 資料根據選擇的時間範圍更新
- KPI 數值隨時間範圍變化
```
結果: [ ] PASS  [ ] FAIL

#### TC-2.3: 點擊區域卡片跳轉
```
前置條件: 已登入，在首頁
測試步驟:
1. 找到 Top Region 卡片
2. 點擊區域名稱（如 United States）

預期結果:
- 跳轉到該區域的詳細頁面
- URL 更新包含 region 參數
- 顯示該區域的詳細資料
```
結果: [ ] PASS  [ ] FAIL

---

### 3. 區域詳情頁 (Region Detail)

#### TC-3.1: 查看區域詳情
```
前置條件: 已登入
測試步驟:
1. 從首頁點擊任一區域進入詳情頁
2. 或從下拉選單選擇區域

預期結果:
- 顯示該區域的 Executive Summary
- 顯示 KPI 卡片（Open Rate, Click Rate, etc.）
- 顯示 Campaign 列表
- 顯示圖表
```
結果: [ ] PASS  [ ] FAIL

#### TC-3.2: Campaign 列表分頁
```
前置條件: 在區域詳情頁，有超過 15 個 campaigns
測試步驟:
1. 捲動到 Campaign 列表
2. 確認每頁顯示 15 筆
3. 點擊下一頁

預期結果:
- 每頁顯示 15 筆 campaigns
- 分頁功能正常運作
```
結果: [ ] PASS  [ ] FAIL

#### TC-3.3: 返回總覽
```
前置條件: 在區域詳情頁
測試步驟:
1. 點擊「← Back to Overview」按鈕

預期結果:
- 返回首頁總覽
- URL 清除 region 參數
```
結果: [ ] PASS  [ ] FAIL

---

### 4. AI 分析功能 (Admin Only)

#### TC-4.1: 執行 AI 分析
```
前置條件: 以 Admin 帳號登入
測試步驟:
1. 在 Dashboard 頁面
2. 點擊「AI Analysis」按鈕
3. 等待分析完成

預期結果:
- 顯示載入中狀態
- 分析完成後顯示 AI 報告
- 報告包含洞察和建議
```
結果: [ ] PASS  [ ] FAIL

#### TC-4.2: Viewer 無法執行 AI 分析
```
前置條件: 以 Viewer 帳號登入
測試步驟:
1. 確認 AI Analysis 按鈕狀態

預期結果:
- AI Analysis 按鈕不可用或不顯示
```
結果: [ ] PASS  [ ] FAIL

---

### 5. 設定功能 (Settings)

#### TC-5.1: 開啟設定
```
前置條件: 已登入
測試步驟:
1. 點擊齒輪圖示開啟 Settings

預期結果:
- 顯示 Settings Modal
- 顯示 Alerts 設定 tab
```
結果: [ ] PASS  [ ] FAIL

#### TC-5.2: 調整 Alert 閾值
```
前置條件: 在 Settings > Alerts
測試步驟:
1. 調整 Bounce Rate 閾值
2. 關閉 Settings
3. 重新開啟 Settings

預期結果:
- 設定值被保存
- 重新開啟後顯示更新後的值
```
結果: [ ] PASS  [ ] FAIL

#### TC-5.3: Admin 專用 Tabs
```
前置條件: 以 Admin 帳號登入
測試步驟:
1. 開啟 Settings
2. 確認可見的 tabs

預期結果 (Admin):
- 可看到: Alerts, AI Analysis, Excluded, Share Links, Users, Activity

測試 Viewer:
- 只能看到: Alerts
```
結果: [ ] PASS  [ ] FAIL

---

### 6. 使用者管理 (Admin Only)

#### TC-6.1: 查看使用者列表
```
前置條件: 以 Admin 帳號登入
測試步驟:
1. 開啟 Settings
2. 點擊「Users」tab

預期結果:
- 顯示所有使用者列表
- 顯示每個使用者的 Email、Role、Last Login
```
結果: [ ] PASS  [ ] FAIL

#### TC-6.2: 新增使用者
```
前置條件: 在 Settings > Users
測試步驟:
1. 點擊「Add User」
2. 輸入 Email
3. 選擇 Role
4. 確認新增

預期結果:
- 使用者被新增
- 顯示臨時密碼
- 列表更新
```
結果: [ ] PASS  [ ] FAIL

---

### 7. Activity Logs (Admin Only)

#### TC-7.1: 查看活動紀錄
```
前置條件: 以 Admin 帳號登入
測試步驟:
1. 開啟 Settings
2. 點擊「Activity」tab

預期結果:
- 顯示活動統計摘要
- 顯示使用者活動統計
- 顯示活動紀錄表格
```
結果: [ ] PASS  [ ] FAIL

#### TC-7.2: 活動紀錄篩選
```
前置條件: 在 Settings > Activity
測試步驟:
1. 使用動作類型下拉選單篩選
2. 選擇特定動作（如「登入」）

預期結果:
- 列表只顯示該類型的紀錄
```
結果: [ ] PASS  [ ] FAIL

---

### 8. API Diagnostics

#### TC-8.1: 開啟 Diagnostics
```
前置條件: 已登入
測試步驟:
1. 點擊 header 上的 Diagnostics 按鈕

預期結果:
- 開啟 Diagnostics Drawer
- 顯示 Cache 統計
- 顯示 Quick Actions
```
結果: [ ] PASS  [ ] FAIL

#### TC-8.2: Populate Cache
```
前置條件: 在 Diagnostics Drawer
測試步驟:
1. 點擊「Populate Cache」按鈕
2. 等待完成

預期結果:
- 顯示載入中狀態
- 完成後顯示成功訊息
- Cache 統計更新
```
結果: [ ] PASS  [ ] FAIL

---

### 9. Share Link 功能

#### TC-9.1: 建立分享連結
```
前置條件: 已登入
測試步驟:
1. 設定好篩選條件
2. 點擊 Share 按鈕
3. 填寫名稱（選填）
4. 點擊「Create Link」

預期結果:
- 產生分享連結
- 可複製連結
```
結果: [ ] PASS  [ ] FAIL

#### TC-9.2: 使用分享連結（無密碼）
```
前置條件: 已建立無密碼的分享連結
測試步驟:
1. 開啟無痕視窗
2. 貼上分享連結

預期結果:
- 可直接查看 Dashboard
- 篩選條件與建立時相同
```
結果: [ ] PASS  [ ] FAIL

---

### 10. 響應式設計

#### TC-10.1: 桌面版 (1920x1080)
```
測試步驟:
1. 將視窗調整為 1920x1080
2. 瀏覽各頁面

預期結果:
- 版面正常顯示
- 無水平捲動
```
結果: [ ] PASS  [ ] FAIL

#### TC-10.2: 平板版 (768x1024)
```
測試步驟:
1. 將視窗調整為 768x1024
2. 瀏覽各頁面

預期結果:
- 版面自動調整
- 內容可讀
```
結果: [ ] PASS  [ ] FAIL

---

## 測試結果摘要

| 類別 | 總測試數 | PASS | FAIL |
|------|----------|------|------|
| 認證與登入 | 3 | | |
| 首頁儀表板 | 3 | | |
| 區域詳情頁 | 3 | | |
| AI 分析功能 | 2 | | |
| 設定功能 | 3 | | |
| 使用者管理 | 2 | | |
| Activity Logs | 2 | | |
| API Diagnostics | 2 | | |
| Share Link | 2 | | |
| 響應式設計 | 2 | | |
| **總計** | **24** | | |

---

## 已知問題 / Bug 記錄

| # | 測試案例 | 問題描述 | 嚴重度 | 狀態 |
|---|----------|----------|--------|------|
| 1 | | | High/Medium/Low | Open |
| 2 | | | | |

---

## AI 測試 Prompt 範例

### 給 Claude 的完整測試 Prompt:

```
你是一位 QA 測試工程師。請幫我測試以下網頁應用。

## 應用資訊
- 網址: [URL]
- Admin 帳號: [email] / [password]
- Viewer 帳號: [email] / [password]

## 測試任務

請依照以下步驟測試，並回報每個測試的結果：

### 測試 1: 登入功能
1. 開啟網址
2. 使用 Admin 帳號登入
3. 確認是否成功進入 Dashboard
4. 登出
5. 使用錯誤密碼嘗試登入，確認顯示錯誤訊息

### 測試 2: Dashboard 功能
1. 登入後，確認 Executive Summary 是否正常顯示
2. 切換時間範圍（30天、60天、90天）
3. 確認資料是否更新
4. 點擊區域名稱，確認是否跳轉到詳情頁

### 測試 3: 權限測試
1. 使用 Viewer 帳號登入
2. 開啟 Settings
3. 確認只能看到 Alerts tab
4. 確認無法看到 Users、Activity 等 Admin 功能

## 回報格式

請用以下格式回報每個測試：

**測試名稱**: [名稱]
**結果**: PASS / FAIL
**觀察**: [你看到的實際行為]
**問題**: [如果 FAIL，描述問題]
**建議**: [如果有改善建議]
```

---

## 備註

- 測試前請確保資料庫有足夠的測試資料
- 建議在不同瀏覽器（Chrome, Firefox, Safari）各測試一次
- 如果有 AI 輔助測試，記得提供應用的存取權限
