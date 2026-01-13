# EnGenius EDM Dashboard - 功能說明

## 目錄
- [使用者管理](#使用者管理)
- [儀表板功能](#儀表板功能)
- [篩選與排除](#篩選與排除)
- [分享功能](#分享功能)
- [警示設定](#警示設定)
- [匯出功能](#匯出功能)

---

## 使用者管理

### 角色權限
系統支援兩種角色：

| 角色 | 權限 |
|------|------|
| **Admin** | 完整權限：管理使用者、設定排除清單、建立分享連結、編輯警示設定 |
| **Viewer** | 唯讀權限：檢視儀表板、使用篩選器、匯出報表 |

### 帳號功能
- 使用者登入/登出
- 首次登入強制變更密碼
- 管理員可新增/刪除使用者
- 管理員可重設使用者密碼

---

## 儀表板功能

### Home Dashboard (總覽頁面)
顯示所有區域的整體統計：

- **Executive Summary**: AI 生成的摘要報告
- **KPI Cards**: 總發送數、平均開信率、平均點擊率、取消訂閱數、總訂閱人數
- **Campaign Metrics over Time**: 各區域的指標趨勢圖
- **Region Cards**: 各區域摘要卡片（可點擊進入詳細頁面）

### Second-Level Dashboard (區域詳細頁面)
顯示單一區域的詳細資料：

- **Executive Summary**: 區域專屬摘要報告
- **KPI Cards**: 該區域的關鍵指標
- **Campaign Performance**: 效能趨勢圖表
- **Campaign List**: 最近的 Campaign 列表（含詳細指標）

---

## 篩選與排除

### 時間範圍篩選
- 預設選項：7天、30天、60天、90天、180天、365天
- 自訂日期：可選擇任意起迄日期

### 區域篩選
- All Regions：顯示所有區域彙總
- 單一區域：US、EU、APAC、JP 等

### Audience 篩選
在區域詳細頁面中：
- All Audiences：顯示該區域所有 Audience
- 單一 Audience：僅顯示特定 Audience 的資料

### 排除 Audience 功能 (v1.1 新增)

**用途**：排除測試用的 Audience，使其不影響統計數據

**設定方式**：
1. 點擊右上角使用者頭像
2. 選擇「Settings」
3. 切換至「Excluded Audiences」分頁
4. 勾選要排除的 Audience
5. 點擊「Save Changes」儲存

**功能特點**：
- 全域設定：所有使用者共用同一份排除清單
- 僅限管理員：只有 Admin 可以編輯排除清單
- 即時生效：儲存後立即反映在統計數據中
- 不影響個別檢視：選擇特定 Audience 時仍可查看被排除的資料

**排除效果**：
- Home Dashboard：被排除的 Audience 不計入 KPI 統計
- Second-Level Dashboard：「All Audiences」檢視時不顯示被排除的資料
- 總訂閱人數：不計入被排除 Audience 的訂閱者

---

## 分享功能

### 建立分享連結
1. 設定好篩選條件（時間、區域、Audience）
2. 點擊「Share」按鈕
3. 可選設定：
   - 密碼保護
   - 有效期限（1天、7天、30天、永久）
4. 複製產生的連結

### 分享連結特性
- 唯讀模式：檢視者無法修改篩選條件
- 保留篩選狀態：連結包含建立時的篩選設定
- 無需登入：任何人都可透過連結檢視

### 管理分享連結
- 路徑：Settings > Share Links
- 可查看所有建立的連結
- 可刪除不需要的連結

---

## 警示設定

### 閾值設定
可為以下指標設定警示閾值：
- 開信率 (Open Rate)
- 點擊率 (Click Rate)
- 退信率 (Bounce Rate)
- 取消訂閱率 (Unsubscribe Rate)

### 設定方式
1. Settings > Alert Settings
2. 為各指標設定警示閾值
3. Campaign 低於閾值時會以紅色標示

---

## 匯出功能

### 支援格式
- **PNG**：高解析度圖片
- **PDF**：多頁 PDF 文件

### 匯出內容
匯出時會包含：
- Executive Summary
- KPI Cards
- 圖表
- Campaign 列表（PDF）

### 使用方式
點擊右上角「Export」按鈕，選擇格式即可下載

---

## API 端點

### Dashboard API
| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/dashboard` | 取得儀表板資料 |
| GET | `/api/regions` | 取得可用區域列表 |
| GET | `/api/audiences` | 取得 Audience 列表 |
| POST | `/api/sync` | 觸發資料同步 |

### 使用者 API
| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/auth/login` | 使用者登入 |
| POST | `/api/auth/change-password` | 變更密碼 |
| GET | `/api/users` | 取得使用者列表 (Admin) |
| POST | `/api/users` | 新增使用者 (Admin) |
| DELETE | `/api/users/{id}` | 刪除使用者 (Admin) |

### 設定 API
| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/settings/thresholds` | 取得警示閾值 |
| PUT | `/api/settings/thresholds` | 更新警示閾值 |
| GET | `/api/settings/excluded-audiences` | 取得排除的 Audience 清單 |
| PUT | `/api/settings/excluded-audiences` | 更新排除的 Audience 清單 (Admin) |

### 分享連結 API
| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/share-links` | 建立分享連結 |
| GET | `/api/share-links` | 取得分享連結列表 (Admin) |
| GET | `/api/share-links/{token}` | 取得分享連結資訊 |
| POST | `/api/share-links/{token}/verify` | 驗證分享連結密碼 |
| DELETE | `/api/share-links/{token}` | 刪除分享連結 (Admin) |

---

## 版本歷史

### v1.1 (2024-01)
- 新增「排除 Audience」功能
- 修復手機版日期選擇器 Layout 問題
- 修復 Campaign 名稱過長導致的排版問題

### v1.0 (2024-01)
- 初始版本
- 多區域儀表板
- 使用者管理與權限控制
- 分享連結功能
- 警示閾值設定
- PDF/PNG 匯出
