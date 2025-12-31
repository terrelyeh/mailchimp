# ⚡ 快速入門（5 分鐘上手）

## 🎯 最快的方法：使用 Mock 資料

不需要 MailChimp 帳號也能體驗完整功能！

### 步驟 1: 開啟兩個終端機

**終端機 1 - Backend**：
```bash
cd /home/user/mailchimp/backend
pip install -r requirements.txt
python main.py
```

**終端機 2 - Frontend**：
```bash
cd /home/user/mailchimp/frontend
npm install
npm run dev
```

### 步驟 2: 開始使用

打開瀏覽器，訪問：**http://localhost:5173**

就這麼簡單！🎉

---

## 🔥 使用真實 MailChimp 資料

### 1️⃣ 取得 API Key

1. 登入 https://mailchimp.com
2. 點擊右上角頭像 → **Account** → **Extras** → **API keys**
3. 點擊 **Create A Key**
4. 複製 API Key

### 2️⃣ 建立 .env 檔案

```bash
cd /home/user/mailchimp/backend
cp .env.example .env
```

編輯 `.env` 檔案，填入：
```env
MAILCHIMP_API_KEY=你的API金鑰
MAILCHIMP_SERVER_PREFIX=us1
```

> **Server Prefix 在哪？**
> 看你的 MailChimp 網址：
> `https://us1.admin.mailchimp.com/` → 就是 `us1`

### 3️⃣ 重啟 Backend

按 `Ctrl+C` 停止 Backend，然後重新啟動：
```bash
python main.py
```

重新整理瀏覽器，就能看到真實資料了！📊

---

## 🐳 使用 Docker（一鍵部署）

如果你已經安裝 Docker：

```bash
cd /home/user/mailchimp
./deploy.sh
```

然後訪問：**http://localhost**

就這麼簡單！

---

## 📚 更多資訊

- **完整設置指南**: 查看 [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **專案說明**: 查看 [README.md](README.md)
- **API 文檔**: http://localhost:8000/docs

---

## 🎮 試試這些功能

1. ✅ 切換時間範圍（7/30/90天）
2. ✅ 選擇單一區域查看詳細資料
3. ✅ 點擊區域卡片進入詳細頁
4. ✅ 查看開信率、點擊率比較圖表
5. ✅ 點擊 Sync 按鈕同步最新資料

享受你的酷炫 Dashboard！🚀
