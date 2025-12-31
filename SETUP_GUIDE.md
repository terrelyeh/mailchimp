# 🚀 新手完整設置指南

## 目錄
1. [配置真實 MailChimp API](#配置真實-mailchimp-api)
2. [本地開發環境啟動](#本地開發環境啟動)
3. [使用 Docker 部署](#使用-docker-部署)

---

## 📝 配置真實 MailChimp API

### 步驟 1: 取得 MailChimp API 金鑰

#### 1.1 登入 MailChimp
- 前往 https://mailchimp.com
- 用你的帳號登入

#### 1.2 建立 API Key
1. 點擊右上角的頭像
2. 選擇 **Account**（帳戶設定）
3. 點擊 **Extras** → **API keys**
4. 點擊 **Create A Key** 按鈕
5. 複製產生的 API Key（看起來像這樣：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-us1`）

#### 1.3 找到你的 Server Prefix
在同一個 API keys 頁面，你會看到類似這樣的訊息：
```
Your API key: a1b2c3d4...
Data center: us1
```

這個 `us1` 就是你的 **Server Prefix**（也可能是 us2, us19 等）

或者看你的 MailChimp 網址：
- 如果是 `https://us1.admin.mailchimp.com/` → Server Prefix 就是 `us1`
- 如果是 `https://us19.admin.mailchimp.com/` → Server Prefix 就是 `us19`

### 步驟 2: 建立 .env 檔案

#### 2.1 複製範例檔案
在終端機（Terminal）執行：

```bash
cd /home/user/mailchimp/backend
cp .env.example .env
```

如果你用的是 Windows，可以手動複製檔案：
- 找到 `backend/.env.example` 檔案
- 複製一份並重新命名為 `.env`

#### 2.2 編輯 .env 檔案

用文字編輯器打開 `backend/.env` 檔案，填入你的憑證：

**如果你只有一個 MailChimp 帳號**（最常見）：
```env
MAILCHIMP_API_KEY=你剛才複製的API金鑰
MAILCHIMP_SERVER_PREFIX=us1
```

實際範例：
```env
MAILCHIMP_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-us1
MAILCHIMP_SERVER_PREFIX=us1
```

**如果你有多個 MailChimp 帳號**（進階使用）：
```env
# 美國區域
MAILCHIMP_API_KEY_US=美國帳號的API金鑰
MAILCHIMP_SERVER_PREFIX_US=us1

# 歐洲區域
MAILCHIMP_API_KEY_EU=歐洲帳號的API金鑰
MAILCHIMP_SERVER_PREFIX_EU=us19

# 其他區域...
```

#### 2.3 儲存檔案
- 儲存 `.env` 檔案
- 確認檔案名稱是 `.env`（不是 `.env.txt`）

### 步驟 3: 安裝 Python 依賴

```bash
cd /home/user/mailchimp/backend
pip install python-dotenv
```

### 步驟 4: 測試 API 連線

啟動 Backend：
```bash
cd /home/user/mailchimp/backend
python main.py
```

如果看到：
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

就成功了！🎉

打開瀏覽器訪問：
- http://localhost:8000/docs （查看 API 文檔）
- http://localhost:8000/api/dashboard （測試拿取資料）

---

## 💻 本地開發環境啟動

### 前置需求
- Python 3.8+ （檢查版本：`python --version`）
- Node.js 18+ （檢查版本：`node --version`）
- npm （通常隨 Node.js 一起安裝）

### 啟動 Backend

開啟**第一個**終端機視窗：

```bash
# 1. 進入 backend 資料夾
cd /home/user/mailchimp/backend

# 2. 安裝 Python 依賴（第一次需要）
pip install -r requirements.txt

# 3. 啟動 Backend 伺服器
python main.py
```

看到這個就成功了：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 啟動 Frontend

開啟**第二個**終端機視窗：

```bash
# 1. 進入 frontend 資料夾
cd /home/user/mailchimp/frontend

# 2. 安裝 Node.js 依賴（第一次需要）
npm install

# 3. 啟動開發伺服器
npm run dev
```

看到這個就成功了：
```
  VITE v7.3.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 訪問應用程式

打開瀏覽器訪問：**http://localhost:5173**

你應該會看到酷炫的 MailChimp Dashboard！🎨

---

## 🐳 使用 Docker 部署

Docker 可以讓你一鍵部署整個應用，不用擔心環境配置問題。

### 前置需求
- 安裝 Docker Desktop（https://www.docker.com/products/docker-desktop）

### 步驟 1: 確認 Docker 已安裝

打開終端機，執行：

```bash
docker --version
```

如果看到版本號（例如 `Docker version 24.0.0`），就代表已安裝成功！

如果沒有安裝，請前往：https://www.docker.com/products/docker-desktop

### 步驟 2: 準備環境變數（可選）

如果要使用真實 MailChimp 資料：

1. 確保你已經建立 `backend/.env` 檔案（參考上面的 API 配置步驟）
2. Docker 會自動讀取這個檔案

如果沒有 `.env` 檔案，系統會使用 Mock 資料（這樣也很好用！）

### 步驟 3: 一鍵部署！

#### 方法 1：使用部署腳本（推薦，超簡單！）

```bash
cd /home/user/mailchimp
./deploy.sh
```

腳本會自動：
- ✅ 檢查 Docker 是否安裝
- ✅ 建置 Backend 和 Frontend
- ✅ 啟動所有服務
- ✅ 顯示訪問網址

#### 方法 2：手動使用 Docker Compose

```bash
cd /home/user/mailchimp

# 建置並啟動服務
docker-compose up -d --build

# 或使用新版 Docker 指令
docker compose up -d --build
```

### 步驟 4: 訪問應用

打開瀏覽器，訪問：

- **Frontend（主要網頁）**: http://localhost
- **Backend API**: http://localhost:8000
- **API 文檔**: http://localhost:8000/docs

### 常用 Docker 指令

```bash
# 查看服務狀態
docker-compose ps

# 查看日誌（即時）
docker-compose logs -f

# 只查看 backend 日誌
docker-compose logs -f backend

# 只查看 frontend 日誌
docker-compose logs -f frontend

# 停止服務
docker-compose down

# 停止並刪除所有資料
docker-compose down -v

# 重新啟動服務
docker-compose restart
```

### 疑難排解

#### 問題 1: 端口被占用
如果看到錯誤：`port is already allocated`

解決方法：
```bash
# 查看哪個程式占用了端口
# Mac/Linux:
lsof -i :80
lsof -i :8000

# Windows:
netstat -ano | findstr :80
netstat -ano | findstr :8000

# 停止占用端口的程式，或修改 docker-compose.yml 中的端口
```

#### 問題 2: 無法連線到 Backend
確保 `frontend/nginx.conf` 已正確配置（我已經幫你設定好了）

#### 問題 3: Docker 建置失敗
```bash
# 清除所有快取重新建置
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 🌐 部署到雲端（進階）

### 部署到 AWS / Google Cloud / Azure

你可以使用這個 `docker-compose.yml` 直接部署到任何支援 Docker 的雲端平台。

#### 快速步驟：

1. 將專案上傳到雲端伺服器
2. 在伺服器上安裝 Docker
3. 執行 `./deploy.sh`

### 部署到 Railway（超簡單的免費方案！）

1. 前往 https://railway.app
2. 連接你的 GitHub repo
3. 新增環境變數（MailChimp API Key）
4. 自動部署！

---

## 💡 小技巧

### 1. 本地開發 + Docker 一起用
- 用 Docker 跑 Backend（不用裝 Python）
- 用 npm 跑 Frontend（方便即時更新）

```bash
# 只啟動 Backend
docker-compose up -d backend

# 然後手動啟動 Frontend
cd frontend && npm run dev
```

### 2. 查看資料庫內容
```bash
# 進入 Backend 容器
docker-compose exec backend bash

# 查看資料庫
sqlite3 campaign_cache.db
SELECT * FROM campaigns LIMIT 5;
```

---

## 📞 需要幫助？

如果遇到任何問題：

1. 查看日誌：`docker-compose logs -f`
2. 檢查 `.env` 檔案是否正確
3. 確認 MailChimp API 金鑰有效
4. 重新建置：`docker-compose down && docker-compose up -d --build`

---

## 🎉 恭喜！

你現在已經：
- ✅ 學會配置 MailChimp API
- ✅ 會使用 Docker 部署應用
- ✅ 擁有一個酷炫的多區域 Dashboard

開始享受你的新工具吧！🚀
