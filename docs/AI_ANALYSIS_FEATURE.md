# AI Dashboard Analysis Feature - 需求文件

## 功能概述

新增「AI 分析」功能，讓使用者可以一鍵將儀表板截圖傳送給 Gemini AI，獲得專業的行銷洞察與建議。

---

## 使用者故事

> 作為行銷人員，我希望能夠快速獲得 AI 對儀表板數據的專業分析，包含洞察、改進建議和行動方案，以便我能夠更有效地優化行銷策略。

---

## 功能規格

### 觸發方式
- 在 Header 區域新增「AI Analysis」按鈕（位於 Export 按鈕旁邊）
- 按鈕圖示：使用 `Sparkles` 或 `Brain` icon（Lucide）

### 執行流程

```
1. 使用者點擊「AI Analysis」按鈕
2. 顯示確認對話框（可選：說明將截圖並分析）
3. 系統截取當前儀表板畫面
4. 顯示 Loading 狀態（預計 5-15 秒）
5. 將截圖傳送至後端 API
6. 後端呼叫 Gemini AI 進行分析
7. 返回分析結果
8. 以 Modal 視窗顯示分析結果
```

### 輸出內容結構

| 區塊 | 說明 |
|------|------|
| 🔍 Key Insights | 從數據中發現的重要洞察（3-5 點） |
| ⚠️ Areas for Improvement | 需要關注或改進的地方（2-4 點） |
| 💡 Recommended Actions | 具體可執行的行動建議（3-5 點） |

---

## 技術規格

### 前端

| 項目 | 說明 |
|------|------|
| 截圖工具 | `html2canvas`（已有） |
| 圖片格式 | JPEG（品質 0.8，減少檔案大小） |
| 圖片傳輸 | Base64 編碼 |
| 結果顯示 | 新建 `AIAnalysisModal` 組件 |

### 後端

| 項目 | 說明 |
|------|------|
| API Endpoint | `POST /api/ai/analyze-dashboard` |
| AI 服務 | Google Gemini API（gemini-1.5-flash 或 gemini-1.5-pro） |
| API Key | 環境變數 `GEMINI_API_KEY` |

### API Request/Response

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "context": {
    "view": "overview | region-detail",
    "region": "APAC",
    "timeRange": "Last 90 days",
    "audience": "All Audiences"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "analysis": {
    "insights": ["...", "...", "..."],
    "improvements": ["...", "...", "..."],
    "actions": ["...", "...", "..."],
    "summary": "整體摘要..."
  },
  "model": "gemini-1.5-flash",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Gemini AI Prompt 設計

### System Prompt

```
You are an expert Email Marketing Analyst with 10+ years of experience in analyzing campaign performance data. You specialize in interpreting marketing dashboards and providing actionable insights.

Your analysis style:
- Data-driven and specific (reference actual numbers when visible)
- Actionable and practical
- Prioritized by impact
- Written for marketing managers, not technical staff
```

### User Prompt Template

```
Please analyze this email marketing dashboard screenshot and provide insights in Traditional Chinese (繁體中文).

**Current View Context:**
- Dashboard Type: {view_type}
- Region: {region}
- Time Period: {time_range}
- Audience Filter: {audience}

**Please provide your analysis in the following format:**

## 🔍 關鍵洞察 (Key Insights)
Identify 3-5 important findings from the data. Be specific with numbers if visible.

## ⚠️ 需改進之處 (Areas for Improvement)
Identify 2-4 areas that need attention or show concerning trends.

## 💡 建議行動方案 (Recommended Actions)
Provide 3-5 specific, actionable recommendations that can be implemented.

## 📊 整體評估 (Overall Assessment)
A brief 2-3 sentence summary of the dashboard's overall health.

Focus on:
- Open rates and click rates trends
- Campaign performance patterns
- Audience engagement levels
- Any anomalies or notable changes
- Comparison between regions (if applicable)
```

---

## UI/UX 設計

### AI Analysis 按鈕
- 位置：Header 區域，Export 按鈕旁邊
- 樣式：與其他按鈕一致
- 文字：「AI Analysis」或「✨ AI 分析」

### Loading 狀態
- 全螢幕 overlay 或 Modal
- 動畫：腦部/星星動畫 + 進度提示
- 文字提示：
  - "正在截取儀表板..."
  - "AI 分析中，請稍候..."
  - "即將完成..."

### 結果 Modal
- 寬度：max-w-2xl（適合閱讀）
- 可滾動內容區
- 底部按鈕：
  - 「複製內容」- 複製分析結果文字
  - 「關閉」

---

## 錯誤處理

| 錯誤情境 | 處理方式 |
|---------|---------|
| 截圖失敗 | 顯示錯誤訊息，建議重試 |
| API 請求逾時 | 30 秒逾時，顯示重試選項 |
| Gemini API 錯誤 | 顯示友善錯誤訊息 |
| API Key 未設定 | 按鈕禁用或顯示設定提示 |

---

## 安全性考量

1. **API Key 保護**：Gemini API Key 只存在後端，不暴露給前端
2. **Rate Limiting**：考慮限制每用戶每日分析次數（如 10 次/天）
3. **圖片處理**：截圖不儲存，分析完即丟棄

---

## 環境變數

```env
# Backend (.env)
GEMINI_API_KEY=your_gemini_api_key_here
AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_DAILY_LIMIT=10
```

---

## 實作優先順序

1. **Phase 1 - MVP**
   - [ ] 後端 API endpoint
   - [ ] Gemini API 整合
   - [ ] 前端按鈕與截圖功能
   - [ ] 結果顯示 Modal

2. **Phase 2 - Enhancement**
   - [ ] 分析歷史記錄
   - [ ] 匯出分析報告（PDF）
   - [ ] 多語言支援
   - [ ] 自訂分析重點

---

## 預估開發時間

| 項目 | 預估時間 |
|------|---------|
| 後端 API | 2-3 小時 |
| 前端 UI | 2-3 小時 |
| 測試與調整 | 1-2 小時 |
| **總計** | **5-8 小時** |

---

## 相依套件

### Backend
```
google-generativeai>=0.3.0
```

### Frontend
- 無新增（使用現有 html2canvas）

---

## 參考資源

- [Gemini API Documentation](https://ai.google.dev/docs)
- [html2canvas Documentation](https://html2canvas.hertzen.com/)
