#!/bin/bash

# MailChimp Dashboard 一鍵部署腳本
# 使用方法：./deploy.sh

echo "🚀 開始部署 MailChimp Multi-Region Dashboard..."
echo ""

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤：找不到 Docker"
    echo "請先安裝 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 錯誤：找不到 Docker Compose"
    echo "請確認 Docker Desktop 已正確安裝"
    exit 1
fi

# 檢查 .env 檔案是否存在
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告：找不到 backend/.env 檔案"
    echo "系統將使用 Mock 資料運行"
    echo ""
    echo "如果要使用真實 MailChimp 資料："
    echo "1. 複製 backend/.env.example 為 backend/.env"
    echo "2. 在 .env 中填入你的 MailChimp API 憑證"
    echo "3. 重新執行此腳本"
    echo ""
    read -p "按 Enter 繼續使用 Mock 資料，或按 Ctrl+C 取消..."
fi

echo "📦 停止並移除舊的容器..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null

echo ""
echo "🔨 建置 Docker 映像檔..."
docker-compose build || docker compose build

if [ $? -ne 0 ]; then
    echo "❌ 建置失敗！"
    exit 1
fi

echo ""
echo "🎬 啟動服務..."
docker-compose up -d || docker compose up -d

if [ $? -ne 0 ]; then
    echo "❌ 啟動失敗！"
    exit 1
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 訪問你的 Dashboard："
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:8000"
echo "   API 文檔: http://localhost:8000/docs"
echo ""
echo "📝 查看日誌："
echo "   docker-compose logs -f"
echo ""
echo "🛑 停止服務："
echo "   docker-compose down"
echo ""
